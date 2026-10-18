import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFavorites } from '../api/recipes'
import RecipeCard from '../components/RecipeCard'

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
  const [favorites, setFavorites] = useState([])

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
  const nothingSaved = !isLoading && !errorMessage && shown.length === 0

  return (
    <main className="results-page favorites-page">
      <h1>Your Favorites</h1>
      <p className="tagline">Recipes you have saved to make again.</p>

      {isLoading && <p>Loading your favorites...</p>}

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {nothingSaved && (
        <div className="empty-state">
          <p className="empty-title">No favorites yet</p>
          <p>Find a recipe you like and tap Favorites. It will show up here.</p>
          <Link className="button" to="/">Find Recipes</Link>
        </div>
      )}

      <div className="recipe-grid">
        {shown.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            id={recipe.id}
            title={recipe.title}
            description="Saved to make again."
            imageUrl={recipe.imageUrl}
            isFavorite={true}
            onFavoriteChange={handleFavoriteChange}
          />
        ))}
      </div>

      <div className="button-group">
        <Link className="button button-secondary" to="/">Back to Home</Link>
      </div>
    </main>
  )
}
