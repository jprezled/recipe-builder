import { useState } from 'react'
import { getRecipe } from '../api/recipes'
import { alreadyHave, pantryWords } from '../lib/pantryMatch'

/**
 * RB-203: a recipe's shopping list, on a saved recipe.
 *
 * RB-262: the ingredients now arrive WITH the saved recipe, stored in our own
 * database when it was first saved. So opening this costs no Spoonacular
 * point, works with the daily 50 spent, and works with no internet at all - a
 * recipe saved in September still tells you what to buy in December.
 *
 * The fetch is kept as a fallback for one case: a recipe saved before the
 * ingredients were stored, or saved while Spoonacular was unreachable. Those
 * arrive with `ingredients` null, which means "ask once" rather than "this
 * recipe has no ingredients".
 *
 * Asking once is literally once: the backend stores what that fetch returned
 * against the recipe, so the next time anybody opens this card - or any other
 * cook who has the same recipe saved - it is already there. The storing
 * happens on the server, not here; this component only displays.
 *
 * Two views, because the cook asked for both:
 *
 *   What I'm missing - measured against their SAVED pantry, so it follows
 *                      their kitchen rather than freezing at the moment they
 *                      bookmarked the recipe
 *   Whole recipe     - everything, for shopping on a day when what is at home
 *                      is different
 */
export default function RecipeShoppingList({ recipeId, pantry, savedIngredients }) {
  const [isOpen, setIsOpen] = useState(false)

  // Seeded from what the favourite already carries. Null means nothing was
  // stored, and only then is anything fetched.
  const [ingredients, setIngredients] = useState(savedIngredients ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showAll, setShowAll] = useState(false)

  async function toggle() {
    if (isOpen) {
      setIsOpen(false)
      return
    }

    setIsOpen(true)

    // Already here - either stored with the recipe, or fetched once earlier.
    // Re-opening spends nothing either way.
    if (ingredients) {
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    try {
      const recipe = await getRecipe(recipeId)
      setIngredients(recipe.allIngredients || [])
    } catch (failure) {
      setErrorMessage(failure.message)
    } finally {
      setIsLoading(false)
    }
  }

  const owned = pantryWords(pantry)
  const missing = (ingredients || []).filter((one) => !alreadyHave(one.name, owned))
  const shown = showAll ? ingredients || [] : missing

  return (
    <div className="shopping">
      <button
        type="button"
        className="shopping-toggle"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        Shopping list
        <span aria-hidden="true">{isOpen ? ' ▲' : ' ▼'}</span>
      </button>

      {isOpen && (
        <div className="shopping-body">
          {isLoading && <p className="shopping-note">Fetching the ingredients...</p>}

          {errorMessage && <p role="alert">{errorMessage}</p>}

          {ingredients && (
            <>
              {/* A real fieldset so a screen reader announces the pair as one
                  choice rather than two loose radios. */}
              <fieldset className="shopping-view">
                <legend className="visually-hidden">Which ingredients to show</legend>
                <label>
                  <input
                    type="radio"
                    name={'view-' + recipeId}
                    checked={!showAll}
                    onChange={() => setShowAll(false)}
                  />
                  What I&rsquo;m missing
                </label>
                <label>
                  <input
                    type="radio"
                    name={'view-' + recipeId}
                    checked={showAll}
                    onChange={() => setShowAll(true)}
                  />
                  Whole recipe
                </label>
              </fieldset>

              {shown.length === 0 ? (
                <p className="shopping-note">
                  You already have everything for this one.
                </p>
              ) : (
                <div className="shopping-list">
                  {groupByCategory(shown).map(([category, items]) => (
                    <div key={category}>
                      <h4>{category}</h4>
                      <ul>
                        {items.map((item, index) => (
                          <li key={item.name + index}>{item.line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {!showAll && missing.length > 0 && (
                <p className="shopping-note">
                  Measured against your saved ingredients.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Gathers items under their category, keeping first-seen order.
 *
 * A Map rather than a plain object because the names are free text from
 * Spoonacular, and an object would let one like "constructor" collide with
 * something it inherits.
 */
function groupByCategory(items) {
  const byCategory = new Map()

  for (const item of items) {
    const category = item.aisle || 'Other'
    if (!byCategory.has(category)) {
      byCategory.set(category, [])
    }
    byCategory.get(category).push(item)
  }

  return [...byCategory.entries()]
}