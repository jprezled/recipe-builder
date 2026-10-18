import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ResultsPage from './ResultsPage'

/**
 * The Add page is where the user enters ingredients.
 *
 * After the user selects Generate Recipes, this page renders ResultsPage
 * inside a box below the ingredient list. ResultsPage is the same component
 * used by the separate /results route, so recipe loading and recipe cards
 * have one implementation rather than a separate preview implementation.
 */
export default function HomePage() {
  // Read ingredients from the address if the user returns here from Results.
  // This lets them continue from their existing list instead of starting over.
  const [searchParams] = useSearchParams()

  // `typed` is only the text currently in the input. It does not become part
  // of the pantry list until the user presses Add or submits with Enter.
  const [typed, setTyped] = useState('')

  // Convert a URL value such as ?ingredients=eggs%2Cmilk into a list that can
  // be displayed and edited. This initializer runs when HomePage first loads.
  const [ingredients, setIngredients] = useState(() => {
    const fromAddress = searchParams.get('ingredients')

    if (!fromAddress) {
      return []
    }

    return fromAddress
      .split(',')
      .map((ingredient) => ingredient.trim())
      .filter(Boolean)
  })

  // This controls whether the embedded Results page is shown. Clicking
  // Generate Recipes changes this to true; ResultsPage then performs the
  // search and displays its own loading, error, and result states.
  const [showResults, setShowResults] = useState(false)

  /**
   * Add the typed ingredient to the pantry list.
   *
   * The input intentionally treats the whole entry as one ingredient. This
   * means names such as "green onion" and "olive oil" stay together.
   */
  function handleAdd(event) {
    // Stop the browser from reloading the page when the form is submitted.
    event.preventDefault()

    // Remove extra spaces around the entry. If the input is blank, there is
    // nothing to add.
    const ingredient = typed.trim()
    if (!ingredient) {
      return
    }

    setIngredients((currentIngredients) => {
      // Treat entries with different capitalization as the same ingredient,
      // so adding "Eggs" after "eggs" does not create a duplicate.
      const alreadyAdded = currentIngredients.some(
        (existing) => existing.toLowerCase() === ingredient.toLowerCase(),
      )

      // Return a new array rather than changing the existing React state array.
      return alreadyAdded
        ? currentIngredients
        : [...currentIngredients, ingredient]
    })

    // Clear the input after adding. Hide old results because they were
    // generated for the previous ingredient list.
    setTyped('')
    setShowResults(false)
  }

  /**
   * Remove an ingredient from the pantry.
   *
   * The embedded results are hidden because they no longer match the updated
   * ingredient list. The user can generate a new set of results afterward.
   */
  function handleRemove(ingredientToRemove) {
    setIngredients((currentIngredients) =>
      currentIngredients.filter(
        (ingredient) => ingredient !== ingredientToRemove,
      ),
    )

    setShowResults(false)
  }

  // ResultsPage expects a comma-separated string. Passing the current
  // ingredients this way lets the embedded page search for this exact list.
  const ingredientsForResults = ingredients.join(',')

  // The standalone Results page reads its ingredients from the URL. The
  // Expand link uses this address to open that full-page version.
  const resultsUrl =
    '/results?ingredients=' + encodeURIComponent(ingredientsForResults)

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
      <form onSubmit={handleAdd}>
        <div className="ingredient-entry">
          <label htmlFor="ingredient">Ingredient</label>{' '}
          <input
            id="ingredient"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Type an ingredient, e.g. eggs"
          />{' '}
          <button type="submit" className="button">
            Add
          </button>
        </div>
      </form>

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
          onClick={() => setShowResults(true)}
          disabled={ingredients.length === 0}
        >
          Generate Recipes
        </button>

        <Link className="button button-secondary" to="/favorites">
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
