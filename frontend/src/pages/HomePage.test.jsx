import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HomePage from './HomePage'
import { getFavorites, searchRecipes } from '../api/recipes'

// Peter's HomePage renders the real ResultsPage inside itself, and that page
// does the searching. Stubbing the api layer keeps these tests about the
// pantry list while still proving the list reaches the search.
vi.mock('../api/recipes', () => ({
  searchRecipes: vi.fn(() => Promise.resolve([])),
  getFavorites: vi.fn(() => Promise.resolve([])),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function renderHome(entry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function add(name) {
  await userEvent.type(screen.getByLabelText('Ingredient'), name)
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
}

/**
 * Andrew's add-to-a-list design, made real. His Add button, his "Your
 * ingredients" heading, his wording and his CSS classes all stay; only the
 * hardcoded Eggs / Milk / Flour becomes state.
 *
 * Add splits on commas but never on spaces, so one box handles both cases:
 * "green onion" stays one ingredient, and a pasted "eggs, milk, cheese"
 * becomes three separate rows that can be removed individually.
 */
describe('HomePage', () => {
  it('adds a typed ingredient to the list', async () => {
    renderHome()
    await add('eggs')
    expect(screen.getByRole('listitem')).toHaveTextContent('eggs')
  })

  it('no longer shows the hardcoded Eggs / Milk / Flour', () => {
    renderHome()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('empties the box after adding, ready for the next one', async () => {
    renderHome()
    await add('eggs')
    expect(screen.getByLabelText('Ingredient')).toHaveValue('')
  })

  it('keeps a two-word ingredient whole', async () => {
    // The reason Add beats a comma-separated box: "green onion" is ONE
    // ingredient, and pressing Add says so without any separator to guess.
    renderHome()
    await add('green onion')
    expect(screen.getByRole('listitem')).toHaveTextContent('green onion')
  })

  it('searches for the whole list when Generate Recipes is pressed', async () => {
    // Asserted on the search call rather than on a URL, because the results
    // are embedded here rather than navigated to. The list reaching the
    // search is the behaviour that matters either way.
    renderHome()
    await add('eggs')
    await add('milk')
    await userEvent.click(screen.getByRole('button', { name: 'Generate Recipes' }))
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalledWith('eggs,milk'))
  })

  it('does not search until Generate Recipes is pressed', async () => {
    // Adding ingredients must not cost a Spoonacular point. The free tier is
    // 150 a day, and a search per keystroke would burn it before lunch.
    renderHome()
    await add('eggs')
    expect(searchRecipes).not.toHaveBeenCalled()
    expect(getFavorites).not.toHaveBeenCalled()
  })

  it('splits a comma list typed in one go into separate rows', async () => {
    renderHome()
    await add('eggs, milk, cheese')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('does not add the same ingredient twice, whatever the capitalisation', async () => {
    renderHome()
    await add('eggs')
    await add('Eggs')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('ignores Add when only spaces were typed', async () => {
    renderHome()
    await add('   ')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('takes an ingredient back off the list', async () => {
    renderHome()
    await add('eggs')
    await add('milk')
    await userEvent.click(screen.getByRole('button', { name: 'Remove eggs' }))
    const left = screen.getAllByRole('listitem')
    expect(left).toHaveLength(1)
    expect(left[0]).toHaveTextContent('milk')
  })

  it('cannot generate recipes with an empty list', () => {
    renderHome()
    expect(screen.getByRole('button', { name: 'Generate Recipes' })).toBeDisabled()
  })

  it('picks the pantry list back up from the address', () => {
    renderHome('/?ingredients=eggs,milk,flour')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('keeps Andrew’s link to the favorites page', () => {
    renderHome()
    expect(screen.getByRole('link', { name: 'View Favorites' })).toBeInTheDocument()
  })
})
