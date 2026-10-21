import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('searches for the ingredients in the address', async () => {
    searchRecipes.mockResolvedValue([])
    renderResults('?ingredients=eggs,milk,flour')

    expect(await screen.findByText('No recipes found for those ingredients.'))
      .toBeInTheDocument()
    expect(searchRecipes).toHaveBeenCalledWith('eggs,milk,flour')
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
