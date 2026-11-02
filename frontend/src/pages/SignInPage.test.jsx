import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SignInPage from './SignInPage'
import { signIn } from '../api/accounts'

vi.mock('../api/accounts')

function renderSignIn() {
  return render(<MemoryRouter><SignInPage /></MemoryRouter>)
}

/**
 * The sign-in form. Same two rules as sign-up: send what was typed, show the
 * backend's sentence unchanged.
 */
describe('SignInPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('sends exactly what was typed', async () => {
    signIn.mockResolvedValue({ id: 1, username: 'demo' })
    renderSignIn()

    await userEvent.type(screen.getByLabelText('Username'), 'demo')
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(signIn).toHaveBeenCalledWith({ username: 'demo', password: 'demo1234' })
  })

  it("shows the backend's sentence when the details are wrong", async () => {
    // The deliberately vague 401 from docs/error-shape.md - one sentence for
    // both an unknown name and a wrong password.
    signIn.mockRejectedValue(new Error('Incorrect username or password.'))
    renderSignIn()

    await userEvent.type(screen.getByLabelText('Username'), 'demo')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-one')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Incorrect username or password.')
  })

  it('does not submit an empty form', async () => {
    renderSignIn()

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(signIn).not.toHaveBeenCalled()
  })

  it('keeps the password out of sight while it is typed', async () => {
    renderSignIn()

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('offers a way across to signing up', async () => {
    renderSignIn()

    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/signup')
  })
})
