import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguagesEditor from './LanguagesEditor'
import { renderWithProviders } from '../../test/render'

describe('LanguagesEditor', () => {
  const user = userEvent.setup()

  it('renders input with current value', () => {
    renderWithProviders(<LanguagesEditor value="French (native), English (fluent)" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('French (native), English (fluent)')).toBeInTheDocument()
  })

  it('calls onChange when typing', async () => {
    const onChange = vi.fn()
    renderWithProviders(<LanguagesEditor value="" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'F')

    expect(onChange).toHaveBeenCalledWith('F')
  })

  it('renders with empty value', () => {
    renderWithProviders(<LanguagesEditor value="" onChange={vi.fn()} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('')
  })

  it('renders label text', () => {
    renderWithProviders(<LanguagesEditor value="" onChange={vi.fn()} />)
    // The label should exist (translated key)
    const labels = screen.getAllByText((_, element) => element?.tagName === 'LABEL')
    expect(labels.length).toBeGreaterThanOrEqual(1)
  })
})
