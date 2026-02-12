import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePdfGeneration } from './usePdfGeneration';
import type { ResumeData } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

const makeData = (): ResumeData => ({
  personal: { name: 'John Doe', title: 'Developer', location: '', email: '', phone: '', links: [] },
  sections: [],
  template_id: 'harvard',
});

describe('usePdfGeneration', () => {
  let mockSetError: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockSetError = vi.fn();
    globalThis.fetch = vi.fn();
    // Mock URL.createObjectURL and revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake-blob-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('has initial loading state as false', () => {
    const { result } = renderHook(() =>
      usePdfGeneration({ data: makeData(), setError: mockSetError })
    );

    expect(result.current.loading).toBe(false);
  });

  it('generates PDF successfully: creates blob URL and triggers download', async () => {
    const mockBlob = new Blob(['fake pdf'], { type: 'application/pdf' });
    const mockResponse = {
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    // Track DOM element creation
    const mockClick = vi.fn();
    const mockRemove = vi.fn();
    const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = mockClick;
        el.remove = mockRemove;
      }
      return el;
    });

    const data = makeData();
    const { result } = renderHook(() =>
      usePdfGeneration({ data, setError: mockSetError })
    );

    await act(async () => {
      await result.current.handleGenerate();
    });

    // Verify loading returned to false
    expect(result.current.loading).toBe(false);

    // Verify fetch was called with correct parameters
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, lang: 'en' }),
    });

    // Verify blob URL was created and a click was triggered
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockClick).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-blob-url');
    expect(mockRemove).toHaveBeenCalled();

    // Verify error was cleared
    expect(mockSetError).toHaveBeenCalledWith(null);

    mockAppendChild.mockRestore();
  });

  it('uses the personal name for the download filename', async () => {
    const mockBlob = new Blob(['fake pdf'], { type: 'application/pdf' });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    let capturedHref = '';
    let capturedDownload = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = vi.fn();
        el.remove = vi.fn();
        // Capture the download attribute when set
        const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'download');
        Object.defineProperty(el, 'download', {
          set(val) {
            capturedDownload = val;
            if (originalDescriptor?.set) originalDescriptor.set.call(el, val);
          },
          get() {
            return capturedDownload;
          },
        });
      }
      return el;
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    const data = makeData();
    data.personal.name = 'John Doe';
    const { result } = renderHook(() =>
      usePdfGeneration({ data, setError: mockSetError })
    );

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(capturedDownload).toBe('John_Doe_CV.pdf');
  });

  it('calls setError with error message on failed generation', async () => {
    const errorDetail = 'LaTeX compilation failed';
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ detail: errorDetail }),
    });

    const data = makeData();
    const { result } = renderHook(() =>
      usePdfGeneration({ data, setError: mockSetError })
    );

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(result.current.loading).toBe(false);
    expect(mockSetError).toHaveBeenCalledWith(errorDetail);
  });

  it('calls setError with translated key when no detail is provided', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({}),
    });

    const data = makeData();
    const { result } = renderHook(() =>
      usePdfGeneration({ data, setError: mockSetError })
    );

    await act(async () => {
      await result.current.handleGenerate();
    });

    // t('errors.generation') returns 'errors.generation' due to mock
    expect(mockSetError).toHaveBeenCalledWith('errors.generation');
  });

  it('calls setError with fallback message on network error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const data = makeData();
    const { result } = renderHook(() =>
      usePdfGeneration({ data, setError: mockSetError })
    );

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(result.current.loading).toBe(false);
    expect(mockSetError).toHaveBeenCalledWith('Network error');
  });
});
