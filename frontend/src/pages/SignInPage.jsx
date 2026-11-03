import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signIn } from '../api/accounts'

/**
 * Sign in to an existing account.
 *
 * Same rule as sign-up: whatever the backend sends is what this shows. The
 * one sentence it can get back for a failure is deliberately vague - an
 * unknown username and a wrong password give the same words, so nobody can
 * use this form to discover which usernames exist.
 */
export default function SignInPage() {
  const navigate = useNavigate()

  // This page does not use the pantry list, but it has to pass it on: the list
  // lives in the address, so dropping it here loses it for good.
  const { search } = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (!username.trim() || !password) {
      return
    }

    setErrorMessage('')
    setIsSending(true)

    try {
      await signIn({ username: username.trim(), password })

      // Favorites is where being signed in actually changes what you see, so
      // it is the one page worth landing on.
      navigate({ pathname: '/favorites', search })
    } catch (failure) {
      setErrorMessage(failure.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="account-page">
      <h1>Sign in</h1>
      <p className="account-tagline">Welcome back.</p>

      <form className="account-form" onSubmit={handleSubmit}>
        <div className="account-field">
          <label htmlFor="signin-username">Username</label>
          <input
            id="signin-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>

        <div className="account-field">
          <label htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button type="submit" className="account-button" disabled={isSending}>
          Sign in
        </button>
      </form>

      {errorMessage && <p className="account-error" role="alert">{errorMessage}</p>}

      <p className="account-swap">
        New here? <Link to={{ pathname: '/signup', search }}>Sign up</Link>
      </p>
    </main>
  )
}
