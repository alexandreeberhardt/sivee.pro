import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createResume,
  listResumes,
  getResume,
  updateResume,
  deleteResume,
} from './resumes'

// Mock the api client
vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from './client'

describe('Resumes API', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createResume', () => {
    it('calls POST /resumes with name', async () => {
      const mockResume = { id: 1, name: 'My CV', json_content: null }
      vi.mocked(api.post).mockResolvedValue(mockResume)

      const result = await createResume('My CV')

      expect(api.post).toHaveBeenCalledWith('/resumes', {
        name: 'My CV',
        json_content: null,
      })
      expect(result).toEqual(mockResume)
    })

    it('calls POST /resumes with name and content', async () => {
      const content = { personal: { name: 'John' }, sections: [] } as any
      vi.mocked(api.post).mockResolvedValue({ id: 1, name: 'CV', json_content: content })

      await createResume('CV', content)

      expect(api.post).toHaveBeenCalledWith('/resumes', {
        name: 'CV',
        json_content: content,
      })
    })
  })

  describe('listResumes', () => {
    it('calls GET /resumes', async () => {
      const mockResponse = { resumes: [], total: 0 }
      vi.mocked(api.get).mockResolvedValue(mockResponse)

      const result = await listResumes()

      expect(api.get).toHaveBeenCalledWith('/resumes')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getResume', () => {
    it('calls GET /resumes/:id', async () => {
      const mockResume = { id: 5, name: 'My CV' }
      vi.mocked(api.get).mockResolvedValue(mockResume)

      const result = await getResume(5)

      expect(api.get).toHaveBeenCalledWith('/resumes/5')
      expect(result).toEqual(mockResume)
    })
  })

  describe('updateResume', () => {
    it('calls PUT /resumes/:id with data', async () => {
      const updateData = { name: 'Updated CV' }
      vi.mocked(api.put).mockResolvedValue({ id: 1, name: 'Updated CV' })

      const result = await updateResume(1, updateData)

      expect(api.put).toHaveBeenCalledWith('/resumes/1', updateData)
      expect(result).toEqual({ id: 1, name: 'Updated CV' })
    })

    it('calls PUT /resumes/:id with json_content', async () => {
      const content = { personal: { name: 'Jane' } } as any
      vi.mocked(api.put).mockResolvedValue({ id: 2, json_content: content })

      await updateResume(2, { json_content: content })

      expect(api.put).toHaveBeenCalledWith('/resumes/2', { json_content: content })
    })
  })

  describe('deleteResume', () => {
    it('calls DELETE /resumes/:id', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined)

      await deleteResume(3)

      expect(api.delete).toHaveBeenCalledWith('/resumes/3')
    })
  })
})
