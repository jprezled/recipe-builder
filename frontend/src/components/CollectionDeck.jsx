import { useState } from 'react'

/**
 * RB-210: one collection, as a deck on the favourites page.
 *
 * Shows its name and count; clicking unfolds its recipes (the children) in
 * place. Rename and delete live here too. It does no HTTP: the page owns that,
 * and a failure comes back as a thrown Error whose message is shown as-is.
 *
 * @param {object} props.collection     { id, name }
 * @param {number} props.recipeCount
 * @param {boolean} props.isOpen
 * @param {Function} props.onToggle     (id) => void
 * @param {Function} props.onRename     async (id, name) => void, throws to refuse
 * @param {Function} props.onDelete     async (id) => void, throws to refuse
 * @param {Function} [props.onDropRecipe]  (recipeId, collectionId) => void
 * @param {Array} [props.coverImages]     up to 2 image URLs from the collection's
                                     own recipes, newest first. Only the
                                     first 2 are shown; a missing or absent
                                     image leaves that slot blank rather
                                     than skipping to the next recipe.
 */
export default function CollectionDeck({
  collection, recipeCount, isOpen, onToggle, onRename, onDelete, onDropRecipe,
  coverImages = [], children,
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draft, setDraft] = useState(collection.name)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const countText = recipeCount + (recipeCount === 1 ? ' recipe' : ' recipes')
  const slots = [0, 1].map((position) => coverImages[position] || null)

  async function handleSaveName() {
    setErrorMessage('')
    try {
      await onRename(collection.id, draft)
      setIsRenaming(false)
    } catch (failure) {
      // The field stays open so what was typed is not lost.
      setErrorMessage(failure.message)
    }
  }

  async function handleConfirmDelete() {
    setErrorMessage('')
    try {
      await onDelete(collection.id)
    } catch (failure) {
      setErrorMessage(failure.message)
      setIsConfirmingDelete(false)
    }
  }

  // Dropping is only allowed where a drop handler exists. preventDefault on
  // dragover is what tells the browser this element accepts a drop at all.
  function handleDragOver(event) {
    if (onDropRecipe) {
      event.preventDefault()
      setIsDragOver(true)
    }
  }

  function handleDrop(event) {
    setIsDragOver(false)
    if (!onDropRecipe) {
      return
    }
    event.preventDefault()
    const recipeId = Number(event.dataTransfer.getData('text/plain'))
    if (recipeId > 0) {
      onDropRecipe(recipeId, collection.id)
    }
  }

  return (
    <section
      className={
        'recipe-card collection-deck'
        + (isOpen ? ' collection-deck-open' : '')
        + (isDragOver ? ' collection-deck-over' : '')
      }
      data-testid={'deck-' + collection.id}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {isRenaming ? (
        <div className="collection-rename">
          <input
            type="text"
            aria-label="Collection name"
            value={draft}
            maxLength={50}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="button" onClick={handleSaveName}>Save name</button>
          <button
            type="button"
            onClick={() => {
              setDraft(collection.name)
              setIsRenaming(false)
              setErrorMessage('')
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="collection-deck-header">
          <button
            type="button"
            className="collection-deck-toggle"
            aria-expanded={isOpen}
            onClick={() => onToggle(collection.id)}
          >
            <div className="collection-deck-collage">
              {slots.map((imageUrl, position) => (
                imageUrl
                  ? (
                    <img
                      key={position}
                      src={imageUrl}
                      alt=""
                      data-testid="collection-cover-image"
                      className="collection-deck-cover"
                    />
                  )
                  : (
                    <div
                      key={position}
                      data-testid="collection-cover-blank"
                      className="collection-deck-cover-blank"
                    />
                  )
              ))}

              <div className="collection-deck-caption">
                <span className="collection-deck-name">{collection.name}</span>
                <span className="collection-deck-count">{countText}</span>
              </div>
            </div>
          </button>

          <div className="collection-deck-actions">
            <button
              type="button"
              className="collection-deck-action"
              aria-label={'Rename ' + collection.name}
              onClick={() => setIsRenaming(true)}
            >
              Rename
            </button>
            <button
              type="button"
              className="collection-deck-action"
              aria-label={'Delete ' + collection.name}
              onClick={() => setIsConfirmingDelete(true)}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Asked on the page rather than with window.confirm, which blocks the
          browser and the tooling the team uses. */}
      {isConfirmingDelete && (
        <div className="collection-confirm">
          <p>
            Delete {collection.name}? Its recipes stay in your favorites.
          </p>
          <button type="button" onClick={handleConfirmDelete}>Yes, delete</button>
          <button type="button" onClick={() => setIsConfirmingDelete(false)}>Cancel</button>
        </div>
      )}

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {isOpen && <div className="collection-deck-recipes">{children}</div>}
    </section>
  )
}
