import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'


/**
 * Shared navigation shown above every page.
 *
 * Scrolling down hides the bar after the visitor has moved away from the top
 * of the page. Scrolling up, or returning to the top, makes it visible again.
 */
export default function NavigationBar() {
  // Track whether the bar should slide out of view.
  const [isHidden, setIsHidden] = useState(false)

  // Remember the last observed scroll position so each scroll event can be
  // compared with the previous one to determine the scrolling direction.
  const previousScrollY = useRef(0)

  useEffect(() => {
    // Keep the bar visible near the top, and avoid reacting to tiny scroll
    // changes that can be caused by trackpads or browser rendering.
    const topThreshold = 80
    const movementThreshold = 4

    function handleScroll() {
      const currentScrollY = window.scrollY
      const movement = currentScrollY - previousScrollY.current

      // Always show the navigation when the visitor returns to the page top.
      if (currentScrollY <= 0) {
        setIsHidden(false)
      } else if (
        movement > movementThreshold &&
        currentScrollY > topThreshold
      ) {
        // Hide the bar when scrolling down beyond the top threshold.
        setIsHidden(true)
      } else if (movement < -movementThreshold) {
        // Show the bar as soon as the visitor scrolls back up.
        setIsHidden(false)
      }

      // Save this position for comparison with the next scroll event.
      previousScrollY.current = currentScrollY
    }

    // Match the initial reference position to the page's current scroll
    // position, then listen for scrolling without blocking page movement.
    previousScrollY.current = window.scrollY
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Remove the listener when the component is unmounted.
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <header
      className={`site-header${isHidden ? ' site-header-hidden' : ''}`}
      aria-hidden={isHidden}
      inert={isHidden}
    >
      <div className="site-header-inner">
        {/* Keep the site name as a convenient link back to Home. */}
        <NavLink className="site-name" to="/" end>
          Recipe Builder
        </NavLink>

        {/* Place the available page links together on the right. */}
        <nav className="site-navigation" aria-label="Main navigation">
          <NavLink className="site-nav-link" to="/" end>
            Home
          </NavLink>
          <NavLink className="site-nav-link" to="/results">
            Results
          </NavLink>
          <NavLink className="site-nav-link" to="/favorites">
            Favorites
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
