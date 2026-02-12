import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EducationEditor from './EducationEditor'
import { renderWithProviders } from '../../test/render'
import type { EducationItem } from '../../types'

describe('EducationEditor', () => {
  const user = userEvent.setup()

  const sampleItems: EducationItem[] = [
    {
      school: 'MIT',
      degree: 'BS Computer Science',
      dates: '2018 - 2022',
      subtitle: 'GPA 3.9',
      description: 'Focus on AI and ML',
    },
  ]

  it('renders existing education items', () => {
    renderWithProviders(<EducationEditor items={sampleItems} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('MIT')).toBeInTheDocument()
    expect(screen.getByDisplayValue('BS Computer Science')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2018 - 2022')).toBeInTheDocument()
    expect(screen.getByDisplayValue('GPA 3.9')).toBeInTheDocument()
  })

  it('renders description textarea', () => {
    renderWithProviders(<EducationEditor items={sampleItems} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Focus on AI and ML')).toBeInTheDocument()
  })

  it('adds a new education item when clicking add button', async () => {
    const onChange = vi.fn()
    renderWithProviders(<EducationEditor items={[]} onChange={onChange} />)

    const addButton = screen.getByRole('button', { name: /education/i })
    await user.click(addButton)

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ school: '', degree: '', dates: '' }),
    ])
  })

  it('removes an education item when clicking delete', async () => {
    const onChange = vi.fn()
    renderWithProviders(<EducationEditor items={sampleItems} onChange={onChange} />)

    const deleteButton = screen.getByTitle(/delete/i)
    await user.click(deleteButton)

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('calls onChange when editing school field', async () => {
    const onChange = vi.fn()
    renderWithProviders(<EducationEditor items={sampleItems} onChange={onChange} />)

    const schoolInput = screen.getByDisplayValue('MIT')
    await user.type(schoolInput, 'X')

    expect(onChange).toHaveBeenCalled()
    const firstCall = onChange.mock.calls[0][0]
    expect(firstCall[0].school).toBe('MITX')
  })

  it('calls onChange when editing degree field', async () => {
    const onChange = vi.fn()
    renderWithProviders(<EducationEditor items={sampleItems} onChange={onChange} />)

    const degreeInput = screen.getByDisplayValue('BS Computer Science')
    await user.type(degreeInput, '!')

    expect(onChange).toHaveBeenCalled()
    const firstCall = onChange.mock.calls[0][0]
    expect(firstCall[0].degree).toBe('BS Computer Science!')
  })

  it('calls onChange when editing dates field', async () => {
    const onChange = vi.fn()
    renderWithProviders(<EducationEditor items={sampleItems} onChange={onChange} />)

    const datesInput = screen.getByDisplayValue('2018 - 2022')
    await user.type(datesInput, '3')

    expect(onChange).toHaveBeenCalled()
  })

  it('renders multiple items', () => {
    const multiItems: EducationItem[] = [
      { school: 'MIT', degree: 'BS', dates: '2020', subtitle: '', description: '' },
      { school: 'Stanford', degree: 'MS', dates: '2022', subtitle: '', description: '' },
    ]
    renderWithProviders(<EducationEditor items={multiItems} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('MIT')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Stanford')).toBeInTheDocument()
  })

  it('renders add education button when empty', () => {
    renderWithProviders(<EducationEditor items={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /education/i })).toBeInTheDocument()
  })
})
