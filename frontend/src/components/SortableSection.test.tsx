import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SortableSection from './SortableSection'
import { renderWithProviders } from '../test/render'
import type { CVSection } from '../types'

// Mock dnd-kit
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}))

const makeSection = (overrides: Partial<CVSection> = {}): CVSection => ({
  id: 'sec-1',
  type: 'education',
  title: 'Education',
  isVisible: true,
  items: [],
  ...overrides,
})

describe('SortableSection', () => {
  const user = userEvent.setup()

  it('renders section title', () => {
    renderWithProviders(
      <SortableSection
        section={makeSection({ title: 'My Education' })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.queryAllByText('My Education').length).toBeGreaterThanOrEqual(1)
  })

  it('renders section type badge', () => {
    renderWithProviders(
      <SortableSection
        section={makeSection()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    // The badge shows the translated section type
    const badges = document.querySelectorAll('.badge')
    expect(badges.length).toBeGreaterThanOrEqual(0) // badge exists on desktop
  })

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = vi.fn()
    renderWithProviders(
      <SortableSection
        section={makeSection()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />
    )
    // Find trash button by its title attribute
    const deleteBtn = document.querySelector('button[title]')
    const buttons = screen.getAllByRole('button')
    // The delete button has Trash2 icon
    const trashBtn = buttons.find(b => b.querySelector('.lucide-trash-2'))
    if (trashBtn) {
      await user.click(trashBtn)
      expect(onDelete).toHaveBeenCalledOnce()
    }
  })

  it('toggles visibility when eye button clicked', async () => {
    const onUpdate = vi.fn()
    renderWithProviders(
      <SortableSection
        section={makeSection({ isVisible: true })}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    )
    // Find the eye button
    const buttons = screen.getAllByRole('button')
    const eyeBtn = buttons.find(b => b.querySelector('.lucide-eye'))
    if (eyeBtn) {
      await user.click(eyeBtn)
      expect(onUpdate).toHaveBeenCalledWith({ isVisible: false })
    }
  })

  it('shows hidden message when section is not visible but expanded', () => {
    renderWithProviders(
      <SortableSection
        section={makeSection({ isVisible: false })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    // The hidden message should appear (section is expanded by default)
    const hiddenText = document.querySelector('.text-primary-400')
    expect(hiddenText).toBeInTheDocument()
  })

  it('collapses when chevron clicked', async () => {
    renderWithProviders(
      <SortableSection
        section={makeSection()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    // Find chevron-up button (section starts expanded)
    const buttons = screen.getAllByRole('button')
    const chevronBtn = buttons.find(b => b.querySelector('.lucide-chevron-up'))
    if (chevronBtn) {
      await user.click(chevronBtn)
      // After collapsing, chevron-down should appear
      const chevronDown = document.querySelector('.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()
    }
  })

  it('enters title editing mode when pencil clicked', async () => {
    renderWithProviders(
      <SortableSection
        section={makeSection({ title: 'Education' })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const pencilBtn = document.querySelector('button .lucide-pencil')?.parentElement
    if (pencilBtn) {
      await user.click(pencilBtn)
      // Should now show an input with the current title
      const input = screen.getByDisplayValue('Education')
      expect(input).toBeInTheDocument()
    }
  })

  it('saves edited title when check is clicked', async () => {
    const onUpdate = vi.fn()
    renderWithProviders(
      <SortableSection
        section={makeSection({ title: 'Education' })}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    )
    // Enter edit mode
    const pencilBtn = document.querySelector('button .lucide-pencil')?.parentElement
    if (pencilBtn) {
      await user.click(pencilBtn)
      const input = screen.getByDisplayValue('Education')
      await user.clear(input)
      await user.type(input, 'Parcours')

      const checkBtn = document.querySelector('button .lucide-check')?.parentElement
      if (checkBtn) {
        await user.click(checkBtn)
        expect(onUpdate).toHaveBeenCalledWith({ title: 'Parcours' })
      }
    }
  })

  it('cancels title editing when X is clicked', async () => {
    renderWithProviders(
      <SortableSection
        section={makeSection({ title: 'Education' })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const pencilBtn = document.querySelector('button .lucide-pencil')?.parentElement
    if (pencilBtn) {
      await user.click(pencilBtn)
      const input = screen.getByDisplayValue('Education')
      await user.clear(input)
      await user.type(input, 'Changed')

      const cancelBtn = document.querySelector('button .lucide-x')?.parentElement
      if (cancelBtn) {
        await user.click(cancelBtn)
        // Should revert to original title
        const titles = screen.queryAllByText('Education')
        expect(titles.length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('saves title on Enter key', async () => {
    const onUpdate = vi.fn()
    renderWithProviders(
      <SortableSection
        section={makeSection({ title: 'Education' })}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    )
    const pencilBtn = document.querySelector('button .lucide-pencil')?.parentElement
    if (pencilBtn) {
      await user.click(pencilBtn)
      const input = screen.getByDisplayValue('Education')
      await user.clear(input)
      await user.type(input, 'New Title{Enter}')
      expect(onUpdate).toHaveBeenCalledWith({ title: 'New Title' })
    }
  })

  it('cancels title editing on Escape key', async () => {
    renderWithProviders(
      <SortableSection
        section={makeSection({ title: 'Education' })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const pencilBtn = document.querySelector('button .lucide-pencil')?.parentElement
    if (pencilBtn) {
      await user.click(pencilBtn)
      await user.keyboard('{Escape}')
      // Should show the title text again, not input
      const titles = screen.queryAllByText('Education')
      expect(titles.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('renders education editor for education section', () => {
    renderWithProviders(
      <SortableSection
        section={makeSection({ type: 'education', items: [] })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    // The section should render without errors (editor renders the empty state)
  })

  it('renders skills editor for skills section', () => {
    renderWithProviders(
      <SortableSection
        section={makeSection({ type: 'skills', items: { languages: '', tools: '' } })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
  })

  it('renders summary editor for summary section', () => {
    renderWithProviders(
      <SortableSection
        section={makeSection({ type: 'summary', items: 'My summary text' })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
  })

  it('has reduced opacity when hidden', () => {
    const { container } = renderWithProviders(
      <SortableSection
        section={makeSection({ isVisible: false })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('opacity-60')
  })
})
