/**
 * RB-203: does the cook already have this ingredient?
 *
 * One place for the rule, so the shopping list and anything built on it later
 * cannot answer the same question two different ways.
 *
 * The same rule also exists in RecipeService on the backend, where the cost
 * panel needs it. That duplication is deliberate rather than careless: the
 * recipe endpoint is cached on the recipe id ALONE, so it cannot be handed a
 * pantry without two cooks with different pantries each paying for the same
 * answer. The matching therefore happens wherever the pantry is - on the
 * server for the priced list, here for the free one.
 *
 * Matching is loose in BOTH directions and deliberately forgiving:
 *
 *   cook types "chicken"       recipe says "whole chicken"   -> has it
 *   cook types "basmati rice"  recipe says "rice"            -> has it
 *
 * It is right most of the time and occasionally wrong - "egg" matches
 * "eggplant" - which is why the list is offered as a help rather than as a
 * claim, and why the whole recipe is always one click away.
 */

/** Splits a saved pantry string into comparable words. */
export function pantryWords(pantry) {
  return (pantry || '')
    .split(',')
    .map((one) => one.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * @param {string} ingredientName the recipe's name for it, e.g. "whole chicken"
 * @param {string[]} owned        from pantryWords()
 * @returns {boolean} true when the cook looks to have it already
 */
export function alreadyHave(ingredientName, owned) {
  const name = (ingredientName || '').toLowerCase()
  if (!name) {
    return false
  }
  return owned.some((one) => name.includes(one) || one.includes(name))
}
