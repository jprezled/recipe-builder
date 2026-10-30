import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getFavorites, getRecipe } from '../api/recipes'
import FavoriteButton from '../components/FavoriteButton'

/**
 * Shown when a failure arrives with no message we can display. The same
 * sentence ResultsPage uses, so one wording covers both pages.
 */
const COULD_NOT_LOAD = 'Could not load recipes. Please try again.'

/**
 * The page for one recipe, named by the id in the address.
 *
 * The heading, image, description slot, button group and two sections are
 * Andrew's and are unchanged - only their contents come from the backend now.
 */
export default function RecipeDetailPage() {
  const { id } = useParams()

  // Four pieces of state, so the page can tell its situations apart: still
  // loading, failed, loaded, and loaded-but-empty.
  const [recipe, setRecipe] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // A cook can click away while the request is still in flight. Without
    // this flag a slow reply updates a page that is no longer on screen.
    let stillOnThisPage = true

    async function load() {
      setIsLoading(true)
      setErrorMessage('')
      setRecipe(null)

      try {
        // The saved list is a database read and costs no Spoonacular quota,
        // so it goes out alongside the recipe rather than after it. Its
        // failure is swallowed: a favorites problem must not stop the recipe
        // appearing, it only leaves the button reading "Save".
        const [found, saved] = await Promise.all([
          getRecipe(id),
          getFavorites().catch(() => []),
        ])

        if (stillOnThisPage) {
          setRecipe(found)
          setIsFavorite(saved.some((one) => one.id === found.id))
        }
      } catch (failure) {
        if (stillOnThisPage) {
          setErrorMessage(failure.message || COULD_NOT_LOAD)
        }
      } finally {
        if (stillOnThisPage) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      stillOnThisPage = false
    }
  }, [id])

  return (
    <main className="detail-page">
      <button type="button" className="button button-secondary">Back to Recipes</button>

      {isLoading && <p>Loading recipe...</p>}

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {recipe && (
        <>
          <h1>{recipe.title}</h1>
          <img className="detail-image" src={recipe.imageUrl} alt={recipe.title} />

          {/* Spoonacular has no prose we can use here - their "summary" is
              marketing copy with HTML in it. See the contract. */}
          <p className="detail-description">
            Serves {recipe.servings} · ready in {recipe.readyInMinutes} minutes
          </p>

          <div className="button-group">
            <FavoriteButton
              recipe={recipe}
              isFavorite={isFavorite}
              onChange={(_id, isNowFavorite) => setIsFavorite(isNowFavorite)}
              variant="text"
            />
          </div>

          <section className="detail-section">
            <h2>Ingredients</h2>
            {recipe.ingredients.length === 0 ? (
              <p>No ingredients were listed for this recipe.</p>
            ) : (
              <ul>
                {recipe.ingredients.map((one, position) => (
                  <li key={position}>{one}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="detail-section">
            <h2>Instructions</h2>
            {recipe.steps.length === 0 ? (
              <p>No instructions were provided for this recipe.</p>
            ) : (
              <ol>
                {recipe.steps.map((one, position) => (
                  <li key={position}>{one}</li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </main>
  )
}
