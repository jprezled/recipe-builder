import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import RecipeDetailPage from './RecipeDetailPage'
import { addFavorite, getFavorites, getRecipe } from '../api/recipes'
import { getCollections } from '../api/collections'

vi.mock('../api/recipes')
vi.mock('../api/collections')

/** A recipe in OUR shape, as docs/recipe-detail-contract.md fixes it. */
const RECIPE = {
  id: 660101,
  title: 'Simple Garlic Pasta',
  imageUrl: 'https://img.spoonacular.com/recipes/660101-556x370.jpg',
  servings: 1,
  readyInMinutes: 45,
  ingredients: [
    '2 whole dried chili pepper',
    '3 cloves of garlic (minced)',
    '3 tablespoons olive oil',
  ],
  steps: [
    'Start with boiling water in a large pot.',
    'While you are boiling, mince the garlic',
  ],
  diets: { vegetarian: true, vegan: true, glutenFree: false, dairyFree: true },
  
  nutrition: {
    calories: 591,
    fat: 13.42,
    saturatedFat: 5.23,
    carbohydrates: 69.02,
    sugar: 2.54,
    protein: 18.1,
  },  
}

/** Stands in for the results page, and reports what the address still holds. */
function ResultsProbe() {
  const { search } = useLocation()
  return <p>results for {new URLSearchParams(search).get('ingredients')}</p>
}

function renderDetail(id = '660101') {
  return render(
    <MemoryRouter initialEntries={['/recipe/' + id]}>
      <Routes>
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/**
 * RB-178: Andrew's detail page shows the recipe in the address.
 *
 * His heading, image, description slot, button group and two sections are
 * unchanged - only their contents come from the backend now.
 */
describe('RecipeDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getRecipe.mockResolvedValue(RECIPE)
    getFavorites.mockResolvedValue([])
    getCollections.mockResolvedValue([])
  })

  it('offers the cook their collections when saving (RB-210)', async () => {
    getCollections.mockResolvedValue([{ id: 3, name: 'Breakfast' }])
    addFavorite.mockResolvedValue(undefined)
    renderDetail()

    await userEvent.click(await screen.findByRole('button',
      { name: 'Save Simple Garlic Pasta to favorites' }))
    await userEvent.click(screen.getByRole('button', { name: 'Breakfast' }))

    expect(addFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 660101 }), 3)
  })

  it('still saves when the collections cannot be read (RB-210)', async () => {
    getCollections.mockRejectedValue(new Error('Please sign in to save favorites.'))
    addFavorite.mockResolvedValue(undefined)
    renderDetail()

    await userEvent.click(await screen.findByRole('button',
      { name: 'Save Simple Garlic Pasta to favorites' }))

    expect(addFavorite).toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('asks for the recipe named in the address', async () => {
    renderDetail('660101')

    await screen.findByText('Simple Garlic Pasta')
    expect(getRecipe).toHaveBeenCalledWith('660101')
  })

  it('shows the recipe title and image', async () => {
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Simple Garlic Pasta' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Simple Garlic Pasta' })).toHaveAttribute(
      'src',
      RECIPE.imageUrl,
    )
  })

  it('fills the description slot from the numbers in the same response', async () => {
    // Spoonacular has no prose we can use - see the contract's note on why
    // their "summary" is not rendered.
    renderDetail()

    expect(await screen.findByText(/Serves 1/)).toBeInTheDocument()
    expect(screen.getByText(/45 minutes/)).toBeInTheDocument()
  })

  it('lists the real ingredients', async () => {
    renderDetail()

    expect(await screen.findByText('3 cloves of garlic (minced)')).toBeInTheDocument()
    expect(screen.getByText('3 tablespoons olive oil')).toBeInTheDocument()
  })

  it('lists the real steps', async () => {
    renderDetail()

    expect(await screen.findByText('Start with boiling water in a large pot.')).toBeInTheDocument()
    expect(screen.getByText('While you are boiling, mince the garlic')).toBeInTheDocument()
  })

  it('no longer shows the hardcoded mockup recipe', async () => {
    renderDetail()
    await screen.findByText('Simple Garlic Pasta')

    expect(screen.queryByText('Swiss Bircher Muesli')).not.toBeInTheDocument()
    expect(screen.queryByText('1 cup rolled oats')).not.toBeInTheDocument()
  })

  it('says so when the recipe has no steps, rather than showing nothing', async () => {
    // A recipe with no steps came back successfully. This is not an error.
    getRecipe.mockResolvedValue({ ...RECIPE, steps: [] })
    renderDetail()

    expect(
      await screen.findByText('No instructions were provided for this recipe.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says so when the recipe has no ingredients', async () => {
    getRecipe.mockResolvedValue({ ...RECIPE, ingredients: [] })
    renderDetail()

    expect(
      await screen.findByText('No ingredients were listed for this recipe.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the sentence the backend sent when the recipe cannot be loaded', async () => {
    getRecipe.mockRejectedValue(new Error('That recipe link is not valid.'))
    renderDetail('0')

    expect(await screen.findByRole('alert')).toHaveTextContent('That recipe link is not valid.')
  })

  it('still has the Save button', async () => {
    renderDetail()

    expect(
      await screen.findByRole('button', { name: 'Save Simple Garlic Pasta to favorites' }),
    ).toBeInTheDocument()
  })

  it('keeps Andrew wide worded Save button, not the cards star', async () => {
    // His design for this page. The star belongs on the result cards, where
    // space is tight; here the control is wide and says what it does.
    renderDetail()

    const save = await screen.findByRole('button', { name: 'Save Simple Garlic Pasta to favorites' })
    expect(save).toHaveTextContent('Save to Favorites')
    expect(save).not.toHaveTextContent('☆')
  })

  it('reads Remove from Favorites once the recipe is saved', async () => {
    getFavorites.mockResolvedValue([{ id: 660101, title: 'Simple Garlic Pasta', imageUrl: 'x' }])
    renderDetail()

    const save = await screen.findByRole('button', { name: 'Remove Simple Garlic Pasta from favorites' })
    expect(save).toHaveTextContent('Remove from Favorites')
  })

  it('opens the Save button already saved when the recipe is a favorite', async () => {
    getFavorites.mockResolvedValue([{ id: 660101, title: 'Simple Garlic Pasta', imageUrl: 'x' }])
    renderDetail()

    expect(
      await screen.findByRole('button', { name: 'Remove Simple Garlic Pasta from favorites' }),
    ).toBeInTheDocument()
  })

  it('renders a repeated ingredient line without a duplicate-key warning', async () => {
    // Spoonacular can list the same phrase twice. Using the line itself as the
    // React key makes those two entries collide.
    const warnings = []
    const realError = console.error
    console.error = (...args) => warnings.push(String(args[0]))

    try {
      getRecipe.mockResolvedValue({
        ...RECIPE,
        ingredients: ['3 tablespoons olive oil', '2 cloves garlic', '3 tablespoons olive oil'],
      })
      renderDetail()

      await screen.findByText('2 cloves garlic')
      expect(screen.getAllByText('3 tablespoons olive oil')).toHaveLength(2)
      expect(warnings.filter((one) => one.includes('same key'))).toEqual([])
    } finally {
      console.error = realError
    }
  })

  it('shows a readable sentence when the failure carries no message', async () => {
    // An empty message must not render an empty alert box - a visible error
    // with no words in it is the silent failure RB-188 was made of.
    getRecipe.mockRejectedValue(new Error(''))
    renderDetail()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load recipes. Please try again.',
    )
  })

  it('shows a badge for each diet the recipe suits', async () => {
    // The fixture is vegetarian, vegan and dairy free, but not gluten free.
    renderDetail()

    expect(await screen.findByText('Vegetarian')).toBeInTheDocument()
    expect(screen.getByText('Vegan')).toBeInTheDocument()
    expect(screen.getByText('Dairy free')).toBeInTheDocument()
    expect(screen.queryByText('Gluten free')).not.toBeInTheDocument()
  })

  it('shows no badges for a recipe that suits none of them', async () => {
    getRecipe.mockResolvedValue({
      ...RECIPE,
      diets: { vegetarian: false, vegan: false, glutenFree: false, dairyFree: false },
    })
    renderDetail()

    await screen.findByText('Simple Garlic Pasta')
    expect(screen.queryByText('Vegetarian')).not.toBeInTheDocument()
    expect(screen.queryByText('Vegan')).not.toBeInTheDocument()
    expect(screen.queryByText('Gluten free')).not.toBeInTheDocument()
    expect(screen.queryByText('Dairy free')).not.toBeInTheDocument()
  })

  it('Back to Recipes returns to the results with the ingredients intact', async () => {
    // RB-179's Done criterion: pantry -> results -> a recipe -> back, without
    // losing the ingredients or the filter.
    render(
      <MemoryRouter initialEntries={['/results?ingredients=eggs,milk', '/recipe/660101']} initialIndex={1}>
        <Routes>
          <Route path="/results" element={<ResultsProbe />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Simple Garlic Pasta')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Recipes' }))

    expect(await screen.findByText('results for eggs,milk')).toBeInTheDocument()
  })

  it('still shows the recipe when the favorites lookup fails', async () => {
    // A database problem must not stop the recipe appearing.
    getFavorites.mockRejectedValue(new Error('Could not reach the recipe service.'))
    renderDetail()

    expect(await screen.findByText('Simple Garlic Pasta')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('starts with nutrition closed', async () => {
    renderDetail()

    const button = await screen.findByRole('button', {
      name: 'Nutrition Facts',
    })

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'nutrition-facts')
    expect(
      screen.queryByRole('heading', { name: 'Nutrition Facts' }),
    ).not.toBeInTheDocument()
  })

  it('opens nutrition and shows all six values per serving', async () => {
    const user = userEvent.setup()
    renderDetail()

    const button = await screen.findByRole('button', {
      name: 'Nutrition Facts',
    })
    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('heading', { name: 'Nutrition Facts' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Per serving')).toBeInTheDocument()
    expect(screen.getByText('591 kcal')).toBeInTheDocument()
    expect(screen.getByText('13.42g')).toBeInTheDocument()
    expect(screen.getByText('5.23g')).toBeInTheDocument()
    expect(screen.getByText('69.02g')).toBeInTheDocument()
    expect(screen.getByText('2.54g')).toBeInTheDocument()
    expect(screen.getByText('18.1g')).toBeInTheDocument()

    expect(getRecipe).toHaveBeenCalledTimes(1)
  })

  it('closes nutrition on a second click', async () => {
    const user = userEvent.setup()
    renderDetail()

    const button = await screen.findByRole('button', {
      name: 'Nutrition Facts',
    })
    await user.click(button)
    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('heading', { name: 'Nutrition Facts' }),
    ).not.toBeInTheDocument()
  })

  it('shows no nutrition button when nutrition is missing', async () => {
    getRecipe.mockResolvedValue({ ...RECIPE, nutrition: null })
    renderDetail()

    await screen.findByRole('heading', { name: 'Simple Garlic Pasta' })

    expect(
      screen.queryByRole('button', { name: 'Nutrition Facts' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })  
})
