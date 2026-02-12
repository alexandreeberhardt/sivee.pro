import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import PrivacyPolicy from './PrivacyPolicy'

describe('PrivacyPolicy', () => {
  it('renders without crashing', () => {
    renderWithProviders(<PrivacyPolicy />)
  })

  it('has a header', () => {
    renderWithProviders(<PrivacyPolicy />)
    expect(document.querySelector('header')).toBeTruthy()
  })

  it('has a back link to home', () => {
    renderWithProviders(<PrivacyPolicy />)
    const links = screen.getAllByRole('link')
    const homeLink = links.find(l => l.getAttribute('href') === '/')
    expect(homeLink).toBeTruthy()
  })
})
