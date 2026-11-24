import { useEffect, useState } from 'react'
import { changePassword, deleteAccount, getSession } from '../api/accounts'
import PasswordField from '../components/PasswordField'

/**
 * RB-290: changing a password, and deleting an account.
 *
 * Both forms show the backend's own sentence unchanged - see
 * docs/account-management-contract.md and docs/error-shape.md.
 */
export default function AccountPage() {
  // null means "we have not asked yet", same three-state pattern FavoritesPage
  // uses, so a signed-in cook never sees the sign-in prompt flash first.
  const [isSignedIn, setIsSignedIn] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleted, setIsDeleted] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let stillOnThisPage = true

    getSession()
      .then(() => {
        if (stillOnThisPage) {
          setIsSignedIn(true)
        }
      })
      .catch(() => {
        if (stillOnThisPage) {
          setIsSignedIn(false)
        }
      })

    return () => { stillOnThisPage = false }
  }, [])

  async function handleChangePassword(event) {
    event.preventDefault()

    setPasswordError('')
    setPasswordMessage('')
    setIsChangingPassword(true)

    try {
      await changePassword(currentPassword, newPassword)
      setPasswordMessage('Your password has been changed.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (failure) {
      setPasswordError(failure.message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  function handleStartDelete() {
    setDeleteError('')
    setIsConfirmingDelete(true)
  }

  function handleKeepAccount() {
    setIsConfirmingDelete(false)
    setDeletePassword('')
    setDeleteError('')
  }

  async function handleConfirmDelete(event) {
    event.preventDefault()

    setDeleteError('')
    setIsDeleting(true)

    try {
      await deleteAccount(deletePassword)
      setIsDeleted(true)
      setIsConfirmingDelete(false)
    } catch (failure) {
      setDeleteError(failure.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="account-page">
      <h1>Your Account</h1>

      {isSignedIn === false && (
        <p className="account-tagline">Please sign in to manage your account.</p>
      )}

      {isDeleted && (
        <p className="account-tagline">Your account has been deleted.</p>
      )}

      {isSignedIn === true && !isDeleted && (
        <>
          <form className="account-form" onSubmit={handleChangePassword}>
            <h2>Change password</h2>

            <PasswordField
              id="account-current-password"
              label="Current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />

            <PasswordField
              id="account-new-password"
              label="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              hint="At least 8 characters."
            />

            <button type="submit" className="account-button" disabled={isChangingPassword}>
              Change password
            </button>

            {passwordError && <p className="account-error" role="alert">{passwordError}</p>}
            {passwordMessage && <p className="account-tagline">{passwordMessage}</p>}
          </form>

          <div className="account-form account-danger">
            <h2>Delete account</h2>

            {!isConfirmingDelete && (
              <>
                <p className="account-danger-text">
                  Permanently removes your account and everything saved with it.
                </p>
                <button type="button" className="account-button account-button-danger-outline" onClick={handleStartDelete}>
                  Delete my account
                </button>
              </>
            )}

            {isConfirmingDelete && (
              <form className="account-danger-confirm" onSubmit={handleConfirmDelete}>
                <p className="account-danger-text">
                  Deleting your account removes it, and everything saved with
                  it, for good. This cannot be undone.
                </p>

                <PasswordField
                  id="account-delete-password"
                  label="Password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                />

                <div className="account-danger-actions">
                  <button type="submit" className="account-button account-button-danger" disabled={isDeleting}>
                    Yes, delete my account
                  </button>
                  <button type="button" className="account-button account-button-plain" onClick={handleKeepAccount}>
                    Keep my account
                  </button>
                </div>

                {deleteError && <p className="account-error" role="alert">{deleteError}</p>}
              </form>
            )}
          </div>
        </>
      )}
    </main>
  )
}
