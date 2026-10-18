import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

/**
 * Where you say what is in your pantry.
 *
 * The layout, the wording, the CSS classes and the add-to-a-list idea are all
 * Andrew's, from the page skeletons he committed on 2026-10-13. This change
 * only makes them work: the list is real state instead of a hardcoded
 * Eggs / Milk / Flour, and Generate Recipes actually goes somewhere.
 *
 * Adding one ingredient at a time is not just his preference - it is what
 * makes the input unambiguous. A single comma-separated box cannot tell
 * "green onion" (one ingredient) from two, and splitting on spaces would
 * break "olive oil" and "sour cream" too. Pressing Add settles it.
 *
 * This page does NO fetching. It collects the ingredients and sends the
 * browser to /results, which does the asking - so that address carries
 * everything needed to reproduce the results, and can be refreshed or shared.
 */
export default function HomePage() {
  const [searchParams] = useSearchParams()
  const [typed, setTyped] = useState('')

  // Start from whatever the address carries, so coming back from the results
  // page finds the pantry list as it was left. Written as a function so it is
  // worked out once, on first render, not on every keystroke after.
  const [ingredients, setIngredients] = useState(() => {
    const fromAddress = searchParams.get('ingredients')
    if (!fromAddress) {
      return []
    }
    return fromAddress.split(',').map((one) => one.trim()).filter((one) => one !== '')
  })

  const navigate = useNavigate()

  /** The Add button, and pressing Enter in the box. */
  function handleAdd(event) {
    // Stop the browser reloading the page, which is a form's default.
    event.preventDefault()

    // Usually one ingredient. But people paste, so a comma-separated list
    // pasted in one go becomes separate rows rather than a single row holding
    // three things - otherwise the remove button would take out all of them.
    const pieces = typed.split(',').map((one) => one.trim()).filter((one) => one !== '')

    if (pieces.length === 0) {
      return
    }

    setIngredients((current) => {
      const next = current.slice()

      for (const one of pieces) {
        // Case-insensitive, so "Eggs" is not added on top of "eggs". Checked
        // against the list being built, so a repeat inside pasted text is
        // caught too.
        const alreadyThere = next.some(
          (existing) => existing.toLowerCase() === one.toLowerCase(),
        )
        if (!alreadyThere) {
          next.push(one)
        }
      }

      return next
    })

    setTyped('')
  }

  function handleRemove(one) {
    setIngredients(ingredients.filter((existing) => existing !== one))
  }

  function handleGenerate() {
    if (ingredients.length === 0) {
      return
    }

    // The backend trims, lowercases, de-duplicates and SORTS this before
    // searching, so the order here does not matter - see IngredientList.
    navigate('/results?ingredients=' + encodeURIComponent(ingredients.join(',')))
  }

  return (
    <main className="home-page">
      <h1 className="home-title">Recipe Builder</h1>
      <p className="tagline">Make the best of the ingredients you have.</p>
      <p>
        Tell us what is in your pantry and we&apos;ll search for recipes that best fit
        what you already have, so you can waste less food and spend less time deciding
        what to cook.
      </p>

      <form onSubmit={handleAdd}>
        <div className="ingredient-entry">
          <label htmlFor="ingredient">Ingredient</label>{' '}
          <input
            id="ingredient"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Type an ingredient, e.g. eggs"
          />{' '}
          <button type="submit" className="button">Add</button>
        </div>
      </form>

      <h2>Your ingredients</h2>

      {ingredients.length === 0 ? (
        <p>Nothing added yet. Type an ingredient above and press Add.</p>
      ) : (
        <ul className="ingredient-list">
          {ingredients.map((one) => (
            <li key={one}>
              {one}{' '}
              <button
                type="button"
                className="remove-ingredient"
                onClick={() => handleRemove(one)}
                aria-label={'Remove ' + one}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="button-group">
        <button
          type="button"
          className="button"
          onClick={handleGenerate}
          disabled={ingredients.length === 0}
        >
          Generate Recipes
        </button>
        <Link className="button button-secondary" to="/favorites">View Favorites</Link>
      </div>
    </main>
  )
}
