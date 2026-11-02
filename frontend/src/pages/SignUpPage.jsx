import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../api/accounts'

/**
 * Create an account.
 *
 * The form never writes its own validation wording. Every sentence shown here
 * came from the backend, because two copies of a message disagree the day one
 * of them is reworded - and only one of them would be the truth. The rules
 * themselves (8-character password, the column widths) are checked in
 * UserService, so they hold for anything calling our API and not just for
 * this form.
 */
export default function SignUpPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function handleSubmit(event) {
    // Without this the browser reloads the page and the request is lost.
    event.preventDefault()

    // An empty form is not worth a round trip. The backend checks the same
    // things again - this only saves the request.
    if (!username.trim() || !email.trim() || !password) {
      return
    }

    setErrorMessage('')
    setIsSending(true)

    try {
      await signUp({ username: username.trim(), email: email.trim(), password })

      // Straight to sign-in rather than signing them in here: creating an
      // account and starting a session are two different endpoints, and
      // doing both would mean two ways to become signed in to keep working.
      navigate('/signin')
    } catch (failure) {
      setErrorMessage(failure.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="account-page">
      <h1>Sign up</h1>
      <p className="account-tagline">Save the recipes you like to your own account.</p>

      <form className="account-form" onSubmit={handleSubmit}>
        <div className="account-field">
          <label htmlFor="signup-username">Username</label>
          <input
            id="signup-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>

        <div className="account-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="account-field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="account-hint">At least 8 characters.</p>
        </div>

        <button type="submit" className="account-button" disabled={isSending}>
          Sign up
        </button>
      </form>

      {/* role="alert" so a screen reader announces the failure rather than
          leaving it as text somebody has to go looking for. */}
      {errorMessage && <p className="account-error" role="alert">{errorMessage}</p>}

      <p className="account-swap">
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </main>
  )
}
