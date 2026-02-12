import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSize } from './useAutoSize';
import type { ResumeData } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

const makeData = (): ResumeData => ({
  personal: { name: 'John Doe', title: 'Developer', location: '', email: '', phone: '', links: [] },
  sections: [
    { id: 'sec-1', type: 'education', title: 'Education', isVisible: true, items: [] },
  ],
  template_id: 'harvard',
});

describe('useAutoSize', () => {
  let mockSetData: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSetData = vi.fn();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('has correct initial state: autoSize=true, recommendedSize="normal", autoSizeLoading=false', () => {
    // Prevent the effect's fetch from resolving during this test
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useAutoSize({ data: makeData(), setData: mockSetData })
    );

    expect(result.current.autoSize).toBe(true);
    expect(result.current.recommendedSize).toBe('normal');
    expect(result.current.autoSizeLoading).toBe(false);
  });

  it('setAutoSize(false) disables auto-sizing', () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useAutoSize({ data: makeData(), setData: mockSetData })
    );

    act(() => {
      result.current.setAutoSize(false);
    });

    expect(result.current.autoSize).toBe(false);
  });

  it('makes a debounced API call when autoSize is true', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        optimal_size: 'compact',
        template_id: 'harvard_compact',
      }),
    });

    const data = makeData();
    renderHook(() => useAutoSize({ data, setData: mockSetData }));

    // Fetch should not have been called yet (debounce pending)
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // Advance timers past the 1000ms debounce
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/optimal-size', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, template_id: 'harvard', lang: 'en' }),
    });
  });

  it('updates recommendedSize and calls setData on successful API response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        optimal_size: 'compact',
        template_id: 'harvard_compact',
      }),
    });

    const data = makeData();
    const { result } = renderHook(() =>
      useAutoSize({ data, setData: mockSetData })
    );

    // Advance past debounce and let the async fetch resolve
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.recommendedSize).toBe('compact');
    expect(result.current.autoSizeLoading).toBe(false);

    // Verify setData was called with an updater function
    expect(mockSetData).toHaveBeenCalled();
    const updater = mockSetData.mock.calls[0][0];
    const updated = updater(data);
    expect(updated.template_id).toBe('harvard_compact');
  });

  it('does not update template_id if it already matches', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        optimal_size: 'normal',
        template_id: 'harvard',
      }),
    });

    const data = makeData(); // template_id is already 'harvard'
    renderHook(() => useAutoSize({ data, setData: mockSetData }));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // setData should be called, but the updater should return same object
    expect(mockSetData).toHaveBeenCalled();
    const updater = mockSetData.mock.calls[0][0];
    const result = updater(data);
    // Should return the same reference since template_id hasn't changed
    expect(result).toBe(data);
  });

  it('does not make API calls when autoSize is false', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const data = makeData();
    const { result } = renderHook(() =>
      useAutoSize({ data, setData: mockSetData })
    );

    act(() => {
      result.current.setAutoSize(false);
    });

    // Clear any calls that may have happened before disabling
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockClear();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('handles API errors gracefully without crashing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));

    const data = makeData();
    const { result } = renderHook(() =>
      useAutoSize({ data, setData: mockSetData })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.autoSizeLoading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to get optimal size:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
