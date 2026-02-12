/**
 * Additional edge case tests for section editors
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import EducationEditor from './EducationEditor'
import ExperienceEditor from './ExperienceEditor'
import ProjectEditor from './ProjectEditor'
import LeadershipEditor from './LeadershipEditor'
import CustomEditor from './CustomEditor'

describe('EducationEditor edge cases', () => {
  const user = userEvent.setup()

  it('renders with empty items array', () => {
    renderWithProviders(<EducationEditor items={[]} onChange={vi.fn()} />)
    // Should have an "add" button
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders multiple items', () => {
    const items = [
      { school: 'MIT', degree: 'BSc', dates: '2020-2024', subtitle: '', description: '' },
      { school: 'Stanford', degree: 'MSc', dates: '2024-2026', subtitle: '', description: '' },
    ]
    renderWithProviders(<EducationEditor items={items} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('MIT')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Stanford')).toBeInTheDocument()
  })
})

describe('ExperienceEditor edge cases', () => {
  it('renders with empty items', () => {
    renderWithProviders(<ExperienceEditor items={[]} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders highlights', () => {
    const items = [
      { title: 'SWE', company: 'Google', dates: '2023', highlights: ['Built X', 'Led Y'] },
    ]
    renderWithProviders(<ExperienceEditor items={items} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Built X')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Led Y')).toBeInTheDocument()
  })
})

describe('ProjectEditor edge cases', () => {
  it('renders with empty items', () => {
    renderWithProviders(<ProjectEditor items={[]} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders project with highlights', () => {
    const items = [
      { name: 'My Project', year: '2023', highlights: ['Feature 1'] },
    ]
    renderWithProviders(<ProjectEditor items={items} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('My Project')).toBeInTheDocument()
  })
})

describe('LeadershipEditor edge cases', () => {
  it('renders with empty items', () => {
    renderWithProviders(<LeadershipEditor items={[]} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders leadership item', () => {
    const items = [
      { role: 'President', place: 'Club', dates: '2023', highlights: [] },
    ]
    renderWithProviders(<LeadershipEditor items={items} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('President')).toBeInTheDocument()
  })
})

describe('CustomEditor edge cases', () => {
  it('renders with empty items', () => {
    renderWithProviders(<CustomEditor items={[]} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders custom item with all fields', () => {
    const items = [
      { title: 'Hobby', subtitle: 'Sport', dates: '2020', highlights: ['Football'] },
    ]
    renderWithProviders(<CustomEditor items={items} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Hobby')).toBeInTheDocument()
  })
})
