import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createCollection,
  deleteCollection,
  getCollections,
  moveRecipeToCollection,
  renameCollection,
} from './collections'

/** RB-210: every collection call. fetch is stubbed, so nothing leaves the process. */
describe('collections api', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(body = {}) {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => body })
    vi.stubGlobal('fetch', spy)
    return spy
  }

  it('asks a relative /api/collections address', async () => {
    const spy = stubFetch([{ id: 3, name: 'Breakfast' }])

    const found = await getCollections()

    expect(spy.mock.calls[0][0]).toBe('/api/collections')
    expect(found).toEqual([{ id: 3, name: 'Breakfast' }])
  })

  it('posts the name to create one and returns the created collection', async () => {
    const spy = stubFetch({ id: 3, name: 'Breakfast' })

    const created = await createCollection('Breakfast')

    const [url, options] = spy.mock.calls[0]
    expect(url).toBe('/api/collections')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ name: 'Breakfast' })
    expect(created).toEqual({ id: 3, name: 'Breakfast' })
  })

  it('throws the sentence the server sent when a name is refused', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'You already have a collection with that name.' }),
    }))

    await expect(createCollection('Breakfast')).rejects.toThrow(
      'You already have a collection with that name.',
    )
  })

  it('puts the new name to the id address to rename', async () => {
    const spy = stubFetch()

    await renameCollection(3, 'Brunch')

    const [url, options] = spy.mock.calls[0]
    expect(url).toBe('/api/collections/3')
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ name: 'Brunch' })
  })

  it('deletes the id address', async () => {
    const spy = stubFetch()

    await deleteCollection(3)

    const [url, options] = spy.mock.calls[0]
    expect(url).toBe('/api/collections/3')
    expect(options.method).toBe('DELETE')
  })

  it('puts the collection id to move a recipe', async () => {
    const spy = stubFetch()

    await moveRecipeToCollection(716429, 3)

    const [url, options] = spy.mock.calls[0]
    expect(url).toBe('/api/favorites/716429/collection')
    expect(options.method).toBe('PUT')
    expect(options.body).toBe('3')
  })

  it('sends an empty body to make a recipe loose', async () => {
    const spy = stubFetch()

    await moveRecipeToCollection(716429, null)

    expect(spy.mock.calls[0][1].body).toBe('')
  })

  it('reads as a displayable error when the backend is not running', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(getCollections()).rejects.toThrow(
      'Could not reach the recipe service. Is the backend running?',
    )
  })
})
