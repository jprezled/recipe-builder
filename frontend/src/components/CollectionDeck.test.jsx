import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import CollectionDeck from './CollectionDeck'

const BREAKFAST = { id: 3, name: 'Breakfast' }

function renderDeck(props = {}) {
  return render(
    <CollectionDeck
      collection={BREAKFAST}
      recipeCount={4}
      isOpen={false}
      onToggle={() => {}}
      onRename={async () => {}}
      onDelete={async () => {}}
      onDropRecipe={() => {}}
      {...props}
    >
      <p>inside the deck</p>
    </CollectionDeck>,
  )
}

describe('CollectionDeck', () => {
  it('shows its name and its count', () => {
    renderDeck()

    const deck = screen.getByRole('button', { name: /^Breakfast/ })
    expect(deck).toHaveTextContent('Breakfast')
    expect(deck).toHaveTextContent('4 recipes')
  })

  it('reads one recipe, singular', () => {
    renderDeck({ recipeCount: 1 })
    expect(screen.getByRole('button', { name: /^Breakfast/ })).toHaveTextContent('1 recipe')
    expect(screen.getByRole('button', { name: /^Breakfast/ })).not.toHaveTextContent('1 recipes')
  })

  it('an empty collection reads 0 recipes', () => {
    renderDeck({ recipeCount: 0 })
    expect(screen.getByRole('button', { name: /^Breakfast/ })).toHaveTextContent('0 recipes')
  })

  it('reports clicks and says whether it is expanded', async () => {
    const onToggle = vi.fn()
    const { rerender } = renderDeck({ onToggle })
    const deck = screen.getByRole('button', { name: /^Breakfast/ })
    expect(deck).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(deck)
    expect(onToggle).toHaveBeenCalledWith(3)

    rerender(<CollectionDeck collection={BREAKFAST} recipeCount={4} isOpen={true}
                             onToggle={onToggle} onRename={async () => {}}
                             onDelete={async () => {}} />)
    expect(screen.getByRole('button', { name: /^Breakfast/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('only renders its recipes when open', () => {
    const { rerender } = renderDeck()
    expect(screen.queryByText('inside the deck')).not.toBeInTheDocument()

    rerender(<CollectionDeck collection={BREAKFAST} recipeCount={4} isOpen={true}
                             onToggle={() => {}} onRename={async () => {}}
                             onDelete={async () => {}}><p>inside the deck</p></CollectionDeck>)
    expect(screen.getByText('inside the deck')).toBeInTheDocument()
  })

  // RB-210 follow-up: the card shows the first two recipes' photos as its
  // cover, side by side, with the name and count overlaid on top. Four
  // looked cluttered at card width; two reads cleanly.

  it('shows up to two recipe images as a cover', () => {
    renderDeck({ coverImages: ['a.jpg', 'b.jpg'] })

    const images = screen.getAllByTestId('collection-cover-image')
    expect(images).toHaveLength(2)
    expect(images.map((one) => one.getAttribute('src'))).toEqual(['a.jpg', 'b.jpg'])
  })

  it('shows only the first two when the collection has more', () => {
    renderDeck({ coverImages: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'] })

    const images = screen.getAllByTestId('collection-cover-image')
    expect(images).toHaveLength(2)
    expect(images.map((one) => one.getAttribute('src'))).toEqual(['a.jpg', 'b.jpg'])
  })

  it('fills the rest of the cover with a blank when there is only one recipe', () => {
    renderDeck({ coverImages: ['a.jpg'] })

    expect(screen.getAllByTestId('collection-cover-image')).toHaveLength(1)
    expect(screen.getAllByTestId('collection-cover-blank')).toHaveLength(1)
  })

  it('shows two blanks and no images for an empty collection', () => {
    renderDeck({ coverImages: [] })

    expect(screen.queryAllByTestId('collection-cover-image')).toHaveLength(0)
    expect(screen.getAllByTestId('collection-cover-blank')).toHaveLength(2)
  })

  it('treats a recipe with no image of its own as a blank slot, not a skip', () => {
    renderDeck({ coverImages: [null, 'b.jpg'] })

    const images = screen.getAllByTestId('collection-cover-image')
    expect(images.map((one) => one.getAttribute('src'))).toEqual(['b.jpg'])
    expect(screen.getAllByTestId('collection-cover-blank')).toHaveLength(1)
  })

  it('rename shows a field holding the current name', async () => {
    renderDeck()

    await userEvent.click(screen.getByRole('button', { name: 'Rename Breakfast' }))

    expect(screen.getByRole('textbox', { name: 'Collection name' })).toHaveValue('Breakfast')
  })

  it('saving a rename reports the new name and closes the field', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined)
    renderDeck({ onRename })

    await userEvent.click(screen.getByRole('button', { name: 'Rename Breakfast' }))
    const field = screen.getByRole('textbox', { name: 'Collection name' })
    await userEvent.clear(field)
    await userEvent.type(field, 'Brunch')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(onRename).toHaveBeenCalledWith(3, 'Brunch')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('a refused rename shows the server message and keeps the field open', async () => {
    const onRename = vi.fn().mockRejectedValue(
      new Error('You already have a collection with that name.'))
    renderDeck({ onRename })

    await userEvent.click(screen.getByRole('button', { name: 'Rename Breakfast' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('You already have a collection with that name.')
    expect(screen.getByRole('textbox', { name: 'Collection name' })).toHaveValue('Breakfast')
  })

  it('delete asks first, on the page, and deletes nothing yet', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    renderDeck({ onDelete })

    await userEvent.click(screen.getByRole('button', { name: 'Delete Breakfast' }))

    expect(screen.getByText(/recipes stay in your favorites/i)).toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('confirming deletes it', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    renderDeck({ onDelete })

    await userEvent.click(screen.getByRole('button', { name: 'Delete Breakfast' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    expect(onDelete).toHaveBeenCalledWith(3)
  })

  it('cancelling the confirmation deletes nothing', async () => {
    const onDelete = vi.fn()
    renderDeck({ onDelete })

    await userEvent.click(screen.getByRole('button', { name: 'Delete Breakfast' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByText(/recipes stay in your favorites/i)).not.toBeInTheDocument()
  })

  it('reports a recipe dropped on it', () => {
    const onDropRecipe = vi.fn()
    renderDeck({ onDropRecipe })

    fireEvent.drop(screen.getByTestId('deck-3'), {
      dataTransfer: { getData: () => '716429' },
    })

    expect(onDropRecipe).toHaveBeenCalledWith(716429, 3)
  })
})
