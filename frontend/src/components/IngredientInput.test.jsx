import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import IngredientInput from './IngredientInput'
import { suggestIngredients } from '../api/recipes'

vi.mock('../api/recipes', () => ({
  suggestIngredients: vi.fn(),
}))

beforeEach(() => {
  vi.useFakeTimers()
  suggestIngredients.mockReset()
  suggestIngredients.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

function renderInput() {
  const onAdd = vi.fn()

  render(
    <IngredientInput
      id="ingredient"
      label="Ingredient"
      placeholder="Type an ingredient"
      onAdd={onAdd}
    />,
  )

  return {
    input: screen.getByRole('combobox', { name: 'Ingredient' }),
    onAdd,
  }
}

function typeText(input, text) {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: text } })
}

async function advanceTime(milliseconds = 300) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

describe('IngredientInput', () => {
  it('shows local matches without requesting backend suggestions', async () => {
    const { input } = renderInput()

    typeText(input, 'tom')

    expect(screen.getByRole('option', { name: 'tomato' }))
      .toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'tomato paste' }))
      .toBeInTheDocument()

    await advanceTime(1000)

    expect(suggestIngredients).not.toHaveBeenCalled()
  })

  it('places prefix matches before substring matches', () => {
    const { input } = renderInput()

    typeText(input, 'on')

    const names = screen.getAllByRole('option').map(
      (option) => option.textContent,
    )

    expect(names[0]).toBe('onion')
    expect(names.indexOf('onion')).toBeLessThan(names.indexOf('bacon'))
    expect(suggestIngredients).not.toHaveBeenCalled()
  })

  it('waits 300ms after the latest change before requesting suggestions', async () => {
    suggestIngredients.mockResolvedValue([
      { name: 'yuzu', imageUrl: null },
    ])

    const { input } = renderInput()

    typeText(input, 'yu')
    await advanceTime(200)

    typeText(input, 'yuz')
    await advanceTime(299)

    expect(suggestIngredients).not.toHaveBeenCalled()

    await advanceTime(1)

    expect(suggestIngredients).toHaveBeenCalledExactlyOnceWith('yuz')
    expect(screen.getByRole('option', { name: 'yuzu' }))
      .toBeInTheDocument()
  })

  it('does not request suggestions for one character or blank input', async () => {
    const { input } = renderInput()

    typeText(input, 'z')
    await advanceTime(1000)

    typeText(input, '   ')
    await advanceTime(1000)

    expect(suggestIngredients).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('adds exactly the typed text when Enter has no highlighted option', () => {
    const { input, onAdd } = renderInput()

    typeText(input, 'tom')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onAdd).toHaveBeenCalledExactlyOnceWith('tom')
    expect(input).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(suggestIngredients).not.toHaveBeenCalled()
  })

  it('lets Add use the typed text even when an option is highlighted', () => {
    const { input, onAdd } = renderInput()

    typeText(input, 'tom')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledExactlyOnceWith('tom')
  })

  it('supports ArrowDown, ArrowUp, and Enter to select a suggestion', () => {
    const { input, onAdd } = renderInput()

    typeText(input, 'tom')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: 'tomato' }))
      .toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: 'tomato paste' }))
      .toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onAdd).toHaveBeenCalledExactlyOnceWith('tomato')
  })

  it('adds a clicked suggestion', () => {
    const { input, onAdd } = renderInput()

    typeText(input, 'tom')
    fireEvent.click(screen.getByRole('option', { name: 'tomato paste' }))

    expect(onAdd).toHaveBeenCalledExactlyOnceWith('tomato paste')
    expect(input).toHaveValue('')
  })

  it('silently handles a failed lookup and still allows manual entry', async () => {
    suggestIngredients.mockRejectedValue(new Error('Service unavailable'))

    const { input, onAdd } = renderInput()

    typeText(input, 'yuz')
    await advanceTime()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledExactlyOnceWith('yuz')
  })

  it('clears old local suggestions while waiting for the fallback', async () => {
    const { input } = renderInput()

    typeText(input, 'y')
    expect(screen.getByRole('option', { name: 'yogurt' }))
      .toBeInTheDocument()

    typeText(input, 'yuz')

    expect(screen.queryByRole('option', { name: 'yogurt' }))
      .not.toBeInTheDocument()

    await advanceTime()

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('keeps the dropdown closed after Escape while a lookup is pending', async () => {
    let finishLookup

    suggestIngredients.mockImplementation(
      () => new Promise((resolve) => {
        finishLookup = resolve
      }),
    )

    const { input } = renderInput()

    typeText(input, 'yuz')
    await advanceTime()

    fireEvent.keyDown(input, { key: 'Escape' })

    await act(async () => {
      finishLookup([{ name: 'yuzu', imageUrl: null }])
    })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('reuses a previous fallback result without requesting it again', async () => {
    suggestIngredients.mockResolvedValue([
      { name: 'yuzu', imageUrl: null },
    ])

    const { input } = renderInput()

    typeText(input, 'yuz')
    await advanceTime()

    typeText(input, 'tom')
    typeText(input, ' YUZ ')
    await advanceTime()

    expect(suggestIngredients).toHaveBeenCalledExactlyOnceWith('yuz')
    expect(screen.getByRole('option', { name: 'yuzu' }))
      .toBeInTheDocument()
  })
})