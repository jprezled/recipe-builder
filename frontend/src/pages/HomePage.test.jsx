import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HomePage from './HomePage'
import { getFavorites, searchRecipes } from '../api/recipes'
import { getPantry, getRestrictions, savePantry, saveRestrictions } from '../api/accounts'

// Peter's HomePage renders the real ResultsPage inside itself, and that page
// does the searching. Stubbing the api layer keeps these tests about the
// pantry list while still proving the list reaches the search.
vi.mock('../api/recipes', () => ({
  searchRecipes: vi.fn(() => Promise.resolve([])),
  getFavorites: vi.fn(() => Promise.resolve([])),
  suggestIngredients: vi.fn(() => Promise.resolve([])),
}))

// RB-208: the home page reads and writes the saved pantry. The embedded
// ResultsPage also reads the saved restrictions, so those belong here too -
// an explicit mock has to list every export the page tree uses.
vi.mock('../api/accounts', () => ({
  getPantry: vi.fn(() => Promise.resolve('')),
  savePantry: vi.fn(() => Promise.resolve()),
  getRestrictions: vi.fn(() => Promise.resolve({ diet: '', intolerances: '' })),
  saveRestrictions: vi.fn(() => Promise.resolve()),
}))

vi.mock('../api/collections', () => ({
  getCollections: vi.fn(() => Promise.resolve([])),
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
    // RB-173 added diet and intolerances, RB-226 added sort
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalledWith('eggs,milk', {
      diet: null,
      intolerances: null,
      sort: null,
    }),
  )
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

  // ---- RB-208: the saved pantry ------------------------------------------

  describe('the saved pantry', () => {
    it('loads the saved pantry into an empty page', async () => {
      getPantry.mockResolvedValue('eggs,milk')

      renderHome('/')

      expect(await screen.findByText('eggs')).toBeInTheDocument()
      expect(screen.getByText('milk')).toBeInTheDocument()
    })

    it('lets the address win over the saved pantry', async () => {
      // A link someone shared must show what the link says, not the
      // recipient's own kitchen.
      getPantry.mockResolvedValue('eggs,milk')

      renderHome('/?ingredients=flour')

      expect(await screen.findByText('flour')).toBeInTheDocument()
      expect(screen.queryByText('eggs')).not.toBeInTheDocument()
    })

    it('saves the pantry when an ingredient is added', async () => {
      getPantry.mockResolvedValue('')

      renderHome('/')
      await add('eggs')

      await vi.waitFor(() => expect(savePantry).toHaveBeenCalledWith('eggs'))
    })

    it('saves the emptied pantry when the last ingredient goes', async () => {
      getPantry.mockResolvedValue('')

      renderHome('/?ingredients=eggs')
      await userEvent.click(await screen.findByRole('button', { name: /remove eggs/i }))

      await vi.waitFor(() => expect(savePantry).toHaveBeenCalledWith(''))
    })

    it('is quiet when signed out', async () => {
      // Signed out is the ordinary case on this page, not a problem to
      // report - the rejection is swallowed and the page stays usable.
      getPantry.mockRejectedValue(new Error('Please sign in to save favorites.'))

      renderHome('/')
      await add('eggs')

      expect(screen.getByText('eggs')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('still loads after StrictMode cancels the first attempt', async () => {
      // The contract's Mistake 1: a flag set before the fetch is spent on
      // the attempt whose result gets thrown away, and nothing ever loads.
      getPantry.mockResolvedValue('eggs,milk')

      render(
        <StrictMode>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<HomePage />} />
            </Routes>
          </MemoryRouter>
        </StrictMode>,
      )

      expect(await screen.findByText('eggs')).toBeInTheDocument()
    })
  })

  // ---- Dietary restrictions: set on the home page, before Generate -------

  it('puts Generate Recipes in the middle, between the dietary toggle and View Favorites', () => {
    renderHome('/?ingredients=eggs')

    const toggle = screen.getByRole('button', { name: /Dietary Restrictions/ })
    const generate = screen.getByRole('button', { name: 'Generate Recipes' })
    const favorites = screen.getByRole('link', { name: 'View Favorites' })

    expect(toggle.compareDocumentPosition(generate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(generate.compareDocumentPosition(favorites) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('searches with the ticked filters when Generate Recipes is pressed', async () => {
    renderHome('/?ingredients=eggs')

    await userEvent.click(screen.getByRole('button', { name: /Dietary Restrictions/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Vegan' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Dairy' }))
    await userEvent.click(screen.getByRole('button', { name: 'Generate Recipes' }))

    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenCalledWith('eggs', expect.objectContaining({
        diet: 'vegan',
        intolerances: 'dairy',
      })),
    )
  })

  it('does not search when the filters are applied, only saves and closes', async () => {
    renderHome('/?ingredients=eggs')

    await userEvent.click(screen.getByRole('button', { name: /Dietary Restrictions/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Vegan' }))
    await userEvent.click(screen.getByRole('button', { name: 'Find recipes' }))

    expect(saveRestrictions).toHaveBeenCalledWith('vegan', '')
    expect(searchRecipes).not.toHaveBeenCalled()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('has only one dietary toggle once the results box is showing', async () => {
    renderHome('/?ingredients=eggs&results=1')

    expect(await screen.findByRole('heading', { name: 'Your Recipes' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Dietary Restrictions/ })).toHaveLength(1)
  })

  it('takes the results away when a filter changes, since they were for the old filters', async () => {
    renderHome('/?ingredients=eggs&results=1')
    expect(await screen.findByRole('heading', { name: 'Your Recipes' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Dietary Restrictions/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Vegan' }))

    expect(screen.queryByRole('heading', { name: 'Your Recipes' })).not.toBeInTheDocument()
  })

  it('fills the panel from the cook\'s saved restrictions', async () => {
    getRestrictions.mockResolvedValue({ diet: 'vegan', intolerances: 'dairy' })
    renderHome('/?ingredients=eggs')

    // Let the saved choices arrive and the panel rebuild itself, then open it
    // once - opening it while they are still arriving would be undone by the
    // rebuild.
    await vi.waitFor(() => expect(getRestrictions).toHaveBeenCalled())
    await act(async () => {})

    await userEvent.click(screen.getByRole('button', { name: /Dietary Restrictions/ }))

    expect(screen.getByRole('radio', { name: 'Vegan' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Dairy' })).toBeChecked()
  })
})
