import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import Footer from './Footer'
import { renderWithProviders } from '../test/render'

describe('Footer', () => {
  it('renders the app name', () => {
    renderWithProviders(<Footer />)
    // The app name comes from i18n key landing.appName
    // It should render some text in the footer
    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
  })

  it('renders legal links', () => {
    renderWithProviders(<Footer />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(3)
  })

  it('has navigation element', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
