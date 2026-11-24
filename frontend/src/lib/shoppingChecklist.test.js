import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getChecked, setChecked } from './shoppingChecklist'

// RB-317: the one place both shopping lists keep their checks.
// docs/shopping-checklist-contract.md.

describe('shoppingChecklist', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('gives an empty set when nothing is stored for the recipe', () => {
    const checked = getChecked(660101)

    expect(checked).toBeInstanceOf(Set)
    expect(checked.size).toBe(0)
  })

  it('gives an empty set when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage is disabled')
    })

    const checked = getChecked(660101)

    expect(checked).toBeInstanceOf(Set)
    expect(checked.size).toBe(0)
  })

  it('never throws from setChecked, even when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is disabled')
    })

    expect(() => setChecked(660101, new Set(['3 cloves of garlic (minced)']))).not.toThrow()
  })

  it('gives back what was stored, for that recipe only', () => {
    setChecked(660101, new Set(['3 cloves of garlic (minced)']))

    expect(getChecked(660101)).toEqual(new Set(['3 cloves of garlic (minced)']))
    expect(getChecked(715538).size).toBe(0)
  })
})