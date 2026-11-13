import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CollectionPicker from './CollectionPicker'

const COLLECTIONS = [
  { id: 3, name: 'Breakfast' },
  { id: 4, name: 'For my mum' },
]

describe('CollectionPicker', () => {
  it('shows Favorites first, then every collection', () => {
    render(<CollectionPicker collections={COLLECTIONS} onChoose={() => {}} />)

    const names = screen.getAllByRole('button').map((one) => one.textContent)
    expect(names).toEqual(['Favorites (no collection)', 'Breakfast', 'For my mum'])
  })

  it('reports the id of the collection chosen', async () => {
    const onChoose = vi.fn()
    render(<CollectionPicker collections={COLLECTIONS} onChoose={onChoose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Breakfast' }))

    expect(onChoose).toHaveBeenCalledWith(3)
  })

  it('reports null when plain Favorites is chosen', async () => {
    const onChoose = vi.fn()
    render(<CollectionPicker collections={COLLECTIONS} onChoose={onChoose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Favorites (no collection)' }))

    expect(onChoose).toHaveBeenCalledWith(null)
  })

  it('can be reached and chosen from the keyboard', async () => {
    const onChoose = vi.fn()
    render(<CollectionPicker collections={COLLECTIONS} onChoose={onChoose} />)

    await userEvent.tab()
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    expect(onChoose).toHaveBeenCalledWith(3)
  })
})
