/**
 * RB-210: where does this recipe go?
 *
 * Real buttons rather than a <select>, so each choice is one click and the list
 * is reachable by keyboard without any extra work. Plain favorites is first
 * and is the same as not choosing a collection at all.
 *
 * @param {Array} props.collections  [{ id, name }]
 * @param {Function} props.onChoose  (collectionId | null) => void
 */
export default function CollectionPicker({ collections, onChoose }) {
  return (
    <div className="collection-picker" role="group" aria-label="Save to">
      <button type="button" onClick={() => onChoose(null)}>
        Favorites (no collection)
      </button>

      {collections.map((collection) => (
        <button key={collection.id} type="button" onClick={() => onChoose(collection.id)}>
          {collection.name}
        </button>
      ))}
    </div>
  )
}
