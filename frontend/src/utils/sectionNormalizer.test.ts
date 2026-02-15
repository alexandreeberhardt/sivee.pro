import { describe, it, expect, vi } from 'vitest'
import {
  KNOWN_SECTION_TYPES,
  isKnownSectionType,
  convertToCustomItems,
  normalizeSection,
} from './sectionNormalizer'

describe('isKnownSectionType', () => {
  it('returns true for all known section types', () => {
    const knownTypes = [
      'summary',
      'education',
      'experiences',
      'projects',
      'skills',
      'leadership',
      'languages',
      'custom',
    ]
    for (const type of knownTypes) {
      expect(isKnownSectionType(type)).toBe(true)
    }
  })

  it('returns false for unknown section types', () => {
    expect(isKnownSectionType('volunteering')).toBe(false)
    expect(isKnownSectionType('certifications')).toBe(false)
    expect(isKnownSectionType('hobbies')).toBe(false)
    expect(isKnownSectionType('')).toBe(false)
  })

  it('KNOWN_SECTION_TYPES contains exactly 8 types', () => {
    expect(KNOWN_SECTION_TYPES).toHaveLength(8)
  })
})

describe('convertToCustomItems', () => {
  it('converts an array of strings to CustomItems with highlights', () => {
    const result = convertToCustomItems(['Built a website', 'Led a team'])
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      title: '',
      subtitle: '',
      dates: '',
      highlights: ['Built a website'],
    })
    expect(result[0].id).toBeDefined()
    expect(result[1]).toMatchObject({
      title: '',
      subtitle: '',
      dates: '',
      highlights: ['Led a team'],
    })
  })

  it('converts objects with highlights field', () => {
    const items = [{ title: 'Project A', highlights: ['point 1', 'point 2'] }]
    const result = convertToCustomItems(items)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Project A')
    expect(result[0].highlights).toEqual(['point 1', 'point 2'])
  })

  it('converts objects with points field as highlights', () => {
    const items = [{ title: 'Task', points: ['did this', 'did that'] }]
    const result = convertToCustomItems(items)
    expect(result[0].highlights).toEqual(['did this', 'did that'])
  })

  it('converts objects with items field as highlights', () => {
    const items = [{ title: 'Task', items: ['item A', 'item B'] }]
    const result = convertToCustomItems(items)
    expect(result[0].highlights).toEqual(['item A', 'item B'])
  })

  it('converts objects with description field as a single highlight', () => {
    const items = [{ title: 'Cert', description: 'AWS Certified' }]
    const result = convertToCustomItems(items)
    expect(result[0].highlights).toEqual(['AWS Certified'])
  })

  it('uses name as fallback for title', () => {
    const items = [{ name: 'Volunteer Role', organization: 'NGO', date: '2024' }]
    const result = convertToCustomItems(items)
    expect(result[0].title).toBe('Volunteer Role')
    expect(result[0].subtitle).toBe('NGO')
    expect(result[0].dates).toBe('2024')
  })

  it('uses organization as fallback for subtitle', () => {
    const items = [{ organization: 'Red Cross' }]
    const result = convertToCustomItems(items)
    expect(result[0].subtitle).toBe('Red Cross')
  })

  it('uses date as fallback for dates', () => {
    const items = [{ date: '2023-2024' }]
    const result = convertToCustomItems(items)
    expect(result[0].dates).toBe('2023-2024')
  })

  it('converts a single string to a single CustomItem', () => {
    const result = convertToCustomItems('Some description text')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: '',
      subtitle: '',
      dates: '',
      highlights: ['Some description text'],
    })
  })

  it('returns empty array for null', () => {
    expect(convertToCustomItems(null)).toEqual([])
  })

  it('returns empty array for undefined', () => {
    expect(convertToCustomItems(undefined)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(convertToCustomItems('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(convertToCustomItems('   ')).toEqual([])
  })

  it('handles a mixed array of strings and objects', () => {
    const items = ['A plain string', { title: 'An object', highlights: ['h1'] }]
    const result = convertToCustomItems(items)
    expect(result).toHaveLength(2)
    expect(result[0].highlights).toEqual(['A plain string'])
    expect(result[1].title).toBe('An object')
    expect(result[1].highlights).toEqual(['h1'])
  })

  it('handles non-string, non-object items in array gracefully', () => {
    const items = [42, true]
    const result = convertToCustomItems(items)
    expect(result).toHaveLength(2)
    // Falls through to fallback empty CustomItem
    expect(result[0]).toMatchObject({ title: '', subtitle: '', dates: '', highlights: [] })
    expect(result[1]).toMatchObject({ title: '', subtitle: '', dates: '', highlights: [] })
  })

  it('filters out non-string values from highlights arrays', () => {
    const items = [{ highlights: ['valid', 42, null, 'also valid'] }]
    const result = convertToCustomItems(items)
    expect(result[0].highlights).toEqual(['valid', 'also valid'])
  })
})

describe('normalizeSection', () => {
  it('passes through a known section type', () => {
    const sectionData = {
      type: 'education',
      title: 'My Education',
      isVisible: true,
      items: [{ school: 'MIT', degree: 'CS', dates: '2020', subtitle: '', description: '' }],
    }
    const result = normalizeSection(sectionData)
    expect(result.type).toBe('education')
    expect(result.title).toBe('My Education')
    expect(result.isVisible).toBe(true)
    expect(result.id).toBeDefined()
  })

  it('converts an unknown section type to custom', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const sectionData = {
      type: 'volunteering',
      title: 'Volunteering',
      items: ['Helped at shelter', 'Organized events'],
    }
    const result = normalizeSection(sectionData)
    expect(result.type).toBe('custom')
    expect(result.title).toBe('Volunteering')
    expect(Array.isArray(result.items)).toBe(true)
    expect(result.items as Array<unknown>).toHaveLength(2)
    consoleSpy.mockRestore()
  })

  it('preserves original title for unknown section types', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const sectionData = {
      type: 'certifications',
      title: 'Certifications & Awards',
      items: [],
    }
    const result = normalizeSection(sectionData)
    expect(result.title).toBe('Certifications & Awards')
    consoleSpy.mockRestore()
  })

  it('falls back to type name when title is missing', () => {
    const sectionData = {
      type: 'experiences',
      items: [],
    }
    const result = normalizeSection(sectionData)
    expect(result.title).toBe('experiences')
  })

  it('falls back to "Section" when both title and type are missing', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const sectionData = {
      items: [],
    }
    const result = normalizeSection(sectionData)
    expect(result.title).toBe('Section')
    consoleSpy.mockRestore()
  })

  it('defaults isVisible to true when not specified', () => {
    const sectionData = {
      type: 'skills',
      title: 'Skills',
      items: { languages: 'TypeScript', tools: 'Vite' },
    }
    const result = normalizeSection(sectionData)
    expect(result.isVisible).toBe(true)
  })

  it('respects isVisible: false', () => {
    const sectionData = {
      type: 'summary',
      title: 'Summary',
      isVisible: false,
      items: 'Some text',
    }
    const result = normalizeSection(sectionData)
    expect(result.isVisible).toBe(false)
  })

  it('generates a unique id for each normalized section', () => {
    const sectionData = { type: 'projects', title: 'Projects', items: [] }
    const result1 = normalizeSection(sectionData)
    const result2 = normalizeSection(sectionData)
    expect(result1.id).not.toBe(result2.id)
  })
})
