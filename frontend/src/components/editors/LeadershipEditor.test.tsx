import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LeadershipEditor from './LeadershipEditor'
import { renderWithProviders } from '../../test/render'
import type { LeadershipItem } from '../../types'

describe('LeadershipEditor', () => {
  const user = userEvent.setup()

  const sampleItems: LeadershipItem[] = [
    {
      role: 'Team Lead',
      place: 'Tech Corp',
      dates: '2021 - 2023',
      highlights: ['Managed 5 engineers', 'Improved velocity 30%'],
    },
  ]

  it('renders existing items', () => {
    renderWithProviders(<LeadershipEditor items={sampleItems} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Team Lead')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Tech Corp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2021 - 2023')).toBeInTheDocument()
  })

  it('renders highlights', () => {
    renderWithProviders(<LeadershipEditor items={sampleItems} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Managed 5 engineers')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Improved velocity 30%')).toBeInTheDocument()
  })

  it('adds a new item when clicking add button', async () => {
    const onChange = vi.fn()
    renderWithProviders(<LeadershipEditor items={[]} onChange={onChange} />)

    const addButton = screen.getByRole('button', { name: /involvement|leadership/i })
    await user.click(addButton)

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ role: '', place: '', dates: '', highlights: [] }),
    ])
  })

  it('removes an item when clicking delete', async () => {
    const onChange = vi.fn()
    renderWithProviders(<LeadershipEditor items={sampleItems} onChange={onChange} />)

    const deleteButton = screen.getByTitle(/delete/i)
    await user.click(deleteButton)

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('calls onChange when editing role field', async () => {
    const onChange = vi.fn()
    renderWithProviders(<LeadershipEditor items={sampleItems} onChange={onChange} />)

    const roleInput = screen.getByDisplayValue('Team Lead')
    await user.type(roleInput, '!')

    expect(onChange).toHaveBeenCalled()
    const firstCall = onChange.mock.calls[0][0]
    expect(firstCall[0].role).toBe('Team Lead!')
  })

  it('adds a highlight', async () => {
    const onChange = vi.fn()
    renderWithProviders(<LeadershipEditor items={sampleItems} onChange={onChange} />)

    const allButtons = screen.getAllByRole('button')
    const addHighlightBtn = allButtons.find(btn => {
      const text = btn.textContent?.toLowerCase() || ''
      return (text === 'add' || text === 'ajouter') && !text.includes('leadership')
    })!
    await user.click(addHighlightBtn)

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        highlights: ['Managed 5 engineers', 'Improved velocity 30%', ''],
      }),
    ])
  })

  it('shows empty highlights message when no highlights', () => {
    const itemsNoHighlights: LeadershipItem[] = [
      { role: 'Lead', place: 'Co', dates: '2020', highlights: [] },
    ]
    renderWithProviders(<LeadershipEditor items={itemsNoHighlights} onChange={vi.fn()} />)

    const emptyMessage = screen.getByText((text, element) =>
      element?.tagName === 'P' && element?.classList.contains('italic') && text.length > 0
    )
    expect(emptyMessage).toBeInTheDocument()
  })

  it('renders add button when empty', () => {
    renderWithProviders(<LeadershipEditor items={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /involvement|leadership/i })).toBeInTheDocument()
  })
})
