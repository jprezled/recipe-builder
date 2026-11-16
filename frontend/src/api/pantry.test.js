import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPantry, savePantry } from './accounts'

/**
 * RB-208: the saved pantry calls, as docs/saved-pantry-contract.md fixes
 * them - plain text both ways, no id in the address.
 */
describe('the saved pantry api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the pantry as plain text', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('eggs,milk') }),
    )

    expect(await getPantry()).toBe('eggs,milk')

    const [address, options] = global.fetch.mock.calls[0]
    expect(address).toBe('/api/pantry')
    expect(options.method).toBe('GET')
  })

  it('sends the list as the body, not wrapped in JSON', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))

    await savePantry('eggs,milk')

    const [address, options] = global.fetch.mock.calls[0]
    expect(address).toBe('/api/pantry')
    expect(options.method).toBe('PUT')
    expect(options.headers['Content-Type']).toBe('text/plain')
    // The body IS the list. A JSON wrapper would be a 415 from the server.
    expect(options.body).toBe('eggs,milk')
  })

  it('asks for no id in the address, so another cook cannot be named', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('') }))

    await getPantry()

    expect(global.fetch.mock.calls[0][0]).not.toMatch(/users|\d/)
  })

  it('passes the signed-out message through rather than swallowing it', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Please sign in to save favorites.' }),
      }),
    )

    await expect(getPantry()).rejects.toThrow('Please sign in to save favorites.')
  })
})
