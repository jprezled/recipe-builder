# How to write a component test

A **component test** checks one React component or page — it renders it, acts
on it the way a person would, and checks what appears on screen.

No browser and no backend. `jsdom` provides a fake DOM, and the API module is
replaced with a fake so nothing reaches the network.

Use this for any subtask whose file ends in `.test.jsx`.

Follow the steps in order. Do not skip step 4.

---

## Step 1 — Create the file

Next to the thing it tests, with the same name:

```
frontend/src/components/RecipeNote.test.jsx
frontend/src/pages/ResultsPage.test.jsx
```

Vitest finds any file ending `.test.jsx`. There is no config to change.

---

## Step 2 — Paste the skeleton

```jsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipeNote from './RecipeNote'
import { saveNote } from '../api/recipes'

// Replaces every function in that module with a fake. Nothing reaches the
// network, and each test decides what the fake returns.
vi.mock('../api/recipes')

describe('RecipeNote', () => {
  beforeEach(() => {
    // Forget what the fakes did in the previous test.
    vi.resetAllMocks()
    // Set the defaults AFTER the reset, or the reset wipes them.
    saveNote.mockResolvedValue(undefined)
  })

  it('shows the note it was given', () => {
    render(<RecipeNote recipeId={660101} note="double the garlic" />)

    expect(screen.getByText('double the garlic')).toBeInTheDocument()
  })
})
```

**If the component is inside a page that uses routing**, wrap it:

```jsx
import { MemoryRouter } from 'react-router-dom'

render(
  <MemoryRouter initialEntries={['/results?ingredients=eggs,milk']}>
    <ResultsPage />
  </MemoryRouter>,
)
```

`MemoryRouter` is a router with no real browser address, so you can start the
test on any URL. `initialEntries` is how a test sets up the query string that
`useSearchParams` reads.

---

## Step 3 — Write one test method — pick one option

### Option A — something appears on screen

For "the page shows X".

```jsx
it('says so when nothing was found', async () => {
  searchRecipes.mockResolvedValue([])
  renderResults()

  expect(await screen.findByText('No recipes found for those ingredients.'))
    .toBeInTheDocument()
})
```

**`findBy` waits; `getBy` does not.** Use `findBy` for anything that appears
after a fetch, and `getBy` for what is there from the first render. Using
`getBy` too early is the single most common failure, and the message is
"Unable to find an element", which looks like the component is broken.

### Option B — a click does the right thing

For "pressing the button calls X" or "ticking a box changes Y".

```jsx
it('saves the note that was typed', async () => {
  render(<RecipeNote recipeId={660101} note={null} />)

  await userEvent.click(screen.getByRole('button', { name: /add a note/i }))
  await userEvent.type(screen.getByRole('textbox'), 'less salt')
  await userEvent.click(screen.getByRole('button', { name: /save note/i }))

  expect(saveNote).toHaveBeenCalledWith(660101, 'less salt')
})
```

Every `userEvent` call needs `await`. Without it the click has not finished
when the next line runs, and the test fails for no visible reason.

### Option C — something does NOT happen

For "this must not call the API" or "this must not appear". Sprint 4 has
several of these, because a wasted Spoonacular call costs real quota.

```jsx
it('offers local matches without asking Spoonacular', async () => {
  renderInput()

  await userEvent.type(screen.getByLabelText('Ingredient'), 'tom')

  expect(screen.getByRole('option', { name: 'tomato' })).toBeInTheDocument()
  expect(suggestIngredients).not.toHaveBeenCalled()
})
```

Use `queryBy` — not `getBy` — when you expect something to be absent.
`getBy` **throws** when it finds nothing, so the test errors instead of
failing with a useful message.

```jsx
expect(screen.queryByRole('option')).not.toBeInTheDocument()
```

---

## Step 4 — Run it and watch it fail

```bash
cd frontend
npm test -- RecipeNote           # one file
npm test                         # everything
```

**This is the step people skip and the one that matters.** A test written after
the code passes the instant you write it, which proves nothing. A test you
watched fail, then made pass, has demonstrated it can detect the problem it
exists for.

**If a brand-new test passes immediately, something is wrong.** Either the
behaviour already existed, or the test is not running.

---

## Step 5 — Write the code that makes it pass

Only now open the `.jsx` file.

---

## Step 6 — Run the whole suite

```bash
cd frontend && npm test
```

A component test can break a page test that renders the same component, so the
single-file run is not enough.

---

## Finding things on screen

Prefer the query that matches how a person finds the control. Roughly in order:

| Query | Use for |
|---|---|
| `getByRole('button', { name: /save/i })` | buttons, links, checkboxes, radios |
| `getByLabelText('Ingredient')` | a text box with a real `<label>` |
| `getByText('No recipes found')` | plain text on the page |
| `getByTestId('address')` | last resort, when nothing else identifies it |

**Why roles rather than CSS classes:** a role is what the control *is*, so the
test survives restyling. A class is what it looks like, so a test tied to one
breaks the next time somebody renames it — and it never checks that a screen
reader can find the control at all.

This is also why components need a real `<label for="...">` and `aria-expanded`
on a toggle. Those are not decoration; they are how both a screen reader and
the test identify the thing.

---

## Two traps specific to this project

**StrictMode runs effects twice.** `main.jsx` wraps the app in `StrictMode`,
which deliberately runs every effect twice in development and cancels the first
attempt in between. A test that renders inside `<StrictMode>` sees the same
thing. Two sprint 4 bugs came from this, both involving a flag set before a
fetch instead of inside the `.then` — see `docs/saved-pantry-contract.md`.

**`vi.resetAllMocks()` wipes your defaults.** It belongs at the **top** of
`beforeEach`, with the `mockResolvedValue` lines **below** it. The other way
round and every fake returns `undefined`, which usually shows up as
"Cannot read properties of undefined".

---

## Naming

- The file must end in `.test.jsx`
- Name tests after what should happen, as a sentence:
  `it('offers local matches without asking Spoonacular')`, not `it('works')`
- Group related tests in a `describe` named after the component
