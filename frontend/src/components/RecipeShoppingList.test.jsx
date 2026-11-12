import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipeShoppingList from './RecipeShoppingList'
import { getRecipe } from '../api/recipes'

vi.mock('../api/recipes')

/** What the recipe endpoint sends: every ingredient, in OUR shape (RB-203a). */
const ALL_INGREDIENTS = [
  { name: 'carrot', line: '2 large carrots', aisle: 'Produce' },
  { name: 'garlic', line: '3 cloves of garlic (minced)', aisle: 'Produce' },
  { name: 'olive oil', line: '3 tablespoons olive oil', aisle: 'Oil, Vinegar, Salad Dressing' },
]

function renderList(props = {}) {
  return render(<RecipeShoppingList recipeId={660101} pantry="" {...props} />)
}

const toggle = () => screen.getByRole('button', { name: 'Shopping list' })

/**
 * RB-203e: a collapsible shopping list on each saved recipe.
 *
 * getRecipe is mocked, so no Spoonacular point is spent. Counting its calls
 * is how these tests pin the cost rule: fetch on expand, never on mount, and
 * never twice for the same card.
 */
describe('RecipeShoppingList', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getRecipe.mockResolvedValue({ allIngredients: ALL_INGREDIENTS })
  })

  // RED 1a: the cost rule. Ten favourites on screen must not be ten points.
  it('does not fetch anything on first render', () => {
    renderList()

    expect(getRecipe).not.toHaveBeenCalled()
    expect(screen.queryByText('3 cloves of garlic (minced)')).not.toBeInTheDocument()
  })

  // RED 1b: opening is what spends the point, and it spends exactly one.
  it('fetches the recipe once when the card is expanded', async () => {
    renderList()

    await userEvent.click(toggle())

    expect(await screen.findByText('3 cloves of garlic (minced)')).toBeInTheDocument()
    expect(getRecipe).toHaveBeenCalledTimes(1)
    expect(getRecipe).toHaveBeenCalledWith(660101)
  })

  // The "Watch out": re-opening the same card must not spend a second point.
  it('does not fetch again when the card is closed and re-opened', async () => {
    renderList()

    await userEvent.click(toggle())
    await screen.findByText('3 cloves of garlic (minced)')
    await userEvent.click(toggle()) // close
    await userEvent.click(toggle()) // re-open

    expect(await screen.findByText('3 cloves of garlic (minced)')).toBeInTheDocument()
    expect(getRecipe).toHaveBeenCalledTimes(1)
  })

  // RED 2: the pantry decides what "missing" means; the whole recipe ignores it.
  it('hides what the pantry already has in the missing view, and shows it in the whole recipe', async () => {
    renderList({ pantry: 'carrot' })

    await userEvent.click(toggle())
    await screen.findByText('3 cloves of garlic (minced)')

    // Missing view is the default: no carrot line.
    expect(screen.queryByText('2 large carrots')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Whole recipe' }))

    expect(screen.getByText('2 large carrots')).toBeInTheDocument()
    expect(screen.getByText('3 cloves of garlic (minced)')).toBeInTheDocument()
    // Switching views is just filtering what is already in state.
    expect(getRecipe).toHaveBeenCalledTimes(1)
  })

  it('says so when the pantry covers everything', async () => {
    renderList({ pantry: 'carrot, garlic, olive oil' })

    await userEvent.click(toggle())

    expect(
      await screen.findByText('You already have everything for this one.'),
    ).toBeInTheDocument()
  })

  it('uses the ingredients stored with the saved recipe and makes no call at all', async () => {
    renderList({ savedIngredients: ALL_INGREDIENTS })

    await userEvent.click(toggle())

    expect(await screen.findByText('3 cloves of garlic (minced)')).toBeInTheDocument()
    expect(getRecipe).not.toHaveBeenCalled()
  })

  it('shows the error when the fetch fails', async () => {
    getRecipe.mockRejectedValue(new Error('Could not reach the recipe service.'))
    renderList()

    await userEvent.click(toggle())

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the recipe service.')
  })
})
