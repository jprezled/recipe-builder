import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import RecipeDetailPage from './RecipeDetailPage'
import { getFavorites, getRecipe } from '../api/recipes'

vi.mock('../api/recipes')

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
  allIngredients: [
    { name: 'dried chili pepper', line: '2 whole dried chili pepper', aisle: 'Produce' },
    { name: 'garlic', line: '3 cloves of garlic (minced)', aisle: 'Produce' },
    { name: 'olive oil', line: '3 tablespoons olive oil', aisle: 'Oil, Vinegar, Salad Dressing' },
  ],
}

/** Stands in for the results page, and reports what the address still holds. */
function ResultsProbe() {
  const { search } = useLocation()
  return <p>results for {new URLSearchParams(search).get('ingredients')}</p>
}

function renderDetail(id = '660101', query = '') {
  return render(
    <MemoryRouter initialEntries={['/recipe/' + id + query]}>
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
    describe('shopping list', () => {
    /** The list under one category heading, so a line is checked in its group. */
    function groupUnder(category) {
      return within(screen.getByRole('heading', { name: category }).parentElement)
    }

    const openPanel = async () => {
      await screen.findByText('Simple Garlic Pasta')
      await userEvent.click(screen.getByRole('button', { name: /shopping list/i }))
    }

    // 1. Not on screen until the button is pressed. queryBy, not getBy:
    //    getBy throws when nothing is there, so it cannot assert absence.
    it('keeps the panel off screen until the button is pressed', async () => {
      renderDetail()
      await screen.findByText('Simple Garlic Pasta')

      expect(screen.queryByRole('heading', { name: /shopping list/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Produce' })).not.toBeInTheDocument()
    })

    // 2. Opens, and a line appears under its category heading.
    it('opens the panel and shows an ingredient under its category heading', async () => {
      renderDetail()
      await openPanel()

      expect(screen.getByRole('heading', { name: /shopping list/i })).toBeInTheDocument()
      expect(
        groupUnder('Oil, Vinegar, Salad Dressing').getByText('3 tablespoons olive oil'),
      ).toBeInTheDocument()
    })

    // 3. Ingredients sharing a category share one heading.
    it('puts ingredients with the same category under one heading', async () => {
      renderDetail()
      await openPanel()

      expect(screen.getAllByRole('heading', { name: 'Produce' })).toHaveLength(1)
      const produce = groupUnder('Produce')
      expect(produce.getByText('3 cloves of garlic (minced)')).toBeInTheDocument()
      expect(produce.getByText('2 whole dried chili pepper')).toBeInTheDocument()
      expect(produce.queryByText('3 tablespoons olive oil')).not.toBeInTheDocument()
    })

    // 4. The pantry in the address is ignored: every ingredient is listed.
    it('ignores the pantry in the address and lists every ingredient', async () => {
      getRecipe.mockResolvedValue({
        ...RECIPE,
        ingredients: ['2 eggs', '1 cup milk', '1 cup flour'],
        allIngredients: [
          { name: 'eggs', line: '2 eggs', aisle: 'Milk, Eggs, Other Dairy' },
          { name: 'milk', line: '1 cup milk', aisle: 'Milk, Eggs, Other Dairy' },
          { name: 'flour', line: '1 cup flour', aisle: 'Baking' },
        ],
      })
      renderDetail('660101', '?ingredients=eggs,milk')
      await openPanel()

      const dairy = groupUnder('Milk, Eggs, Other Dairy')
      expect(dairy.getByText('2 eggs')).toBeInTheDocument()
      expect(dairy.getByText('1 cup milk')).toBeInTheDocument()
      expect(groupUnder('Baking').getByText('1 cup flour')).toBeInTheDocument()
    })

    // 5. Nothing to open, so no button.
    it('has no Shopping list button when the recipe lists no ingredients', async () => {
      getRecipe.mockResolvedValue({ ...RECIPE, ingredients: [], allIngredients: [] })
      renderDetail()
      await screen.findByText('Simple Garlic Pasta')

      expect(screen.queryByRole('button', { name: /shopping list/i })).not.toBeInTheDocument()
    })

    // 6. Toggles shut again, and tells assistive tech which state it is in.
    it('closes again when the button is pressed a second time', async () => {
      renderDetail()
      await openPanel()
      const button = screen.getByRole('button', { name: /shopping list/i })
      expect(button).toHaveAttribute('aria-expanded', 'true')

      await userEvent.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('heading', { name: /shopping list/i })).not.toBeInTheDocument()
    })

    // 7. Why it is a Map: a free-text category named "constructor" must work.
    it('groups correctly when a category is named like an inherited property', async () => {
      getRecipe.mockResolvedValue({
        ...RECIPE,
        allIngredients: [
          { name: 'salt', line: '1 pinch of salt', aisle: 'constructor' },
          { name: 'pepper', line: '1 pinch of pepper', aisle: 'constructor' },
        ],
      })
      renderDetail()
      await openPanel()

      const group = groupUnder('constructor')
      expect(group.getByText('1 pinch of salt')).toBeInTheDocument()
      expect(group.getByText('1 pinch of pepper')).toBeInTheDocument()
    })
  })
})
