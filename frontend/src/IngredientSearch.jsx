import { useState } from 'react'
import { searchRecipes } from './api/recipes'

/**
 * The whole of sprint 1 on screen: type one ingredient, see recipes that use it.
 *
 * All the HTTP work lives in src/api/recipes.js. This component only decides
 * what to show, which is why its tests can replace that module entirely and
 * involve no network at all.
 */
export default function IngredientSearch() {
  const [ingredient, setIngredient] = useState('')
  const [recipes, setRecipes] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSearch(event) {
    // Stop the browser reloading the page, which is a form's default.
    event.preventDefault()

    setIsSearching(true)
    // Clear the last error so a successful search does not sit under a stale
    // failure message.
    setErrorMessage('')

    try {
      const found = await searchRecipes(ingredient)
      setRecipes(found)
    } catch (failure) {
      // The message came from our own backend, or from src/api/recipes.js when
      // the backend could not be reached. Either way it is written for a person
      // and we show it unchanged - see docs/error-shape.md.
      setErrorMessage(failure.message)
      setRecipes([])
    } finally {
      setIsSearching(false)
      setHasSearched(true)
    }
  }

  const foundNothing = hasSearched && !isSearching && !errorMessage && recipes.length === 0

  return (
    <main>
      <h1>Recipe Builder</h1>
      <p>Find recipes from the ingredients you already have.</p>

      <form onSubmit={handleSearch}>
        <label htmlFor="ingredient">Ingredient</label>{' '}
        <input
          id="ingredient"
          value={ingredient}
          onChange={(event) => setIngredient(event.target.value)}
          placeholder="chicken, garlic, pasta"
        />{' '}
        <button type="submit" disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* role="alert" so screen readers announce it, and so the test can find
          it without depending on the wording. */}
      {errorMessage && <p role="alert">{errorMessage}</p>}

      {foundNothing && <p>No recipes found for that ingredient.</p>}

      <ul>
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            {recipe.imageUrl && <img src={recipe.imageUrl} alt="" width="120" />}
            <h2>{recipe.title}</h2>
            <p>
              Uses {recipe.ingredientsYouHave} of your ingredients, needs{' '}
              {recipe.ingredientsYouNeed} more.
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}
