import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RecipeCard from './RecipeCard'

vi.mock('../api/recipes')

function renderCard(props = {}, at = '/') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <RecipeCard
        id={660101}
        title="Simple Garlic Pasta"
        description="67% match - uses 2 of yours, needs 1 more."
        imageUrl="http://img/660101.jpg"
        {...props}
      />
    </MemoryRouter>,
  )
}

/**
 * RB-179: the card's own "View Recipe" control, finally wired up.
 *
 * A link on the existing button rather than a clickable card: the star sits
 * inside the card, and a link wrapping everything would contain a button -
 * ambiguous to screen readers, and tapping the star would navigate.
 */
describe('RecipeCard', () => {
  it('View Recipe opens this card own recipe', () => {
    renderCard()

    expect(screen.getByRole('link', { name: 'View Recipe' }))
      .toHaveAttribute('href', '/recipe/660101')
  })

  it('carries the current query string into the recipe address', () => {
    // The nav bar propagates whatever the address holds. If this link drops
    // the pantry list, leaving the detail page by the nav bar loses it.
    renderCard({}, '/results?ingredients=garlic&results=1')

    expect(screen.getByRole('link', { name: 'View Recipe' }))
      .toHaveAttribute('href', '/recipe/660101?ingredients=garlic&results=1')
  })

  it('keeps the star outside the link, so saving never navigates', () => {
    renderCard({ onFavoriteChange: () => {} })

    const star = screen.getByRole('button', { name: /Save Simple Garlic Pasta to favorites/ })
    const link = screen.getByRole('link', { name: 'View Recipe' })

    expect(link).not.toContainElement(star)
  })

  it('still renders as Andrew wrote it when no star is wanted', () => {
    renderCard()

    expect(screen.getByRole('heading', { name: 'Simple Garlic Pasta' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Simple Garlic Pasta' })).toBeInTheDocument()
    // No handler means no star, and the only control left is the link.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
