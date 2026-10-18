import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchRecipes } from '../api/recipes'
import RecipeCard from '../components/RecipeCard'

/**
 * The recipes you can make, read from the address bar.
 *
 * Andrew's page - his heading, his tagline, his grid, his Back button - with
 * the three hardcoded cards replaced by whatever the search returned.
 *
 * His RecipeCard keeps the prop names he gave it (title, description,
 * imageUrl) rather than being changed to take a recipe object. That matters:
 * his FavoritesPage passes those same props, so changing the signature here
 * would break his page for no gain.
 *
 * The ingredients come from the address rather than from state handed over by
 * the home page, which is what lets this page be refreshed, bookmarked or
 * shared and still work.
 */
export default function ResultsPage() {
  const [searchParams] = useSearchParams()
  const ingredients = searchParams.get('ingredients') || ''

  const [recipes, setRecipes] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isSearching, setIsSearching] = useState(true)

  useEffect(() => {
    // If this page is left while the request is still in flight, React would
    // warn about setting state on something no longer on screen. This flag is
    // how a reply that arrives too late gets ignored.
    let stillOnThisPage = true

    async function load() {
      setIsSearching(true)
      setErrorMessage('')

      try {
        const found = await searchRecipes(ingredients)
        if (stillOnThisPage) {
          setRecipes(found)
        }
      } catch (failure) {
        if (stillOnThisPage) {
          // The message came from our own backend, or from src/api/recipes.js
          // when it could not be reached. Either way it is written for a
          // person, so it is shown unchanged - see docs/error-shape.md.
          setErrorMessage(failure.message)
          setRecipes([])
        }
      } finally {
        if (stillOnThisPage) {
          setIsSearching(false)
        }
      }
    }

    load()

    return () => { stillOnThisPage = false }
  }, [ingredients])

  const foundNothing = !isSearching && !errorMessage && recipes.length === 0

  return (
    <main className="results-page">
      <h1>Your Recipes</h1>
      <p className="tagline">Here is what you can make with the ingredients you have added.</p>

      {isSearching && <p>Searching...</p>}

      {/* role="alert" so screen readers announce it, and so the test can find
          it without depending on the wording. */}
      {errorMessage && <p role="alert">{errorMessage}</p>}

      {foundNothing && <p>No recipes found for those ingredients.</p>}

      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            title={recipe.title}
            description={
              'Uses ' + recipe.ingredientsYouHave + ' of yours, needs '
              + recipe.ingredientsYouNeed + ' more.'
            }
            imageUrl={recipe.imageUrl}
          />
        ))}
      </div>

      <div className="button-group">
        {/* Carries the ingredients back, so the pantry list is still there
            rather than being retyped. They are already in this page's own
            address, so there is nothing extra to remember. */}
        <Link
          className="button button-secondary"
          to={'/?ingredients=' + encodeURIComponent(ingredients)}
        >
          Back to Ingredients
        </Link>
      </div>
    </main>
  )
}
