import IngredientInput from '../components/IngredientInput'
import { Link, useSearchParams } from 'react-router-dom'
import ResultsPage from './ResultsPage'

/** "eggs, milk" from the address becomes ["eggs", "milk"] for the screen. */
function splitList(fromAddress) {
  if (!fromAddress) {
    return []
  }

  return fromAddress
    .split(',')
    .map((ingredient) => ingredient.trim())
    .filter(Boolean)
}

/**
 * The Add page is where the user enters ingredients.
 *
 * After the user selects Generate Recipes, this page renders ResultsPage
 * inside a box below the ingredient list. ResultsPage is the same component
 * used by the separate /results route, so recipe loading and recipe cards
 * have one implementation rather than a separate preview implementation.
 */
export default function HomePage() {
  // The address holds the pantry list, not component state - the same
  // decision RB-173 made for the filters. React Router unmounts this page
  // whenever the cook uses the nav bar, so anything kept in useState here is
  // destroyed on the way out and the list comes back empty.
  const [searchParams, setSearchParams] = useSearchParams()

  const ingredients = splitList(searchParams.get('ingredients'))

  // Whether the embedded Results page is shown. In the address too, so that
  // coming back brings the recipes back and not just the ingredients.
  const showResults = searchParams.get('results') === '1'

  /**
   * Write the pantry list into the address.
   *
   * Built from the current parameters so the diet and intolerances the
   * embedded ResultsPage manages are carried through untouched.
   *
   * `replace` on an edit: adding five ingredients should not put five steps
   * into the browser's Back button. Pressing Generate is a real change of
   * what the page shows, so that one is left to push an entry.
   */
  function putInAddress(nextIngredients, nextShowResults, replace) {
    const next = new URLSearchParams(searchParams)

    if (nextIngredients.length > 0) {
      next.set('ingredients', nextIngredients.join(','))
    } else {
      next.delete('ingredients')
    }

    if (nextShowResults) {
      next.set('results', '1')
    } else {
      next.delete('results')
    }

    setSearchParams(next, { replace })
  }

  /**
   * Add the typed entry to the pantry list.
   *
   * Splits on commas only, never on spaces. That is what lets both of these
   * work from the same box: "green onion" is one ingredient because it has no
   * comma, and a pasted "eggs, milk, cheese" becomes three rows rather than
   * one row holding three things - which would otherwise make the remove
   * button take out all three at once.
   */
  function handleAdd(name) {
  // Split the text received from IngredientInput into separate ingredients.
  const pieces = name
    .split(',')
    .map((piece) => piece.trim())
    .filter((piece) => piece !== '')

    if (pieces.length === 0) {
      return
    }

    // Build on a copy rather than changing the current list in place.
    const next = ingredients.slice()

    for (const piece of pieces) {
      // Treat entries with different capitalization as the same ingredient,
      // so adding "Eggs" after "eggs" does not create a duplicate. Checked
      // against the list being built, so a repeat inside pasted text is
      // caught too.
      const alreadyAdded = next.some(
        (existing) => existing.toLowerCase() === piece.toLowerCase(),
      )

      if (!alreadyAdded) {
        next.push(piece)
      }
    }

    // Hide old results because they were generated for the previous list.
    putInAddress(next, false, true)
  }

  /**
   * Remove an ingredient from the pantry.
   *
   * The embedded results are hidden because they no longer match the updated
   * ingredient list. The user can generate a new set of results afterward.
   */
  function handleRemove(ingredientToRemove) {
    const remaining = ingredients.filter(
      (ingredient) => ingredient !== ingredientToRemove,
    )

    putInAddress(remaining, false, true)
  }

  // ResultsPage expects a comma-separated string. Passing the current
  // ingredients this way lets the embedded page search for this exact list.
  const ingredientsForResults = ingredients.join(',')

  // The filters live in this page's own address, so Expand has to carry them
  // across. Sending only the ingredients would quietly drop a restriction the
  // cook had set - the one failure this whole filter exists to avoid.
  const resultsParams = new URLSearchParams(searchParams)
  resultsParams.set('ingredients', ingredientsForResults)

  // "results" is this page's own flag for showing the embedded box. The
  // standalone page always shows them, so it would be noise in a shared link.
  resultsParams.delete('results')

  const resultsUrl = '/results?' + resultsParams.toString()


  return (
    <main className="home-page">
      <h1 className="home-title">Recipe Builder</h1>
      <p className="tagline">Make the best of the ingredients you have.</p>
      <p>
        Tell us what is in your pantry and we&apos;ll search for recipes that best
        fit what you already have, so you can waste less food and spend less time
        deciding what to cook.
      </p>

      {/* Submitting this form adds an ingredient without leaving the page. */}
      <IngredientInput
        id="ingredient"
        label="Ingredient"
        placeholder="Type an ingredient, e.g. eggs"
        onAdd={handleAdd}
      />

      <h2>Your ingredients</h2>

      {/* Show instructions before the user has added their first ingredient. */}
      {ingredients.length === 0 ? (
        <p>Nothing added yet. Type an ingredient above and press Add.</p>
      ) : (
        <ul className="ingredient-list">
          {ingredients.map((ingredient) => (
            <li key={ingredient}>
              {ingredient}{' '}
              <button
                type="button"
                className="remove-ingredient"
                onClick={() => handleRemove(ingredient)}
                aria-label={'Remove ' + ingredient}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="button-group">
        {/* This reveals ResultsPage below the ingredients. It does not navigate
            away; the embedded ResultsPage will start its recipe search. */}
        <button
          type="button"
          className="button"
          onClick={() => putInAddress(ingredients, true, false)}
          disabled={ingredients.length === 0}
        >
          Generate Recipes
        </button>

        {/* Carries the query string for the same reason the nav bar does: the
            pantry list and the dietary filters live in the address, so a bare
            "/favorites" throws them away and coming back lands on an empty
            page. RB-188 fixed the nav bar's links and not this one. */}
        <Link
          className="button button-secondary"
          to={{ pathname: '/favorites', search: searchParams.toString() }}
        >
          View Favorites
        </Link>
      </div>

      {/* Mount the actual ResultsPage inside this box. Passing the ingredients
          as a prop lets it work here without relying on Home's URL. */}
      {showResults && (
        <div className="home-results-box">
          <ResultsPage
            embedded
            ingredients={ingredientsForResults}
            resultsUrl={resultsUrl}
          />
        </div>
      )}
    </main>
  )
}
