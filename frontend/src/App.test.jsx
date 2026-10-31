import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { searchRecipes } from './api/recipes'

// The pages search on mount. Stubbing the api layer keeps these tests about
// routing and navigation rather than about the network.
vi.mock('./api/recipes', () => ({
  searchRecipes: vi.fn(() => Promise.resolve([])),
  getFavorites: vi.fn(() => Promise.resolve([])),
  // The detail page loads a recipe on mount. Without this it renders its
  // error state instead, and the route test below would pass against a
  // broken page.
  getRecipe: vi.fn(() => Promise.resolve({
    id: 716429,
    title: 'Simple Garlic Pasta',
    imageUrl: 'http://img/1.jpg',
    servings: 1,
    readyInMinutes: 45,
    ingredients: [],
    steps: [],
    diets: { vegetarian: false, vegan: false, glutenFree: false, dairyFree: false },
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * The route table, wired the way main.jsx wires it.
 *
 * Nothing tested App.jsx before, which is how this app spent a sprint showing
 * one hardcoded page while every other test stayed green. These tests are what
 * notice if a page stops being reachable.
 *
 * BrowserRouter on purpose rather than MemoryRouter: that is what main.jsx
 * uses, and a mistake there produces a blank browser page that MemoryRouter
 * tests would never see.
 */
function renderAt(path) {
  window.history.pushState({}, '', path)
  return render(<BrowserRouter><App /></BrowserRouter>)
}

describe('App routes', () => {
  it('shows the home page at /', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Recipe Builder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('shows the results page at /results', () => {
    renderAt('/results')
    expect(screen.getByRole('heading', { name: 'Your Recipes' })).toBeInTheDocument()
  })

  it('shows the favorites page at /favorites', () => {
    renderAt('/favorites')
    expect(screen.getByRole('heading', { name: 'Your Favorites' })).toBeInTheDocument()
  })

  it('shows the detail page at /recipe/:id', () => {
    renderAt('/recipe/716429')
    expect(screen.getByRole('button', { name: 'Back to Recipes' })).toBeInTheDocument()
  })
})

async function add(name) {
  await userEvent.type(screen.getByLabelText('Ingredient'), name)
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
}

/**
 * The pantry list has to survive the navigation bar.
 *
 * HomePage held the list in component state only, and the nav links carry no
 * query string, so React Router unmounted the page and the list went with it.
 * Pressing Results then searched for nothing - which is what put "No recipes
 * found for those ingredients." on screen with the filters above it.
 */
describe('the pantry list survives the nav bar', () => {
  it('carries the ingredients to the Results tab', async () => {
    renderAt('/')
    await add('eggs')
    await add('milk')
    await userEvent.click(screen.getByRole('button', { name: 'Generate Recipes' }))

    // Forget the embedded search, so what follows is the Results tab's own.
    vi.clearAllMocks()

    await userEvent.click(screen.getByRole('link', { name: 'Results' }))

    await vi.waitFor(() =>
      expect(searchRecipes).toHaveBeenCalledWith('eggs,milk', expect.anything()),
    )
  })

  it('still has the pantry list after leaving the page and coming back', async () => {
    renderAt('/')
    await add('eggs')
    await add('milk')

    await userEvent.click(screen.getByRole('link', { name: 'Results' }))
    await userEvent.click(screen.getByRole('link', { name: 'Home' }))

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('still has the pantry list after opening a recipe and leaving by the nav bar', async () => {
    // Reported by hand: results -> a recipe -> Home lost the ingredients,
    // because the detail address carried none for the nav bar to pass on.
    searchRecipes.mockResolvedValue([{
      id: 660101,
      title: 'Simple Garlic Pasta',
      imageUrl: 'http://img/1.jpg',
      ingredientsYouHave: 1,
      ingredientsYouNeed: 2,
      matchPercent: 33,
    }])

    renderAt('/')
    await add('garlic')
    await userEvent.click(screen.getByRole('button', { name: 'Generate Recipes' }))

    await userEvent.click(await screen.findByRole('link', { name: 'View Recipe' }))
    await screen.findByRole('heading', { name: 'Simple Garlic Pasta' })

    await userEvent.click(screen.getByRole('link', { name: 'Home' }))

    expect(screen.getAllByRole('listitem').map((one) => one.textContent))
      .toEqual(expect.arrayContaining([expect.stringContaining('garlic')]))
  })

  it('still shows the results after leaving the page and coming back', async () => {
    renderAt('/')
    await add('eggs')
    await userEvent.click(screen.getByRole('button', { name: 'Generate Recipes' }))

    await userEvent.click(screen.getByRole('link', { name: 'Results' }))
    await userEvent.click(screen.getByRole('link', { name: 'Home' }))

    // The embedded results box is back, not just the ingredient list.
    expect(screen.getByRole('heading', { name: 'Your Recipes' })).toBeInTheDocument()
  })
})
