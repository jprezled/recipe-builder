/** RB-297 / RB-294: recipe rating API calls. */

async function parseJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'Could not load rating.')
    error.status = response.status
    throw error
  }
  return data
}

export async function getRecipeRating(recipeId) {
  const response = await fetch(`/api/recipes/${recipeId}/rating`, {
    credentials: 'include',
  })
  return parseJson(response)
}

export async function submitRecipeRating(recipeId, rating) {
  const response = await fetch(`/api/recipes/${recipeId}/rating`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  })
  return parseJson(response)
}

export async function getRecipeRatings(ids) {
  const list = Array.isArray(ids) ? ids : []
  if (list.length === 0) return []
  const query = encodeURIComponent(list.join(','))
  const response = await fetch(`/api/recipes/ratings?ids=${query}`, {
    credentials: 'include',
  })
  return parseJson(response)
}
