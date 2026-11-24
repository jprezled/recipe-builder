import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getFavorites, searchRecipes } from '../api/recipes'
import { getRestrictions, saveRestrictions } from '../api/accounts'
import { getCollections } from '../api/collections'
import { getRecipeRatings } from '../api/ratings'
import RecipeCard from '../components/RecipeCard'
import IngredientInput from '../components/IngredientInput'

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
/**
 * RB-209: the applied filters, written out for a person.
 *
 * "gluten free" is the value the search sends; "Gluten free" is what a reader
 * sees. Two vocabularies that happen to look alike, same as the diet badges
 * on the recipe page - see docs/dietary-filter-contract.md.
 */
function describeFilters(diet, intolerances) {
  const parts = []

  if (diet) {
    parts.push(diet.charAt(0).toUpperCase() + diet.slice(1))
  }

  if (intolerances) {
    const names = intolerances.split(',')
    for (const one of names) {
      const trimmed = one.trim()
      if (trimmed) {
        parts.push('no ' + trimmed)
      }
    }
  }

  return parts.join(' \u00B7 ')
}

export default function ResultsPage({
  embedded = false,
  ingredients: suppliedIngredients,
  resultsUrl,
}) {
  // The standalone page gets its ingredients from the query string.
  // When this component is inside HomePage, Home passes the ingredients
  // directly as a prop instead.
  // Adds the two values to effect's watch list, so they appear with address changes
  const [searchParams, setSearchParams] = useSearchParams()
  const ingredients = suppliedIngredients ?? searchParams.get('ingredients') ?? ''

  // The restrictions always come from the address, even when the ingredients
  // arrive as a prop. The address is the one source of truth, so a filtered
  // search can be refreshed, bookmarked and shared.
  // RB-226: the sort lives in the address too, so refresh, Back and a shared
  // link all keep it. null means the default

  const diet = searchParams.get('diet')
  const intolerances = searchParams.get('intolerances')
  const sort = searchParams.get('sort')

  // RB-211: the filters the RESULTS ON SCREEN were fetched with.
  //
  // Separate from diet/intolerances above, which are what the cook has
  // currently ticked or typed. Ticking a filter or editing the ingredient
  // list changes those and nothing else; pressing Find recipes copies them
  // here, and only THAT runs a search. Ticking three boxes used to be three
  // paid Spoonacular calls - now it is none.
  //
  // Seeded from the address, so arriving at a link that already carries
  // ingredients and filters searches with them straight away.
  const [applied, setApplied] = useState({ ingredients, diet, intolerances })

  // RB-211: what is on screen but not yet searched for.
  //
  // Both halves are set freely and cost nothing until Find recipes is
  // pressed, so without this the page gives no sign that the recipes below
  // are answering an older question than the one on screen.
  const ingredientsChanged = ingredients !== applied.ingredients
  const filtersChanged = diet !== applied.diet || intolerances !== applied.intolerances

  // RB-251
  // Loads into an empty address only - the rule from RB-209a.
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
  const [ratingsById, setRatingsById] = useState({})

  // Keep errors separate from results so a failed request is not mistaken for
  // a successful search that simply found no recipes.
  const [errorMessage, setErrorMessage] = useState('')

  // Start in the loading state so the page can display "Searching..." while
  // its first request is running.
  const [isSearching, setIsSearching] = useState(true)

  // RB-211: the ingredient list on screen, as an array for the chips.
  const pantryList = ingredients ? ingredients.split(',').map((i) => i.trim()).filter(Boolean) : []

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
      setRatingsById({})

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
          searchRecipes(
            applied.ingredients,
            // Only the two restriction fields plus sort - applied also
            // carries the ingredients, which are the first argument.
            { diet: applied.diet, intolerances: applied.intolerances, sort },
          ),
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

        // RB-294: one request for the whole page of cards, not awaited, so the
        // cards show without waiting for it. A failure leaves the cards with no
        // rating line rather than a wrong "No rating".
        if (foundRecipes.length > 0) {
          getRecipeRatings(foundRecipes.map((recipe) => recipe.id))
            .then((summaries) => {
              if (!stillOnThisPage) {
                return
              }
              const nextRatings = {}
              for (const item of summaries) {
                if (item && item.id != null) {
                  nextRatings[item.id] = { average: item.average ?? 0, count: item.count ?? 0 }
                }
              }
              setRatingsById(nextRatings)
            })
            .catch(() => {})
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
  }, [sort, applied]) // `applied`, not the live ticks or the typed list

  /**
   * RB-211: write the ingredient list into the address.
   *
   * No search, for the same reason ticking a filter does not search - the
   * cook builds the list they want and then asks once. `replace` so adding
   * several ingredients does not put several entries in the Back button.
   */
  function putIngredientsInAddress(nextList) {
    const next = new URLSearchParams(searchParams)

    if (nextList.length > 0) {
      next.set('ingredients', nextList.join(','))
    } else {
      next.delete('ingredients')
    }

    setSearchParams(next, { replace: true })
  }

  function handleAddIngredient(chosen) {
    const current = ingredients ? ingredients.split(',') : []
    const wanted = chosen.trim()

    if (!wanted) {
      return
    }

    // A repeat is not an error, it is just nothing to do.
    const alreadyThere = current.some(
      (one) => one.trim().toLowerCase() === wanted.toLowerCase(),
    )

    if (!alreadyThere) {
      putIngredientsInAddress([...current, wanted])
    }
  }

  function handleRemoveIngredient(wanted) {
    const current = ingredients ? ingredients.split(',') : []
    putIngredientsInAddress(current.filter((one) => one !== wanted))
  }

  /**
   * RB-209: a tick. Remembered in the address so it survives the nav bar and
   * a refresh, and so it can be shared - but no search runs, because the
   * search effect does not watch these.
   */
  function handleFilterChange(chosenDiet, chosenIntolerances) {
    const next = new URLSearchParams(searchParams)

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

    // replace, so ticking several boxes does not put several entries in the
    // browser's Back button.
    setSearchParams(next, { replace: true })
  }

  function handleApplyFilters(chosenDiet, chosenIntolerances) {
    saveRestrictions(chosenDiet, chosenIntolerances.join(',')).catch(() => {})

    const next = new URLSearchParams(searchParams)

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

    // The one place ticking a filter spends a Spoonacular point. Copying the
    // on-screen ingredients and ticks into `applied` is what the search
    // effect is watching.
    setApplied({
      ingredients,
      diet: chosenDiet || null,
      intolerances: chosenIntolerances.length > 0 ? chosenIntolerances.join(',') : null,
    })
  }

  // === RB-226 Sort handler
  function handleSortChange(chosenSort) {
    const next = new URLSearchParams(searchParams)

    if (chosenSort && chosenSort !== DEFAULT_SORT) {
      next.set('sort', chosenSort)
    } else {
      next.delete('sort')
    }

    setSearchParams(next)
  }

  function handleFavoriteChange(id, isNowFavorite) {
    setFavoriteIds((currentIds) => {
      if (isNowFavorite) {
        return currentIds.includes(id) ? currentIds : [...currentIds, id]
      }
      return currentIds.filter((favoriteId) => favoriteId !== id)
    })
  }

  const foundNothing =
    !isSearching && !errorMessage && recipes.length === 0

  const PageWrapper = embedded ? 'section' : 'main'

  const expandUrl =
    resultsUrl ||
    '/results?ingredients=' + encodeURIComponent(ingredients)

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

        {embedded && (
          <Link className="button button-secondary" to={expandUrl}>
            Expand
          </Link>
        )}
      </div>

      {/* RB-211: change the ingredient list without leaving the page.
          Only on the standalone page - embedded, the home page above owns
          this list and has its own entry for it. */}
      {!embedded && (
        <div className="results-search">
          {/* RB-228: the same entry the home page uses, suggestions and all.
              The label is hidden because the placeholder says the same thing
              on screen - a screen reader still gets it, and the tests find
              the input by it. */}
          <IngredientInput
            id="results-ingredient"
            label="Ingredients"
            hideLabel
            placeholder="Add an ingredient, e.g. tomato, egg, celery"
            onAdd={handleAddIngredient}
          />

          {pantryList.length > 0 && (
            <ul className="ingredient-list">
              {pantryList.map((one) => (
                <li key={one}>
                  {one}{' '}
                  <button
                    type="button"
                    className="remove-ingredient"
                    onClick={() => handleRemoveIngredient(one)}
                    aria-label={'Remove ' + one}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Keyed on the APPLIED filters, not the live ticks. The key exists so
          the controls match the address after a refresh or a Back - but ticks
          now write to the address too, and keying on those would remount the
          controls on every click and wipe the tick that caused it.
          `applied` changes only when the button is pressed. */}
      <DietaryFilters
        key={(applied.diet ?? '') + '|' + (applied.intolerances ?? '')}
        selectedDiet={diet}
        selectedIntolerances={intolerances ? intolerances.split(',') : []}
        onApply={handleApplyFilters}
        onChange={handleFilterChange}
      />

      {(ingredientsChanged || filtersChanged) && (
        <p className="search-pending" role="status">
          {/* Named rather than lumped together, so the cook can tell at a
              glance whether the stale part is the list or the filters. */}
          {ingredientsChanged && filtersChanged
            ? 'Your ingredients and filters have changed.'
            : ingredientsChanged
              ? 'Your ingredients have changed.'
              : 'Your filters have changed.'}{' '}
          Press <strong>Find recipes</strong> to use them.
        </p>
      )}

      {/* RB-209: confirms the Find recipes press landed, and keeps saying so
          while the filters are on - which also answers "why are there fewer
          recipes?" later, when a saved preference applied them without being
          asked. role="status" so a screen reader announces it without
          stealing focus. */}
      {(diet || intolerances) && (
        <p className="filters-applied" role="status">
          Filters applied: <strong>{describeFilters(diet, intolerances)}</strong>
        </p>
      )}

      <div className="sort-control">
        <label htmlFor="sort-order">Show me</label>
        <select
          id="sort-order"
          value={sort ?? DEFAULT_SORT}
          onChange={(event) => handleSortChange(event.target.value)}
        >
          <option value={DEFAULT_SORT}>Most of my ingredients used</option>
          <option value={FEWEST_MISSING_SORT}>Fewest extra ingredients to buy</option>
        </select>
      </div>

      {isSearching && <p>Searching...</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {foundNothing && <p>No recipes found for those ingredients.</p>}

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
            rating={ratingsById[recipe.id]}
          />
        ))}
      </div>

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