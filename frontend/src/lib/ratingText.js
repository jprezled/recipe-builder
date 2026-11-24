// RB-294: how a shared rating reads. One place, so a card and the detail page
// can never word it differently.

/**
 * @param {number} average
 * @param {number} count how many cooks rated it; 0 means nobody has
 * @returns {string} e.g. "4.5 ★ (2 ratings)", or "No rating" - never "0.0"
 */
export function formatRating(average, count) {
  if (!count || count <= 0) {
    return 'No rating'
  }

  const formattedAvg = Number(average).toFixed(1)
  const word = count === 1 ? 'rating' : 'ratings'
  return `${formattedAvg} ★ (${count} ${word})`
}
