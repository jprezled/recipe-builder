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
 * Searches for recipes using one ingredient.
 *
 * @param {string} ingredient what the user typed, e.g. "apple"
 * @returns {Promise<Array>} the recipes, or an empty array if none matched
 * @throws {Error} with a message that can be displayed as-is
 */
export async function searchRecipes(ingredient) {
  // STEP 1: build a RELATIVE address.
  //
  // Vite forwards /api to the backend on 8080, so the browser only ever talks
  // to 5173 and CORS never applies. Writing the full localhost:8080 URL here
  // would bypass the proxy and break in a deployed build.
  //
  // encodeURIComponent escapes the value - "green onion" has a space, and a
  // space is not legal in a URL.
  const address = '/api/recipes/search?ingredient=' + encodeURIComponent(ingredient)

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
  //
  // Our backend sends every error as {"message": "..."}, so we read that and
  // pass it straight on. We do not rewrite it, shorten it, or decide anything
  // from the status code - the sentence is already written for a person.
  if (!response.ok) {
    let message = UNKNOWN_PROBLEM
    try {
      const body = await response.json()
      if (body && typeof body.message === 'string' && body.message.length > 0) {
        message = body.message
      }
    } catch {
      // The body was not JSON. Keep the generic message.
    }
    throw new Error(message)
  }

  // STEP 4: success. Hand back the recipes exactly as the backend sent them.
  return response.json()
}
