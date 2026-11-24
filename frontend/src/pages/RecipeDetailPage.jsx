import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getFavorites, getRecipe, getRecipeCost } from '../api/recipes'
import { getCollections } from '../api/collections'
import FavoriteButton from '../components/FavoriteButton'
import RecipeNote from '../components/RecipeNote' 

/**
 * Shown when a failure arrives with no message we can display. The same
 * sentence ResultsPage uses, so one wording covers both pages.
 */
const COULD_NOT_LOAD = 'Could not load recipes. Please try again.'

/**
 * The labels a recipe reports about itself.
 *
 * Field name and label are kept apart on purpose: these labels are NOT the
 * strings the dietary filter sends. The filter sends "gluten free" as a search
 * parameter; this is a badge reading "Gluten free". Two vocabularies that
 * happen to look alike - see docs/dietary-filter-contract.md.
 */
const DIET_LABELS = [
  { field: 'vegetarian', label: 'Vegetarian' },
  { field: 'vegan', label: 'Vegan' },
  { field: 'glutenFree', label: 'Gluten free' },
  { field: 'dairyFree', label: 'Dairy free' },
]

const NUTRITION_ROWS = [
  { field: 'calories', label: 'Calories', unit: ' kcal' },
  { field: 'fat', label: 'Fat', unit: 'g' },
  { field: 'saturatedFat', label: 'Saturated fat', unit: 'g' },
  { field: 'carbohydrates', label: 'Carbohydrates', unit: 'g' },
  { field: 'sugar', label: 'Sugar', unit: 'g' },
  { field: 'protein', label: 'Protein', unit: 'g' },
]

/**
 * RB-291: the lowest and highest servings the stepper allows.
 *
 * Below 1 a recipe stops making sense; above 20 nobody is actually cooking
 * for that many people from this app. See docs/recipe-scaling-contract.md.
 */
const MIN_SERVINGS = 1
const MAX_SERVINGS = 20


/**
 * RB-291: one ingredient line, scaled to the chosen servings.
 */
function scaledIngredientLine({ name, amount, unit }, chosenServings, recipeServings) {
  if (!amount) {
    return name
  }

  const scaled = Math.round(amount * (chosenServings / recipeServings) * 100) / 100
  return [scaled, unit, name].filter(Boolean).join(' ')
}

/**
 * Groups ingredients by their aisle. A Map rather than a plain object because aisle names are free text from
 * Spoonacular - a name like "constructor" would collide with an inherited
 * property on an object, and a Map has no inherited keys.
 * @param {Array<{name: string, line: string, aisle: string}>}allIngredients
 * @returns {Array<[string, Array]>}[category, items]
 */
function groupByAisle(allIngredients = []) {
  const byAisle = new Map()

  for (const item of allIngredients) {
    if (!byAisle.has(item.aisle)) {
      byAisle.set(item.aisle, [])
    }
    byAisle.get(item.aisle).push(item)
  }

  return [...byAisle.entries()]
}

/**
 * The page for one recipe, named by the id in the address.
 *
 * The heading, image, description slot, button group and two sections are
 * Andrew's and are unchanged - only their contents come from the backend now.
 */
export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Four pieces of state, so the page can tell its situations apart: still
  // loading, failed, loaded, and loaded-but-empty.
  // const [isNutritionOpen, setIsNutritionOpen] = useState(false)
  // RB-295: Nutrition Facts and My Note share one slot under Ingredients, in
  // the left column - this array holds whichever of them are open, most
  // recently opened first, so that one renders closest to Ingredients.
  const [leftOpen, setLeftOpen] = useState([])

  const [recipe, setRecipe] = useState(null)
   // RB-291: the servings the stepper is currently showing. Starts at the
  // recipe's own count once it loads, so the Ingredients section opens
  // showing Spoonacular's original phrases rather than a scaled line nobody
  // asked for.
  const [servings, setServings] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [collections, setCollections] = useState([])

  const [errorMessage, setErrorMessage] = useState('')
  // RB-299: wrapped in a fresh object each time, rather than the bare id -
  // opening the same panel twice in a row would otherwise set the same
  // string both times, and React skips an update whose value is unchanged,
  // so the effect below would never re-run the second time. Only ever set
  // on an OPEN transition, never on close - there is nothing to point at
  // once a panel is gone.
  const [justOpened, setJustOpened] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isShoppingOpen, setIsShoppingOpen] = useState(false)
  // RB-271: the cook's note, read from the favorites reply the page already makes.
  const [note, setNote] = useState(null)
  // const [isNoteOpen, setIsNoteOpen] = useState(false)

  // RB-193: the shopping cost. Null until the cook asks for it, because
  // fetching it is a whole Spoonacular point - loading it with the page would
  // double what browsing a recipe costs.
  const [searchParams] = useSearchParams()
  const pantry = searchParams.get('ingredients') ?? ''
  const [cost, setCost] = useState(null)
  const [isCostLoading, setIsCostLoading] = useState(false)
  const [costError, setCostError] = useState('')

 
  useEffect(() => {
    if (!justOpened) {
      return
    }

   const panel = document.getElementById(justOpened.id)

    if (!panel) {
      return
    }

    panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    panel.classList.add('flash-highlight')

    const timer = setTimeout(() => panel.classList.remove('flash-highlight'), 1600)
    return () => clearTimeout(timer)
  }, [justOpened])
  
  useEffect(() => {
    // A cook can click away while the request is still in flight. Without
    // this flag a slow reply updates a page that is no longer on screen.
    let stillOnThisPage = true

    async function load() {
      setIsLoading(true)
      setErrorMessage('')
      setRecipe(null)
      setNote(null)
      setLeftOpen([])

      try {
        // The saved list is a database read and costs no Spoonacular quota,
        // so it goes out alongside the recipe rather than after it. Its
        // failure is swallowed: a favorites problem must not stop the recipe
        // appearing, it only leaves the button reading "Save".
        const [found, saved, savedCollections] = await Promise.all([
          getRecipe(id),
          getFavorites().catch(() => []),
          // RB-210: swallowed for the same reason - signed out is normal here.
          getCollections().catch(() => []),
        ])

        if (stillOnThisPage) {
          setRecipe(found)

          setServings(found.servings)   // inside load(), right after setRecipe(found)
    

          // RB-271: find, not some - the entry carries the cook's note, and
          // some() threw it away. No extra request: the note was always here.
          const alreadySaved = saved.find((one) => one.id === found.id)
          setIsFavorite(alreadySaved !== undefined)
          setNote(alreadySaved ? alreadySaved.note : null)
          setCollections(savedCollections)
        }
      } catch (failure) {
        if (stillOnThisPage) {
          setErrorMessage(failure.message || COULD_NOT_LOAD)
        }
      } finally {
        if (stillOnThisPage) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      stillOnThisPage = false
    }
  }, [id])

  /** RB-193: fetched on demand; a second press puts the panel away. */
  async function showCost() {
    if (cost) {
      setCost(null)
      return
    }

    

    setIsCostLoading(true)
    setCostError('')
    try {
      //setCost(await getRecipeCost(recipe.id, pantry))
      // showCost(): inside the try, on the line after setCost(...)
      setCost(await getRecipeCost(recipe.id, pantry))
      // RB-299: only once the panel actually has something to show - setting
      // this before the fetch resolves would try to scroll to a section
      // that does not exist in the DOM yet.
      setJustOpened({ id: 'recipe-cost' })

    } catch (failure) {
      setCostError(failure.message)
    } finally {
      setIsCostLoading(false)
    }
  }

  // was once under the showCost function, moved out for proper component scope
  function toggleLeftPanel(key, sectionId) {
      const opening = !leftOpen.includes(key)
      const withoutKey = leftOpen.filter((one) => one !== key)

      setLeftOpen(opening ? [key, ...withoutKey] : withoutKey)

      // if (opening) {
      //   setJustOpened({ id: sectionId })
      // }
    }

   /** RB-291: nudge the stepper by one, staying inside the agreed range. */
  function handleServingsChange(next) {
    if (next >= MIN_SERVINGS && next <= MAX_SERVINGS) {
      setServings(next)
    }
  }

  return (
    <main className="detail-page">
      {/* One step back in history rather than a fixed address, so this
          returns to the results the cook was actually looking at and keeps
          their ingredients and any filter - without this page needing to
          know either exists. */}
      <button
        type="button"
        className="button button-secondary"
        onClick={() => navigate(-1)}
      >
        Back to Recipes
      </button>

      {isLoading && <p>Loading recipe...</p>}

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {recipe && (
        <>
          <h1>{recipe.title}</h1>
          <img className="detail-image" src={recipe.imageUrl} alt={recipe.title} />

          {/* Spoonacular has no prose we can use here - their "summary" is
              marketing copy with HTML in it. See the contract. */}
          <p className="detail-description">
            Serves {recipe.servings} · ready in {recipe.readyInMinutes} minutes
          </p>

          {/* These four flags arrive in the call the page already makes, so
              showing them costs nothing extra. Search results do not carry
              them, which is why the result cards have no badges. */}
          <ul className="diet-badges">
            {DIET_LABELS.filter((one) => recipe.diets[one.field]).map((one) => (
              <li key={one.field}>{one.label}</li>
            ))}
          </ul>

            <div className="favorite-row">
            <FavoriteButton
              recipe={recipe}
              isFavorite={isFavorite}
              onChange={(_id, isNowFavorite) => {
                setIsFavorite(isNowFavorite)
              // Un-saving deletes the note on the backend (RB-205), so drop ours too
                if (!isNowFavorite) setNote(null)
              }}
              variant="text"
              collections={collections}
            />
          </div>

          <div className="button-group">
            
            {/* RB-193b: free - it arrived with the recipe, so it is simply
                shown. The button below is the part that costs a point. */}
            
            {recipe.nutrition != null && (
              <button
                type="button"
                className="nutrition-toggle"
                aria-expanded={leftOpen.includes('nutrition')}
                aria-controls="nutrition-facts"
                onClick={() => toggleLeftPanel('nutrition', 'nutrition-facts')}
              >
            Nutrition Facts{' '}
            <span aria-hidden="true">
              {leftOpen.includes('nutrition') ? '▲' : '▼'}
            </span>
            </button>
            )}

            {/* no extra fetch - allIngredients came with the recipe. */}
            {recipe.allIngredients?.length > 0 && (
              <button
                type="button"
                className="button button-secondary"
                aria-expanded={isShoppingOpen}
                aria-controls="shopping-list"
                // Shopping list button: replace its onClick
                onClick={() => {
                  const opening = !isShoppingOpen
                  setIsShoppingOpen(opening)
                  if (opening) {
                    setJustOpened({ id: 'shopping-list' })
                  }
                }}
              >
                 Shopping list
                <span aria-hidden="true">{isShoppingOpen ? ' ▲' : ' ▼'}</span>
              </button>
            )}
            <button
              type="button"
              className="button button-secondary"
              aria-expanded={cost != null}
              aria-controls="recipe-cost"
              onClick={showCost}
              disabled={isCostLoading}
            >
              {isCostLoading ? 'Working it out...' : 'What I need to buy'}
              <span aria-hidden="true">{cost ? ' ▲' : ' ▼'}</span>
            </button>

            {/* RB-272: always in the row, saved or not - a button that comes
                and goes looks like a bug. See docs/recipe-notes-contract.md. */}
            <button
            type="button"
            className="button button-secondary"
            aria-expanded={leftOpen.includes('note')}
            aria-controls="recipe-note"
            onClick={() => toggleLeftPanel('note', 'recipe-note')}
          >
            My note{' '}
            <span aria-hidden="true">
              {leftOpen.includes('note') ? '▲' : '▼'}
            </span>
          </button>
          </div>

           {recipe.costPerServing > 0 && (
            <p className="detail-cost">
              About <strong>${recipe.costPerServing.toFixed(2)}</strong> a serving
              {recipe.servings > 1 && <> · ${recipe.costTotal.toFixed(2)} in total</>}
            </p>
          )}

          {costError && <p role="alert">{costError}</p>}

          
          {/* {isNoteOpen && (
            <section className="detail-section" id="recipe-note">
              <h2>My Note</h2>
              {isFavorite ? (
                // The same component the favourites page uses, not a copy.
                // key: RecipeNote reads its note prop only once, so a new
                // note must build a fresh component or the box opens blank.
                <RecipeNote key={note ?? ''} recipeId={recipe.id} note={note} />
              ) : (
                <p className="note-empty">Save this recipe to add a note.</p>
              )}
            </section>
          )} ==> defunct*/}

          {/* {recipe.nutrition != null && isNutritionOpen && (
            <section className="detail-section" id="nutrition-facts">
              <h2>Nutrition Facts</h2>
              <p className="nutrition-note">Per serving</p>

              <ul className="nutrition-list">
                {NUTRITION_ROWS.map((row) => (
                  <li key={row.field}>
                    <span>{row.label}</span>
                    <span>
                      {recipe.nutrition[row.field]}{row.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )} ==> also defunct, not use isNutritionOpen handler*/}

          {/* RB-295:Give the ingredients list the same bordered-row, 
          no-bullet treatment as the nutrition and cost panels, 
          scroll it when it is long, and put it in a left column beside the instructions. */}

        <div className="recipe-body-columns">
          <div className="column-left">
            <section className="detail-section ingredients-scroll" id="recipe-ingredients">
              <h2>Ingredients</h2>
              {recipe.ingredients.length === 0 ? (
                <p>No ingredients were listed for this recipe.</p>
              ) : (
                <ul className="ingredients-list">
                  {recipe.ingredients.map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
                </ul>
              )}
            </section>

            {leftOpen.map((key) =>
              key === 'nutrition' ? (
                recipe.nutrition != null && (
                  <section className="detail-section" id="nutrition-facts" key="nutrition">
                    <h2>Nutrition Facts</h2>
                    <p className="nutrition-note">Per serving</p>
                    <ul className="nutrition-list">
                      {NUTRITION_ROWS.map((row) => (
                        <li key={row.field}>
                          <span>{row.label}</span>
                          <span>
                            {recipe.nutrition[row.field]}{row.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              ) : (
                <section className="detail-section" id="recipe-note" key="note">
                  <h2>My Note</h2>
                  {isFavorite ? (
                    <RecipeNote key={note ?? ''} recipeId={recipe.id} note={note} />
                  ) : (
                    <p className="note-empty">Save this recipe to add a note.</p>
                  )}
                </section>
              ),
            )}
          </div>

          <div className="column-right">
            <section className="detail-section">
              <h2>Instructions</h2>
              {recipe.steps.length === 0 ? (
                <p>No instructions were provided for this recipe.</p>
              ) : (
                <ol className="instructions-list">
                  {recipe.steps.map((one, position) => (
                    <li key={position}>{one}</li>
                  ))}
                </ol>
              )}
            </section>

            {cost != null && (
              <section className="detail-section" id="recipe-cost">
                <h2>What I need to buy</h2>

                <p className="cost-headline">
                  About <strong>${cost.youNeed.toFixed(2)}</strong> of shopping
                  {cost.youHave > 0 && (
                    <> · ${cost.youHave.toFixed(2)} already in your kitchen</>
                  )}
                </p>

                <ul className="cost-list">
                  {cost.items.map((item) => (
                    <li key={item.name} className={item.inPantry ? 'cost-have' : undefined}>
                      <span className="cost-name">{item.name}</span>
                      <span className="nutrition-amount">${item.price.toFixed(2)}</span>
                      {item.inPantry && (
                        <span className="cost-tag" role="img" aria-label="already in your kitchen">
                          ✓
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <p className="cost-note">
                  Prices are national averages, so treat them as a guide.
                </p>
              </section>
            )}
          </div>
        </div>

          {isShoppingOpen && recipe.allIngredients?.length > 0 && (
          <section className="detail-section" id="shopping-list">
            <h2>Shopping list</h2>
            {groupByAisle(recipe.allIngredients).map(([aisle, items]) => (
              <div key={aisle}>
                <h3>{aisle}</h3>
                <ul className="ingredients-list">
                  {items.map((item, index) => (
                    <li key={`${item.name}-${index}`}>{item.line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
          )}

        </>
      )}
    </main>
  )
}
