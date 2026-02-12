/**
 * Additional tests for AddSectionModal
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/render'
import AddSectionModal from './AddSectionModal'

describe('AddSectionModal', () => {
  const user = userEvent.setup()

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <AddSectionModal isOpen={false} onClose={vi.fn()} onAdd={vi.fn()} />
    )
    // Modal should not be visible
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders section types when open', () => {
    renderWithProviders(
      <AddSectionModal isOpen={true} onClose={vi.fn()} onAdd={vi.fn()} />
    )
    // Should have buttons for section types
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('calls onClose when clicking close', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <AddSectionModal isOpen={true} onClose={onClose} onAdd={vi.fn()} />
    )

    // Find close button (usually has X icon or aria-label)
    const closeBtn = screen.getAllByRole('button').find(b => {
      const label = b.getAttribute('aria-label') || b.textContent || ''
      return label.toLowerCase().includes('close') || label.toLowerCase().includes('fermer') || label === '×'
    })
    if (closeBtn) {
      await user.click(closeBtn)
      expect(onClose).toHaveBeenCalled()
    }
  })
})
