// The ONLY place in the frontend that talks to our backend.
//
// Components call these functions and get back plain data, or an Error whose
// message is safe to show a person. They never see a URL, a status code, or
// JSON parsing. A fetch() written inside a component is the thing this file
// exists to prevent.
//
// The messages below are fixed by docs/error-shape.md - do not reword them
// here without changing that file first.

/** Shown when fetch itself fails, so there is no response to read. */
const CANNOT_REACH = 'Could not reach the recipe service. Is the backend running?'

/** Shown when a failure arrives but carries no message we can display. */
const UNKNOWN_PROBLEM = 'Something went wrong loading recipes. Please try again.'

/**
 * Reads the one sentence out of a failed response.
 *
 * Our backend sends every error as {"message": "..."}, so we read that and pass
 * it straight on. We do not rewrite it, shorten it, or decide anything from the
 * status code - the sentence is already written for a person.
 *
 * @param {Response} response a response whose ok is false
 * @returns {Promise<string>} the message to show
 */
async function readErrorMessage(response) {
  try {
    const body = await response.json()
    if (body && typeof body.message === 'string' && body.message.length > 0) {
      return body.message
    }
  } catch {
    // The body was not JSON. Fall through to the generic message.
  }
  return UNKNOWN_PROBLEM
}

/**
 * Searches for recipes using one or more ingredients.
 *
 * @param {string} ingredients what the user typed, e.g. "eggs, milk, flour"
 * @param {{diet?: string|null, intolerances?: string|null}} restrictions
 *        what the cook chose; each is left out of the request when missing
 * @returns {Promise<Array>} the recipes, or an empty array if none matched
 * @throws {Error} with a message that can be displayed as-is
 */
//export async function searchRecipes(ingredients) { //legacy
export async function searchRecipes(ingredients, restrictions) {
  // STEP 1: build a RELATIVE address.
  //
  // Vite forwards /api to the backend on 8080, so the browser only ever talks
  // to 5173 and CORS never applies. Writing the full localhost:8080 URL here
  // would bypass the proxy and break in a deployed build.
  //
  // encodeURIComponent escapes the value - "green onion" has a space, and a
  // space is not legal in a URL.

  //const address = '/api/recipes/search?ingredients=' + encodeURIComponent(ingredients) //legacy
    let address = '/api/recipes/search?ingredients=' + encodeURIComponent(ingredients)

  // Left off entirely when absent rather than sent empty, so an unfiltered
  // search is byte-for-byte the request it has always been - and so the
  // backend keys it to the same cache entry.
  if (restrictions && restrictions.diet) {
    address += '&diet=' + encodeURIComponent(restrictions.diet)
  }
  if (restrictions && restrictions.intolerances) {
    address += '&intolerances=' + encodeURIComponent(restrictions.intolerances)
  }

  // RB-226: same rule for the sort. Only sent when chosen, so a plain search
  // stays byte for byte the request it has always been
  if ( restrictions && restrictions.sort) {
    address += '&sort=' + encodeURIComponent(restrictions.sort)
  }


  // STEP 2: send the request.
  //
  // fetch only rejects when the request could not be made at all - the backend
  // is not running, the network is down, DNS failed. A 400 or 500 is a
  // successful round trip as far as fetch is concerned, and is handled in
  // step 3.
  let response
  try {
    response = await fetch(address)
  } catch {
    throw new Error(CANNOT_REACH)
  }

  // STEP 3: a reply arrived, but it may be a failure.
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  // STEP 4: success. Hand back the recipes exactly as the backend sent them.
  return response.json()
}

/**
 * Fetches everything about one recipe.
 *
 * One call costs one of our 150 daily Spoonacular points, so the backend
 * remembers each recipe for an hour - opening the same one twice is free.
 *
 * @param {number|string} id Spoonacular's recipe id, the same one search returned
 * @returns {Promise<object>} the recipe: { id, title, imageUrl, servings,
 *          readyInMinutes, ingredients, steps, diets }
 * @throws {Error} with a message that can be displayed as-is
 */
export async function getRecipe(id) {
  let response
  try {
    response = await fetch('/api/recipes/' + encodeURIComponent(id))
  } catch {
    throw new Error(CANNOT_REACH)
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json()
}

/**
 * Lists the recipes that have been saved as favorites.
 *
 * This never reaches Spoonacular - the backend answers it from Postgres alone,
 * so it costs none of our 150 daily points however often it is called. That is
 * also why the favorites page proves the database works: it has no other
 * source the data could be coming from.
 *
 * @returns {Promise<Array>} the saved recipes: { id, title, imageUrl }
 * @throws {Error} with a message that can be displayed as-is
 */
export async function getFavorites() {
  let response
  try {
    response = await fetch('/api/favorites')
  } catch {
    throw new Error(CANNOT_REACH)
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json()
}

/**
 * Saves one recipe as a favorite.
 *
 * The recipe's id, title and image are sent, not just the id, and that is
 * deliberate: if the backend only received an id it would have to ask
 * Spoonacular for the title - one of our 150 daily points spent per favorite.
 * We already have it on screen, so saving costs nothing.
 *
 * The search-only counts are left out on purpose. "ingredientsYouHave"
 * describes what the cook typed, not the recipe, so it is meaningless on
 * something saved last week and the backend has no column for it.
 *
 * Saving the same recipe twice is not an error, so a double-tapped button is
 * harmless.
 *
 * @param {{id: number, title: string, imageUrl: string}} recipe from a search
 * @throws {Error} with a message that can be displayed as-is
 */
export async function addFavorite(recipe, collectionId) {
  let response
  try {
    response = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: recipe.id,
        title: recipe.title,
        imageUrl: recipe.imageUrl,
        // RB-210: undefined is left out of the JSON, so a save with no
        // collection is the same three-field body it always was.
        collectionId: collectionId,
      }),
    })
  } catch {
    throw new Error(CANNOT_REACH)
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

/**
 * Removes one recipe from the favorites.
 *
 * Removing something that was never saved is not an error, for the same reason
 * as above: the browser can retry without having to check first.
 *
 * @param {number} id Spoonacular's recipe id
 * @throws {Error} with a message that can be displayed as-is
 */
export async function removeFavorite(id) {
  let response
  try {
    response = await fetch('/api/favorites/' + encodeURIComponent(id), {
      method: 'DELETE',
    })
  } catch {
    throw new Error(CANNOT_REACH)
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

/**
 * RB-205: writes the signed-in cook's note about one saved recipe.
 *
 * PUT rather than POST: writing the same note twice leaves the same note.
 *
 * The Content-Type header is required. Leave it off and Spring refuses the
 * body with 415, which reads like a sign-in problem when you are debugging.
 *
 * @param {number} id Spoonacular's recipe id
 * @param {string} note the text, or blank to clear it
 * @throws {Error} with a message that can be displayed as-is
 */
export async function saveNote(id, note) {
  let response
  try {
    response = await fetch('/api/favorites/' + encodeURIComponent(id) + '/note', {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: note,
    })
  } catch {
    throw new Error(CANNOT_REACH)
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}
