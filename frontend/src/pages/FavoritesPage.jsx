import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getFavorites } from '../api/recipes'
import { getSession } from '../api/accounts'
import {
  createCollection, deleteCollection, getCollections, moveRecipeToCollection,
  renameCollection,
} from '../api/collections'
import CollectionDeck from '../components/CollectionDeck'
import MoveToCollection from '../components/MoveToCollection'
import RecipeCard from '../components/RecipeCard'
import RecipeNote from '../components/RecipeNote'

/**
 * The recipes you have saved.
 *
 * Andrew's page - his heading, his tagline, his empty state and his grid -
 * reading from the database instead of showing two hardcoded cards. His
 * "No favorites yet" block was the nicest thing in the mockup and is kept
 * exactly; it is now shown only when there is genuinely nothing saved.
 *
 * This page has NO path to Spoonacular. Everything on it came out of Postgres,
 * which is what makes it the proof that the database works: close the app, come
 * back tomorrow, and whatever is here could not have come from anywhere else.
 */
export default function FavoritesPage() {
  // Favorites does not use the pantry list, but it has to hand it back: the
  // list lives in the address, so a bare "/" on the way out loses it.
  const { search } = useLocation()

  // RB-210: which decks are unfolded. Local state rather than the address -
  // unlike the pantry list, a deck left open is not something a cook wants
  // waiting for them on some later, unrelated visit. Leaving the page (even a
  // round trip through the nav bar) should put every deck away again, and
  // local state does that for free: it does not survive past the component
  // that held it.
  const [openIds, setOpenIds] = useState([])

  const [favorites, setFavorites] = useState([])
  const [collections, setCollections] = useState([])
  const [pageMessage, setPageMessage] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  // Three states, not two. null means "we have not asked yet", which is what
  // keeps the page from flashing the sign-in prompt at somebody who is in fact
  // signed in.
  const [isSignedIn, setIsSignedIn] = useState(null)

  // Which cards are hidden because they were just unsaved.
  //
  // Kept SEPARATELY from the list rather than deleted out of it. The control
  // changes the moment it is tapped, before the request finishes - so if that
  // request fails we have to put the card back, and we can only do that if we
  // never threw the recipe away.
  const [hiddenIds, setHiddenIds] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let stillOnThisPage = true

    async function load() {
      setIsLoading(true)
      setErrorMessage('')

      // Asked EXPLICITLY, rather than inferred from a failed getFavorites().
      // Reading the reason out of an error message works right up until
      // somebody rewords the sentence, and then it fails silently.
      try {
        await getSession()
        if (!stillOnThisPage) {
          return
        }
        setIsSignedIn(true)
      } catch {
        if (stillOnThisPage) {
          setIsSignedIn(false)
          setIsLoading(false)
        }
        // A guaranteed 401 is not worth sending.
        return
      }

      // RB-210: ignored in silence on failure. A page without collections is
      // the page this was before, and nothing here is worth an error.
      try {
        const found = await getCollections()
        if (stillOnThisPage) {
          setCollections(found)
        }
      } catch {
        // Deliberately empty.
      }

      try {
        const saved = await getFavorites()
        if (stillOnThisPage) {
          setFavorites(saved)
        }
      } catch (failure) {
        if (stillOnThisPage) {
          setErrorMessage(failure.message)
          setFavorites([])
        }
      } finally {
        if (stillOnThisPage) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => { stillOnThisPage = false }
  }, [])

  /**
   * On this page, unsaving something means it no longer belongs here - so it
   * disappears rather than sitting there with an empty star.
   *
   * If the removal fails, FavoriteButton calls this again with true and the
   * card reappears.
   */
  function handleFavoriteChange(id, isNowFavorite) {
    setHiddenIds((current) => {
      if (isNowFavorite) {
        // The removal failed and was undone - show it again.
        return current.filter((one) => one !== id)
      }
      return current.includes(id) ? current : current.concat(id)
    })
  }

  const shown = favorites.filter((one) => !hiddenIds.includes(one.id))

  // Grouping is done here, from the list we already have. A recipe naming a
  // collection we do not know about is treated as loose, so it can never
  // vanish from the page.
  const collectionIds = collections.map((one) => one.id)
  const looseRecipes = shown.filter((one) => !collectionIds.includes(one.collectionId))

  function recipesIn(collectionId) {
    return shown.filter((one) => one.collectionId === collectionId)
  }

  function handleToggleDeck(id) {
    setOpenIds((current) => (current.includes(id)
      ? current.filter((one) => one !== id)
      : current.concat(id)))
  }

  /**
   * The one way a recipe changes collection. The Move to… control and
   * dropping a card on a deck both end up here, so the part a test can reach
   * is the same code the part it cannot reach runs.
   */
  async function handleMove(recipeId, collectionId) {
    setPageMessage('')
    try {
      await moveRecipeToCollection(recipeId, collectionId)
      setFavorites((current) => current.map((one) =>
        one.id === recipeId ? { ...one, collectionId } : one))
    } catch (failure) {
      // The card stays where it was.
      setPageMessage(failure.message)
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    setPageMessage('')
    try {
      const created = await createCollection(newName)
      // Newest first, like the server's own ordering.
      setCollections((current) => [created].concat(current))
      setNewName('')
      setIsCreating(false)
    } catch (failure) {
      setPageMessage(failure.message)
    }
  }

  // Rename and delete throw on failure; the deck shows the message itself.
  async function handleRename(id, name) {
    await renameCollection(id, name)
    setCollections((current) => current.map((one) =>
      one.id === id ? { ...one, name: name.trim() } : one))
  }

  async function handleDelete(id) {
    await deleteCollection(id)
    // The collection was only a label, so its recipes are simply loose now.
    setCollections((current) => current.filter((one) => one.id !== id))
    setFavorites((current) => current.map((one) =>
      one.collectionId === id ? { ...one, collectionId: null } : one))
    setOpenIds((current) => current.filter((one) => one !== id))
  }

  function handleCardDragStart(recipeId) {
    return (event) => event.dataTransfer.setData('text/plain', String(recipeId))
  }

  function renderCard(recipe) {
    return (
      <RecipeCard
        key={recipe.id}
        id={recipe.id}
        title={recipe.title}
        description="Saved to make again."
        imageUrl={recipe.imageUrl}
        isFavorite={true}
        onFavoriteChange={handleFavoriteChange}
        onDragStart={handleCardDragStart(recipe.id)}
      >
        {/* RB-205: only on this page. A note belongs to a recipe the cook has
            saved, so there is nothing to attach one to in search results. */}
        <RecipeNote recipeId={recipe.id} note={recipe.note} />
        <MoveToCollection
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          collections={collections}
          currentCollectionId={recipe.collectionId ?? null}
          onMove={handleMove}
        />
      </RecipeCard>
    )
  }

  // "Nothing saved" is only true once we know WHO has saved nothing. Without
  // that condition a signed-out visitor sees "No favorites yet", which is the
  // screen being confidently wrong.
  const nothingSaved =
    isSignedIn === true && !isLoading && !errorMessage && shown.length === 0

  return (
    <main className="results-page favorites-page">
      <h1>Your Favorites</h1>
      <p className="tagline">Recipes you have saved to make again.</p>

      {isLoading && <p>Loading your favorites...</p>}

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {/* Not an error and not an empty list - a third thing, and it says so.
          The sentence is the agreed one from docs/error-shape.md. */}
      {isSignedIn === false && (
        <div className="empty-state">
          <p className="empty-title">Please sign in to save favorites.</p>
          <p>Your saved recipes are kept with your account.</p>
          <Link className="button" to={{ pathname: '/signin', search }}>Sign in</Link>
        </div>
      )}

      {nothingSaved && (
        <div className="empty-state">
          <p className="empty-title">No favorites yet</p>
          <p>Find a recipe you like and tap Favorites. It will show up here.</p>
          <Link className="button" to={{ pathname: '/', search }}>Find Recipes</Link>
        </div>
      )}

      {isSignedIn === true && !isLoading && (
        <div className="collection-create">
          {isCreating ? (
            <form onSubmit={handleCreate}>
              <input
                type="text"
                aria-label="New collection name"
                value={newName}
                maxLength={50}
                onChange={(event) => setNewName(event.target.value)}
              />
              <button type="submit">Create</button>
              <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
            </form>
          ) : (
            <button type="button" onClick={() => setIsCreating(true)}>
              Create a collection
            </button>
          )}
        </div>
      )}

      {pageMessage && <p role="alert">{pageMessage}</p>}

      {collections.length > 0 && (
        <div className="collection-decks">
          {collections.map((collection) => (
            <CollectionDeck
              key={collection.id}
              collection={collection}
              recipeCount={recipesIn(collection.id).length}
              // The oldest two in the collection, not the newest - a stable
              // cover that does not reshuffle every time something new is
              // added. getFavorites returns newest-saved-first, so this is
              // the last two entries, oldest first.
              coverImages={[...recipesIn(collection.id)].reverse().slice(0, 2)
                .map((one) => one.imageUrl)}
              isOpen={openIds.includes(collection.id)}
              onToggle={handleToggleDeck}
              onRename={handleRename}
              onDelete={handleDelete}
              onDropRecipe={handleMove}
            >
              <div className="recipe-grid">
                {recipesIn(collection.id).map(renderCard)}
              </div>
            </CollectionDeck>
          ))}
        </div>
      )}

      {collections.length > 0 && looseRecipes.length > 0 && (
        <h2>Not in a collection</h2>
      )}

      <div className="recipe-grid">
        {looseRecipes.map(renderCard)}
      </div>

      <div className="button-group">
        <Link className="button button-secondary" to={{ pathname: '/', search }}>Back to Home</Link>
      </div>
    </main>
  )
}
