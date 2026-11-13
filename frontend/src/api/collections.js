// RB-210: every network call about collections.
//
// Same contract as recipes.js and accounts.js - components call a function and
// get plain data, or an Error whose message is safe to show a person. The
// sentences are fixed by docs/error-shape.md; they come from the server and are
// passed on untouched.

const CANNOT_REACH = 'Could not reach the recipe service. Is the backend running?'
const UNKNOWN_PROBLEM = 'Something went wrong. Please try again.'

async function readErrorMessage(response) {
  try {
    const body = await response.json()
    if (body && typeof body.message === 'string' && body.message.length > 0) {
      return body.message
    }
  } catch {
    // The body was not JSON. Fall through to the generic sentence.
  }
  return UNKNOWN_PROBLEM
}

/** Relative addresses only - Vite forwards /api to the backend. */
async function send(address, options) {
  let response
  try {
    response = await fetch(address, options)
  } catch {
    throw new Error(CANNOT_REACH)
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response
}

/** @returns {Promise<Array>} [{ id, name }], newest first */
export async function getCollections() {
  const response = await send('/api/collections')
  return response.json()
}

/** @returns {Promise<object>} the created { id, name } */
export async function createCollection(name) {
  const response = await send('/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return response.json()
}

export async function renameCollection(id, name) {
  await send('/api/collections/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteCollection(id) {
  await send('/api/collections/' + encodeURIComponent(id), { method: 'DELETE' })
}

/**
 * Puts a saved recipe into a collection.
 *
 * @param {number} recipeId Spoonacular's recipe id
 * @param {number|null} collectionId the collection, or null to make it loose
 */
export async function moveRecipeToCollection(recipeId, collectionId) {
  await send('/api/favorites/' + encodeURIComponent(recipeId) + '/collection', {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: collectionId === null ? '' : String(collectionId),
  })
}
