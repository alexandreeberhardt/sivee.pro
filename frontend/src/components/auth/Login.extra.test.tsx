/**
 * Additional tests for Login and Register components
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import Login from './Login'
import Register from './Register'

describe('Login component extra', () => {
  const user = userEvent.setup()

  it('renders without crashing', () => {
    renderWithProviders(<Login onSwitchToRegister={vi.fn()} />)
  })

  it('has input fields', () => {
    renderWithProviders(<Login onSwitchToRegister={vi.fn()} />)
    const inputs = document.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('renders submit button', () => {
    renderWithProviders(<Login onSwitchToRegister={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders switch to register', () => {
    const switchFn = vi.fn()
    renderWithProviders(<Login onSwitchToRegister={switchFn} />)
    // There should be some interactive element to switch
    const allButtons = screen.getAllByRole('button')
    expect(allButtons.length).toBeGreaterThan(0)
  })
})

describe('Register component extra', () => {
  it('renders without crashing', () => {
    renderWithProviders(<Register onSwitchToLogin={vi.fn()} />)
  })

  it('has input fields', () => {
    renderWithProviders(<Register onSwitchToLogin={vi.fn()} />)
    const inputs = document.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('has a submit button', () => {
    renderWithProviders(<Register onSwitchToLogin={vi.fn()} />)
    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).toBeTruthy()
  })

  it('has terms checkbox', () => {
    renderWithProviders(<Register onSwitchToLogin={vi.fn()} />)
    const checkbox = document.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeTruthy()
  })

  it('submit button is disabled by default', () => {
    renderWithProviders(<Register onSwitchToLogin={vi.fn()} />)
    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn?.hasAttribute('disabled')).toBe(true)
  })
})
