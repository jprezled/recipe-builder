import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getFavorites, searchRecipes } from '../api/recipes'
import { getRestrictions, saveRestrictions } from '../api/accounts'
import { getCollections } from '../api/collections'
import RecipeCard from '../components/RecipeCard'

// Temporary preview: uncomment this import and the block below to inspect filter controls. done
import DietaryFilters from '../components/DietaryFilters'

// The default sort, from docs/sort-contract.md. It is never written into the
// address: no sort parameter at all means this one.
const DEFAULT_SORT = 'max-used-ingredients'
const FEWEST_MISSING_SORT = 'min-missing-ingredients'
/**
 * Displays recipes for the ingredients supplied to the page.
 *
 * This component has two uses:
 * - On its own at /results, it reads ingredients from the address bar.
 * - Inside HomePage, it receives ingredients as props and renders in a box.
 *
 * Both uses share the same search, favorite buttons, and recipe cards. This
 * avoids having one version of results for Home and another for /results.
 */
export default function ResultsPage({
  embedded = false,
  ingredients: suppliedIngredients,
  resultsUrl,
}) {
  // The standalone page gets its ingredients from the query string.
  // When this component is inside HomePage, Home passes the ingredients
  // directly as a prop instead.
  //Adds the two values to effect's watch list, so they appear with address changes
  const [searchParams, setSearchParams] = useSearchParams()
  const ingredients = suppliedIngredients ?? searchParams.get('ingredients') ?? ''

  // The restrictions always come from the address, even when the ingredients
  // arrive as a prop. The address is the one source of truth, so a filtered
  // search can be refreshed, bookmarked and shared.
  // RB-226: the sort lives in the address too, so refresh, Back and a shared
  // link all keep it.null means the default

  const diet = searchParams.get('diet')
  const intolerances = searchParams.get('intolerances')
  const sort = searchParams.get('sort')

// RB-251
// Loads into an empty address only — the rule from RB-209a. 
// The latch comment is the bug this story shipped once.
// two people the same thing - the same rule the home page follows for the
// pantry. Signed out, getRestrictions rejects, which is an answer and not a
// problem, so the rejection is swallowed.
const hasLoadedSaved = useRef(false)

useEffect(() => {
  if (hasLoadedSaved.current || diet || intolerances) {
    return
  }
  let stillOnThisPage = true

  getRestrictions()
    .then((saved) => {
      if (!stillOnThisPage) {
        return
      }

      // Latched here, not in the guard above. StrictMode runs this effect
      // twice in development and cancels the first attempt in between - a
      // latch set before the fetch would be spent on the attempt whose
      // result gets thrown away, and the second run would skip entirely.
      hasLoadedSaved.current = true

      if (!saved.diet && !saved.intolerances) {
        return
      }

      const next = new URLSearchParams(searchParams)
      if (saved.diet) {
        next.set('diet', saved.diet)
      }
      if (saved.intolerances) {
        next.set('intolerances', saved.intolerances)
      }
      setSearchParams(next, { replace: true })
    })
    .catch(() => {})

  return () => {
    stillOnThisPage = false
  }
  // Runs once. Re-running on every address change would fight the cook as
  // they clear a filter - they remove it, and it comes straight back.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])


// Store the recipes and favorite IDs separately. Recipes supply the card

  // content; favorite IDs tell each card whether its star should be selected.
  const [recipes, setRecipes] = useState([])
  const [favoriteIds, setFavoriteIds] = useState([])

  // RB-210: fetched once here and handed down, because fetching inside each
  // star would be one request per card.
  const [collections, setCollections] = useState([])

  // Keep errors separate from results so a failed request is not mistaken for
  // a successful search that simply found no recipes.
  const [errorMessage, setErrorMessage] = useState('')

  // Start in the loading state so the page can display "Searching..." while
  // its first request is running.
  const [isSearching, setIsSearching] = useState(true)

  // Search again when the ingredient list changes. This happens if the
  // standalone page's query string changes, or if Home passes a new list.
  useEffect(() => {
    // This flag prevents an older request from changing the screen after the
    // component has been removed or has started a search for different inputs.
    let stillOnThisPage = true

    async function loadResults() {
      // Clear old results and errors before starting a new search. This avoids
      // briefly showing recipes from the previous ingredient list.
      setIsSearching(true)
      setErrorMessage('')
      setRecipes([])
      setFavoriteIds([])
      setCollections([])

      // An empty list should not be sent to the recipe service.
      if (!ingredients.trim()) {
        setIsSearching(false)
        return
      }

      try {
        // Recipe search and favorite lookup are independent, so run them at
        // the same time. A favorites-service failure should not prevent the
        // recipe search from succeeding.
        const [foundRecipes, savedFavorites, savedCollections] = await Promise.all([
          //searchRecipes(ingredients), //legacy, add new paramters 
          searchRecipes(ingredients, { diet, intolerances, sort }),   
          getFavorites().catch(() => []),
          // A signed-out visitor is refused here, and that is normal: no picker,
          // and the star saves as it always did.
          getCollections().catch(() => []),
        ])

        // Ignore results if this component has since unmounted or started a
        // newer search.
        if (stillOnThisPage) {
          setRecipes(foundRecipes)
          setFavoriteIds(savedFavorites.map((favorite) => favorite.id))
          setCollections(savedCollections)
        }
      } catch (failure) {
        // A recipe-search error is shown to the user. Favorite lookup errors
        // are handled above and instead leave the stars unselected.
        if (stillOnThisPage) {
          setErrorMessage(
            failure.message || 'Could not load recipes. Please try again.',
          )
        }
      } finally {
        // Stop the loading message once both requests have settled.
        if (stillOnThisPage) {
          setIsSearching(false)
        }
      }
    }

    loadResults()

    // Mark this request as outdated if the component unmounts or ingredients
    // change before it finishes.
    return () => {
      stillOnThisPage = false
    }
  }, [ingredients, diet, intolerances, sort]) //added diet and intolerances 

// === RB-173 Apply Handler
  /**
   * Put the chosen restrictions in the address.
   *
   * Apply navigates rather than searching directly: the effect above already
   * re-runs when these change, so the address stays the one source of truth.
   */
  //function handleApplyFilters(chosenDiet, chosenIntolerances) {
  //  const next = new URLSearchParams(searchParams)
  function handleApplyFilters(chosenDiet, chosenIntolerances) {
    saveRestrictions(chosenDiet, chosenIntolerances.join(',')).catch(() => {})

    const next = new URLSearchParams(searchParams)

    // Removed rather than set to an empty value, so an unfiltered search has
    // a clean address and the request matches what it always sent.
    if (chosenDiet) {
      next.set('diet', chosenDiet)
    } else {
      next.delete('diet')
    }

    if (chosenIntolerances.length > 0) {
      next.set('intolerances', chosenIntolerances.join(','))
    } else {
      next.delete('intolerances')
    }

    setSearchParams(next)
  }

  // === RB-226 Sort handler
  /**
   * Put the chosen sort in the address.
   *
   * Like Apply, this does not search directly: the effect above re-runs when
   * the address changes. The default is removed rather than written, so a
   * plain search keeps its old address and its old cache entry.
   */
  function handleSortChange(chosenSort) {
    const next = new URLSearchParams(searchParams)

    if (chosenSort && chosenSort !== DEFAULT_SORT) {
      next.set('sort', chosenSort)
    } else {
      next.delete('sort')
    }

    setSearchParams(next)
  } 

  /**
   * Keep the star state in sync after a favorite button is clicked.
   *
   * FavoriteButton handles saving or removing the favorite through the API.
   * This callback updates the IDs used to display the stars on this page.
   */
  function handleFavoriteChange(id, isNowFavorite) {
    setFavoriteIds((currentIds) => {
      if (isNowFavorite) {
        // Avoid adding the same ID twice if the callback is repeated.
        return currentIds.includes(id) ? currentIds : [...currentIds, id]
      }

      // Remove this recipe's ID after it is unfavorited.
      return currentIds.filter((favoriteId) => favoriteId !== id)
    })
  }

  // Show the empty-results message only after a successful search has finished.
  const foundNothing =
    !isSearching && !errorMessage && recipes.length === 0

  // Use a section when embedded inside Home's main landmark. Use main when
  // this component is the full, standalone Results page.
  const PageWrapper = embedded ? 'section' : 'main'

  // Home passes the URL to use for Expand. The fallback also supports using
  // this component in another embedded location later.
  const expandUrl =
    resultsUrl ||
    '/results?ingredients=' + encodeURIComponent(ingredients)

  // Built from the current address rather than from scratch, so going back to
  // edit the ingredients does not silently drop the cook's diet and
  // intolerances - they chose those, and an unfiltered search is a different
  // search.
  const backToIngredients = new URLSearchParams(searchParams)
  backToIngredients.set('ingredients', ingredients)
  const backToIngredientsSearch = backToIngredients.toString()

  return (
    <PageWrapper
      className={
        embedded
          ? 'results-page results-page-embedded'
          : 'results-page'
      }
    >
      <div className="results-heading">
        <div className="results-heading-text">
          <h1>Your Recipes</h1>
          <p className="tagline">
            Here is what you can make with the ingredients you have added.
          </p>
        </div>

        {/* Expand is only needed in the embedded version. It opens the same
            results as a dedicated page, using the current ingredient list. */}
        {embedded && (
          <Link className="button button-secondary" to={expandUrl}>
            Expand
          </Link>
        )}
      </div>

      
      
      

      {/* The key remounts the controls when the applied choices change, so
      they always show what the address actually asked for - including
      after a refresh or a Back. */}
      <DietaryFilters
        key={(diet ?? '') + '|' + (intolerances ?? '')}
        selectedDiet={diet}
        selectedIntolerances={intolerances ? intolerances.split(',') : []}
        onApply={handleApplyFilters}
      />

      {/* RB-227: one choice, so it applies straight away - no Apply button.
          Its value comes from the address, so it always shows what the
          address asked for, including after a refresh or a Back. */}
      <div className="sort-control">
        <label htmlFor="sort-order">Sort by</label>
        <select
          id="sort-order"
          value={sort ?? DEFAULT_SORT}
          onChange={(event) => handleSortChange(event.target.value)}
        >
          <option value={DEFAULT_SORT}>Most of my ingredients used</option>
          <option value={FEWEST_MISSING_SORT}>Fewest extra ingredients to buy</option>
        </select>
      </div>


      {/* Keep the user informed while the recipe search is running. */}
      {isSearching && <p>Searching...</p>}

      {/* role="alert" helps assistive technology announce an error promptly. */}
      {errorMessage && <p role="alert">{errorMessage}</p>}

      {/* Only show this after a successful search has completed with no hits. */}
      {foundNothing && <p>No recipes found for those ingredients.</p>}

      {/* Each recipe becomes one card. The ID is its stable React key and is
          also used to determine whether its favorite star is selected. */}
      <div
        className={
          embedded
            ? 'recipe-grid recipe-grid-embedded'
            : 'recipe-grid'
        }
      >
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            id={recipe.id}
            title={recipe.title}
            description={
              recipe.matchPercent +
              '% match - uses ' +
              recipe.ingredientsYouHave +
              ' of yours, needs ' +
              recipe.ingredientsYouNeed +
              ' more.'
            }
            imageUrl={recipe.imageUrl}
            isFavorite={favoriteIds.includes(recipe.id)}
            onFavoriteChange={handleFavoriteChange}
            collections={collections}
          />
        ))}
      </div>

      {/* The embedded version has Expand instead of a Back button. The
          standalone Results page keeps the existing route back to Home. */}
      {!embedded && (
        <div className="button-group">
          <Link
            className="button button-secondary"
            to={{ pathname: '/', search: backToIngredientsSearch }}
          >
            Back to Ingredients
          </Link>
        </div>
      )}
    </PageWrapper>
  )

  
}
