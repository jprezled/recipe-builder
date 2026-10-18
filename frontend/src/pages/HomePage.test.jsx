import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import HomePage from './HomePage'

/** Stands in for the results page, and shows what it was asked for. */
function FakeResults() {
  const [searchParams] = useSearchParams()
  return <p>asked for: {searchParams.get('ingredients')}</p>
}

function renderHome(entry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<FakeResults />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function add(name) {
  await userEvent.type(screen.getByLabelText('Ingredient'), name)
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
}

/**
 * Andrew's add-to-a-list design, made real. His Add button, his "Your
 * ingredients" heading, his wording and his CSS classes all stay; only the
 * hardcoded Eggs / Milk / Flour becomes state.
 *
 * Adding one at a time is also what removes the comma problem: typing
 * "green onion" into a single comma-separated box is ambiguous, but pressing
 * Add makes it unambiguously one ingredient.
 */
describe('HomePage', () => {
  it('adds a typed ingredient to the list', async () => {
    renderHome()
    await add('eggs')
    expect(screen.getByRole('listitem')).toHaveTextContent('eggs')
  })

  it('no longer shows the hardcoded Eggs / Milk / Flour', () => {
    renderHome()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('empties the box after adding, ready for the next one', async () => {
    renderHome()
    await add('eggs')
    expect(screen.getByLabelText('Ingredient')).toHaveValue('')
  })

  it('keeps a two-word ingredient whole', async () => {
    // The reason Add beats a comma-separated box: "green onion" is ONE
    // ingredient, and pressing Add says so without any separator to guess.
    renderHome()
    await add('green onion')
    expect(screen.getByRole('listitem')).toHaveTextContent('green onion')
  })

  it('sends the whole list to the results page', async () => {
    renderHome()
    await add('eggs')
    await add('milk')
    await userEvent.click(screen.getByRole('button', { name: 'Generate Recipes' }))
    expect(await screen.findByText('asked for: eggs,milk')).toBeInTheDocument()
  })

  it('splits a comma list typed in one go into separate rows', async () => {
    renderHome()
    await add('eggs, milk, cheese')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('does not add the same ingredient twice, whatever the capitalisation', async () => {
    renderHome()
    await add('eggs')
    await add('Eggs')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('ignores Add when only spaces were typed', async () => {
    renderHome()
    await add('   ')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('takes an ingredient back off the list', async () => {
    renderHome()
    await add('eggs')
    await add('milk')
    await userEvent.click(screen.getByRole('button', { name: 'Remove eggs' }))
    const left = screen.getAllByRole('listitem')
    expect(left).toHaveLength(1)
    expect(left[0]).toHaveTextContent('milk')
  })

  it('cannot generate recipes with an empty list', () => {
    renderHome()
    expect(screen.getByRole('button', { name: 'Generate Recipes' })).toBeDisabled()
  })

  it('picks the pantry list back up from the address', () => {
    renderHome('/?ingredients=eggs,milk,flour')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('keeps Andrew’s link to the favorites page', () => {
    renderHome()
    expect(screen.getByRole('link', { name: 'View Favorites' })).toBeInTheDocument()
  })
})
