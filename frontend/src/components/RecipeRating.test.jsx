import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import RecipeRating from './RecipeRating'

describe('RecipeRating', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows No rating when a recipe has no ratings yet', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ average: 0, count: 0, yourRating: null }),
    })

    render(<RecipeRating recipeId={716429} />)

    expect(await screen.findByText('No rating')).toBeInTheDocument()
  })

  it('shows average, count, and user rating, then submits an updated star rating', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ average: 4.0, count: 2, yourRating: 4 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ average: 4.5, count: 2, yourRating: 5 }),
      })

    render(<RecipeRating recipeId={716429} />)

    expect(await screen.findByText('4.0 ★ (2 ratings)')).toBeInTheDocument()
    expect(screen.getByText('Your rating: 4 ★')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('button', { name: '5 stars' }))

    await waitFor(() => {
      expect(screen.getByText('4.5 ★ (2 ratings)')).toBeInTheDocument()
      expect(screen.getByText('Your rating: 5 ★')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/recipes/716429/rating',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ rating: 5 }),
      }),
    )
  })

  it('shows the sign-in notice when submitting while signed out returns 401', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ average: 0, count: 0, yourRating: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Please sign in to save favorites.' }),
      })

    render(<RecipeRating recipeId={716429} />)

    expect(await screen.findByText('No rating')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('button', { name: '3 stars' }))

    expect(await screen.findByText('Please sign in to rate recipes.')).toBeInTheDocument()
  })
})
