/**
 * RB-317: which shopping-list lines the cook has checked off, per recipe.
 *
 * One module both pages read and write - the recipe detail page and the
 * Favorites page's RecipeShoppingList - so neither invents its own storage
 * key or format, and a check made on one shows on the other.
 * See docs/shopping-checklist-contract.md.
 *
 * Kept in this browser's localStorage only: nothing is sent to the server.
 * Inside one recipe's set, an item is its own displayed line, e.g.
 * "3 cloves of garlic (minced)".
 *
 * Every storage call is wrapped in try/catch. Some browsers block storage
 * (private browsing, storage turned off); then checks simply are not saved,
 * and the page carries on instead of crashing.
 */

/** One key per recipe, so one recipe's checks never show on another's list. */
function keyFor(recipeId) {
  return 'shoppingChecklist:' + recipeId
}

/**
 * @param {number|string} recipeId
 * @returns {Set<string>} the checked lines; empty when nothing is stored,
 *          the stored value is unreadable, or storage is blocked
 */
export function getChecked(recipeId) {
  try {
    const stored = localStorage.getItem(keyFor(recipeId))
    if (!stored) {
      return new Set()
    }

    const lines = JSON.parse(stored)
    if (!Array.isArray(lines)) {
      return new Set()
    }

    return new Set(lines.filter((line) => typeof line === 'string'))
  } catch {
    return new Set()
  }
}

/**
 * Saves the checked lines for one recipe. Never throws.
 *
 * @param {number|string} recipeId
 * @param {Set<string>} checkedSet
 */
export function setChecked(recipeId, checkedSet) {
  try {
    localStorage.setItem(keyFor(recipeId), JSON.stringify([...checkedSet]))
  } catch {
    // Storage blocked or full: the checkbox still toggles on screen for this
    // visit, it just will not be remembered.
  }
}