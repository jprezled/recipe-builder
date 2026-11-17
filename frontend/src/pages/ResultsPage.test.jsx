import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import ResultsPage from './ResultsPage'
import { addFavorite, getFavorites, searchRecipes } from '../api/recipes'
import { StrictMode } from 'react'
import { getRestrictions, saveRestrictions } from '../api/accounts'
import { getCollections } from '../api/collections'

// Replace the duplicate recipes mock lines with these mocks.
// These prevent tests from making real network requests.
vi.mock('../api/recipes')
vi.mock('../api/accounts')
vi.mock('../api/collections')

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

/** Reports the address, so a test can check what a control wrote into it. */
function AddressProbe() {
  return <p data-testid="address">{useLocation().search}</p>
}

function renderResultsWithAddress(query = '?ingredients=eggs') {
  return render(
    <MemoryRouter initialEntries={['/results' + query]}>
      <ResultsPage />
      <AddressProbe />
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
    getCollections.mockResolvedValue([])
  })

  // ---- RB-173: the restrictions travel in the address --------------------

  it('sends the restrictions from the address to the search', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs&diet=vegetarian&intolerances=dairy,peanut')

    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenCalledWith('eggs', {
        diet: 'vegetarian',
        intolerances: 'dairy,peanut',
        sort: null,
      }),
    )
  })

  it('searches again with the new choices when Find recipes is pressed', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')

    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('radio', { name: /vegan/i }))
    await userEvent.click(screen.getByRole('button', { name: /find recipes/i }))

    // Find recipes copies the on-screen choices into `applied`, which is
    // what the search effect watches.
    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenLastCalledWith('eggs', {
        diet: 'vegan',
        intolerances: null,
        sort: null,
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

    renderResultsWithAddress('?ingredients=eggs')

    // The saved preference lands in the address rather than remounting the
    // filter controls - a remount on every raw change is exactly what would
    // wipe an in-progress tick, so the controls are kept keyed on `applied`.
    await vi.waitFor(() =>
      expect(screen.getByTestId('address')).toHaveTextContent('diet=vegan'),
    )
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
  it('saves restrictions only when Find recipes is pressed', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')

    await userEvent.click(screen.getByRole('radio', { name: /vegan/i }))
    expect(saveRestrictions).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /find recipes/i }))
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
          <AddressProbe />
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

    await vi.waitFor(() =>
      expect(screen.getByTestId('address')).toHaveTextContent('diet=vegan'),
    )
  })

  // ---- RB-226: the sort travels in the address ----------------------------

  it('sends the sort from the address to the search', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs&sort=min-missing-ingredients')

    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenCalledWith('eggs', {
        diet: null,
        intolerances: null,
        sort: 'min-missing-ingredients',
      }),
    )
  })

  it('keeps the sort when going back to the ingredients', async () => {
    searchRecipes.mockResolvedValue([PASTA])
    renderResults('?ingredients=eggs&sort=min-missing-ingredients')

    const back = await screen.findByRole('link', { name: 'Back to Ingredients' })
    expect(back.getAttribute('href')).toContain('sort=min-missing-ingredients')
  })

  // --- end of RB-226

  // ---- RB-227: the sort dropdown ------------------------------------------

  it('offers both sort options', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')

    const options = within(await screen.findByLabelText('Show me')).getAllByRole('option')
    expect(options.map((option) => option.value)).toEqual([
      'max-used-ingredients',
      'min-missing-ingredients',
    ])
  })

  it('opens on the default sort when the address has none', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')

    expect(await screen.findByLabelText('Show me')).toHaveValue('max-used-ingredients')
  })

  it('shows the sort the address asked for', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs&sort=min-missing-ingredients')

    expect(await screen.findByLabelText('Show me')).toHaveValue('min-missing-ingredients')
  })

  it('searches again as soon as the sort is changed, with no Apply', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalled())

    await userEvent.selectOptions(screen.getByLabelText('Show me'), 'min-missing-ingredients')

    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenLastCalledWith('eggs', {
        diet: null,
        intolerances: null,
        sort: 'min-missing-ingredients',
      }),
    )
  })

  it('drops the sort from the address when the default is chosen again', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs&sort=min-missing-ingredients')
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalled())

    await userEvent.selectOptions(screen.getByLabelText('Show me'), 'max-used-ingredients')

    // null, not 'max-used-ingredients': the default is written as no
    // parameter at all, so a plain search keeps its old address.
    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenLastCalledWith('eggs', {
        diet: null,
        intolerances: null,
        sort: null,
      }),
    )
  })

  it('ties a real label to the dropdown', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')

    const dropdown = await screen.findByLabelText('Show me')
    expect(dropdown.tagName).toBe('SELECT')
  })

  // --- end of RB-227

  it('searches for the ingredients in the address', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs,milk,flour')

    expect(await screen.findByText('No recipes found for those ingredients.'))
      .toBeInTheDocument()
    expect(searchRecipes).toHaveBeenCalledWith('eggs,milk,flour', {
      diet: null,
      intolerances: null,
      sort: null,
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

  // ---- RB-210: collections -------------------------------------------------

  it('asks which collection when the cook has some', async () => {
    searchRecipes.mockResolvedValue([PASTA])
    getCollections.mockResolvedValue([{ id: 3, name: 'Breakfast' }])
    addFavorite.mockResolvedValue(undefined)

    renderResults()
    await userEvent.click(await screen.findByRole('button',
      { name: 'Save Garlic Chicken Pasta to favorites' }))
    expect(addFavorite).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Breakfast' }))

    expect(addFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 716429 }), 3)
  })

  it('fetches the collections once, not once per card', async () => {
    searchRecipes.mockResolvedValue([PASTA, PARFAIT])
    renderResults()
    await screen.findByText('Garlic Chicken Pasta')

    expect(getCollections).toHaveBeenCalledTimes(1)
  })

  it('stays silent and keeps saving when signed out (collections refused)', async () => {
    searchRecipes.mockResolvedValue([PASTA])
    getCollections.mockRejectedValue(new Error('Please sign in to save favorites.'))
    addFavorite.mockResolvedValue(undefined)

    renderResults()
    await userEvent.click(await screen.findByRole('button',
      { name: 'Save Garlic Chicken Pasta to favorites' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(addFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 716429 }))
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
    await userEvent.click(screen.getByRole('button', { name: /find recipes/i }))

    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenLastCalledWith('eggs', {
        diet: 'vegan',
        intolerances: null,
        sort: null,
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

  // ---- RB-211: set-then-search - ticking and editing cost nothing until
  // Find recipes is pressed. This is the point of the story: without this,
  // every tick or every added ingredient was its own paid Spoonacular call.

  it('does not search when a box is ticked', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('radio', { name: /vegan/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /dairy/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /peanut/i }))

    expect(searchRecipes).toHaveBeenCalledTimes(1)
  })

  it('remembers a tick in the address so the nav bar cannot lose it, without searching', async () => {
    searchRecipes.mockResolvedValue([])
    renderResultsWithAddress('?ingredients=eggs')
    await screen.findByRole('button', { name: /find recipes/i })

    await userEvent.click(screen.getByRole('radio', { name: /vegan/i }))

    await vi.waitFor(() =>
      expect(screen.getByTestId('address')).toHaveTextContent('diet=vegan'),
    )
    expect(searchRecipes).toHaveBeenCalledTimes(1)
  })

  it('adds an ingredient without searching', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalledTimes(1))

    await userEvent.type(screen.getByLabelText('Ingredients'), 'milk')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(searchRecipes).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Remove milk' })).toBeInTheDocument()
  })

  it('removes an ingredient without searching', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs,milk')
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('button', { name: 'Remove milk' }))

    expect(searchRecipes).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Remove milk' })).not.toBeInTheDocument()
  })

  it('ignores an ingredient that is already on the list', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')
    await screen.findByLabelText('Ingredients')

    await userEvent.type(screen.getByLabelText('Ingredients'), 'Eggs')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(1)
  })

  it('has no ingredient entry when embedded, because the home page owns the list', () => {
    searchRecipes.mockResolvedValue([])
    render(
      <MemoryRouter initialEntries={['/?ingredients=eggs']}>
        <ResultsPage embedded ingredients="eggs" />
      </MemoryRouter>,
    )

    expect(screen.queryByLabelText('Ingredients')).not.toBeInTheDocument()
  })

  it('searches once with the whole new list and ticks together when Find recipes is pressed', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalledTimes(1))

    await userEvent.type(screen.getByLabelText('Ingredients'), 'milk')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    await userEvent.click(screen.getByRole('radio', { name: /vegan/i }))
    // The filter form's own button is the only one - it applies the
    // ingredients and the ticks together.
    await userEvent.click(screen.getByRole('button', { name: /find recipes/i }))

    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalledTimes(2))
    expect(searchRecipes).toHaveBeenLastCalledWith('eggs,milk', {
      diet: 'vegan',
      intolerances: null,
      sort: null,
    })
  })

  it('says nothing until the page differs from the results on screen', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalledTimes(1))

    expect(screen.queryByText(/have changed/i)).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Ingredients'), 'milk')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText(/ingredients have changed/i)).toBeInTheDocument()
  })

  it('prompts for a tick as well as an ingredient, and names which changed', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('radio', { name: /vegan/i }))
    expect(screen.getByText(/filters have changed/i)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Ingredients'), 'milk')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText(/ingredients and filters have changed/i)).toBeInTheDocument()

    // Pressing it clears the prompt, because the results now match the page.
    await userEvent.click(screen.getByRole('button', { name: /find recipes/i }))
    await vi.waitFor(() =>
      expect(screen.queryByText(/have changed/i)).not.toBeInTheDocument())
  })

  // ---- RB-209: the applied-filters message --------------------------------

  it('says nothing when no filters are on', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')
    await screen.findByLabelText('Show me')

    expect(screen.queryByText(/Filters applied/)).not.toBeInTheDocument()
  })

  it('confirms the filters once Find recipes is pressed', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')

    await screen.findByRole('button', { name: /find recipes/i })
    await userEvent.click(screen.getByRole('radio', { name: 'Vegan' }))
    await userEvent.click(screen.getByRole('button', { name: /find recipes/i }))

    // Scoped to the status message: "Vegan" is also the radio's own label.
    expect(await screen.findByRole('status', { name: '' }))
    expect(screen.getByText('Filters applied:')).toBeInTheDocument()
  })

  it('names the allergies as well as the diet', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs&diet=vegetarian&intolerances=dairy,peanut')

    expect(await screen.findByText('Vegetarian · no dairy · no peanut'))
      .toBeInTheDocument()
  })
})
