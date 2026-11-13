import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoveToCollection from './MoveToCollection'

const COLLECTIONS = [
  { id: 3, name: 'Breakfast' },
  { id: 4, name: 'For my mum' },
]

function renderMove(props = {}) {
  return render(
    <MoveToCollection
      recipeId={716429}
      recipeTitle="Pancakes"
      collections={COLLECTIONS}
      currentCollectionId={null}
      onMove={() => {}}
      {...props}
    />,
  )
}

describe('MoveToCollection', () => {
  it('is labelled with the recipe it moves', () => {
    renderMove()
    expect(screen.getByRole('combobox', { name: 'Move Pancakes to…' })).toBeInTheDocument()
  })

  it('lists every collection, and not "Not in a collection" for a loose recipe', () => {
    renderMove()

    const options = screen.getAllByRole('option').map((one) => one.textContent)
    expect(options).toEqual(['Move to…', 'Breakfast', 'For my mum'])
  })

  it('omits the collection the recipe is already in, and offers a way out', () => {
    renderMove({ currentCollectionId: 3 })

    const options = screen.getAllByRole('option').map((one) => one.textContent)
    expect(options).toEqual(['Move to…', 'For my mum', 'Not in a collection'])
  })

  it('choosing one reports the recipe and the collection', async () => {
    const onMove = vi.fn()
    renderMove({ onMove })

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Breakfast')

    expect(onMove).toHaveBeenCalledWith(716429, 3)
  })

  it('choosing Not in a collection reports null', async () => {
    const onMove = vi.fn()
    renderMove({ currentCollectionId: 3, onMove })

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Not in a collection')

    expect(onMove).toHaveBeenCalledWith(716429, null)
  })

  it('renders nothing when there is nowhere to move to', () => {
    renderMove({ collections: [], currentCollectionId: null })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
