// Vitest provides the test structure, assertions, and mock functions.
import { afterEach, describe, expect, it, vi } from 'vitest'

// render mounts the component in a simulated browser.
// screen finds controls using their accessible roles and names.
// cleanup removes rendered components between tests.
import { cleanup, render, screen } from '@testing-library/react'

// Simulates user interactions such as clicking controls.
import userEvent from '@testing-library/user-event'

// Adds assertions such as toBeChecked() and toBeInTheDocument().
import '@testing-library/jest-dom/vitest'

// The component these tests will check.
import DietaryFilters from './DietaryFilters'

// Give each test a clean document without controls from previous tests.
afterEach(() => {
  cleanup()
})

/** RB-292: the filters start closed, so every test that needs a control opens them first. */
async function openFilters(user) {
  await user.click(screen.getByRole('button', { name: /Dietary Restrictions/ }))
}

// Group all tests for this component together.
describe('DietaryFilters', () => {
  it('displays all supported options with no restrictions selected', async () => {
    const user = userEvent.setup()

    // Mount the component without initial restrictions.
    // vi.fn() supplies a mock callback that records calls.
    render(<DietaryFilters onApply={vi.fn()} />)
    await openFilters(user)

    // No preference should be selected by default.
    expect(
      screen.getByRole('radio', { name: 'No preference' }),
    ).toBeChecked()

    // Confirm every supported diet exists and starts unselected.
    for (const name of ['Vegetarian', 'Vegan', 'Gluten free']) {
      expect(screen.getByRole('radio', { name })).not.toBeChecked()
    }

    // Confirm every supported exclusion exists and starts unchecked.
    for (const name of [
      'Dairy',
      'Eggs',
      'Peanuts',
      'Tree nuts',
      'Shellfish',
      'Soy',
    ]) {
      expect(
        screen.getByRole('checkbox', { name }),
      ).not.toBeChecked()
    }

    // Confirm an Apply button is present.
    expect(
      screen.getByRole('button', { name: 'Find recipes' }),
    ).toBeInTheDocument()
  })

  it('does not report choices while selections are changing', async () => {
    // Create a user interaction session and a callback we can inspect.
    const user = userEvent.setup()
    const onApply = vi.fn()

    render(<DietaryFilters onApply={onApply} />)
    await openFilters(user)

    // Change the diet and select three exclusions.
    // await lets each interaction finish before the next statement.
    await user.click(screen.getByRole('radio', { name: 'Vegan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Dairy' }))
    await user.click(screen.getByRole('checkbox', { name: 'Peanuts' }))
    await user.click(screen.getByRole('checkbox', { name: 'Soy' }))

    // The selection should update visually.
    expect(
      screen.getByRole('checkbox', { name: 'Soy' }),
    ).toBeChecked()

    // Changing selections must not report them to the parent.
    // Apply has not been pressed.
    expect(onApply).not.toHaveBeenCalled()
  })

  it('reports the selected choices exactly once when Find recipes is pressed', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()

    render(<DietaryFilters onApply={onApply} />)
    await openFilters(user)

    // Select options whose API values contain spaces.
    await user.click(
      screen.getByRole('radio', { name: 'Gluten free' }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Tree nuts' }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Shellfish' }),
    )

    // Submit the choices.
    await user.click(screen.getByRole('button', { name: 'Find recipes' }))

    // One press should produce exactly one callback.
    expect(onApply).toHaveBeenCalledTimes(1)

    // Verify the callback receives the contract's values,
    // rather than the labels displayed to the user.
    expect(onApply).toHaveBeenCalledWith(
      'gluten free',
      ['tree nut', 'shellfish'],
    )
  })

  it('shows the current choices supplied by the parent page', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()

    // Mount with restrictions that are already applied.
    render(
      <DietaryFilters
        selectedDiet="vegetarian"
        selectedIntolerances={['egg', 'peanut']}
        onApply={onApply}
      />,
    )
    await openFilters(user)

    // The supplied diet and exclusions should appear selected.
    expect(
      screen.getByRole('radio', { name: 'Vegetarian' }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Eggs' }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Peanuts' }),
    ).toBeChecked()

    // An exclusion that was not supplied should remain unchecked.
    expect(
      screen.getByRole('checkbox', { name: 'Dairy' }),
    ).not.toBeChecked()

    // Opening the component must not automatically apply anything.
    expect(onApply).not.toHaveBeenCalled()
  })

  it('allows only one diet to be selected at a time', async () => {
    const user = userEvent.setup()

    render(<DietaryFilters onApply={vi.fn()} />)
    await openFilters(user)

    // Select one diet, then switch to another.
    await user.click(
      screen.getByRole('radio', { name: 'Vegetarian' }),
    )
    await user.click(screen.getByRole('radio', { name: 'Vegan' }))

    // Only the latest selection should remain checked.
    expect(
      screen.getByRole('radio', { name: 'Vegan' }),
    ).toBeChecked()
    expect(
      screen.getByRole('radio', { name: 'Vegetarian' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('radio', { name: 'No preference' }),
    ).not.toBeChecked()
  })

  it('allows all restrictions to be cleared and applied', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()

    // Start with one diet and two exclusions selected.
    render(
      <DietaryFilters
        selectedDiet="vegan"
        selectedIntolerances={['dairy', 'soy']}
        onApply={onApply}
      />,
    )
    await openFilters(user)

    // Clear the diet and uncheck both exclusions.
    await user.click(
      screen.getByRole('radio', { name: 'No preference' }),
    )
    await user.click(screen.getByRole('checkbox', { name: 'Dairy' }))
    await user.click(screen.getByRole('checkbox', { name: 'Soy' }))

    // Clearing selections alone must not notify the parent.
    expect(onApply).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Find recipes' }))

    // No preference is reported as null.
    // No exclusions are reported as an empty array.
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith(null, [])
  })

  // ---- RB-292: collapsed behind a toggle ---------------------------------

  it('starts closed, with only the toggle showing', () => {
    render(<DietaryFilters onApply={vi.fn()} />)

    const toggle = screen.getByRole('button', { name: /Dietary Restrictions/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Find recipes' })).not.toBeInTheDocument()
  })

  it('opens when the toggle is clicked, and closes when it is clicked again', async () => {
    const user = userEvent.setup()
    render(<DietaryFilters onApply={vi.fn()} />)

    await openFilters(user)
    expect(screen.getByRole('button', { name: /Dietary Restrictions/ }))
      .toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('radio', { name: 'Vegan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find recipes' })).toBeInTheDocument()

    await openFilters(user)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('closes itself again after Find recipes, having reported the choices once', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<DietaryFilters onApply={onApply} />)

    await openFilters(user)
    await user.click(screen.getByRole('radio', { name: 'Vegetarian' }))
    await user.click(screen.getByRole('button', { name: 'Find recipes' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith('vegetarian', [])
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dietary Restrictions/ }))
      .toHaveAttribute('aria-expanded', 'false')
  })

  it('remembers the ticks while it is closed', async () => {
    const user = userEvent.setup()
    render(<DietaryFilters onApply={vi.fn()} />)

    await openFilters(user)
    await user.click(screen.getByRole('radio', { name: 'Vegan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Soy' }))
    await openFilters(user)
    await openFilters(user)

    expect(screen.getByRole('radio', { name: 'Vegan' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Soy' })).toBeChecked()
  })

  it('has no separate heading repeating the toggle label', () => {
    render(<DietaryFilters onApply={vi.fn()} />)

    expect(screen.queryByRole('heading', { name: 'Dietary Restrictions' })).not.toBeInTheDocument()
  })
})
