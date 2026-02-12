import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from './ThemeToggle'
import { renderWithProviders } from '../test/render'

describe('ThemeToggle', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders light and dark buttons', () => {
    renderWithProviders(<ThemeToggle />)
    expect(screen.getByTitle('Light')).toBeInTheDocument()
    expect(screen.getByTitle('Dark')).toBeInTheDocument()
  })

  it('has aria-labels for accessibility', () => {
    renderWithProviders(<ThemeToggle />)
    expect(screen.getByLabelText('Set theme to Light')).toBeInTheDocument()
    expect(screen.getByLabelText('Set theme to Dark')).toBeInTheDocument()
  })

  it('switches to dark when clicking dark button', async () => {
    renderWithProviders(<ThemeToggle />)
    await user.click(screen.getByTitle('Dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('switches to light when clicking light button', async () => {
    localStorage.setItem('theme-preference', 'dark')
    renderWithProviders(<ThemeToggle />)
    await user.click(screen.getByTitle('Light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
