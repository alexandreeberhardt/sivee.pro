import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import TermsOfService from './TermsOfService'

describe('TermsOfService', () => {
  it('renders without crashing', () => {
    renderWithProviders(<TermsOfService />)
  })

  it('has a header', () => {
    renderWithProviders(<TermsOfService />)
    expect(document.querySelector('header')).toBeTruthy()
  })

  it('has a back link to home', () => {
    renderWithProviders(<TermsOfService />)
    const links = screen.getAllByRole('link')
    const homeLink = links.find(l => l.getAttribute('href') === '/')
    expect(homeLink).toBeTruthy()
  })
})
