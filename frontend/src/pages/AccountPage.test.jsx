import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AccountPage from './AccountPage'
import { changePassword, deleteAccount, getSession } from '../api/accounts'

vi.mock('../api/accounts')

function renderAccount() {
  return render(<MemoryRouter><AccountPage /></MemoryRouter>)
}

/**
 * RB-290: changing a password, and deleting an account.
 *
 * Both show the backend's own sentence unchanged - the wordings are fixed in
 * docs/error-shape.md, not here.
 */
describe('AccountPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getSession.mockResolvedValue({ id: 1, username: 'demo' })
  })

  // ---- changing a password ------------------------------------------------

  it('sends the current and new password exactly as typed', async () => {
    changePassword.mockResolvedValue(undefined)
    renderAccount()

    await userEvent.type(await screen.findByLabelText('Current password'), 'demo1234')
    await userEvent.type(screen.getByLabelText('New password'), 'brandnew123')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(changePassword).toHaveBeenCalledWith('demo1234', 'brandnew123')
  })

  it('shows the backend sentence when the current password is wrong', async () => {
    changePassword.mockRejectedValue(new Error('Incorrect password.'))
    renderAccount()

    await userEvent.type(await screen.findByLabelText('Current password'), 'wrong')
    await userEvent.type(screen.getByLabelText('New password'), 'brandnew123')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password.')
  })

  it('confirms when the password actually changed', async () => {
    changePassword.mockResolvedValue(undefined)
    renderAccount()

    await userEvent.type(await screen.findByLabelText('Current password'), 'demo1234')
    await userEvent.type(screen.getByLabelText('New password'), 'brandnew123')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('Your password has been changed.')).toBeInTheDocument()
  })

  // ---- deleting an account ------------------------------------------------

  it('does not delete on the first press - it asks first', async () => {
    renderAccount()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))

    expect(deleteAccount).not.toHaveBeenCalled()
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
  })

  it('deletes once the password is given and the confirmation is pressed', async () => {
    deleteAccount.mockResolvedValue(undefined)
    renderAccount()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234')
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete my account' }))

    expect(deleteAccount).toHaveBeenCalledWith('demo1234')
  })

  it('lets the cook back out of deleting', async () => {
    renderAccount()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Keep my account' }))

    expect(deleteAccount).not.toHaveBeenCalled()
    expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument()
  })

  it('shows the backend sentence when the delete password is wrong', async () => {
    deleteAccount.mockRejectedValue(new Error('Incorrect password.'))
    renderAccount()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete my account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password.')
  })

  it('says the account is gone once it is deleted', async () => {
    deleteAccount.mockResolvedValue(undefined)
    renderAccount()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234')
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete my account' }))

    expect(await screen.findByText('Your account has been deleted.')).toBeInTheDocument()
  })

  // ---- signed out ---------------------------------------------------------

  it('asks the cook to sign in rather than showing the forms', async () => {
    // getSession rejects for a signed-out visitor. That is an answer, not a
    // problem - the same swallow the other pages use.
    getSession.mockRejectedValue(new Error('Please sign in to save favorites.'))
    renderAccount()

    expect(await screen.findByText(/sign in to manage your account/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
  })
})
