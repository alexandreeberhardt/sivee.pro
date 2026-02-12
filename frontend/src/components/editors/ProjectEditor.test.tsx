import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectEditor from './ProjectEditor'
import { renderWithProviders } from '../../test/render'
import type { ProjectItem } from '../../types'

describe('ProjectEditor', () => {
  const user = userEvent.setup()

  const sampleItems: ProjectItem[] = [
    {
      name: 'CV Generator',
      year: '2024',
      highlights: ['Built with React', 'LaTeX rendering'],
    },
  ]

  it('renders existing project items', () => {
    renderWithProviders(<ProjectEditor items={sampleItems} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('CV Generator')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024')).toBeInTheDocument()
  })

  it('renders highlights', () => {
    renderWithProviders(<ProjectEditor items={sampleItems} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Built with React')).toBeInTheDocument()
    expect(screen.getByDisplayValue('LaTeX rendering')).toBeInTheDocument()
  })

  it('adds a new project when clicking add button', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ProjectEditor items={[]} onChange={onChange} />)

    const addButton = screen.getByRole('button', { name: /project/i })
    await user.click(addButton)

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: '', year: '', highlights: [] }),
    ])
  })

  it('removes a project when clicking delete', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ProjectEditor items={sampleItems} onChange={onChange} />)

    const deleteButton = screen.getByTitle(/delete/i)
    await user.click(deleteButton)

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('calls onChange when editing name field', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ProjectEditor items={sampleItems} onChange={onChange} />)

    const nameInput = screen.getByDisplayValue('CV Generator')
    await user.type(nameInput, '!')

    expect(onChange).toHaveBeenCalled()
    const firstCall = onChange.mock.calls[0][0]
    expect(firstCall[0].name).toBe('CV Generator!')
  })

  it('adds a highlight', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ProjectEditor items={sampleItems} onChange={onChange} />)

    const allButtons = screen.getAllByRole('button')
    const addHighlightBtn = allButtons.find(btn => {
      const text = btn.textContent?.toLowerCase() || ''
      return (text === 'add' || text === 'ajouter') && !text.includes('project') && !text.includes('projet')
    })!
    await user.click(addHighlightBtn)

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        highlights: ['Built with React', 'LaTeX rendering', ''],
      }),
    ])
  })

  it('shows empty highlights message when no highlights', () => {
    const itemsNoHighlights: ProjectItem[] = [
      { name: 'Project', year: '2024', highlights: [] },
    ]
    renderWithProviders(<ProjectEditor items={itemsNoHighlights} onChange={vi.fn()} />)

    const emptyMessage = screen.getByText((text, element) =>
      element?.tagName === 'P' && element?.classList.contains('italic') && text.length > 0
    )
    expect(emptyMessage).toBeInTheDocument()
  })

  it('renders add project button when empty', () => {
    renderWithProviders(<ProjectEditor items={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /project/i })).toBeInTheDocument()
  })
})
