import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchRecipes } from './recipes'

/**
 * RB-39: one module owns every network call.
 *
 * fetch is replaced in every test, so nothing leaves the process - no backend
 * needs to be running and no Spoonacular quota is spent.
 */
describe('searchRecipes', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ---- success -----------------------------------------------------------

  it('resolves with the recipe array the backend sent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 716433, title: 'Sunny Fruit Parfait', imageUrl: 'x', ingredientsYouHave: 1, ingredientsYouNeed: 3 },
      ],
    }))

    const recipes = await searchRecipes('apple')

    expect(recipes).toHaveLength(1)
    expect(recipes[0].title).toBe('Sunny Fruit Parfait')
  })

  it('calls the backend through a relative /api path', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchSpy)

    await searchRecipes('apple')

    const url = fetchSpy.mock.calls[0][0]
    expect(url).toBe('/api/recipes/search?ingredient=apple')
    // A full URL would bypass the Vite proxy and trigger CORS.
    expect(url).not.toContain('localhost:8080')
  })

  it('escapes an ingredient containing a space', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchSpy)

    await searchRecipes('green onion')

    expect(fetchSpy.mock.calls[0][0]).toBe('/api/recipes/search?ingredient=green%20onion')
  })

  // ---- failure -----------------------------------------------------------

  it('rejects with the message our backend sent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Daily recipe search limit reached. Please try again tomorrow.' }),
    }))

    await expect(searchRecipes('apple')).rejects.toThrow(
      'Daily recipe search limit reached. Please try again tomorrow.',
    )
  })

  it('rejects with a readable message when the backend is not running', async () => {
    // fetch itself fails - there is no response to read a message out of, so
    // this sentence has to come from us. See docs/error-shape.md.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(searchRecipes('apple')).rejects.toThrow(
      'Could not reach the recipe service. Is the backend running?',
    )
  })

  it('rejects with a readable message when the error body has no message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new SyntaxError('not json') },
    }))

    await expect(searchRecipes('apple')).rejects.toThrow(
      'Something went wrong loading recipes. Please try again.',
    )
  })

  it('never rejects with a status code or a stack trace', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ message: 'Recipe search is unavailable right now. Please try again shortly.' }),
    }))

    await expect(searchRecipes('apple')).rejects.toThrow(/^[A-Z][^{}]*\.$/)
  })
})
