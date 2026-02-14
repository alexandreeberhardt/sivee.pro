// Types pour les données du CV avec sections dynamiques

// === Types d'authentification ===

export interface User {
  id: number
  email: string
  isGuest?: boolean
  feedbackCompleted?: boolean
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

export interface SavedResume {
  id: number
  user_id: number
  name: string
  json_content: ResumeData | null
  s3_url: string | null
  created_at?: string
}

export interface SavedResumeListResponse {
  resumes: SavedResume[]
  total: number
}

// === Types de base pour les items ===

export type PlatformType = 'linkedin' | 'github' | 'portfolio' | 'behance' | 'website' | 'other'

export interface ProfessionalLink {
  platform: PlatformType
  username: string
  url: string
}

export interface PersonalInfo {
  name: string
  title: string
  location: string
  email: string
  phone: string
  links: ProfessionalLink[]
}

export const createEmptyLink = (): ProfessionalLink => ({
  platform: 'linkedin',
  username: '',
  url: '',
})

export interface EducationItem {
  school: string
  degree: string
  dates: string
  subtitle: string
  description: string
}

export interface ExperienceItem {
  title: string
  company: string
  dates: string
  highlights: string[]
}

export interface ProjectItem {
  name: string
  year: string
  highlights: string[]
}

export interface SkillsItem {
  languages: string
  tools: string
}

export interface LeadershipItem {
  role: string
  place: string
  dates: string
  highlights: string[]
}

export interface CustomItem {
  title: string
  subtitle?: string
  dates?: string
  highlights: string[]
}

// === Types de sections ===

export type SectionType =
  | 'summary'
  | 'education'
  | 'experiences'
  | 'projects'
  | 'skills'
  | 'leadership'
  | 'languages'
  | 'custom'

export type SectionItems =
  | EducationItem[]
  | ExperienceItem[]
  | ProjectItem[]
  | SkillsItem
  | LeadershipItem[]
  | string // pour languages
  | CustomItem[]

export interface CVSection {
  id: string
  type: SectionType
  title: string
  isVisible: boolean
  items: SectionItems
}

// === Types de templates ===

export type TemplateId =
  | 'harvard'
  | 'harvard_compact'
  | 'harvard_large'
  | 'europass'
  | 'europass_compact'
  | 'europass_large'
  | 'mckinsey'
  | 'mckinsey_compact'
  | 'mckinsey_large'
  | 'aurianne'
  | 'aurianne_compact'
  | 'aurianne_large'
  | 'stephane'
  | 'stephane_compact'
  | 'stephane_large'
  | 'michel'
  | 'michel_compact'
  | 'michel_large'
  | 'double'
  | 'double_compact'
  | 'double_large'

export interface TemplateOption {
  id: TemplateId
  name: string
  description: string
}

export const AVAILABLE_TEMPLATES: TemplateOption[] = [
  // Harvard
  { id: 'harvard', name: 'Harvard', description: 'Style classique et professionnel' },
  { id: 'harvard_compact', name: 'Harvard Compact', description: 'Harvard avec espacement réduit' },
  { id: 'harvard_large', name: 'Harvard Large', description: 'Harvard avec espacement augmenté' },
  // Europass
  { id: 'europass', name: 'Europass', description: 'Format européen standardisé' },
  {
    id: 'europass_compact',
    name: 'Europass Compact',
    description: 'Europass avec espacement réduit',
  },
  {
    id: 'europass_large',
    name: 'Europass Large',
    description: 'Europass avec espacement augmenté',
  },
  // McKinsey
  { id: 'mckinsey', name: 'McKinsey', description: 'Style consulting haut de gamme' },
  {
    id: 'mckinsey_compact',
    name: 'McKinsey Compact',
    description: 'McKinsey avec espacement réduit',
  },
  {
    id: 'mckinsey_large',
    name: 'McKinsey Large',
    description: 'McKinsey avec espacement augmenté',
  },
  // Aurianne
  { id: 'aurianne', name: 'Aurianne', description: 'Style moderne et compact' },
  {
    id: 'aurianne_compact',
    name: 'Aurianne Compact',
    description: 'Aurianne avec espacement réduit',
  },
  {
    id: 'aurianne_large',
    name: 'Aurianne Large',
    description: 'Aurianne avec espacement augmenté',
  },
  // Stephane
  { id: 'stephane', name: 'Stephane', description: 'Style moderne avec icônes' },
  {
    id: 'stephane_compact',
    name: 'Stephane Compact',
    description: 'Stephane avec espacement réduit',
  },
  {
    id: 'stephane_large',
    name: 'Stephane Large',
    description: 'Stephane avec espacement augmenté',
  },
  // Michel
  { id: 'michel', name: 'Michel', description: 'Style moderncv classique' },
  { id: 'michel_compact', name: 'Michel Compact', description: 'Michel avec espacement réduit' },
  { id: 'michel_large', name: 'Michel Large', description: 'Michel avec espacement augmenté' },
  // Double
  { id: 'double', name: 'Double', description: 'Style moderne deux colonnes avec initiales' },
  { id: 'double_compact', name: 'Double Compact', description: 'Double avec espacement réduit' },
  { id: 'double_large', name: 'Double Large', description: 'Double avec espacement augmenté' },
]

// === Structure principale du CV ===

export interface ResumeData {
  personal: PersonalInfo
  sections: CVSection[]
  template_id: TemplateId
}

// === Helpers pour créer des sections vides ===

export const createEmptyEducation = (): EducationItem => ({
  school: '',
  degree: '',
  dates: '',
  subtitle: '',
  description: '',
})

export const createEmptyExperience = (): ExperienceItem => ({
  title: '',
  company: '',
  dates: '',
  highlights: [],
})

export const createEmptyProject = (): ProjectItem => ({
  name: '',
  year: '',
  highlights: [],
})

export const createEmptySkills = (): SkillsItem => ({
  languages: '',
  tools: '',
})

export const createEmptyLeadership = (): LeadershipItem => ({
  role: '',
  place: '',
  dates: '',
  highlights: [],
})

export const createEmptyCustomItem = (): CustomItem => ({
  title: '',
  subtitle: '',
  dates: '',
  highlights: [],
})

// Générateur d'ID unique
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Créer une nouvelle section
export const createSection = (type: SectionType, title: string): CVSection => {
  const id = generateId()
  let items: SectionItems

  switch (type) {
    case 'summary':
      items = ''
      break
    case 'education':
      items = []
      break
    case 'experiences':
      items = []
      break
    case 'projects':
      items = []
      break
    case 'skills':
      items = createEmptySkills()
      break
    case 'leadership':
      items = []
      break
    case 'languages':
      items = ''
      break
    case 'custom':
      items = []
      break
    default:
      items = []
  }

  return { id, type, title, isVisible: true, items }
}

// Titres par défaut en anglais (utilisés comme fallback et pour la détection de personnalisation)
export const defaultSectionTitlesEn: Record<SectionType, string> = {
  summary: 'Summary',
  education: 'Education',
  experiences: 'Experiences',
  projects: 'Projects',
  skills: 'Technical Skills',
  leadership: 'Leadership & Community Involvement',
  languages: 'Languages',
  custom: 'Custom Section',
}

// Alias pour compatibilité
export const defaultSectionTitles = defaultSectionTitlesEn

// Données par défaut vides (avec titres en anglais, sera remplacé par getEmptyResumeData)
export const emptyResumeData: ResumeData = {
  personal: {
    name: '',
    title: '',
    location: '',
    email: '',
    phone: '',
    links: [],
  },
  sections: [],
  template_id: 'harvard',
}

// === Estimation de densité du contenu ===

export type SizeVariant = 'compact' | 'normal' | 'large'

/**
 * Estime la densité du contenu du CV pour recommander une variante de taille.
 *
 * Critères de calcul:
 * - Nombre de caractères dans le summary (pondéré)
 * - Nombre total d'items dans les sections (formations, expériences, projets, etc.)
 * - Nombre total de highlights/puces
 * - Longueur des skills
 *
 * Seuils:
 * - score < 12: 'large' (peu de contenu, besoin d'espacement)
 * - 12 <= score < 30: 'normal' (contenu équilibré)
 * - score >= 30: 'compact' (contenu dense, besoin de compression)
 */
export const estimateContentDensity = (data: ResumeData): SizeVariant => {
  let score = 0

  // Parcourir toutes les sections visibles
  for (const section of data.sections) {
    if (!section.isVisible) continue

    switch (section.type) {
      case 'summary': {
        const summaryText = section.items as string
        // 1 point par 100 caractères
        score += Math.floor((summaryText?.length || 0) / 100)
        break
      }

      case 'education': {
        const items = section.items as EducationItem[]
        // 2 points par formation
        score += (items?.length || 0) * 2
        // +1 si description présente
        items?.forEach((item) => {
          if (item.description?.trim()) score += 1
        })
        break
      }

      case 'experiences': {
        const items = section.items as ExperienceItem[]
        // 3 points par expérience (plus impactant visuellement)
        score += (items?.length || 0) * 3
        // 0.5 point par highlight
        items?.forEach((item) => {
          score += (item.highlights?.length || 0) * 0.5
        })
        break
      }

      case 'projects': {
        const items = section.items as ProjectItem[]
        // 2 points par projet
        score += (items?.length || 0) * 2
        // 0.5 point par highlight
        items?.forEach((item) => {
          score += (item.highlights?.length || 0) * 0.5
        })
        break
      }

      case 'leadership': {
        const items = section.items as LeadershipItem[]
        // 2 points par engagement
        score += (items?.length || 0) * 2
        // 0.5 point par highlight
        items?.forEach((item) => {
          score += (item.highlights?.length || 0) * 0.5
        })
        break
      }

      case 'custom': {
        const items = section.items as CustomItem[]
        // 2 points par item custom
        score += (items?.length || 0) * 2
        // 0.5 point par highlight
        items?.forEach((item) => {
          score += (item.highlights?.length || 0) * 0.5
        })
        break
      }

      case 'skills': {
        const skills = section.items as SkillsItem
        // Points basés sur la longueur des compétences
        const languagesLen = skills?.languages?.length || 0
        const toolsLen = skills?.tools?.length || 0
        score += Math.floor((languagesLen + toolsLen) / 50)
        break
      }

      case 'languages': {
        const langText = section.items as string
        // 0.5 point par 50 caractères
        score += Math.floor((langText?.length || 0) / 100)
        break
      }
    }
  }

  // Déterminer la variante selon le score
  if (score < 12) {
    return 'large'
  } else if (score < 30) {
    return 'normal'
  } else {
    return 'compact'
  }
}

/**
 * Applique une variante de taille à un template ID.
 */
export const applyTemplateSizeVariant = (
  templateId: TemplateId,
  variant: SizeVariant,
): TemplateId => {
  const baseTemplate = templateId.replace(/_compact|_large/, '')
  if (variant === 'normal') {
    return baseTemplate as TemplateId
  }
  return `${baseTemplate}_${variant}` as TemplateId
}

/**
 * Extrait la variante de taille d'un template ID.
 */
export const getTemplateSizeVariant = (templateId: TemplateId): SizeVariant => {
  if (templateId.includes('_compact')) return 'compact'
  if (templateId.includes('_large')) return 'large'
  return 'normal'
}

/**
 * Extrait le template de base (sans suffixe de taille).
 */
export const getBaseTemplateId = (templateId: TemplateId): string => {
  return templateId.replace(/_compact|_large/, '')
}

// Fonction pour créer les données par défaut avec les titres traduits
export const getEmptyResumeData = (): ResumeData => ({
  personal: {
    name: '',
    title: '',
    location: '',
    email: '',
    phone: '',
    links: [],
  },
  sections: [],
  template_id: 'harvard',
})
