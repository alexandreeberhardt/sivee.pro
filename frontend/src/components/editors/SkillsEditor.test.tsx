import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SkillsEditor from './SkillsEditor'
import { renderWithProviders } from '../../test/render'
import type { SkillsItem } from '../../types'

describe('SkillsEditor', () => {
  const user = userEvent.setup()

  const sampleData: SkillsItem = [
    { id: '1', category: 'Programming Languages', skills: 'Python, JavaScript, TypeScript' },
    { id: '2', category: 'Tools', skills: 'Git, Docker, AWS' },
  ]

  it('renders category fields with current values', () => {
    renderWithProviders(<SkillsEditor data={sampleData} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Programming Languages')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Tools')).toBeInTheDocument()
  })

  it('renders skills fields with current values', () => {
    renderWithProviders(<SkillsEditor data={sampleData} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Python, JavaScript, TypeScript')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Git, Docker, AWS')).toBeInTheDocument()
  })

  it('calls onChange when editing a category name', async () => {
    const onChange = vi.fn()
    renderWithProviders(<SkillsEditor data={sampleData} onChange={onChange} />)

    const categoryInput = screen.getByDisplayValue('Programming Languages')
    await user.type(categoryInput, '!')

    expect(onChange).toHaveBeenCalled()
    const firstCall = onChange.mock.calls[0][0]
    expect(firstCall[0].category).toContain('Programming Languages')
    expect(firstCall[1].skills).toBe('Git, Docker, AWS')
  })

  it('calls onChange when editing skills', async () => {
    const onChange = vi.fn()
    renderWithProviders(<SkillsEditor data={sampleData} onChange={onChange} />)

    const skillsInput = screen.getByDisplayValue('Git, Docker, AWS')
    await user.type(skillsInput, '!')

    expect(onChange).toHaveBeenCalled()
    const firstCall = onChange.mock.calls[0][0]
    expect(firstCall[1].skills).toBe('Git, Docker, AWS!')
    expect(firstCall[0].category).toBe('Programming Languages')
  })

  it('renders with empty data', () => {
    const emptyData: SkillsItem = []
    renderWithProviders(<SkillsEditor data={emptyData} onChange={vi.fn()} />)
    // Should show empty hint
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
