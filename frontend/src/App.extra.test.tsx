import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import { renderWithProviders } from './test/render'

vi.mock('./api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/auth')>()
  return {
    ...actual,
    resendVerification: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('./api/resumes', () => ({
  listResumes: vi.fn().mockResolvedValue({ resumes: [] }),
  createResume: vi.fn().mockResolvedValue({}),
  updateResume: vi.fn().mockResolvedValue({}),
  deleteResume: vi.fn().mockResolvedValue({}),
}))

const verifiedUser = {
  id: 1,
  email: 'test@example.com',
  isGuest: false,
  isVerified: true as boolean | undefined,
  feedbackCompleted: false,
}

const unverifiedUser = {
  ...verifiedUser,
  isVerified: false as boolean | undefined,
}

describe('App – loading state', () => {
  it('shows loading spinner during auth check', async () => {
    renderWithProviders(<App />, {
      authValue: { isLoading: true, isAuthenticated: false },
    })
    await act(async () => {})
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })
})

describe('App – unverified user screen', () => {
  it('shows "Check your inbox" heading', async () => {
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
      },
    })
    await act(async () => {})
    expect(screen.getByText('Check your inbox')).toBeTruthy()
  })

  it('displays the user email', async () => {
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
      },
    })
    await act(async () => {})
    expect(screen.getByText('test@example.com')).toBeTruthy()
  })

  it('shows the resend verification button', async () => {
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
      },
    })
    await act(async () => {})
    expect(screen.getByText('Resend verification email')).toBeTruthy()
  })

  it('shows the change email button', async () => {
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
      },
    })
    await act(async () => {})
    expect(screen.getByText('Change email')).toBeTruthy()
  })

  it('shows logout button', async () => {
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
      },
    })
    await act(async () => {})
    expect(screen.getByTestId('logout-unverified')).toBeTruthy()
  })

  it('calls logout when clicking logout button', async () => {
    const logout = vi.fn()
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
        logout,
      },
    })
    await act(async () => {})
    fireEvent.click(screen.getByTestId('logout-unverified'))
    expect(logout).toHaveBeenCalledOnce()
  })
})

describe('App – resend verification email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls resendVerification when clicking resend button', async () => {
    const { resendVerification } = await import('./api/auth')

    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
      },
    })
    await act(async () => {})

    fireEvent.click(screen.getByText('Resend verification email'))

    await waitFor(() => {
      expect(resendVerification).toHaveBeenCalledWith('test@example.com')
    })
  })

  it('shows success message after resend', async () => {
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
      },
    })
    await act(async () => {})

    fireEvent.click(screen.getByText('Resend verification email'))

    await waitFor(() => {
      expect(
        screen.getByText('Verification email resent! Check your inbox.'),
      ).toBeTruthy()
    })
  })

  it('hides resend button after success', async () => {
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
      },
    })
    await act(async () => {})

    fireEvent.click(screen.getByText('Resend verification email'))

    await waitFor(() => {
      expect(screen.queryByText('Resend verification email')).toBeNull()
    })
  })
})

describe('App – change email modal', () => {
  it('opens ChangeEmailModal when clicking change email button', async () => {
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: unverifiedUser,
      },
    })
    await act(async () => {})

    fireEvent.click(screen.getByText('Change email'))
    expect(screen.getByText('Change email address')).toBeTruthy()
  })
})

describe('App – localStorage draft for unverified users', () => {
  const draftKey = `resume_draft_unverified_1`

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('restores draft from localStorage when user becomes verified', async () => {
    const draft = {
      personal: {
        name: 'Jean Dupont',
        title: '',
        location: '',
        email: '',
        phone: '',
        links: [],
      },
      sections: [],
      template_id: 'harvard',
    }
    localStorage.setItem(draftKey, JSON.stringify(draft))

    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: verifiedUser,
      },
    })
    await act(async () => {})

    // The draft restoration runs in a useEffect. After the effect,
    // localStorage entry should be removed.
    expect(localStorage.getItem(draftKey)).toBeNull()
  })

  it('does not restore draft when localStorage is empty', async () => {
    renderWithProviders(<App />, {
      authValue: {
        isAuthenticated: true,
        user: verifiedUser,
      },
    })
    await act(async () => {})

    // No draft in localStorage – nothing should break
    expect(localStorage.getItem(draftKey)).toBeNull()
  })
})
