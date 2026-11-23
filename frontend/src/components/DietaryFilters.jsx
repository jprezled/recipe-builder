/*
DietaryFilters.jsx creates a reusable React component that collects dietary choices and
 passes them to its parent when Find recipes is pressed.
It does not call Spoonacular or perform recipe searches itself.
*/


// useState holds the user's pending choices.
// useId generates a unique name for this component's radio group.
import { useEffect, useId, useState } from 'react'

// Labels are displayed to the user.
// Values match the dietary filter contract and are reported to the parent.
const DIETS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten free', label: 'Gluten free' },
]

const INTOLERANCES = [
  { value: 'dairy', label: 'Dairy' },
  { value: 'egg', label: 'Eggs' },
  { value: 'peanut', label: 'Peanuts' },
  { value: 'tree nut', label: 'Tree nuts' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'soy', label: 'Soy' },
]

/**
 * Displays dietary restriction controls.
 *
 * Props:
 * - selectedDiet: the initially applied diet, or null for no preference.
 * - selectedIntolerances: the initially applied ingredient exclusions.
 * - onApply: the parent's callback, called with (diet, intolerances).
 *
 * Changing selections updates only this component.
 * Submitting the form reports the choices to the parent.
 * The parent is responsible for applying them to the recipe search.
 */
export default function DietaryFilters({
  selectedDiet = null,
  selectedIntolerances = [],
  onApply,
  onChange,
  applyBeside = false,
  closeSignal = 0,
}) {
  // RB-292: closed until the cook opens it. Kept here, not in the parent -
  // this is the only panel and the only reader of the flag.
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => {
    setIsOpen(false)
  }, [closeSignal])
  const panelId = useId()

  // All diet radio buttons share this name so they form one group.
  // The unique name prevents separate component instances from interfering.
  const dietGroupName = useId()

  // Initialize the controls from the parent's current selections.
  // An empty string represents "No preference" inside the component.
  const [diet, setDiet] = useState(selectedDiet ?? '')

  /**
   * RB-209: report a tick outward WITHOUT searching.
   *
   * The parent remembers the choice so it survives the nav bar, but nothing
   * is searched until the cook presses the button. Ticking four boxes used to
   * be four paid Spoonacular calls; now it is none.
   */
  function reportChange(nextDiet, nextIntolerances) {
    if (onChange) {
      onChange(nextDiet || null, [...nextIntolerances])
    }
  }

  // Copy the supplied array so local selections do not modify the prop.
  const [intolerances, setIntolerances] = useState(
    [...selectedIntolerances],
  )

  // Note: useState uses these initial values only when the component mounts.
  // Later prop changes do not automatically replace these local choices.

  function handleIntoleranceChange(value) {
    // Computed from the closed-over state rather than a functional updater:
    // a checkbox click is one event per render, so there is no risk of a
    // stale value here, and reportChange (which calls the parent's
    // setSearchParams) must run as a plain event-handler statement, not
    // inside React's updater function - calling it there updates a
    // different component while this one is still rendering.
    const next = intolerances.includes(value)
      ? intolerances.filter((item) => item !== value)
      : [...intolerances, value]

    setIntolerances(next)
    reportChange(diet, next)
  }

  /** A diet radio was clicked. Remembered, not searched. */
  function handleDietChange(value) {
    setDiet(value)
    reportChange(value, intolerances)
  }

  function handleApply(event) {
    // Prevent normal browser form submission from reloading the page.
    event.preventDefault()

    // Report the pending choices to the parent exactly once per submission.
    // Convert "No preference" from an empty string to null.
    // Pass a copy of the exclusions array.
    onApply?.(diet || null, [...intolerances])

    // Tidy up once the cook has applied. The ticks stay: this only closes the
    // panel, and the state above is not lost with it.
    setIsOpen(false)
  }

  return (
    // Only form submission reports choices outward.
    <form className="dietary-filters-form" onSubmit={handleApply}>
      <button
        type="button"
        className="dietary-filters-toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        Dietary Restrictions <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Visible without opening the panel, so the cook can apply straight away. */}
      {applyBeside && (
        <button type="submit" className="button">
          Find recipes
        </button>
      )}

      {isOpen && (
        <div id={panelId} className="dietary-filters">
          <fieldset>
            <legend>Diet — choose one</legend>

            <label>
              <input
                type="radio"
                name={dietGroupName}
                value=""
                checked={diet === ''}
                onChange={() => handleDietChange('')}
              />
              No preference
            </label>

            {DIETS.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name={dietGroupName}
                  value={option.value}
                  checked={diet === option.value}
                  onChange={() => handleDietChange(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Exclude ingredients — choose any</legend>

            {INTOLERANCES.map((option) => (
              <label key={option.value}>
                <input
                  type="checkbox"
                  value={option.value}
                  checked={intolerances.includes(option.value)}
                  onChange={() => handleIntoleranceChange(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </form>
  )
}