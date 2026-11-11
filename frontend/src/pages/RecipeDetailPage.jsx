import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFavorites, getRecipe } from '../api/recipes'
import FavoriteButton from '../components/FavoriteButton'

/**
 * Shown when a failure arrives with no message we can display. The same
 * sentence ResultsPage uses, so one wording covers both pages.
 */
const COULD_NOT_LOAD = 'Could not load recipes. Please try again.'

/**
 * The labels a recipe reports about itself.
 *
 * Field name and label are kept apart on purpose: these labels are NOT the
 * strings the dietary filter sends. The filter sends "gluten free" as a search
 * parameter; this is a badge reading "Gluten free". Two vocabularies that
 * happen to look alike - see docs/dietary-filter-contract.md.
 */
const DIET_LABELS = [
  { field: 'vegetarian', label: 'Vegetarian' },
  { field: 'vegan', label: 'Vegan' },
  { field: 'glutenFree', label: 'Gluten free' },
  { field: 'dairyFree', label: 'Dairy free' },
]

const NUTRITION_ROWS = [
  { field: 'calories', label: 'Calories', unit: ' kcal' },
  { field: 'fat', label: 'Fat', unit: 'g' },
  { field: 'saturatedFat', label: 'Saturated fat', unit: 'g' },
  { field: 'carbohydrates', label: 'Carbohydrates', unit: 'g' },
  { field: 'sugar', label: 'Sugar', unit: 'g' },
  { field: 'protein', label: 'Protein', unit: 'g' },
]
/**
 * The page for one recipe, named by the id in the address.
 *
 * The heading, image, description slot, button group and two sections are
 * Andrew's and are unchanged - only their contents come from the backend now.
 */
export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Four pieces of state, so the page can tell its situations apart: still
  // loading, failed, loaded, and loaded-but-empty.
  const [isNutritionOpen, setIsNutritionOpen] = useState(false)
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
      setIsNutritionOpen(false)

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
      {/* One step back in history rather than a fixed address, so this
          returns to the results the cook was actually looking at and keeps
          their ingredients and any filter - without this page needing to
          know either exists. */}
      <button
        type="button"
        className="button button-secondary"
        onClick={() => navigate(-1)}
      >
        Back to Recipes
      </button>

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

          {/* These four flags arrive in the call the page already makes, so
              showing them costs nothing extra. Search results do not carry
              them, which is why the result cards have no badges. */}
          <ul className="diet-badges">
            {DIET_LABELS.filter((one) => recipe.diets[one.field]).map((one) => (
              <li key={one.field}>{one.label}</li>
            ))}
          </ul>

          <div className="button-group">
            <FavoriteButton
              recipe={recipe}
              isFavorite={isFavorite}
              onChange={(_id, isNowFavorite) => setIsFavorite(isNowFavorite)}
              variant="text"
            />

            {recipe.nutrition != null && (
              <button
                type="button"
                className="nutrition-toggle"
                aria-expanded={isNutritionOpen}
                aria-controls="nutrition-facts"
                onClick={() => setIsNutritionOpen((open) => !open)}
              >
                Nutrition Facts{' '}
                <span aria-hidden="true">
                  {isNutritionOpen ? '▲' : '▼'}
                </span>
              </button>
            )}

          </div>

          {recipe.nutrition != null && isNutritionOpen && (
            <section className="detail-section" id="nutrition-facts">
              <h2>Nutrition Facts</h2>
              <p className="nutrition-note">Per serving</p>

              <ul className="nutrition-list">
                {NUTRITION_ROWS.map((row) => (
                  <li key={row.field}>
                    <span>{row.label}</span>
                    <span>
                      {recipe.nutrition[row.field]}{row.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

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
