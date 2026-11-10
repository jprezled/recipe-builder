import { useState } from 'react'
import { saveNote } from '../api/recipes'

/**
 * RB-205: one cook's note about one saved recipe.
 *
 * Starts as a line of text with an Edit control rather than an open textarea,
 * so a page of saved recipes reads as recipes and not as a page of forms.
 *
 * The note is saved explicitly rather than as the cook types. Saving on every
 * keystroke would be one database write per character.
 */
export default function RecipeNote({ recipeId, note }) {
  const [saved, setSaved] = useState(note || '')
  const [draft, setDraft] = useState(note || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSave() {
    setIsSaving(true)
    setErrorMessage('')
    try {
      await saveNote(recipeId, draft)
      setSaved(draft.trim())
      setIsEditing(false)
    } catch (failure) {
      // Whatever the backend sent, shown as-is. The wording is fixed in
      // docs/error-shape.md, not here. The editor stays open so the typed
      // text is not lost.
      setErrorMessage(failure.message)
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    // Put the draft back to what is actually stored, so cancelling cannot
    // leave half-typed text behind for the next time the editor opens.
    setDraft(saved)
    setIsEditing(false)
    setErrorMessage('')
  }

  if (!isEditing) {
    return (
      <div className="note">
        {saved
          ? <p className="note-text">{saved}</p>
          : <p className="note-empty">No note yet.</p>}

        <button type="button" className="note-edit" onClick={() => setIsEditing(true)}>
          {saved ? 'Edit note' : 'Add a note'}
        </button>
      </div>
    )
  }

  return (
    <div className="note">
      <label htmlFor={'note-' + recipeId}>Your note</label>
      <textarea
        id={'note-' + recipeId}
        className="note-input"
        rows={3}
        maxLength={500}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <div className="note-actions">
        <button type="button" className="note-save" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save note'}
        </button>
        <button type="button" className="note-cancel" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </div>
  )
}
