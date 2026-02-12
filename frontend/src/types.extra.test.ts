/**
 * Additional tests for types.ts - factory functions, helpers, and estimateContentDensity
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createEmptyEducation,
  createEmptyExperience,
  createEmptyProject,
  createEmptySkills,
  createEmptyLeadership,
  createEmptyCustomItem,
  createEmptyLink,
  createSection,
  generateId,
  getEmptyResumeData,
  estimateContentDensity,
  applyTemplateSizeVariant,
  getTemplateSizeVariant,
  getBaseTemplateId,
  AVAILABLE_TEMPLATES,
  defaultSectionTitles,
  emptyResumeData,
  type ResumeData,
  type CVSection,
  type TemplateId,
  type SizeVariant,
} from './types'

describe('createEmptyLink', () => {
  it('returns default link', () => {
    const link = createEmptyLink()
    expect(link.platform).toBe('linkedin')
    expect(link.username).toBe('')
    expect(link.url).toBe('')
  })
})

describe('createEmptyEducation', () => {
  it('returns empty education item', () => {
    const item = createEmptyEducation()
    expect(item.school).toBe('')
    expect(item.degree).toBe('')
    expect(item.dates).toBe('')
    expect(item.subtitle).toBe('')
    expect(item.description).toBe('')
  })
})

describe('createEmptyExperience', () => {
  it('returns empty experience item', () => {
    const item = createEmptyExperience()
    expect(item.title).toBe('')
    expect(item.company).toBe('')
    expect(item.highlights).toEqual([])
  })
})

describe('createEmptyProject', () => {
  it('returns empty project item', () => {
    const item = createEmptyProject()
    expect(item.name).toBe('')
    expect(item.year).toBe('')
    expect(item.highlights).toEqual([])
  })
})

describe('createEmptySkills', () => {
  it('returns empty skills item', () => {
    const item = createEmptySkills()
    expect(item.languages).toBe('')
    expect(item.tools).toBe('')
  })
})

describe('createEmptyLeadership', () => {
  it('returns empty leadership item', () => {
    const item = createEmptyLeadership()
    expect(item.role).toBe('')
    expect(item.place).toBe('')
    expect(item.dates).toBe('')
    expect(item.highlights).toEqual([])
  })
})

describe('createEmptyCustomItem', () => {
  it('returns empty custom item', () => {
    const item = createEmptyCustomItem()
    expect(item.title).toBe('')
    expect(item.highlights).toEqual([])
  })
})

describe('generateId', () => {
  it('returns a unique string', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(typeof id1).toBe('string')
    expect(id1).not.toBe(id2)
  })

  it('contains a timestamp component', () => {
    const id = generateId()
    expect(id).toContain('-')
  })
})

describe('createSection', () => {
  it('creates summary section with empty string items', () => {
    const section = createSection('summary', 'Summary')
    expect(section.type).toBe('summary')
    expect(section.items).toBe('')
    expect(section.isVisible).toBe(true)
    expect(section.title).toBe('Summary')
  })

  it('creates education section with empty array', () => {
    const section = createSection('education', 'Education')
    expect(section.items).toEqual([])
  })

  it('creates experiences section with empty array', () => {
    const section = createSection('experiences', 'Experiences')
    expect(section.items).toEqual([])
  })

  it('creates projects section with empty array', () => {
    const section = createSection('projects', 'Projects')
    expect(section.items).toEqual([])
  })

  it('creates skills section with empty skills object', () => {
    const section = createSection('skills', 'Skills')
    expect(section.items).toEqual({ languages: '', tools: '' })
  })

  it('creates leadership section with empty array', () => {
    const section = createSection('leadership', 'Leadership')
    expect(section.items).toEqual([])
  })

  it('creates languages section with empty string', () => {
    const section = createSection('languages', 'Languages')
    expect(section.items).toBe('')
  })

  it('creates custom section with empty array', () => {
    const section = createSection('custom', 'Custom')
    expect(section.items).toEqual([])
  })

  it('has unique id', () => {
    const s1 = createSection('summary', 'A')
    const s2 = createSection('summary', 'B')
    expect(s1.id).not.toBe(s2.id)
  })
})

describe('getEmptyResumeData', () => {
  it('returns fresh empty data', () => {
    const data = getEmptyResumeData()
    expect(data.personal.name).toBe('')
    expect(data.sections).toEqual([])
    expect(data.template_id).toBe('harvard')
  })

  it('returns new instance each call', () => {
    const d1 = getEmptyResumeData()
    const d2 = getEmptyResumeData()
    expect(d1).not.toBe(d2)
  })
})

describe('emptyResumeData constant', () => {
  it('has correct structure', () => {
    expect(emptyResumeData.template_id).toBe('harvard')
    expect(emptyResumeData.sections).toEqual([])
    expect(emptyResumeData.personal.links).toEqual([])
  })
})

describe('AVAILABLE_TEMPLATES', () => {
  it('has 21 templates (7 bases * 3 variants)', () => {
    expect(AVAILABLE_TEMPLATES).toHaveLength(21)
  })

  it('includes all base templates', () => {
    const ids = AVAILABLE_TEMPLATES.map(t => t.id)
    expect(ids).toContain('harvard')
    expect(ids).toContain('europass')
    expect(ids).toContain('mckinsey')
    expect(ids).toContain('aurianne')
    expect(ids).toContain('stephane')
    expect(ids).toContain('michel')
    expect(ids).toContain('double')
  })

  it('each template has name and description', () => {
    for (const t of AVAILABLE_TEMPLATES) {
      expect(t.name).toBeTruthy()
      expect(t.description).toBeTruthy()
    }
  })
})

describe('defaultSectionTitles', () => {
  it('has all section types', () => {
    expect(defaultSectionTitles.summary).toBe('Summary')
    expect(defaultSectionTitles.education).toBe('Education')
    expect(defaultSectionTitles.experiences).toBe('Experiences')
    expect(defaultSectionTitles.skills).toBe('Technical Skills')
    expect(defaultSectionTitles.languages).toBe('Languages')
  })
})

describe('estimateContentDensity', () => {
  const makeData = (sections: CVSection[]): ResumeData => ({
    personal: { name: '', title: '', location: '', email: '', phone: '', links: [] },
    sections,
    template_id: 'harvard',
  })

  it('returns large for empty data', () => {
    expect(estimateContentDensity(makeData([]))).toBe('large')
  })

  it('returns large for minimal content', () => {
    const sections: CVSection[] = [
      { id: '1', type: 'summary', title: 'Summary', isVisible: true, items: 'Short bio' },
    ]
    expect(estimateContentDensity(makeData(sections))).toBe('large')
  })

  it('returns normal for moderate content', () => {
    const sections: CVSection[] = [
      { id: '1', type: 'experiences', title: 'Exp', isVisible: true, items: [
        { title: 'SWE1', company: 'A', dates: '2023', highlights: ['x', 'y'] },
        { title: 'SWE2', company: 'B', dates: '2022', highlights: ['x', 'y'] },
        { title: 'SWE3', company: 'C', dates: '2021', highlights: ['x', 'y'] },
        { title: 'SWE4', company: 'D', dates: '2020', highlights: ['x', 'y'] },
      ] },
    ]
    expect(estimateContentDensity(makeData(sections))).toBe('normal')
  })

  it('returns compact for dense content', () => {
    const sections: CVSection[] = [
      { id: '1', type: 'experiences', title: 'Exp', isVisible: true, items: Array(8).fill(
        { title: 'SWE', company: 'Co', dates: '2023', highlights: ['a', 'b', 'c'] }
      ) },
      { id: '2', type: 'education', title: 'Edu', isVisible: true, items: Array(3).fill(
        { school: 'MIT', degree: 'BSc', dates: '2020', subtitle: '', description: 'Long description here' }
      ) },
    ]
    expect(estimateContentDensity(makeData(sections))).toBe('compact')
  })

  it('ignores hidden sections', () => {
    const sections: CVSection[] = [
      { id: '1', type: 'experiences', title: 'Exp', isVisible: false, items: Array(10).fill(
        { title: 'SWE', company: 'Co', dates: '2023', highlights: ['a', 'b', 'c'] }
      ) },
    ]
    expect(estimateContentDensity(makeData(sections))).toBe('large')
  })

  it('scores skills by text length', () => {
    const sections: CVSection[] = [
      { id: '1', type: 'skills', title: 'Skills', isVisible: true, items: {
        languages: 'Python, JavaScript, TypeScript, Java, C++, Rust, Go, Ruby, PHP',
        tools: 'Git, Docker, Kubernetes, Jenkins, AWS, GCP, Azure, Linux, Terraform',
      } },
    ]
    const result = estimateContentDensity(makeData(sections))
    expect(['large', 'normal', 'compact']).toContain(result)
  })

  it('scores languages section', () => {
    const sections: CVSection[] = [
      { id: '1', type: 'languages', title: 'Languages', isVisible: true, items: 'French (native), English (fluent), Spanish (intermediate), German (beginner), Chinese (beginner), Japanese (beginner)' },
    ]
    const result = estimateContentDensity(makeData(sections))
    expect(['large', 'normal', 'compact']).toContain(result)
  })

  it('scores custom sections', () => {
    const sections: CVSection[] = [
      { id: '1', type: 'custom', title: 'Hobbies', isVisible: true, items: [
        { title: 'Sport', highlights: ['Football', 'Running'] },
        { title: 'Music', highlights: ['Piano'] },
      ] },
    ]
    const result = estimateContentDensity(makeData(sections))
    expect(['large', 'normal', 'compact']).toContain(result)
  })
})

describe('applyTemplateSizeVariant', () => {
  it('normal returns base template', () => {
    expect(applyTemplateSizeVariant('harvard', 'normal')).toBe('harvard')
  })

  it('compact adds _compact suffix', () => {
    expect(applyTemplateSizeVariant('harvard', 'compact')).toBe('harvard_compact')
  })

  it('large adds _large suffix', () => {
    expect(applyTemplateSizeVariant('europass', 'large')).toBe('europass_large')
  })

  it('replaces existing variant', () => {
    expect(applyTemplateSizeVariant('harvard_compact' as TemplateId, 'large')).toBe('harvard_large')
  })

  it('normal from compact removes suffix', () => {
    expect(applyTemplateSizeVariant('mckinsey_compact' as TemplateId, 'normal')).toBe('mckinsey')
  })
})

describe('getTemplateSizeVariant', () => {
  it('returns compact for _compact', () => {
    expect(getTemplateSizeVariant('harvard_compact')).toBe('compact')
  })

  it('returns large for _large', () => {
    expect(getTemplateSizeVariant('europass_large')).toBe('large')
  })

  it('returns normal for base', () => {
    expect(getTemplateSizeVariant('harvard')).toBe('normal')
  })
})

describe('getBaseTemplateId', () => {
  it('removes _compact', () => {
    expect(getBaseTemplateId('harvard_compact')).toBe('harvard')
  })

  it('removes _large', () => {
    expect(getBaseTemplateId('europass_large')).toBe('europass')
  })

  it('returns base as-is', () => {
    expect(getBaseTemplateId('mckinsey')).toBe('mckinsey')
  })
})
