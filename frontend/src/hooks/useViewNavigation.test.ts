import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewNavigation } from './useViewNavigation';

describe('useViewNavigation', () => {
  const pushStateSpy = vi.spyOn(window.history, 'pushState');
  const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

  beforeEach(() => {
    pushStateSpy.mockReset();
    replaceStateSpy.mockReset();
  });

  it('has correct initial state: showLanding=true, showResumesPage=false', () => {
    const { result } = renderHook(() => useViewNavigation());

    expect(result.current.showLanding).toBe(true);
    expect(result.current.showResumesPage).toBe(false);
  });

  it('setShowLanding(false) updates showLanding to false', () => {
    const { result } = renderHook(() => useViewNavigation());

    act(() => {
      result.current.setShowLanding(false);
    });

    expect(result.current.showLanding).toBe(false);
  });

  it('setShowResumesPage(true) updates showResumesPage to true', () => {
    const { result } = renderHook(() => useViewNavigation());

    act(() => {
      result.current.setShowResumesPage(true);
    });

    expect(result.current.showResumesPage).toBe(true);
  });

  it('applyView("editor") sets both showLanding and showResumesPage to false', () => {
    const { result } = renderHook(() => useViewNavigation());

    act(() => {
      result.current.applyView('editor');
    });

    expect(result.current.showLanding).toBe(false);
    expect(result.current.showResumesPage).toBe(false);
  });

  it('applyView("landing") sets showLanding=true and showResumesPage=false', () => {
    const { result } = renderHook(() => useViewNavigation());

    // First go to editor, then back to landing
    act(() => {
      result.current.applyView('editor');
    });

    act(() => {
      result.current.applyView('landing');
    });

    expect(result.current.showLanding).toBe(true);
    expect(result.current.showResumesPage).toBe(false);
  });

  it('applyView("resumes") sets showLanding=false and showResumesPage=true', () => {
    const { result } = renderHook(() => useViewNavigation());

    act(() => {
      result.current.applyView('resumes');
    });

    expect(result.current.showLanding).toBe(false);
    expect(result.current.showResumesPage).toBe(true);
  });

  it('calls window.history.pushState when the view changes', () => {
    const { result } = renderHook(() => useViewNavigation());

    // Clear any calls from initial render/replaceState
    pushStateSpy.mockClear();

    act(() => {
      result.current.applyView('editor');
    });

    expect(pushStateSpy).toHaveBeenCalledWith({ view: 'editor' }, '');
  });

  it('calls window.history.replaceState on mount with landing view', () => {
    renderHook(() => useViewNavigation());

    expect(replaceStateSpy).toHaveBeenCalledWith({ view: 'landing' }, '');
  });

  it('popstate event triggers applyView with the state view', () => {
    const { result } = renderHook(() => useViewNavigation());

    // Navigate to editor first so we can go "back"
    act(() => {
      result.current.applyView('editor');
    });

    expect(result.current.showLanding).toBe(false);
    expect(result.current.showResumesPage).toBe(false);

    // Simulate browser back button with popstate
    act(() => {
      const popStateEvent = new PopStateEvent('popstate', {
        state: { view: 'resumes' },
      });
      window.dispatchEvent(popStateEvent);
    });

    expect(result.current.showLanding).toBe(false);
    expect(result.current.showResumesPage).toBe(true);
  });

  it('popstate event without state defaults to landing', () => {
    const { result } = renderHook(() => useViewNavigation());

    act(() => {
      result.current.applyView('editor');
    });

    act(() => {
      const popStateEvent = new PopStateEvent('popstate', {
        state: null,
      });
      window.dispatchEvent(popStateEvent);
    });

    expect(result.current.showLanding).toBe(true);
    expect(result.current.showResumesPage).toBe(false);
  });
});
