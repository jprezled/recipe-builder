// Adds the DOM matchers used by component tests, e.g. toBeInTheDocument().
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// RB-299: jsdom does not implement scrollIntoView at all - calling it throws
// "not a function" rather than silently doing nothing. A vi.fn() rather than
// a plain no-op so tests can assert it was (or was not) called; shared
// across every element, which vi.resetAllMocks() in a test's beforeEach
// clears like any other mock.
Element.prototype.scrollIntoView = vi.fn()
