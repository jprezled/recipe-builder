import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ResultsPage from './ResultsPage'
import { addFavorite, getFavorites, searchRecipes } from '../api/recipes'

vi.mock('../api/recipes')

const PASTA = {
  id: 716429, title: 'Garlic Chicken Pasta', imageUrl: 'http://img/1.jpg',
  ingredientsYouHave: 2, ingredientsYouNeed: 3, matchPercent: 40,
}
const PARFAIT = {
  id: 716433, title: 'Berry Parfait', imageUrl: 'http://img/2.jpg',
  ingredientsYouHave: 1, ingredientsYouNeed: 4, matchPercent: 20,
}

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
    vi.resetAllMocks()
    getFavorites.mockResolvedValue([])
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

    const options = within(await screen.findByLabelText('Sort by')).getAllByRole('option')
    expect(options.map((option) => option.value)).toEqual([
      'max-used-ingredients',
      'min-missing-ingredients',
    ])
  })

  it('opens on the default sort when the address has none', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')

    expect(await screen.findByLabelText('Sort by')).toHaveValue('max-used-ingredients')
  })

  it('shows the sort the address asked for', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs&sort=min-missing-ingredients')

    expect(await screen.findByLabelText('Sort by')).toHaveValue('min-missing-ingredients')
  })

  it('searches again as soon as the sort is changed, with no Apply', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs')
    await vi.waitFor(() => expect(searchRecipes).toHaveBeenCalled())

    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'min-missing-ingredients')

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

    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'max-used-ingredients')

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

    const dropdown = await screen.findByLabelText('Sort by')
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

  it('makes two requests, not one per recipe', async () => {
    searchRecipes.mockResolvedValue([PASTA, PARFAIT])
    renderResults()
    await screen.findByText('Garlic Chicken Pasta')

    expect(searchRecipes).toHaveBeenCalledTimes(1)
    expect(getFavorites).toHaveBeenCalledTimes(1)
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
