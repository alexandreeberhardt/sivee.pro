/**
 * Tests for CVPreview component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, act } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import CVPreview from './CVPreview'
import type { ResumeData } from '../types'

const emptyData: ResumeData = {
  personal: { name: '', title: '', location: '', email: '', phone: '', links: [] },
  sections: [],
  template_id: 'harvard',
}

const dataWithContent: ResumeData = {
  personal: { name: 'John Doe', title: 'SWE', location: 'Paris', email: 'j@e.com', phone: '123', links: [] },
  sections: [
    { id: '1', type: 'summary', title: 'Summary', isVisible: true, items: 'My bio' },
  ],
  template_id: 'harvard',
}

describe('CVPreview', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['fake pdf'], { type: 'application/pdf' })),
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('renders without crashing with empty data', async () => {
    await act(async () => {
      renderWithProviders(<CVPreview data={emptyData} />)
    })
  })

  it('renders without crashing with content data', async () => {
    await act(async () => {
      renderWithProviders(<CVPreview data={dataWithContent} />)
    })
  })

  it('has collapse/expand toggle', async () => {
    await act(async () => {
      renderWithProviders(<CVPreview data={dataWithContent} />)
    })
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('does not crash for empty data with no debounce', async () => {
    await act(async () => {
      renderWithProviders(<CVPreview data={emptyData} debounceMs={0} />)
    })
  })
})
