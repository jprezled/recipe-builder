import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SignUpPage from './SignUpPage'
import { signUp } from '../api/accounts'

vi.mock('../api/accounts')

function renderSignUp() {
  return render(<MemoryRouter><SignUpPage /></MemoryRouter>)
}

/**
 * The sign-up form. It sends exactly what was typed and shows exactly the
 * sentence the backend sent - it never writes its own wording, because two
 * copies of a message disagree the day one of them is reworded.
 */
describe('SignUpPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('sends exactly what was typed', async () => {
    signUp.mockResolvedValue({ id: 7, username: 'anthony' })
    renderSignUp()

    await userEvent.type(screen.getByLabelText('Username'), 'anthony')
    await userEvent.type(screen.getByLabelText('Email'), 'anthony@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(signUp).toHaveBeenCalledWith({
      username: 'anthony',
      email: 'anthony@example.com',
      password: 'demo1234',
    })
  })

  it("shows the backend's sentence when sign-up fails", async () => {
    // The agreed 409 from docs/error-shape.md. The form must not reword it.
    signUp.mockRejectedValue(new Error('That username is taken. Please pick another.'))
    renderSignUp()

    await userEvent.type(screen.getByLabelText('Username'), 'demo')
    await userEvent.type(screen.getByLabelText('Email'), 'demo@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('That username is taken. Please pick another.')
  })

  it('does not submit an empty form', async () => {
    renderSignUp()

    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(signUp).not.toHaveBeenCalled()
  })

  it('offers a way across to signing in', async () => {
    renderSignUp()

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/signin')
  })
})
