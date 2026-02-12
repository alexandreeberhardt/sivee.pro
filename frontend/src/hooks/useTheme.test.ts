import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('defaults to system preference when no stored value', () => {
    const { result } = renderHook(() => useTheme())
    // The mock in setup.ts sets prefers-color-scheme to false (light)
    expect(result.current.theme).toBe('light')
  })

  it('reads stored theme from localStorage', () => {
    localStorage.setItem('theme-preference', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('setTheme updates theme and persists to localStorage', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem('theme-preference')).toBe('dark')
  })

  it('toggleTheme switches from light to dark', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('dark')
  })

  it('toggleTheme switches from dark to light', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('light')
  })

  it('applies dark class to document root', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class when switching to light', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })
    act(() => {
      result.current.setTheme('light')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('ignores invalid stored values', () => {
    localStorage.setItem('theme-preference', 'invalid')
    const { result } = renderHook(() => useTheme())
    // Should fall back to system preference (light in our mock)
    expect(['light', 'dark']).toContain(result.current.theme)
  })
})
