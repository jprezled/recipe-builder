import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipeNote from './RecipeNote'
import { saveNote } from '../api/recipes'

vi.mock('../api/recipes')

/**
 * RB-205: one cook's note about one saved recipe.
 *
 * The API module is mocked, so these cover the component's behaviour only -
 * no fetch, no database.
 */
describe('RecipeNote', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    saveNote.mockResolvedValue(undefined)
  })

  it('says so when there is no note yet', () => {
    render(<RecipeNote recipeId={660101} note={null} />)

    expect(screen.getByText('No note yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a note' })).toBeInTheDocument()
  })

  it('shows an existing note as text, not as a form', () => {
    // A page of saved recipes should read as recipes, not as a page of boxes.
    render(<RecipeNote recipeId={660101} note="double the garlic" />)

    expect(screen.getByText('double the garlic')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('opens an editor when asked', async () => {
    render(<RecipeNote recipeId={660101} note="double the garlic" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit note' }))

    expect(screen.getByRole('textbox')).toHaveValue('double the garlic')
  })

  it('saves what was typed', async () => {
    render(<RecipeNote recipeId={660101} note="" />)

    await userEvent.click(screen.getByRole('button', { name: 'Add a note' }))
    await userEvent.type(screen.getByRole('textbox'), 'used less salt')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))

    expect(saveNote).toHaveBeenCalledWith(660101, 'used less salt')
  })

  it('shows the saved note afterwards', async () => {
    render(<RecipeNote recipeId={660101} note="" />)

    await userEvent.click(screen.getByRole('button', { name: 'Add a note' }))
    await userEvent.type(screen.getByRole('textbox'), 'used less salt')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByText('used less salt')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('does not save anything when cancelled', async () => {
    render(<RecipeNote recipeId={660101} note="original" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit note' }))
    await userEvent.type(screen.getByRole('textbox'), ' and more')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(saveNote).not.toHaveBeenCalled()
    expect(screen.getByText('original')).toBeInTheDocument()
  })

  it('throws away the half-typed text when cancelled', async () => {
    // Reopening must show what is stored, not what was abandoned.
    render(<RecipeNote recipeId={660101} note="original" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit note' }))
    await userEvent.type(screen.getByRole('textbox'), ' and more')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Edit note' }))

    expect(screen.getByRole('textbox')).toHaveValue('original')
  })

  it('shows the sentence the backend sent when saving fails', async () => {
    saveNote.mockRejectedValue(new Error('Save this recipe before adding a note.'))
    render(<RecipeNote recipeId={660101} note="" />)

    await userEvent.click(screen.getByRole('button', { name: 'Add a note' }))
    await userEvent.type(screen.getByRole('textbox'), 'a note')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Save this recipe before adding a note.',
    )
  })

  it('keeps the editor open when saving fails, so nothing is lost', async () => {
    saveNote.mockRejectedValue(new Error('Could not reach the recipe service.'))
    render(<RecipeNote recipeId={660101} note="" />)

    await userEvent.click(screen.getByRole('button', { name: 'Add a note' }))
    await userEvent.type(screen.getByRole('textbox'), 'a note')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('textbox')).toHaveValue('a note')
  })
})
