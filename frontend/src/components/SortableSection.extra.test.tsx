/**
 * Additional tests for SortableSection component
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import SortableSection from './SortableSection'
import type { CVSection } from '../types'

const summarySection: CVSection = {
  id: 'sec-1',
  type: 'summary',
  title: 'Summary',
  isVisible: true,
  items: 'A passionate developer',
}

const educationSection: CVSection = {
  id: 'sec-2',
  type: 'education',
  title: 'Education',
  isVisible: true,
  items: [
    { school: 'MIT', degree: 'BSc CS', dates: '2020-2024', subtitle: '', description: '' },
  ],
}

const skillsSection: CVSection = {
  id: 'sec-3',
  type: 'skills',
  title: 'Technical Skills',
  isVisible: true,
  items: { languages: 'Python, JS', tools: 'Git, Docker' },
}

const hiddenSection: CVSection = {
  id: 'sec-4',
  type: 'experiences',
  title: 'Experience',
  isVisible: false,
  items: [],
}

describe('SortableSection with different types', () => {
  const defaultProps = {
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  }

  it('renders summary section title', () => {
    renderWithProviders(<SortableSection section={summarySection} {...defaultProps} />)
    // The title text should be visible somewhere in the component
    const container = document.body
    expect(container.textContent).toContain('Summary')
  })

  it('renders education section title', () => {
    renderWithProviders(<SortableSection section={educationSection} {...defaultProps} />)
    expect(document.body.textContent).toContain('Education')
  })

  it('renders skills section', () => {
    renderWithProviders(<SortableSection section={skillsSection} {...defaultProps} />)
    expect(document.body.textContent).toContain('Technical Skills')
  })

  it('renders hidden section', () => {
    renderWithProviders(<SortableSection section={hiddenSection} {...defaultProps} />)
    expect(document.body.textContent).toContain('Experience')
  })

  it('has interactive buttons', () => {
    renderWithProviders(<SortableSection section={summarySection} {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
