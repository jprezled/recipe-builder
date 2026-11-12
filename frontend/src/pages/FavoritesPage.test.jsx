import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import FavoritesPage from './FavoritesPage'
import { getFavorites, removeFavorite, searchRecipes } from '../api/recipes'
import { getSession } from '../api/accounts'
import {
  createCollection, deleteCollection, getCollections, moveRecipeToCollection,
  renameCollection,
} from '../api/collections'

vi.mock('../api/recipes')
vi.mock('../api/accounts')
vi.mock('../api/collections')

const SAVED = { id: 716429, title: 'Garlic Chicken Pasta', imageUrl: 'http://img/1.jpg' }

function renderFavorites() {
  return render(<MemoryRouter><FavoritesPage /></MemoryRouter>)
}

/**
 * Andrew's favorites page, reading from the database instead of showing two
 * hardcoded cards. His heading, tagline, empty state and grid all stay.
 */
describe('FavoritesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Signed in unless a test says otherwise - these tests are about the
    // list, not about accounts.
    getSession.mockResolvedValue({ id: 1, username: 'demo' })
    getCollections.mockResolvedValue([])
  })

  it('lists what the database returned', async () => {
    getFavorites.mockResolvedValue([SAVED])
    renderFavorites()

    expect(await screen.findByText('Garlic Chicken Pasta')).toBeInTheDocument()
  })

  it('no longer shows the hardcoded mockup recipes', async () => {
    getFavorites.mockResolvedValue([SAVED])
    renderFavorites()
    await screen.findByText('Garlic Chicken Pasta')

    expect(screen.queryByText('Swiss Bircher Muesli')).not.toBeInTheDocument()
    expect(screen.queryByText('Berry Parfait')).not.toBeInTheDocument()
  })

  it('never contacts the search endpoint', async () => {
    // The whole point of this page: everything on it came out of Postgres, so
    // it costs none of our 150 daily Spoonacular points.
    getFavorites.mockResolvedValue([SAVED])
    renderFavorites()
    await screen.findByText('Garlic Chicken Pasta')

    expect(searchRecipes).not.toHaveBeenCalled()
  })

  it('keeps Andrew’s empty state when nothing is saved', async () => {
    getFavorites.mockResolvedValue([])
    renderFavorites()

    expect(await screen.findByText('No favorites yet')).toBeInTheDocument()
  })

  it('does not show the empty state when there are favorites', async () => {
    getFavorites.mockResolvedValue([SAVED])
    renderFavorites()
    await screen.findByText('Garlic Chicken Pasta')

    expect(screen.queryByText('No favorites yet')).not.toBeInTheDocument()
  })

  it('takes a recipe off the page when it is unsaved', async () => {
    getFavorites.mockResolvedValue([SAVED])
    removeFavorite.mockResolvedValue(undefined)
    renderFavorites()

    await userEvent.click(await screen.findByRole('button',
      { name: 'Remove Garlic Chicken Pasta from favorites' }))

    expect(screen.queryByText('Garlic Chicken Pasta')).not.toBeInTheDocument()
  })

  it('brings the recipe back if removing it failed', async () => {
    // The obvious implementation deletes it from state and then has nothing to
    // restore, so the card vanishes while the recipe is still saved.
    getFavorites.mockResolvedValue([SAVED])
    removeFavorite.mockRejectedValue(new Error('Could not reach the database.'))
    renderFavorites()

    await userEvent.click(await screen.findByRole('button',
      { name: 'Remove Garlic Chicken Pasta from favorites' }))

    expect(await screen.findByText('Garlic Chicken Pasta')).toBeInTheDocument()
  })

  it('shows the backend message when the database cannot be read', async () => {
    getFavorites.mockRejectedValue(
      new Error('Could not save your favorite right now. Please try again shortly.'),
    )
    renderFavorites()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save your favorite right now. Please try again shortly.',
    )
  })

  it('copes with a saved recipe that has no image', async () => {
    getFavorites.mockResolvedValue([{ id: 1, title: 'No picture', imageUrl: null }])
    renderFavorites()

    expect(await screen.findByText('No picture')).toBeInTheDocument()
  })
})

/**
 * "We do not know who you are" and "you have saved nothing" are different
 * facts and have to look different. An empty grid asserts the second when the
 * first is true - the screen is confidently wrong and the visitor cannot tell.
 */
describe('FavoritesPage when nobody is signed in', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getCollections.mockResolvedValue([])
  })

  it('asks a signed-out visitor to sign in, with a way to do it', async () => {
    getSession.mockRejectedValue(new Error('Please sign in to save favorites.'))
    getFavorites.mockResolvedValue([])
    renderFavorites()

    expect(await screen.findByText('Please sign in to save favorites.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/signin')
  })

  it('does not show the "No favorites yet" block to a signed-out visitor', async () => {
    getSession.mockRejectedValue(new Error('Please sign in to save favorites.'))
    getFavorites.mockResolvedValue([])
    renderFavorites()

    await screen.findByText('Please sign in to save favorites.')

    // This is the whole bug being prevented: the two states must not be
    // confused for one another.
    expect(screen.queryByText('No favorites yet')).not.toBeInTheDocument()
  })

  it('does not even ask for favourites when nobody is signed in', async () => {
    getSession.mockRejectedValue(new Error('Please sign in to save favorites.'))
    renderFavorites()

    await screen.findByText('Please sign in to save favorites.')

    // A guaranteed 401 is not worth sending.
    expect(getFavorites).not.toHaveBeenCalled()
  })

  it('still shows "No favorites yet" to a signed-in visitor with nothing saved', async () => {
    getSession.mockResolvedValue({ id: 1, username: 'demo' })
    getFavorites.mockResolvedValue([])
    renderFavorites()

    expect(await screen.findByText('No favorites yet')).toBeInTheDocument()
    expect(screen.queryByText('Please sign in to save favorites.')).not.toBeInTheDocument()
  })

  // RB-205: notes ------------------------------------------------------

  it('shows a saved note on its card', async () => {
    getFavorites.mockResolvedValue([{ ...SAVED, note: 'double the garlic' }])
    renderFavorites()

    expect(await screen.findByText('double the garlic')).toBeInTheDocument()
  })

  /** The page must pass the note through, not just render the component. */
  it('offers to add a note when a saved recipe has none', async () => {
    getFavorites.mockResolvedValue([{ ...SAVED, note: null }])
    renderFavorites()

    expect(await screen.findByRole('button', { name: 'Add a note' })).toBeInTheDocument()
  })
})

/** RB-210: decks, moving, and creating, renaming and deleting collections. */
describe('FavoritesPage collections', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getSession.mockResolvedValue({ id: 1, username: 'demo' })
    getCollections.mockResolvedValue([])
  })


  const BREAKFAST = { id: 3, name: 'Breakfast' }
  const MUM = { id: 4, name: 'For my mum' }
  const PANCAKES = { id: 1001, title: 'Pancakes', imageUrl: null, collectionId: 3 }
  const CURRY = { id: 1002, title: 'Chicken Curry', imageUrl: null, collectionId: null }

  /** Shows the address, so a test can see what the page wrote into it. */
  function AddressProbe() {
    const { search } = useLocation()
    return <p data-testid="address">{search}</p>
  }

  function renderAt(address = '/favorites') {
    return render(
      <MemoryRouter initialEntries={[address]}>
        <FavoritesPage />
        <AddressProbe />
      </MemoryRouter>,
    )
  }

  it('shows collections as decks, newest first', async () => {
    getFavorites.mockResolvedValue([PANCAKES])
    getCollections.mockResolvedValue([MUM, BREAKFAST])
    renderAt()

    const toggles = await screen.findAllByRole('button', { expanded: false })
    expect(toggles[0]).toHaveTextContent('For my mum')
    expect(toggles[1]).toHaveTextContent('Breakfast')
  })

  it('a recipe in a collection is not also a loose card', async () => {
    getFavorites.mockResolvedValue([PANCAKES, CURRY])
    getCollections.mockResolvedValue([BREAKFAST])
    renderAt()

    expect(await screen.findByText('Chicken Curry')).toBeInTheDocument()
    expect(screen.queryByText('Pancakes')).not.toBeInTheDocument()
  })

  it('loose recipes sit under their own heading', async () => {
    getFavorites.mockResolvedValue([CURRY])
    getCollections.mockResolvedValue([BREAKFAST])
    renderAt()

    expect(await screen.findByRole('heading', { name: 'Not in a collection' })).toBeInTheDocument()
  })

  it('counts the recipes in each deck from the list it already has', async () => {
    getFavorites.mockResolvedValue([PANCAKES, { ...PANCAKES, id: 1003, title: 'Waffles' }])
    getCollections.mockResolvedValue([BREAKFAST, MUM])
    renderAt()

    expect(await within(await screen.findByTestId('deck-3')).findByText('2 recipes'))
      .toBeInTheDocument()
    expect(within(screen.getByTestId('deck-4')).getByText('0 recipes')).toBeInTheDocument()
  })

  it('shows the first two recipes favourited into the collection, not the newest', async () => {
    // getFavorites returns newest-saved-first, same as the backend. The last
    // entry here is the one favourited first; the cover should be stable
    // around that one rather than shuffling in whatever was just added.
    const newest = { id: 2001, title: 'Newest', imageUrl: 'newest.jpg', collectionId: 3 }
    const middle = { id: 2002, title: 'Middle', imageUrl: 'middle.jpg', collectionId: 3 }
    const oldest = { id: 2003, title: 'Oldest', imageUrl: 'oldest.jpg', collectionId: 3 }
    getFavorites.mockResolvedValue([newest, middle, oldest])
    getCollections.mockResolvedValue([BREAKFAST])
    renderAt()

    const images = await within(await screen.findByTestId('deck-3'))
      .findAllByTestId('collection-cover-image')
    expect(images.map((one) => one.getAttribute('src'))).toEqual(['oldest.jpg', 'middle.jpg'])
  })

  // Open/closed is kept in local state rather than the address, specifically
  // so that leaving the page (even a trip that round-trips the address
  // through the nav bar, e.g. Favorites -> Home -> Favorites) puts every deck
  // away again. The RB-188/RB-192 reasoning for keeping the pantry list in
  // the address does not apply here - a deck is not something you want to
  // find already open on an unrelated later visit.

  it('decks start closed, even if the address still names one from an earlier visit', async () => {
    getFavorites.mockResolvedValue([PANCAKES])
    getCollections.mockResolvedValue([BREAKFAST])
    renderAt('/favorites?open=3')

    expect(await screen.findByTestId('deck-3')).toHaveTextContent('1 recipe')
    expect(screen.queryByText('Pancakes')).not.toBeInTheDocument()
  })

  it('opening a deck does not write anything into the address', async () => {
    getFavorites.mockResolvedValue([PANCAKES])
    getCollections.mockResolvedValue([BREAKFAST])
    renderAt('/favorites?ingredients=eggs')

    await userEvent.click(await screen.findByRole('button', { name: /^Breakfast/ }))

    expect(await screen.findByText('Pancakes')).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('ingredients=eggs')
    expect(screen.getByTestId('address')).not.toHaveTextContent('open=')
  })

  it('folds the deck again on a second click', async () => {
    getFavorites.mockResolvedValue([PANCAKES])
    getCollections.mockResolvedValue([BREAKFAST])
    renderAt()

    const toggle = await screen.findByRole('button', { name: /^Breakfast/ })
    await userEvent.click(toggle)
    expect(await screen.findByText('Pancakes')).toBeInTheDocument()

    await userEvent.click(toggle)
    expect(screen.queryByText('Pancakes')).not.toBeInTheDocument()
  })

  it('leaving the favorites page and coming back closes any deck left open', async () => {
    getFavorites.mockResolvedValue([PANCAKES])
    getCollections.mockResolvedValue([BREAKFAST])
    const { unmount } = renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /^Breakfast/ }))
    expect(await screen.findByText('Pancakes')).toBeInTheDocument()

    // Leaving the page is exactly what discards local component state -
    // unmounting is the real mechanism behind "navigate away and back".
    unmount()
    renderAt()

    expect(await screen.findByTestId('deck-3')).toBeInTheDocument()
    expect(screen.queryByText('Pancakes')).not.toBeInTheDocument()
  })

  it('still shows No favorites yet when there are only empty collections', async () => {
    getFavorites.mockResolvedValue([])
    getCollections.mockResolvedValue([BREAKFAST, MUM])
    renderAt()

    expect(await screen.findByText('No favorites yet')).toBeInTheDocument()
    expect(screen.getByTestId('deck-3')).toBeInTheDocument()
  })

  it('a deck stays, reading 0 recipes, when its last recipe is unstarred', async () => {
    getFavorites.mockResolvedValue([PANCAKES])
    getCollections.mockResolvedValue([BREAKFAST])
    removeFavorite.mockResolvedValue(undefined)
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /^Breakfast/ }))
    await userEvent.click(await screen.findByRole('button',
      { name: 'Remove Pancakes from favorites' }))

    expect(screen.queryByText('Pancakes')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('deck-3')).getByText('0 recipes')).toBeInTheDocument()
  })

  it('a failed collections fetch is ignored in silence', async () => {
    getFavorites.mockResolvedValue([CURRY])
    getCollections.mockRejectedValue(new Error('nope'))
    renderAt()

    expect(await screen.findByText('Chicken Curry')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('moving a loose recipe puts its card in that deck, without a reload', async () => {
    getFavorites.mockResolvedValue([CURRY])
    getCollections.mockResolvedValue([BREAKFAST])
    moveRecipeToCollection.mockResolvedValue(undefined)
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /^Breakfast/ }))
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Move Chicken Curry to…' }), 'Breakfast')

    expect(moveRecipeToCollection).toHaveBeenCalledWith(1002, 3)
    const deck = screen.getByTestId('deck-3')
    expect(await within(deck).findByText('Chicken Curry')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Not in a collection' })).not.toBeInTheDocument()
  })

  it('a failed move says why and leaves the card where it was', async () => {
    getFavorites.mockResolvedValue([CURRY])
    getCollections.mockResolvedValue([BREAKFAST])
    moveRecipeToCollection.mockRejectedValue(new Error('That collection could not be found.'))
    renderAt()

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Move Chicken Curry to…' }), 'Breakfast')

    expect(await screen.findByRole('alert')).toHaveTextContent('That collection could not be found.')
    expect(screen.getByRole('heading', { name: 'Not in a collection' })).toBeInTheDocument()
    expect(screen.getByText('Chicken Curry')).toBeInTheDocument()
  })

  it('dropping a card on a deck runs the same move', async () => {
    getFavorites.mockResolvedValue([CURRY])
    getCollections.mockResolvedValue([BREAKFAST])
    moveRecipeToCollection.mockResolvedValue(undefined)
    renderAt()

    // jsdom cannot perform a drag. A plain drop event with a stubbed
    // dataTransfer is as far as it goes, so this proves the wiring and the
    // arguments, not that a real mouse drag works.
    fireEvent.drop(await screen.findByTestId('deck-3'), {
      dataTransfer: { getData: () => '1002' },
    })

    expect(moveRecipeToCollection).toHaveBeenCalledWith(1002, 3)
  })

  it('creating a collection adds a deck', async () => {
    getFavorites.mockResolvedValue([CURRY])
    createCollection.mockResolvedValue({ id: 9, name: 'Weeknight' })
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: 'Create a collection' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'New collection name' }), 'Weeknight')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(createCollection).toHaveBeenCalledWith('Weeknight')
    expect(await screen.findByTestId('deck-9')).toBeInTheDocument()
  })

  it('a refused name shows the server message and creates no deck', async () => {
    getFavorites.mockResolvedValue([CURRY])
    createCollection.mockRejectedValue(new Error('Please give the collection a name.'))
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: 'Create a collection' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please give the collection a name.')
  })

  it('renaming updates the deck', async () => {
    getFavorites.mockResolvedValue([])
    getCollections.mockResolvedValue([BREAKFAST])
    renameCollection.mockResolvedValue(undefined)
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: 'Rename Breakfast' }))
    const field = screen.getByRole('textbox', { name: 'Collection name' })
    await userEvent.clear(field)
    await userEvent.type(field, 'Brunch')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(renameCollection).toHaveBeenCalledWith(3, 'Brunch')
    expect(await screen.findByRole('button', { name: /^Brunch/ })).toBeInTheDocument()
  })

  it('deleting an open collection moves its recipes to the loose section', async () => {
    getFavorites.mockResolvedValue([PANCAKES])
    getCollections.mockResolvedValue([BREAKFAST, MUM])
    deleteCollection.mockResolvedValue(undefined)
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /^Breakfast/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Breakfast' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    expect(deleteCollection).toHaveBeenCalledWith(3)
    expect(screen.queryByTestId('deck-3')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Not in a collection' })).toBeInTheDocument()
    expect(screen.getByText('Pancakes')).toBeInTheDocument()
  })

})
