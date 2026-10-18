import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IngredientSearch from './IngredientSearch'
import { searchRecipes } from './api/recipes'

/**
 * RB-40: render the returned titles.
 *
 * The api module is replaced entirely, so the component receives recipes or an
 * Error with no HTTP involved at all. No backend needs to be running and no
 * API key is used - this is the component-level half of the frontend testing
 * subtask.
 */
vi.mock('./api/recipes')

/** Types an ingredient and presses Search. */
async function search(term) {
  await userEvent.type(screen.getByLabelText('Ingredient'), term)
  await userEvent.click(screen.getByRole('button', { name: 'Search' }))
}

const PARFAIT = {
  id: 716433,
  title: 'Easiest Breakfast Ever: Sunny Fruit Parfait',
  imageUrl: 'https://img.spoonacular.com/recipes/716433-312x231.jpg',
  ingredientsYouHave: 1,
  ingredientsYouNeed: 3,
}

const MUESLI = {
  id: 662665,
  title: 'Swiss Bircher Muesli',
  imageUrl: 'https://img.spoonacular.com/recipes/662665-312x231.jpg',
  ingredientsYouHave: 1,
  ingredientsYouNeed: 3,
}

describe('IngredientSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the title of every recipe returned', async () => {
    searchRecipes.mockResolvedValue([PARFAIT, MUESLI])

    render(<IngredientSearch />)
    await search('apple')

    expect(await screen.findByText(PARFAIT.title)).toBeInTheDocument()
    expect(screen.getByText(MUESLI.title)).toBeInTheDocument()
  })

  it('shows how many ingredients you have and need', async () => {
    searchRecipes.mockResolvedValue([PARFAIT])

    render(<IngredientSearch />)
    await search('apple')

    expect(await screen.findByText(/uses 1 of your ingredients/i)).toBeInTheDocument()
    expect(screen.getByText(/needs 3 more/i)).toBeInTheDocument()
  })

  it('passes the ingredient the user typed to the api module', async () => {
    searchRecipes.mockResolvedValue([])

    render(<IngredientSearch />)
    await search('tomato')

    expect(searchRecipes).toHaveBeenCalledWith('tomato')
  })

  it('tells the user when nothing matched, rather than showing a blank screen', async () => {
    searchRecipes.mockResolvedValue([])

    render(<IngredientSearch />)
    await search('unobtanium')

    expect(await screen.findByText(/no recipes found/i)).toBeInTheDocument()
  })

  it('displays the error message exactly as given, without reinterpreting it', async () => {
    searchRecipes.mockRejectedValue(
      new Error('Daily recipe search limit reached. Please try again tomorrow.'),
    )

    render(<IngredientSearch />)
    await search('apple')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Daily recipe search limit reached. Please try again tomorrow.')
  })

  it('shows no results and no error before the first search', () => {
    render(<IngredientSearch />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/no recipes found/i)).not.toBeInTheDocument()
  })

  it('clears a previous error when a later search succeeds', async () => {
    searchRecipes.mockRejectedValueOnce(new Error('Something went wrong loading recipes. Please try again.'))

    render(<IngredientSearch />)
    await search('apple')
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    searchRecipes.mockResolvedValueOnce([PARFAIT])
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText(PARFAIT.title)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
