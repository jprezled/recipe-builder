import { useState } from 'react'

/**
 * A password input with a button to its left that reveals or re-hides it.
 *
 * Shared by every page with a password field, so the toggle behaves the same
 * way everywhere rather than five separate copies of the same state.
 */
export default function PasswordField({ id, label, value, onChange, hint }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <div className="account-password-wrapper">
        <button
          type="button"
          className="account-password-toggle"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? (
            // Eye with a line through it: the password is showing, and
            // pressing this hides it again.
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.3 5.3C10.2 5.1 11.1 5 12 5c5 0 8.5 3.5 10 7-0.6 1.3-1.5 2.6-2.6 3.7M6.6 6.6C4.3 8 2.6 10 2 12c1.5 3.5 5 7 10 7 1.2 0 2.3-0.2 3.4-0.6"
              />
            </svg>
          ) : (
            // Plain open eye: the password is hidden, and pressing this
            // reveals it.
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2 12c1.5-3.5 5-7 10-7s8.5 3.5 10 7c-1.5 3.5-5 7-10 7s-8.5-3.5-10-7z"
              />
              <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        </button>
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
        />
      </div>
      {hint && <p className="account-hint">{hint}</p>}
    </div>
  )
}
