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

  // RB-210: collections ---------------------------------------------------

  const COLLECTIONS = [{ id: 3, name: 'Breakfast' }]

  it('with no collections, the star saves immediately', async () => {
    addFavorite.mockResolvedValue(undefined)

    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={() => {}}
                           collections={[]} />)
    await userEvent.click(screen.getByRole('button'))

    expect(addFavorite).toHaveBeenCalledWith(A_RECIPE)
    expect(screen.queryByRole('button', { name: 'Breakfast' })).not.toBeInTheDocument()
  })

  it('with collections, the star opens the picker and saves nothing yet', async () => {
    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={() => {}}
                           collections={COLLECTIONS} />)
    const star = screen.getByRole('button', { name: 'Save Garlic Chicken Pasta to favorites' })
    expect(star).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(star)

    expect(star).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Breakfast' })).toBeInTheDocument()
    expect(addFavorite).not.toHaveBeenCalled()
  })

  it('choosing a collection saves into it', async () => {
    addFavorite.mockResolvedValue(undefined)
    const onChange = vi.fn()

    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={onChange}
                           collections={COLLECTIONS} />)
    await userEvent.click(screen.getByRole('button', { name: /Save Garlic/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Breakfast' }))

    expect(addFavorite).toHaveBeenCalledWith(A_RECIPE, 3)
    expect(onChange).toHaveBeenCalledWith(716429, true)
  })

  it('choosing plain Favorites saves with no collection', async () => {
    addFavorite.mockResolvedValue(undefined)

    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={() => {}}
                           collections={COLLECTIONS} />)
    await userEvent.click(screen.getByRole('button', { name: /Save Garlic/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Favorites (no collection)' }))

    expect(addFavorite).toHaveBeenCalledWith(A_RECIPE)
  })

  it('keeps its aria-label and aria-pressed with the picker open', async () => {
    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={() => {}}
                           collections={COLLECTIONS} />)
    await userEvent.click(screen.getByRole('button', { name: /Save Garlic/ }))

    const star = screen.getByRole('button', { name: 'Save Garlic Chicken Pasta to favorites' })
    expect(star).toHaveAttribute('aria-pressed', 'false')
  })

  it('an already saved star removes, and shows no picker', async () => {
    removeFavorite.mockResolvedValue(undefined)

    render(<FavoriteButton recipe={A_RECIPE} isFavorite={true} onChange={() => {}}
                           collections={COLLECTIONS} />)
    await userEvent.click(screen.getByRole('button'))

    expect(removeFavorite).toHaveBeenCalledWith(716429)
    expect(screen.queryByRole('button', { name: 'Breakfast' })).not.toBeInTheDocument()
  })

  it('a failed collections fetch leaves the star working with no error', async () => {
    addFavorite.mockResolvedValue(undefined)

    // The page passes nothing after a 401, so the button never hears of it.
    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button'))

    expect(addFavorite).toHaveBeenCalledWith(A_RECIPE)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a failed save closes the picker and says why', async () => {
    addFavorite.mockRejectedValue(new Error('Could not save your favorite right now.'))
    const onChange = vi.fn()

    render(<FavoriteButton recipe={A_RECIPE} isFavorite={false} onChange={onChange}
                           collections={COLLECTIONS} />)
    await userEvent.click(screen.getByRole('button', { name: /Save Garlic/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Breakfast' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your favorite')
    expect(onChange).toHaveBeenLastCalledWith(716429, false)
  })
})
