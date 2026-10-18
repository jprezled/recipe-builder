import { afterEach, describe, expect, it, vi } from 'vitest'
import { addFavorite, getFavorites, removeFavorite } from './recipes'

/**
 * The favorites half of our one network module.
 *
 * fetch is replaced in every test, so nothing leaves the process - no backend
 * and no database need to be running.
 */
describe('favorites api', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the saved recipes from a relative /api path', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 716429, title: 'Pasta', imageUrl: 'http://img/1.jpg' }],
    })
    vi.stubGlobal('fetch', fetchSpy)

    const saved = await getFavorites()

    expect(fetchSpy.mock.calls[0][0]).toBe('/api/favorites')
    expect(saved).toHaveLength(1)
  })

  it('sends the whole recipe when saving, not just the id', async () => {
    // If only the id were sent, the backend would have to ask Spoonacular for
    // the title - one of our 150 daily points spent per favorite.
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchSpy)

    await addFavorite({
      id: 716429, title: 'Pasta', imageUrl: 'http://img/1.jpg',
      ingredientsYouHave: 2, ingredientsYouNeed: 3,
    })

    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/favorites')
    expect(options.method).toBe('POST')
    // Only the three fields the backend stores - not the search-only counts.
    expect(JSON.parse(options.body))
      .toEqual({ id: 716429, title: 'Pasta', imageUrl: 'http://img/1.jpg' })
  })

  it('deletes by spoonacular id', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchSpy)

    await removeFavorite(716429)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/favorites/716429')
    expect(options.method).toBe('DELETE')
  })

  it('rejects with the message the backend sent when saving fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: 'Could not save your favorite right now. Please try again shortly.',
      }),
    }))

    await expect(addFavorite({ id: 1, title: 'x', imageUrl: null })).rejects.toThrow(
      'Could not save your favorite right now. Please try again shortly.',
    )
  })

  it('rejects readably when the backend is not running', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(getFavorites()).rejects.toThrow(
      'Could not reach the recipe service. Is the backend running?',
    )
  })

  it('never leaks a status code or a stack trace', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 503,
      json: async () => { throw new SyntaxError('not json') },
    }))

    await expect(getFavorites()).rejects.toThrow(
      'Something went wrong loading recipes. Please try again.',
    )
  })
})
