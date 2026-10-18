import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import FavoritesPage from './FavoritesPage'
import { getFavorites, removeFavorite, searchRecipes } from '../api/recipes'

vi.mock('../api/recipes')

const SAVED = { id: 716429, title: 'Garlic Chicken Pasta', imageUrl: 'http://img/1.jpg' }

function renderFavorites() {
  return render(<MemoryRouter><FavoritesPage /></MemoryRouter>)
}

/**
 * Andrew's favorites page, reading from the database instead of showing two
 * hardcoded cards. His heading, tagline, empty state and grid all stay.
 */
describe('FavoritesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lists what the database returned', async () => {
    getFavorites.mockResolvedValue([SAVED])
    renderFavorites()

    expect(await screen.findByText('Garlic Chicken Pasta')).toBeInTheDocument()
  })

  it('no longer shows the hardcoded mockup recipes', async () => {
    getFavorites.mockResolvedValue([SAVED])
    renderFavorites()
    await screen.findByText('Garlic Chicken Pasta')

    expect(screen.queryByText('Swiss Bircher Muesli')).not.toBeInTheDocument()
    expect(screen.queryByText('Berry Parfait')).not.toBeInTheDocument()
  })

  it('never contacts the search endpoint', async () => {
    // The whole point of this page: everything on it came out of Postgres, so
    // it costs none of our 150 daily Spoonacular points.
    getFavorites.mockResolvedValue([SAVED])
    renderFavorites()
    await screen.findByText('Garlic Chicken Pasta')

    expect(searchRecipes).not.toHaveBeenCalled()
  })

  it('keeps Andrew’s empty state when nothing is saved', async () => {
    getFavorites.mockResolvedValue([])
    renderFavorites()

    expect(await screen.findByText('No favorites yet')).toBeInTheDocument()
  })

  it('does not show the empty state when there are favorites', async () => {
    getFavorites.mockResolvedValue([SAVED])
    renderFavorites()
    await screen.findByText('Garlic Chicken Pasta')

    expect(screen.queryByText('No favorites yet')).not.toBeInTheDocument()
  })

  it('takes a recipe off the page when it is unsaved', async () => {
    getFavorites.mockResolvedValue([SAVED])
    removeFavorite.mockResolvedValue(undefined)
    renderFavorites()

    await userEvent.click(await screen.findByRole('button',
      { name: 'Remove Garlic Chicken Pasta from favorites' }))

    expect(screen.queryByText('Garlic Chicken Pasta')).not.toBeInTheDocument()
  })

  it('brings the recipe back if removing it failed', async () => {
    // The obvious implementation deletes it from state and then has nothing to
    // restore, so the card vanishes while the recipe is still saved.
    getFavorites.mockResolvedValue([SAVED])
    removeFavorite.mockRejectedValue(new Error('Could not reach the database.'))
    renderFavorites()

    await userEvent.click(await screen.findByRole('button',
      { name: 'Remove Garlic Chicken Pasta from favorites' }))

    expect(await screen.findByText('Garlic Chicken Pasta')).toBeInTheDocument()
  })

  it('shows the backend message when the database cannot be read', async () => {
    getFavorites.mockRejectedValue(
      new Error('Could not save your favorite right now. Please try again shortly.'),
    )
    renderFavorites()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save your favorite right now. Please try again shortly.',
    )
  })

  it('copes with a saved recipe that has no image', async () => {
    getFavorites.mockResolvedValue([{ id: 1, title: 'No picture', imageUrl: null }])
    renderFavorites()

    expect(await screen.findByText('No picture')).toBeInTheDocument()
  })
})
