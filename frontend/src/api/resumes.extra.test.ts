/**
 * Additional tests for resumes API functions
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  createResume,
  listResumes,
  getResume,
  updateResume,
  deleteResume,
  generateResumePdf,
} from './resumes'

describe('createResume', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    localStorage.clear()
  })

  it('sends POST with name and null content', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, name: 'My CV', json_content: null }),
    })

    const result = await createResume('My CV')
    expect(result.name).toBe('My CV')
    const callArgs = (globalThis.fetch as any).mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.name).toBe('My CV')
    expect(body.json_content).toBeNull()
  })

  it('sends POST with name and content', async () => {
    const content = { personal: { name: 'John' }, sections: [], template_id: 'harvard' }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, name: 'CV', json_content: content }),
    })

    await createResume('CV', content as any)
    const callArgs = (globalThis.fetch as any).mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.json_content.personal.name).toBe('John')
  })
})

describe('listResumes', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends GET request', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ resumes: [], total: 0 }),
    })

    const result = await listResumes()
    expect(result.total).toBe(0)
    expect(result.resumes).toEqual([])
  })
})

describe('getResume', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends GET request with id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 42, name: 'My CV' }),
    })

    const result = await getResume(42)
    expect(result.id).toBe(42)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/resumes/42',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('updateResume', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends PUT with update data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, name: 'Updated' }),
    })

    await updateResume(1, { name: 'Updated' })
    const callArgs = (globalThis.fetch as any).mock.calls[0]
    expect(callArgs[1].method).toBe('PUT')
    expect(callArgs[0]).toBe('/api/resumes/1')
  })
})

describe('deleteResume', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends DELETE request', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    })

    await deleteResume(5)
    const callArgs = (globalThis.fetch as any).mock.calls[0]
    expect(callArgs[1].method).toBe('DELETE')
    expect(callArgs[0]).toBe('/api/resumes/5')
  })
})

describe('generateResumePdf', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    localStorage.clear()
  })

  it('sends POST and returns blob on success', async () => {
    const mockBlob = new Blob(['fake pdf'], { type: 'application/pdf' })
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(mockBlob),
    })

    localStorage.setItem('access_token', 'test-token')
    const result = await generateResumePdf(1, 'harvard', 'fr')
    expect(result).toBeInstanceOf(Blob)
  })

  it('includes auth header', async () => {
    const mockBlob = new Blob(['pdf'])
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(mockBlob),
    })

    localStorage.setItem('access_token', 'my-jwt')
    await generateResumePdf(1)
    const callArgs = (globalThis.fetch as any).mock.calls[0]
    expect(callArgs[1].headers.Authorization).toBe('Bearer my-jwt')
  })

  it('includes template and lang params', async () => {
    const mockBlob = new Blob(['pdf'])
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(mockBlob),
    })

    await generateResumePdf(42, 'europass', 'en')
    const url = (globalThis.fetch as any).mock.calls[0][0]
    expect(url).toContain('template_id=europass')
    expect(url).toContain('lang=en')
  })

  it('throws error on failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Compilation failed' }),
    })

    await expect(generateResumePdf(1)).rejects.toThrow('Compilation failed')
  })

  it('throws generic error when no detail', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Not JSON')),
    })

    await expect(generateResumePdf(1)).rejects.toThrow('PDF generation failed')
  })

  it('uses default template and lang', async () => {
    const mockBlob = new Blob(['pdf'])
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(mockBlob),
    })

    await generateResumePdf(1)
    const url = (globalThis.fetch as any).mock.calls[0][0]
    expect(url).toContain('template_id=harvard')
    expect(url).toContain('lang=fr')
  })
})
