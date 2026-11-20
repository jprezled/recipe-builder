import { useEffect, useRef, useState } from 'react'
import { getRecipeRating, submitRecipeRating } from '../api/ratings'

const SIGN_IN_NOTICE = 'Please sign in to rate recipes.'
const DEFAULT_ERROR = 'Could not save your rating.'

function formatSummary(average, count) {
  if (!count || count <= 0) {
    return 'No rating'
  }
  const formattedAvg = Number(average).toFixed(1)
  const word = count === 1 ? 'rating' : 'ratings'
  return `${formattedAvg} ★ (${count} ${word})`
}

/**
 * RB-297d: shared rating summary + interactive 1-5 star picker popover
 * for the recipe detail page.
 */
export default function RecipeRating({ recipeId }) {
  const [summary, setSummary] = useState({ average: 0, count: 0, yourRating: null })
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const wrapperRef = useRef(null)

  useEffect(() => {
    let active = true
    setNotice('')
    setIsOpen(false)
    setHoveredStar(0)

    getRecipeRating(recipeId)
      .then((data) => {
        if (active) {
          setSummary({
            average: data.average ?? 0,
            count: data.count ?? 0,
            yourRating: data.yourRating ?? null,
          })
        }
      })
      .catch(() => {
        if (active) {
          setSummary({ average: 0, count: 0, yourRating: null })
        }
      })

    return () => {
      active = false
    }
  }, [recipeId])

  useEffect(() => {
    if (!isOpen) return
    function handleOutsideClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
        setNotice('')
        setHoveredStar(0)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  function handleTogglePopover() {
    setNotice('')
    setHoveredStar(0)
    setIsOpen((open) => !open)
  }

  async function handleSelectStar(stars) {
    if (isSubmitting) return
    setNotice('')
    setIsSubmitting(true)
    try {
      const updated = await submitRecipeRating(recipeId, stars)
      setSummary({
        average: updated.average ?? 0,
        count: updated.count ?? 0,
        yourRating: updated.yourRating ?? stars,
      })
      setIsOpen(false)
      setHoveredStar(0)
    } catch (error) {
      if (error.status === 401) {
        setNotice(SIGN_IN_NOTICE)
      } else {
        setNotice(error.message || DEFAULT_ERROR)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeHighlight = hoveredStar || summary.yourRating || 0

  return (
    <div className="recipe-rating" ref={wrapperRef}>
      <button
        type="button"
        className="button button-secondary recipe-rating-trigger"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={handleTogglePopover}
      >
        <span className="recipe-rating-summary">{formatSummary(summary.average, summary.count)}</span>
        {summary.yourRating != null && (
          <span className="recipe-rating-yours">Your rating: {summary.yourRating} ★</span>
        )}
      </button>

      {isOpen && (
        <div className="recipe-rating-popover" role="dialog" aria-label="Rate this recipe">
          <p className="recipe-rating-prompt">
            {summary.yourRating != null
              ? `Update your rating (currently ${summary.yourRating} ★):`
              : 'Rate this recipe (1 to 5 stars):'}
          </p>
          <div
            className="recipe-rating-stars"
            role="group"
            aria-label="1 to 5 stars"
            onMouseLeave={() => setHoveredStar(0)}
          >
            {[1, 2, 3, 4, 5].map((value) => {
              const lit = value <= activeHighlight
              return (
                <button
                  key={value}
                  type="button"
                  disabled={isSubmitting}
                  className={lit ? 'star-btn star-btn-lit' : 'star-btn'}
                  aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                  onMouseEnter={() => setHoveredStar(value)}
                  onFocus={() => setHoveredStar(value)}
                  onClick={() => handleSelectStar(value)}
                >
                  ★
                </button>
              )
            })}
          </div>
          {notice && (
            <p className="recipe-rating-notice" role="status">
              {notice}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
