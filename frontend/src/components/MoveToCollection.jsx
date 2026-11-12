/**
 * RB-210: the "Move to…" control on a saved recipe's card.
 *
 * A native <select>, so it is reachable by keyboard and labelled for a screen
 * reader with no extra work. It only reports the choice; the page does the
 * moving, so that dragging a card onto a deck runs the very same code.
 *
 * @param {number} props.recipeId
 * @param {string} props.recipeTitle           for the label
 * @param {Array} props.collections            [{ id, name }]
 * @param {number|null} props.currentCollectionId  null when the recipe is loose
 * @param {Function} props.onMove              (recipeId, collectionId | null) => void
 */
export default function MoveToCollection({
  recipeId, recipeTitle, collections, currentCollectionId, onMove,
}) {
  const places = collections.filter((one) => one.id !== currentCollectionId)
  const canBeLoose = currentCollectionId !== null

  // Nothing to choose, so no control. A select with only its heading in it
  // would be a dead end.
  if (places.length === 0 && !canBeLoose) {
    return null
  }

  function handleChange(event) {
    const chosen = event.target.value

    if (chosen === '') {
      return
    }

    onMove(recipeId, chosen === 'loose' ? null : Number(chosen))
  }

  // The value stays on the heading: if a move fails the card stays where it
  // was, and the control should not claim otherwise.
  return (
    <select
      className="move-to-collection"
      aria-label={'Move ' + recipeTitle + ' to…'}
      value=""
      onChange={handleChange}
    >
      <option value="">Move to…</option>
      {places.map((one) => (
        <option key={one.id} value={one.id}>{one.name}</option>
      ))}
      {canBeLoose && <option value="loose">Not in a collection</option>}
    </select>
  )
}
