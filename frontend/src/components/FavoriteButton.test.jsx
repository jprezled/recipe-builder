import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FavoriteButton from './FavoriteButton'
import { addFavorite, removeFavorite } from '../api/recipes'

vi.mock('../api/recipes')

const A_RECIPE = { id: 716429, title: 'Garlic Chicken Pasta', imageUrl: 'http://img/1.jpg' }

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('is findable by its accessible name, not by its glyph', () => {
    // The frontend team can restyle this freely. The accessible name is the
    // contract that has to survive it - a bare star tells a screen reader
    // nothing, and it is also how these tests find the control.
    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Save Garlic Chicken Pasta to favorites' }))
      .toBeInTheDocument()
  })

  it('tells assistive software whether it is currently on', () => {
    render(<FavoriteButton recipe={A_RECIPE} isFavorite={true} onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('saves the recipe when an empty star is tapped', async () => {
    addFavorite.mockResolvedValue(undefined)
    const onChange = vi.fn()

    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))

    expect(addFavorite).toHaveBeenCalledWith(A_RECIPE)
    expect(onChange).toHaveBeenCalledWith(716429, true)
  })

  it('removes the recipe when a filled star is tapped', async () => {
    removeFavorite.mockResolvedValue(undefined)
    const onChange = vi.fn()

    render(<FavoriteButton recipe={A_RECIPE} isFavorite={true} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))

    expect(removeFavorite).toHaveBeenCalledWith(716429)
    expect(onChange).toHaveBeenCalledWith(716429, false)
  })

  it('changes before the request finishes', async () => {
    // A control that waits for a round trip feels broken even when it works.
    let finish
    addFavorite.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const onChange = vi.fn()

    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))

    expect(onChange).toHaveBeenCalledWith(716429, true)
    finish()
  })

  it('puts it back and explains when saving fails', async () => {
    addFavorite.mockRejectedValue(
      new Error('Could not save your favorite right now. Please try again shortly.'),
    )
    const onChange = vi.fn()

    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))

    // Optimistic change, then the undo - it must never claim something was
    // saved when it was not.
    expect(onChange).toHaveBeenNthCalledWith(1, 716429, true)
    expect(onChange).toHaveBeenNthCalledWith(2, 716429, false)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save your favorite right now. Please try again shortly.',
    )
  })

  it('renders as Andrew’s wide text button when asked to', () => {
    render(
      <FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={() => {}} variant="text" />,
    )

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Save to Favorites')
    expect(button).toHaveClass('button')
  })
})
