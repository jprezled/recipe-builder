import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ResultsPage from './ResultsPage'
import { addFavorite, getFavorites, searchRecipes } from '../api/recipes'
import { StrictMode } from 'react'
import { getRestrictions, saveRestrictions } from '../api/accounts'

// Replace the duplicate recipes mock lines with these mocks.
// These prevent tests from making real network requests.
vi.mock('../api/recipes')
vi.mock('../api/accounts')

// These sample recipe objects provide predictable data for card-rendering tests.
const PASTA = {
  id: 716429, title: 'Garlic Chicken Pasta', imageUrl: 'http://img/1.jpg',
  ingredientsYouHave: 2, ingredientsYouNeed: 3, matchPercent: 40,
}
const PARFAIT = {
  id: 716433, title: 'Berry Parfait', imageUrl: 'http://img/2.jpg',
  ingredientsYouHave: 1, ingredientsYouNeed: 4, matchPercent: 20,
}

// Render the page with a test URL. This lets each test control the query
// parameters without changing the browser's real address.
function renderResults(query = '?ingredients=eggs,milk') {
  return render(
    <MemoryRouter initialEntries={['/results' + query]}>
      <ResultsPage />
    </MemoryRouter>,
  )
}

/**
 * Andrew's results page, reading from the address instead of three hardcoded
 * cards. His heading, tagline, grid and Back button all stay, and his
 * RecipeCard keeps the prop names he gave it.
 */
describe('ResultsPage', () => {
  beforeEach(() => {
    // Start each test with clean mocks and predictable API responses.
    vi.resetAllMocks()
    getFavorites.mockResolvedValue([])
    getRestrictions.mockResolvedValue({ diet: '', intolerances: '' })
    saveRestrictions.mockResolvedValue(undefined)
  })

  // ---- RB-173: the restrictions travel in the address --------------------

  it('sends the restrictions from the address to the search', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs&diet=vegetarian&intolerances=dairy,peanut')

    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenCalledWith('eggs', {
        diet: 'vegetarian',
        intolerances: 'dairy,peanut',
      }),
    )
  })

  it('searches again with the new choices when Apply is pressed', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')

    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('radio', { name: /vegan/i }))
    await userEvent.click(screen.getByRole('button', { name: /apply/i }))

    // Apply does not search directly - it changes the address, and the
    // existing effect notices.
    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenLastCalledWith('eggs', {
        diet: 'vegan',
        intolerances: null,
      }),
    )
  })

  it('shows the empty message, not an error, when a filter matches nothing', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=chicken&diet=vegetarian')

    expect(await screen.findByText('No recipes found for those ingredients.'))
      .toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // --- end of RB-173: restrictions travels tests


    // Saved-preference tests: the address is authoritative, but saved choices
  // fill in restrictions when the address does not specify any.
  it('prefills the saved diet when the address has no diet filter', async () => {
    searchRecipes.mockResolvedValue([])
    getRestrictions.mockResolvedValue({ diet: 'vegan', intolerances: '' })

    renderResults('?ingredients=eggs')

    // Wait for the saved preference to load and appear in the filter controls.
    expect(await screen.findByRole('radio', { name: /vegan/i })).toBeChecked()
  })

  it('uses the diet in the address instead of the saved diet', async () => {
    searchRecipes.mockResolvedValue([])
    getRestrictions.mockResolvedValue({ diet: 'vegan', intolerances: '' })

    renderResults('?ingredients=eggs&diet=vegetarian')

    // A link's explicit filter wins, so saved preferences should not be loaded.
    expect(screen.getByRole('radio', { name: /vegetarian/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /vegan/i })).not.toBeChecked()
    expect(getRestrictions).not.toHaveBeenCalled()
  })

  // Saving is an Apply action: changing a checkbox alone must not save.
  it('saves restrictions only when Apply is pressed', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')

    await userEvent.click(screen.getByRole('radio', { name: /vegan/i }))
    expect(saveRestrictions).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /apply/i }))
    expect(saveRestrictions).toHaveBeenCalledWith('vegan', '')
  })

  // StrictMode runs an effect, cleans it up, and runs it again in development.
  // The cancelled first request must not consume the latch needed by the second.
  it('loads saved restrictions in StrictMode after the first request is cancelled', async () => {
    searchRecipes.mockResolvedValue([])

    // Keep both requests pending so the test can resolve them after StrictMode
    // has run the effect twice.
    let resolveFirst
    let resolveSecond
    const firstRequest = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const secondRequest = new Promise((resolve) => {
      resolveSecond = resolve
    })

    getRestrictions
      .mockReturnValueOnce(firstRequest)
      .mockReturnValueOnce(secondRequest)

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/results?ingredients=eggs']}>
          <ResultsPage />
        </MemoryRouter>
      </StrictMode>,
    )

    // Two calls confirm StrictMode started both effect attempts.
    await vi.waitFor(() => {
      expect(getRestrictions).toHaveBeenCalledTimes(2)
    })

    // The first result belongs to the cancelled effect; the second is current.
    await act(async () => {
      resolveFirst({ diet: 'vegetarian', intolerances: '' })
      resolveSecond({ diet: 'vegan', intolerances: '' })
    })

    expect(await screen.findByRole('radio', { name: /vegan/i })).toBeChecked()
  })


  it('searches for the ingredients in the address', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs,milk,flour')

    expect(await screen.findByText('No recipes found for those ingredients.'))
      .toBeInTheDocument()
    expect(searchRecipes).toHaveBeenCalledWith('eggs,milk,flour', {
      diet: null,
      intolerances: null,
    })
  })

  it('shows the recipes the backend returned', async () => {
    searchRecipes.mockResolvedValue([PASTA, PARFAIT])
    renderResults()

    expect(await screen.findByText('Garlic Chicken Pasta')).toBeInTheDocument()
    expect(screen.getByText('Berry Parfait')).toBeInTheDocument()
  })

  it('no longer shows the hardcoded mockup recipes', async () => {
    searchRecipes.mockResolvedValue([PASTA])
    renderResults()
    await screen.findByText('Garlic Chicken Pasta')

    expect(screen.queryByText('Swiss Bircher Muesli')).not.toBeInTheDocument()
    expect(screen.queryByText('Veggie Omlet')).not.toBeInTheDocument()
  })

  it('says how many of your ingredients each recipe uses', async () => {
    searchRecipes.mockResolvedValue([PASTA])
    renderResults()

    expect(await screen.findByText(/uses 2 of yours, needs 3 more/)).toBeInTheDocument()
  })

  it('shows the match percentage on each card', async () => {
    searchRecipes.mockResolvedValue([PASTA])
    renderResults()

    expect(await screen.findByText(/40% match/)).toBeInTheDocument()
  })

  it('says so while it is searching', () => {
    searchRecipes.mockReturnValue(new Promise(() => {}))
    renderResults()

    expect(screen.getByText('Searching...')).toBeInTheDocument()
  })

  it('shows the backend message unchanged when the search fails', async () => {
    searchRecipes.mockRejectedValue(
      new Error('Daily recipe search limit reached. Please try again tomorrow.'),
    )
    renderResults()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Daily recipe search limit reached. Please try again tomorrow.',
    )
  })

  it('copes with a recipe that has no image', async () => {
    searchRecipes.mockResolvedValue([{ ...PASTA, imageUrl: null }])
    renderResults()

    expect(await screen.findByText('Garlic Chicken Pasta')).toBeInTheDocument()
  })

  it('carries the ingredients back to the pantry list', async () => {
    searchRecipes.mockResolvedValue([PASTA])
    renderResults('?ingredients=eggs,milk')

    const back = await screen.findByRole('link', { name: 'Back to Ingredients' })
    expect(back.getAttribute('href')).toContain('ingredients=eggs')
  })

  it('starts the star filled for a recipe already saved', async () => {
    searchRecipes.mockResolvedValue([PASTA, PARFAIT])
    getFavorites.mockResolvedValue([{ id: 716429, title: 'Garlic Chicken Pasta', imageUrl: 'x' }])

    renderResults()

    expect(await screen.findByRole('button',
      { name: 'Remove Garlic Chicken Pasta from favorites' })).toBeInTheDocument()
    expect(screen.getByRole('button',
      { name: 'Save Berry Parfait to favorites' })).toBeInTheDocument()
  })

  it('fills the star once a recipe is saved', async () => {
    searchRecipes.mockResolvedValue([PASTA])
    addFavorite.mockResolvedValue(undefined)

    renderResults()
    await userEvent.click(await screen.findByRole('button',
      { name: 'Save Garlic Chicken Pasta to favorites' }))

    expect(await screen.findByRole('button',
      { name: 'Remove Garlic Chicken Pasta from favorites' })).toBeInTheDocument()
  })

  it('makes two requests, not one per recipe', async () => {
    searchRecipes.mockResolvedValue([PASTA, PARFAIT])
    renderResults()
    await screen.findByText('Garlic Chicken Pasta')

    expect(searchRecipes).toHaveBeenCalledTimes(1)
    expect(getFavorites).toHaveBeenCalledTimes(1)
  })

  // A signed-out save may fail, but the filters should still apply to this search.
  it('still applies restrictions when saving fails', async () => {
    searchRecipes.mockResolvedValue([])
    saveRestrictions.mockRejectedValue(new Error('Please sign in.'))
    renderResults('?ingredients=eggs')

    await userEvent.click(screen.getByRole('radio', { name: /vegan/i }))
    await userEvent.click(screen.getByRole('button', { name: /apply/i }))

    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenLastCalledWith('eggs', {
        diet: 'vegan',
        intolerances: null,
      }),
    )
  })

  it('still shows recipes when favorites cannot be read', async () => {
    // A database problem must not hide the recipes. The stars just start empty.
    searchRecipes.mockResolvedValue([PASTA])
    getFavorites.mockRejectedValue(new Error('Could not reach the database.'))

    renderResults()

    expect(await screen.findByText('Garlic Chicken Pasta')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
