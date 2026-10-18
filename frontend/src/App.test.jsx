import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./api/recipes')

/**
 * What the app actually puts on screen.
 *
 * Nothing tested this before, which is how the app spent a whole sprint
 * rendering a hardcoded mockup while 14 tests stayed green. A test here is the
 * only thing that notices when App.jsx is pointed at a static page.
 */
describe('App', () => {
  it('puts a working search box on screen', () => {
    render(<App />)

    expect(screen.getByLabelText('Ingredient')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('does not render a hardcoded mockup', () => {
    // The two static pages that used to be wired here.
    render(<App />)

    expect(screen.queryByText(/Swiss Bircher Muesli/)).not.toBeInTheDocument()
    expect(screen.queryByText(/No favorites yet/)).not.toBeInTheDocument()
  })
})
