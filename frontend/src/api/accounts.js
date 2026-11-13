// Every network call about who you are.
//
// A NEW module rather than additions to recipes.js, deliberately: two other
// stories already modify that file this sprint, and three stories editing one
// module is the worst case for a merge. Splitting costs nothing.
//
// Same contract as recipes.js - components call a function and get plain data,
// or an Error whose message is safe to show a person. The messages below are
// fixed by docs/error-shape.md and docs/accounts-contract.md; do not reword
// them here without changing those files first.

/** Shown when fetch itself fails, so there is no response to read. */
const CANNOT_REACH = 'Could not reach the recipe service. Is the backend running?'

/** Shown when a failure arrives but carries no message we can display. */
const UNKNOWN_PROBLEM = 'Something went wrong. Please try again.'

/**
 * Reads the one sentence out of a failed response.
 *
 * Our backend sends every error as {"message": "..."}, so we read that and pass
 * it straight on, exactly as recipes.js does. We never rewrite it or decide
 * anything from the status code - the sentence is already written for a person.
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
    // The body was not JSON. Fall through to the generic sentence.
  }
  return UNKNOWN_PROBLEM
}

/**
 * Sends one request and turns any failure into a displayable Error.
 *
 * Shared by the four functions below because all four handle failure the same
 * way. Relative address only - Vite forwards /api to the backend, so the
 * browser never talks to port 8080 and CORS never applies.
 *
 * @param {string} address a relative /api/... path
 * @param {object} [options] fetch options
 * @returns {Promise<Response>} a successful response
 * @throws {Error} with a message that can be displayed as-is
 */
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

/** The shape of a POST carrying JSON. */
function asJson(body) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/**
 * Creates an account.
 *
 * @param {{username: string, email: string, password: string}} details
 * @returns {Promise<{id: number, username: string}>} the new account
 * @throws {Error} with a message that can be displayed as-is
 */
export async function signUp({ username, email, password }) {
  const response = await send('/api/users', asJson({ username, email, password }))
  return response.json()
}

/**
 * Signs in.
 *
 * Nothing is stored here. Tomcat sends a JSESSIONID cookie and the browser
 * returns it on every later request, which is the whole of "staying signed
 * in" - there is no token for us to keep.
 *
 * @param {{username: string, password: string}} details
 * @returns {Promise<{id: number, username: string}>} who signed in
 * @throws {Error} with a message that can be displayed as-is
 */
export async function signIn({ username, password }) {
  const response = await send('/api/sessions', asJson({ username, password }))
  return response.json()
}

/**
 * Signs out.
 *
 * Safe to call when nobody is signed in - the backend answers 204 either way,
 * so the browser never has to check first.
 *
 * @throws {Error} with a message that can be displayed as-is
 */
export async function signOut() {
  await send('/api/sessions', { method: 'DELETE' })
}

/**
 * Who is signed in.
 *
 * REJECTS when nobody is. That rejection is an answer, not a problem: callers
 * catch it and treat it as "signed out" rather than putting the 401 sentence
 * on screen.
 *
 * @returns {Promise<{id: number, username: string}>} the signed-in account
 * @throws {Error} when nobody is signed in
 */
export async function getSession() {
  const response = await send('/api/session')
  return response.json()
}


/**
 * RB-209: the signed-in cook's saved dietary choices.
 *
 * Rejects when nobody is signed in, exactly as getSession does.
 * JSON both ways, matching the controller. 
 *
 * @returns {Promise<{diet: string, intolerances: string}>} empty strings when
 *          nothing is saved
 */
export async function getRestrictions() {
  const response = await send('/api/restrictions', { method: 'GET' })
  return response.json()
}

/**
 * RB-209: replaces the saved choices.
 *
 * @param {string} diet         one agreed diet, "none", or blank to clear
 * @param {string} intolerances agreed intolerances, "none", or blank to clear
 */
export async function saveRestrictions(diet, intolerances) {
  await send('/api/restrictions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diet, intolerances }),
  })
}
