# The same note on both pages — what we agreed

**RB-269a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-269b.**

The smallest story in sprint 4. The one real decision in it is a user-interface
question with no obviously right answer, and the team should confirm it.

---

## The short version

1. This costs **nothing** — no endpoint, no migration, no extra request.
2. The page was already fetching the note and throwing it away. Use `find`
   instead of `some`.
3. On an **unsaved** recipe the control stays visible and explains itself.
4. It is a **toggle button**, matching the other three, not a tab.
5. Reuse the existing `RecipeNote` component. Do not copy it.

---

## Why it costs nothing

The recipe detail page already called `getFavorites()` when it loaded, to work
out whether the button should say *Save* or *Saved*.

**That reply has always contained the note.** The page used `saved.some(...)`,
which answers "is it in the list?" and throws the entry itself away.

```js
const alreadySaved = saved.find((one) => one.id === found.id)
setIsFavorite(alreadySaved !== undefined)
setNote(alreadySaved ? alreadySaved.note : null)
```

`find` returns the matching entry; `some` returns only `true` or `false`. That
one-word change is most of the story.

There is a test asserting **exactly one** recipe call and **one** favourites
call when the note panel opens. It is there so nobody later "fixes" this by
adding a fetch for something the page already had.

---

## The decision: what an unsaved recipe shows

The note lives on `saved_recipes`, keyed by (user, recipe), and the backend
refuses a note with *"Save this recipe before adding a note."* So there is no
honest way to offer a working box on a recipe nobody has saved.

Three options were considered:

| Option | In favour | Against |
|---|---|---|
| Hide the control until the recipe is saved | simplest markup | a button that appears and disappears looks like a bug |
| **Show it, and say why it is inert** | stable and self-explaining | one more state to handle |
| Writing a note also saves the recipe | smoothest to use | adds to favourites as a side effect of typing |

**We built the second.** The *My note* button is always in the row, and opening
it on an unsaved recipe says:

```
Save this recipe to add a note.
```

> **Still worth asking the team.** The third option is defensible, and a cook
> might well prefer it. This file records what was built, not a closed argument.

---

## A toggle, not a tab

The button row already holds *Nutrition facts*, *Shopping list* and *What I
need to buy*, and all three are toggle buttons. A tab would be the odd one out.

**If the team wants tabs, all four become tabs together.** One of four being
different is worse than either consistent choice.

---

## Mistake 1 — copying the note component instead of reusing it

`RecipeNote` is used exactly as the favourites page uses it, and `saveNote` is
the same function. So the two pages cannot drift apart or disagree about where
a note lives.

Favourites refetches when it loads, so a note written on one page is simply
there on the other. There is no cache to clear and no event to publish.

---

## Mistake 2 — forgetting the React key

```jsx
<RecipeNote key={note ?? ''} recipeId={recipe.id} note={note} />
```

`RecipeNote` copies its `note` prop into state **once**, when it first appears.

**What goes wrong without the key:** saving the recipe is what makes the
component appear. Without a key tied to the note, React reuses an instance that
started life with an empty note, so the box opens blank even though a note
already exists.

Changing the key tells React to build a fresh component, which reads the prop
again.

---

## Known behaviour

**Un-saving a recipe deletes its note**, because the note lives on the
`saved_recipes` row that gets removed. This came from RB-205 and is not new —
but it is far more visible now that notes can be written from two places, and a
confirmation prompt would be a sensible future story.

---

## Words used here

- **`find` vs `some`** — both search an array. `some` returns a boolean;
  `find` returns the matching element, or `undefined`.
- **React `key`** — tells React whether two renders show the same component or
  a different one. Change it and React discards the old component along with
  everything it was holding in state.
- **Prop copied into state** — a component that does
  `useState(props.note)` reads the prop only on its first render. Later changes
  to the prop are ignored unless something forces a remount.
