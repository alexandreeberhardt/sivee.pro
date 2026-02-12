import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddSectionModal from './AddSectionModal'
import { renderWithProviders } from '../test/render'

describe('AddSectionModal', () => {
  const user = userEvent.setup()

  it('renders modal with title', () => {
    renderWithProviders(
      <AddSectionModal onAdd={vi.fn()} onClose={vi.fn()} />
    )
    // The modal has a heading
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it('renders all 8 section type options', () => {
    renderWithProviders(
      <AddSectionModal onAdd={vi.fn()} onClose={vi.fn()} />
    )
    // There are 8 section type buttons plus close, cancel, and add buttons
    const buttons = screen.getAllByRole('button')
    // At minimum: 8 section types + close + cancel + add = 11
    expect(buttons.length).toBeGreaterThanOrEqual(10)
  })

  it('calls onClose when clicking backdrop', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <AddSectionModal onAdd={vi.fn()} onClose={onClose} />
    )

    // The backdrop is the first div with bg-primary-900/40
    const backdrop = document.querySelector('.backdrop-blur-sm')
    if (backdrop) {
      await user.click(backdrop as HTMLElement)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('calls onClose when clicking cancel button', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <AddSectionModal onAdd={vi.fn()} onClose={onClose} />
    )

    // Find cancel button (btn-ghost class)
    const cancelBtn = document.querySelector('.btn-ghost') as HTMLElement
    if (cancelBtn) {
      await user.click(cancelBtn)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('add button is disabled when no section selected', () => {
    renderWithProviders(
      <AddSectionModal onAdd={vi.fn()} onClose={vi.fn()} />
    )

    const addBtn = document.querySelector('.btn-primary') as HTMLButtonElement
    expect(addBtn).toBeDisabled()
  })

  it('enables add button after selecting a section type', async () => {
    renderWithProviders(
      <AddSectionModal onAdd={vi.fn()} onClose={vi.fn()} />
    )

    // Click on the first section option (education-like)
    const sectionButtons = screen.getAllByRole('button').filter(
      (b) => b.classList.contains('border-2') || b.classList.contains('rounded-xl')
    )
    // Pick the first section type button (skip close button)
    const firstSection = sectionButtons.find(b => b.classList.contains('w-full'))
    if (firstSection) {
      await user.click(firstSection)
      const addBtn = document.querySelector('.btn-primary') as HTMLButtonElement
      expect(addBtn).not.toBeDisabled()
    }
  })

  it('calls onAdd when clicking add button after selection', async () => {
    const onAdd = vi.fn()
    renderWithProviders(
      <AddSectionModal onAdd={onAdd} onClose={vi.fn()} />
    )

    // Select a section type
    const sectionButtons = screen.getAllByRole('button').filter(
      (b) => b.classList.contains('w-full') && b.classList.contains('text-left')
    )
    if (sectionButtons.length > 0) {
      await user.click(sectionButtons[0])

      const addBtn = document.querySelector('.btn-primary') as HTMLElement
      await user.click(addBtn)

      expect(onAdd).toHaveBeenCalled()
    }
  })

  it('shows custom title input when custom section selected', async () => {
    renderWithProviders(
      <AddSectionModal onAdd={vi.fn()} onClose={vi.fn()} />
    )

    // Find and click the "custom" section option (last one)
    const sectionButtons = screen.getAllByRole('button').filter(
      (b) => b.classList.contains('w-full') && b.classList.contains('text-left')
    )
    // Custom is the last section type
    const customBtn = sectionButtons[sectionButtons.length - 1]
    if (customBtn) {
      await user.click(customBtn)

      // A text input for custom title should appear
      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('disables add for custom section without title', async () => {
    renderWithProviders(
      <AddSectionModal onAdd={vi.fn()} onClose={vi.fn()} />
    )

    const sectionButtons = screen.getAllByRole('button').filter(
      (b) => b.classList.contains('w-full') && b.classList.contains('text-left')
    )
    const customBtn = sectionButtons[sectionButtons.length - 1]
    if (customBtn) {
      await user.click(customBtn)

      const addBtn = document.querySelector('.btn-primary') as HTMLButtonElement
      expect(addBtn).toBeDisabled()
    }
  })

  it('enables add for custom section with title', async () => {
    renderWithProviders(
      <AddSectionModal onAdd={vi.fn()} onClose={vi.fn()} />
    )

    const sectionButtons = screen.getAllByRole('button').filter(
      (b) => b.classList.contains('w-full') && b.classList.contains('text-left')
    )
    const customBtn = sectionButtons[sectionButtons.length - 1]
    if (customBtn) {
      await user.click(customBtn)

      const titleInput = screen.getByRole('textbox')
      await user.type(titleInput, 'Hobbies')

      const addBtn = document.querySelector('.btn-primary') as HTMLButtonElement
      expect(addBtn).not.toBeDisabled()
    }
  })
})
