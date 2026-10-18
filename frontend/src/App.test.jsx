import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

/**
 * The route table, wired the way main.jsx wires it.
 *
 * Nothing tested App.jsx before, which is how this app spent a sprint showing
 * one hardcoded page while every other test stayed green. These tests are what
 * notice if a page stops being reachable.
 *
 * BrowserRouter on purpose rather than MemoryRouter: that is what main.jsx
 * uses, and a mistake there produces a blank browser page that MemoryRouter
 * tests would never see.
 */
function renderAt(path) {
  window.history.pushState({}, '', path)
  return render(<BrowserRouter><App /></BrowserRouter>)
}

describe('App routes', () => {
  it('shows the home page at /', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Recipe Builder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('shows the results page at /results', () => {
    renderAt('/results')
    expect(screen.getByRole('heading', { name: 'Your Recipes' })).toBeInTheDocument()
  })

  it('shows the favorites page at /favorites', () => {
    renderAt('/favorites')
    expect(screen.getByRole('heading', { name: 'Your Favorites' })).toBeInTheDocument()
  })

  it('shows the detail page at /recipe/:id', () => {
    renderAt('/recipe/716429')
    expect(screen.getByRole('button', { name: 'Back to Recipes' })).toBeInTheDocument()
  })
})
