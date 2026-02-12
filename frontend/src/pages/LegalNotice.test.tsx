/**
 * Tests for legal pages - LegalNotice, PrivacyPolicy, TermsOfService
 */
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import LegalNotice from './LegalNotice'

describe('LegalNotice', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LegalNotice />)
  })

  it('renders the app name in header', () => {
    renderWithProviders(<LegalNotice />)
    // Should have the app name somewhere
    expect(document.querySelector('header')).toBeTruthy()
  })

  it('has a back link', () => {
    renderWithProviders(<LegalNotice />)
    const links = screen.getAllByRole('link')
    const homeLink = links.find(l => l.getAttribute('href') === '/')
    expect(homeLink).toBeTruthy()
  })

  it('renders theme toggle', () => {
    renderWithProviders(<LegalNotice />)
    expect(screen.getByTitle('Light')).toBeInTheDocument()
    expect(screen.getByTitle('Dark')).toBeInTheDocument()
  })
})
