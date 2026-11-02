import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import FavoritesPage from './FavoritesPage'
import { getFavorites, removeFavorite, searchRecipes } from '../api/recipes'
import { getSession } from '../api/accounts'

vi.mock('../api/recipes')
vi.mock('../api/accounts')

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
    // Signed in unless a test says otherwise - these tests are about the
    // list, not about accounts.
    getSession.mockResolvedValue({ id: 1, username: 'demo' })
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

/**
 * "We do not know who you are" and "you have saved nothing" are different
 * facts and have to look different. An empty grid asserts the second when the
 * first is true - the screen is confidently wrong and the visitor cannot tell.
 */
describe('FavoritesPage when nobody is signed in', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('asks a signed-out visitor to sign in, with a way to do it', async () => {
    getSession.mockRejectedValue(new Error('Please sign in to save favorites.'))
    getFavorites.mockResolvedValue([])
    renderFavorites()

    expect(await screen.findByText('Please sign in to save favorites.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/signin')
  })

  it('does not show the "No favorites yet" block to a signed-out visitor', async () => {
    getSession.mockRejectedValue(new Error('Please sign in to save favorites.'))
    getFavorites.mockResolvedValue([])
    renderFavorites()

    await screen.findByText('Please sign in to save favorites.')

    // This is the whole bug being prevented: the two states must not be
    // confused for one another.
    expect(screen.queryByText('No favorites yet')).not.toBeInTheDocument()
  })

  it('does not even ask for favourites when nobody is signed in', async () => {
    getSession.mockRejectedValue(new Error('Please sign in to save favorites.'))
    renderFavorites()

    await screen.findByText('Please sign in to save favorites.')

    // A guaranteed 401 is not worth sending.
    expect(getFavorites).not.toHaveBeenCalled()
  })

  it('still shows "No favorites yet" to a signed-in visitor with nothing saved', async () => {
    getSession.mockResolvedValue({ id: 1, username: 'demo' })
    getFavorites.mockResolvedValue([])
    renderFavorites()

    expect(await screen.findByText('No favorites yet')).toBeInTheDocument()
    expect(screen.queryByText('Please sign in to save favorites.')).not.toBeInTheDocument()
  })
})
