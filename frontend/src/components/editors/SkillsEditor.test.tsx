import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SkillsEditor from './SkillsEditor'
import { renderWithProviders } from '../../test/render'
import type { SkillsItem } from '../../types'

describe('SkillsEditor', () => {
  const user = userEvent.setup()

  const sampleData: SkillsItem = {
    languages: 'Python, JavaScript, TypeScript',
    tools: 'Git, Docker, AWS',
  }

  it('renders languages field with current value', () => {
    renderWithProviders(<SkillsEditor data={sampleData} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Python, JavaScript, TypeScript')).toBeInTheDocument()
  })

  it('renders tools field with current value', () => {
    renderWithProviders(<SkillsEditor data={sampleData} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Git, Docker, AWS')).toBeInTheDocument()
  })

  it('calls onChange when editing languages', async () => {
    const onChange = vi.fn()
    renderWithProviders(<SkillsEditor data={sampleData} onChange={onChange} />)

    const languagesInput = screen.getByDisplayValue('Python, JavaScript, TypeScript')
    await user.type(languagesInput, ', Go')

    expect(onChange).toHaveBeenCalled()
    // First keystroke
    const firstCall = onChange.mock.calls[0][0]
    expect(firstCall.languages).toContain('Python, JavaScript, TypeScript')
    // Tools should remain unchanged
    expect(firstCall.tools).toBe('Git, Docker, AWS')
  })

  it('calls onChange when editing tools', async () => {
    const onChange = vi.fn()
    renderWithProviders(<SkillsEditor data={sampleData} onChange={onChange} />)

    const toolsInput = screen.getByDisplayValue('Git, Docker, AWS')
    await user.type(toolsInput, '!')

    expect(onChange).toHaveBeenCalled()
    const firstCall = onChange.mock.calls[0][0]
    expect(firstCall.tools).toBe('Git, Docker, AWS!')
    expect(firstCall.languages).toBe('Python, JavaScript, TypeScript')
  })

  it('renders with empty data', () => {
    const emptyData: SkillsItem = { languages: '', tools: '' }
    renderWithProviders(<SkillsEditor data={emptyData} onChange={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })
})
