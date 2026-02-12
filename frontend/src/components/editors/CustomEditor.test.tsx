import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomEditor from './CustomEditor'
import { renderWithProviders } from '../../test/render'
import type { CustomItem } from '../../types'

describe('CustomEditor', () => {
  const user = userEvent.setup()

  const sampleItems: CustomItem[] = [
    {
      title: 'Volunteering',
      subtitle: 'Red Cross',
      dates: '2020 - Present',
      highlights: ['Organized events', 'Trained volunteers'],
    },
  ]

  it('renders existing items', () => {
    renderWithProviders(<CustomEditor items={sampleItems} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Volunteering')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Red Cross')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2020 - Present')).toBeInTheDocument()
  })

  it('renders highlights', () => {
    renderWithProviders(<CustomEditor items={sampleItems} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Organized events')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Trained volunteers')).toBeInTheDocument()
  })

  it('adds a new item when clicking add button', async () => {
    const onChange = vi.fn()
    renderWithProviders(<CustomEditor items={[]} onChange={onChange} />)

    // The add button contains a translated text with "custom" or "item"
    const buttons = screen.getAllByRole('button')
    const addButton = buttons[buttons.length - 1] // Last button is the add button
    await user.click(addButton)

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ title: '', highlights: [] }),
    ])
  })

  it('removes an item when clicking delete', async () => {
    const onChange = vi.fn()
    renderWithProviders(<CustomEditor items={sampleItems} onChange={onChange} />)

    const deleteButton = screen.getByTitle(/delete/i)
    await user.click(deleteButton)

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('calls onChange when editing title', async () => {
    const onChange = vi.fn()
    renderWithProviders(<CustomEditor items={sampleItems} onChange={onChange} />)

    const titleInput = screen.getByDisplayValue('Volunteering')
    await user.type(titleInput, '!')

    expect(onChange).toHaveBeenCalled()
    const firstCall = onChange.mock.calls[0][0]
    expect(firstCall[0].title).toBe('Volunteering!')
  })

  it('adds a highlight', async () => {
    const onChange = vi.fn()
    renderWithProviders(<CustomEditor items={sampleItems} onChange={onChange} />)

    const allButtons = screen.getAllByRole('button')
    const addHighlightBtn = allButtons.find(btn => {
      const text = btn.textContent?.toLowerCase() || ''
      return (text === 'add' || text === 'ajouter') && !text.includes('item')
    })!
    await user.click(addHighlightBtn)

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        highlights: ['Organized events', 'Trained volunteers', ''],
      }),
    ])
  })

  it('shows empty highlights message when no highlights', () => {
    const itemsNoHighlights: CustomItem[] = [
      { title: 'Item', subtitle: '', dates: '', highlights: [] },
    ]
    renderWithProviders(<CustomEditor items={itemsNoHighlights} onChange={vi.fn()} />)

    const emptyMessage = screen.getByText((text, element) =>
      element?.tagName === 'P' && element?.classList.contains('italic') && text.length > 0
    )
    expect(emptyMessage).toBeInTheDocument()
  })
})
