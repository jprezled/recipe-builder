import { useState } from 'react'
import { addFavorite, removeFavorite } from '../api/recipes'
import CollectionPicker from './CollectionPicker'

/**
 * The control that saves a recipe, and takes it back off again.
 *
 * ---------------------------------------------------------------------------
 * THE LOOK OF THIS BELONGS TO THE FRONTEND TEAM.
 *
 * Restyle the glyph, the colours, the size, the hover state - all of it. Two
 * things need to survive whatever you do:
 *
 *   1. aria-label. A bare star is announced to a screen reader as "star",
 *      which tells a blind cook nothing. It is ALSO how the tests find this
 *      control, so dropping it turns the suite red.
 *   2. aria-pressed. This is what says the control is a toggle that is
 *      currently on or off, rather than a button that does something new each
 *      time.
 *
 * Everything below the return is behaviour, not design - please leave it be.
 * ---------------------------------------------------------------------------
 *
 * @param {object} props.recipe        { id, title, imageUrl }
 * @param {boolean} props.isFavorite   whether it is currently saved
 * @param {Function} props.onChange    (id, isNowFavorite) => void
 * @param {Array} [props.collections]  RB-210: the cook's collections. When there
 *                                     are any, saving asks which one first.
 *                                     Absent or empty and the star saves
 *                                     straight away, as it always did.
 * @param {string} [props.variant]     "star" (default) for the glyph on a card,
 *                                     or "text" for Andrew's wider
 *                                     "Save to Favorites" button on the detail
 *                                     page. Same behaviour either way.
 */
export default function FavoriteButton({
  recipe, isFavorite, onChange, collections, variant = 'star',
}) {
  const [errorMessage, setErrorMessage] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // A choice only exists when there are collections, and only when saving:
  // removing has nothing to choose.
  const canChoose = !isFavorite && Array.isArray(collections) && collections.length > 0

  function handleClick() {
    if (canChoose) {
      setIsPickerOpen((open) => !open)
      return
    }
    save(null)
  }

  // collectionId is null for plain favorites.
  async function save(collectionId) {
    const wasFavorite = isFavorite
    setIsPickerOpen(false)

    setErrorMessage('')
    setIsWorking(true)

    // Change it IMMEDIATELY, before the request finishes. A control that waits
    // for a round trip feels broken even when it is working. If the request
    // then fails we put it back, below.
    onChange(recipe.id, !wasFavorite)

    try {
      if (wasFavorite) {
        await removeFavorite(recipe.id)
      } else {
        if (collectionId === null) {
          await addFavorite(recipe)
        } else {
          await addFavorite(recipe, collectionId)
        }
      }
    } catch (failure) {
      // Undo the optimistic change - this must never claim a recipe was saved
      // when it was not.
      onChange(recipe.id, wasFavorite)
      setErrorMessage(failure.message)
    } finally {
      setIsWorking(false)
    }
  }

  const label = isFavorite
    ? 'Remove ' + recipe.title + ' from favorites'
    : 'Save ' + recipe.title + ' to favorites'

  // The text variant keeps Andrew's own wording and his .button class, so his
  // detail page still reads the way he designed it.
  const isText = variant === 'text'

  return (
    <>
      <button
        type="button"
        className={isText ? 'button' : 'favorite-button'}
        onClick={handleClick}
        disabled={isWorking}
        aria-pressed={isFavorite}
        aria-expanded={canChoose ? isPickerOpen : undefined}
        aria-label={label}
      >
        {isText
          ? (isFavorite ? 'Remove from Favorites' : 'Save to Favorites')
          : (isFavorite ? '★' : '☆')}
      </button>

      {isPickerOpen && <CollectionPicker collections={collections} onChoose={save} />}

      {errorMessage && <p role="alert">{errorMessage}</p>}
    </>
  )
}
