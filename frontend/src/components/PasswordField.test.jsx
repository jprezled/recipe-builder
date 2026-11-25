import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordField from './PasswordField'

describe('PasswordField', () => {
  it('starts hidden', () => {
    render(<PasswordField id="pw" label="Password" value="secret123" onChange={() => {}} />)

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()
  })

  it('shows the password, then hides it again', async () => {
    const user = userEvent.setup()
    render(<PasswordField id="pw" label="Password" value="secret123" onChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('does not submit the form it sits in', async () => {
    const user = userEvent.setup()
    let submitted = false
    render(
      <form onSubmit={(event) => { event.preventDefault(); submitted = true }}>
        <PasswordField id="pw" label="Password" value="" onChange={() => {}} />
      </form>,
    )

    await user.click(screen.getByRole('button', { name: 'Show password' }))

    expect(submitted).toBe(false)
  })

  it('shows its hint when given one', () => {
    render(
      <PasswordField id="pw" label="Password" value="" onChange={() => {}} hint="At least 8 characters." />,
    )

    expect(screen.getByText('At least 8 characters.')).toBeInTheDocument()
  })
})
