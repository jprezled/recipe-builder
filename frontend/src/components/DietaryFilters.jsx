/*
DietaryFilters.jsx creates a reusable React component that collects dietary choices and
 passes them to its parent when Apply is pressed.
It does not call Spoonacular or perform recipe searches itself.
*/


// useState holds the user's pending choices.
// useId generates a unique name for this component's radio group.
import { useId, useState } from 'react'

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
}) {
  // All diet radio buttons share this name so they form one group.
  // The unique name prevents separate component instances from interfering.
  const dietGroupName = useId()

  // Initialize the controls from the parent's current selections.
  // An empty string represents "No preference" inside the component.
  const [diet, setDiet] = useState(selectedDiet ?? '')

  // Copy the supplied array so local selections do not modify the prop.
  const [intolerances, setIntolerances] = useState(
    [...selectedIntolerances],
  )

  // Note: useState uses these initial values only when the component mounts.
  // Later prop changes do not automatically replace these local choices.

  function handleIntoleranceChange(value) {
    // Use the latest selection state when adding or removing an exclusion.
    setIntolerances((current) => {
      if (current.includes(value)) {
        // Clicking a selected checkbox removes its value.
        // filter() returns a new array without changing the existing array.
        return current.filter((item) => item !== value)
      }

      // Clicking an unselected checkbox adds its value to a new array.
      return [...current, value]
    })
  }

  function handleApply(event) {
    // Prevent normal browser form submission from reloading the page.
    event.preventDefault()

    // Report the pending choices to the parent exactly once per submission.
    // Convert "No preference" from an empty string to null.
    // Pass a copy of the exclusions array.
    onApply(diet || null, [...intolerances])
  }

  return (
    // Only form submission reports choices outward.
    // The class name provides a hook for styles in index.css.
    <form className="dietary-filters" onSubmit={handleApply}>
      <h2>Dietary Restrictions</h2>

      {/* fieldset and legend identify the related diet controls. */}
      <fieldset>
        <legend>Diet — choose one</legend>

        {/* Wrapping the input in a label gives it an accessible name
            and allows the user to click the label text. */}
        <label>
          <input
            type="radio"
            name={dietGroupName}
            value=""
            checked={diet === ''}
            onChange={() => setDiet('')}
          />
          No preference
        </label>

        {/* Create a radio button for each supported diet.
            key identifies each option in React's rendered list. */}
        {DIETS.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={dietGroupName}
              value={option.value}
              checked={diet === option.value}
              onChange={() => setDiet(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      {/* Checkboxes allow multiple exclusions to be selected together. */}
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

      {/* Submitting calls handleApply.
          Changing a radio button or checkbox does not call it. */}
      <button type="submit" className="button">
        Apply
      </button>
    </form>
  )
}