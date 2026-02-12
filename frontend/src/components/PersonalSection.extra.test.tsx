/**
 * Additional tests for PersonalSection component
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/render'
import PersonalSection from './PersonalSection'
import type { PersonalInfo } from '../types'

const emptyPersonal: PersonalInfo = {
  name: '',
  title: '',
  location: '',
  email: '',
  phone: '',
  links: [],
}

const filledPersonal: PersonalInfo = {
  name: 'John Doe',
  title: 'Software Engineer',
  location: 'Paris, France',
  email: 'john@example.com',
  phone: '+33 6 12 34 56 78',
  links: [
    { platform: 'linkedin', username: 'johndoe', url: 'https://linkedin.com/in/johndoe' },
    { platform: 'github', username: 'johndoe', url: 'https://github.com/johndoe' },
  ],
}

describe('PersonalSection extra', () => {
  const user = userEvent.setup()

  it('renders all 5 input fields with empty data', () => {
    renderWithProviders(<PersonalSection data={emptyPersonal} onChange={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    // At least 5 fields: name, title, location, email, phone
    expect(inputs.length).toBeGreaterThanOrEqual(5)
  })

  it('renders filled name', () => {
    renderWithProviders(<PersonalSection data={filledPersonal} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
  })

  it('renders filled email', () => {
    renderWithProviders(<PersonalSection data={filledPersonal} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
  })

  it('renders filled phone', () => {
    renderWithProviders(<PersonalSection data={filledPersonal} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('+33 6 12 34 56 78')).toBeInTheDocument()
  })

  it('calls onChange when editing name', async () => {
    const onChange = vi.fn()
    renderWithProviders(<PersonalSection data={emptyPersonal} onChange={onChange} />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'A')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders links section for personal with links', () => {
    renderWithProviders(<PersonalSection data={filledPersonal} onChange={vi.fn()} />)
    // Should have link-related inputs (username and url for each link)
    const allInputs = screen.getAllByRole('textbox')
    // More inputs than just the 5 personal fields due to links
    expect(allInputs.length).toBeGreaterThan(5)
  })
})
