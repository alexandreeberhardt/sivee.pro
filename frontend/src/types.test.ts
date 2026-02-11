import { describe, it, expect } from 'vitest'
import {
  createEmptyLink,
  createEmptyEducation,
  createEmptyExperience,
  createEmptyProject,
  createEmptySkills,
  createEmptyLeadership,
  createEmptyCustomItem,
  createSection,
  getEmptyResumeData,
  estimateContentDensity,
  applyTemplateSizeVariant,
  getTemplateSizeVariant,
  getBaseTemplateId,
} from './types'
import type { ResumeData, CVSection } from './types'

// === Factory functions ===

describe('createEmpty* factories', () => {
  it('createEmptyLink returns empty link with linkedin default', () => {
    const link = createEmptyLink()
    expect(link).toEqual({ platform: 'linkedin', username: '', url: '' })
  })

  it('createEmptyEducation returns empty education item', () => {
    const edu = createEmptyEducation()
    expect(edu).toEqual({ school: '', degree: '', dates: '', subtitle: '', description: '' })
  })

  it('createEmptyExperience returns empty experience with empty highlights', () => {
    const exp = createEmptyExperience()
    expect(exp.highlights).toEqual([])
    expect(exp.title).toBe('')
  })

  it('createEmptyProject returns empty project with empty highlights', () => {
    const proj = createEmptyProject()
    expect(proj.highlights).toEqual([])
  })

  it('createEmptySkills returns empty skills', () => {
    const skills = createEmptySkills()
    expect(skills).toEqual({ languages: '', tools: '' })
  })

  it('createEmptyLeadership returns empty leadership with empty highlights', () => {
    const lead = createEmptyLeadership()
    expect(lead.highlights).toEqual([])
  })

  it('createEmptyCustomItem returns empty custom item with empty highlights', () => {
    const custom = createEmptyCustomItem()
    expect(custom.highlights).toEqual([])
    expect(custom.title).toBe('')
  })
})

// === createSection ===

describe('createSection', () => {
  it('creates a summary section with empty string items', () => {
    const section = createSection('summary', 'Summary')
    expect(section.type).toBe('summary')
    expect(section.title).toBe('Summary')
    expect(section.isVisible).toBe(true)
    expect(section.items).toBe('')
    expect(section.id).toBeTruthy()
  })

  it('creates an education section with empty array items', () => {
    const section = createSection('education', 'Education')
    expect(section.items).toEqual([])
  })

  it('creates a skills section with empty skills object', () => {
    const section = createSection('skills', 'Skills')
    expect(section.items).toEqual({ languages: '', tools: '' })
  })

  it('creates a languages section with empty string items', () => {
    const section = createSection('languages', 'Languages')
    expect(section.items).toBe('')
  })

  it('generates unique IDs for different sections', () => {
    const s1 = createSection('education', 'Edu')
    const s2 = createSection('education', 'Edu')
    expect(s1.id).not.toBe(s2.id)
  })
})

// === getEmptyResumeData ===

describe('getEmptyResumeData', () => {
  it('returns empty resume with harvard template', () => {
    const data = getEmptyResumeData()
    expect(data.template_id).toBe('harvard')
    expect(data.sections).toEqual([])
    expect(data.personal.name).toBe('')
    expect(data.personal.links).toEqual([])
  })

  it('returns a new object each time (no shared state)', () => {
    const a = getEmptyResumeData()
    const b = getEmptyResumeData()
    expect(a).not.toBe(b)
    a.personal.name = 'test'
    expect(b.personal.name).toBe('')
  })
})

// === Template variant functions ===

describe('applyTemplateSizeVariant', () => {
  it('returns base template for normal variant', () => {
    expect(applyTemplateSizeVariant('harvard', 'normal')).toBe('harvard')
  })

  it('appends _compact suffix', () => {
    expect(applyTemplateSizeVariant('harvard', 'compact')).toBe('harvard_compact')
  })

  it('appends _large suffix', () => {
    expect(applyTemplateSizeVariant('europass', 'large')).toBe('europass_large')
  })

  it('replaces existing variant suffix', () => {
    expect(applyTemplateSizeVariant('harvard_compact', 'large')).toBe('harvard_large')
  })

  it('strips existing variant for normal', () => {
    expect(applyTemplateSizeVariant('mckinsey_large', 'normal')).toBe('mckinsey')
  })
})

describe('getTemplateSizeVariant', () => {
  it('returns compact for _compact suffix', () => {
    expect(getTemplateSizeVariant('harvard_compact')).toBe('compact')
  })

  it('returns large for _large suffix', () => {
    expect(getTemplateSizeVariant('europass_large')).toBe('large')
  })

  it('returns normal for base template', () => {
    expect(getTemplateSizeVariant('harvard')).toBe('normal')
  })
})

describe('getBaseTemplateId', () => {
  it('strips _compact suffix', () => {
    expect(getBaseTemplateId('harvard_compact')).toBe('harvard')
  })

  it('strips _large suffix', () => {
    expect(getBaseTemplateId('europass_large')).toBe('europass')
  })

  it('returns same id for base template', () => {
    expect(getBaseTemplateId('mckinsey')).toBe('mckinsey')
  })
})

// === estimateContentDensity ===

describe('estimateContentDensity', () => {
  const makeData = (sections: CVSection[]): ResumeData => ({
    personal: { name: '', title: '', location: '', email: '', phone: '', links: [] },
    sections,
    template_id: 'harvard',
  })

  it('returns large for empty resume', () => {
    expect(estimateContentDensity(makeData([]))).toBe('large')
  })

  it('returns large for minimal content', () => {
    const data = makeData([
      { id: '1', type: 'education', title: 'Education', isVisible: true, items: [
        { school: 'MIT', degree: 'BS', dates: '2020', subtitle: '', description: '' }
      ]},
    ])
    // 1 education item = 2 points → large (< 12)
    expect(estimateContentDensity(data)).toBe('large')
  })

  it('returns normal for moderate content', () => {
    const data = makeData([
      { id: '1', type: 'experiences', title: 'Exp', isVisible: true, items: [
        { title: 'Dev', company: 'Co', dates: '2020', highlights: ['a', 'b', 'c'] },
        { title: 'Dev', company: 'Co', dates: '2021', highlights: ['a', 'b'] },
        { title: 'Dev', company: 'Co', dates: '2022', highlights: ['a', 'b'] },
      ]},
      { id: '2', type: 'education', title: 'Edu', isVisible: true, items: [
        { school: 'MIT', degree: 'BS', dates: '2020', subtitle: '', description: 'desc' },
      ]},
    ])
    // 3 exp * 3 = 9, 7 highlights * 0.5 = 3.5, 1 edu * 2 = 2, +1 desc = 1 → 15.5 → normal
    expect(estimateContentDensity(data)).toBe('normal')
  })

  it('returns compact for dense content', () => {
    const makeExp = () => ({
      title: 'Dev', company: 'Co', dates: '2020',
      highlights: ['a', 'b', 'c', 'd']
    })
    const data = makeData([
      { id: '1', type: 'experiences', title: 'Exp', isVisible: true,
        items: [makeExp(), makeExp(), makeExp(), makeExp(), makeExp()] },
      { id: '2', type: 'education', title: 'Edu', isVisible: true, items: [
        { school: 'MIT', degree: 'BS', dates: '2020', subtitle: '', description: 'desc' },
        { school: 'MIT', degree: 'BS', dates: '2020', subtitle: '', description: 'desc' },
      ]},
      { id: '3', type: 'projects', title: 'Projects', isVisible: true, items: [
        { name: 'P1', year: '2020', highlights: ['a', 'b'] },
        { name: 'P2', year: '2021', highlights: ['a', 'b'] },
      ]},
    ])
    // 5 exp * 3 = 15, 20 highlights * 0.5 = 10, 2 edu * 2 = 4, 2 desc = 2, 2 proj * 2 = 4, 4 highlights * 0.5 = 2 → 37 → compact
    expect(estimateContentDensity(data)).toBe('compact')
  })

  it('skips hidden sections', () => {
    const data = makeData([
      { id: '1', type: 'experiences', title: 'Exp', isVisible: false, items: [
        { title: 'Dev', company: 'Co', dates: '2020', highlights: ['a', 'b', 'c', 'd'] },
        { title: 'Dev', company: 'Co', dates: '2020', highlights: ['a', 'b', 'c', 'd'] },
        { title: 'Dev', company: 'Co', dates: '2020', highlights: ['a', 'b', 'c', 'd'] },
        { title: 'Dev', company: 'Co', dates: '2020', highlights: ['a', 'b', 'c', 'd'] },
        { title: 'Dev', company: 'Co', dates: '2020', highlights: ['a', 'b', 'c', 'd'] },
      ]},
    ])
    expect(estimateContentDensity(data)).toBe('large')
  })

  it('counts summary by character length', () => {
    const longSummary = 'a'.repeat(500) // 500 chars → 5 points
    const data = makeData([
      { id: '1', type: 'summary', title: 'Summary', isVisible: true, items: longSummary },
    ])
    expect(estimateContentDensity(data)).toBe('large')
  })

  it('counts skills by total field length', () => {
    const data = makeData([
      { id: '1', type: 'skills', title: 'Skills', isVisible: true,
        items: { languages: 'a'.repeat(200), tools: 'b'.repeat(200) } },
    ])
    // (200 + 200) / 50 = 8 → large
    expect(estimateContentDensity(data)).toBe('large')
  })
})
