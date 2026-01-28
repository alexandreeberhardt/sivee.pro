// Types pour les données du CV avec sections dynamiques

// === Types de base pour les items ===

export interface PersonalInfo {
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  github: string;
  github_url: string;
}

export interface EducationItem {
  school: string;
  degree: string;
  dates: string;
  subtitle: string;
  description: string;
}

export interface ExperienceItem {
  title: string;
  company: string;
  dates: string;
  highlights: string[];
}

export interface ProjectItem {
  name: string;
  year: string;
  highlights: string[];
}

export interface SkillsItem {
  languages: string;
  tools: string;
}

export interface LeadershipItem {
  role: string;
  place: string;
  dates: string;
  highlights: string[];
}

export interface CustomItem {
  title: string;
  subtitle?: string;
  dates?: string;
  highlights: string[];
}

// === Types de sections ===

export type SectionType =
  | 'education'
  | 'experiences'
  | 'projects'
  | 'skills'
  | 'leadership'
  | 'languages'
  | 'custom';

export type SectionItems =
  | EducationItem[]
  | ExperienceItem[]
  | ProjectItem[]
  | SkillsItem
  | LeadershipItem[]
  | string  // pour languages
  | CustomItem[];

export interface CVSection {
  id: string;
  type: SectionType;
  title: string;
  isVisible: boolean;
  items: SectionItems;
}

// === Types de templates ===

export type TemplateId =
  | 'harvard' | 'harvard_compact' | 'harvard_large'
  | 'europass' | 'europass_compact' | 'europass_large'
  | 'mckinsey' | 'mckinsey_compact' | 'mckinsey_large'
  | 'aurianne' | 'aurianne_compact' | 'aurianne_large'
  | 'stephane' | 'stephane_compact' | 'stephane_large'
  | 'michel' | 'michel_compact' | 'michel_large';

export interface TemplateOption {
  id: TemplateId;
  name: string;
  description: string;
}

export const AVAILABLE_TEMPLATES: TemplateOption[] = [
  // Harvard
  { id: 'harvard', name: 'Harvard', description: 'Style classique et professionnel' },
  { id: 'harvard_compact', name: 'Harvard Compact', description: 'Harvard avec espacement réduit' },
  { id: 'harvard_large', name: 'Harvard Large', description: 'Harvard avec espacement augmenté' },
  // Europass
  { id: 'europass', name: 'Europass', description: 'Format européen standardisé' },
  { id: 'europass_compact', name: 'Europass Compact', description: 'Europass avec espacement réduit' },
  { id: 'europass_large', name: 'Europass Large', description: 'Europass avec espacement augmenté' },
  // McKinsey
  { id: 'mckinsey', name: 'McKinsey', description: 'Style consulting haut de gamme' },
  { id: 'mckinsey_compact', name: 'McKinsey Compact', description: 'McKinsey avec espacement réduit' },
  { id: 'mckinsey_large', name: 'McKinsey Large', description: 'McKinsey avec espacement augmenté' },
  // Aurianne
  { id: 'aurianne', name: 'Aurianne', description: 'Style moderne et compact' },
  { id: 'aurianne_compact', name: 'Aurianne Compact', description: 'Aurianne avec espacement réduit' },
  { id: 'aurianne_large', name: 'Aurianne Large', description: 'Aurianne avec espacement augmenté' },
  // Stephane
  { id: 'stephane', name: 'Stephane', description: 'Style moderne avec icônes' },
  { id: 'stephane_compact', name: 'Stephane Compact', description: 'Stephane avec espacement réduit' },
  { id: 'stephane_large', name: 'Stephane Large', description: 'Stephane avec espacement augmenté' },
  // Michel
  { id: 'michel', name: 'Michel', description: 'Style moderncv classique' },
  { id: 'michel_compact', name: 'Michel Compact', description: 'Michel avec espacement réduit' },
  { id: 'michel_large', name: 'Michel Large', description: 'Michel avec espacement augmenté' },
];

// === Structure principale du CV ===

export interface ResumeData {
  personal: PersonalInfo;
  sections: CVSection[];
  template_id: TemplateId;
}

// === Helpers pour créer des sections vides ===

export const createEmptyEducation = (): EducationItem => ({
  school: '',
  degree: '',
  dates: '',
  subtitle: '',
  description: '',
});

export const createEmptyExperience = (): ExperienceItem => ({
  title: '',
  company: '',
  dates: '',
  highlights: [],
});

export const createEmptyProject = (): ProjectItem => ({
  name: '',
  year: '',
  highlights: [],
});

export const createEmptySkills = (): SkillsItem => ({
  languages: '',
  tools: '',
});

export const createEmptyLeadership = (): LeadershipItem => ({
  role: '',
  place: '',
  dates: '',
  highlights: [],
});

export const createEmptyCustomItem = (): CustomItem => ({
  title: '',
  subtitle: '',
  dates: '',
  highlights: [],
});

// Générateur d'ID unique
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Créer une nouvelle section
export const createSection = (type: SectionType, title: string): CVSection => {
  const id = generateId();
  let items: SectionItems;

  switch (type) {
    case 'education':
      items = [];
      break;
    case 'experiences':
      items = [];
      break;
    case 'projects':
      items = [];
      break;
    case 'skills':
      items = createEmptySkills();
      break;
    case 'leadership':
      items = [];
      break;
    case 'languages':
      items = '';
      break;
    case 'custom':
      items = [];
      break;
    default:
      items = [];
  }

  return { id, type, title, isVisible: true, items };
};

// Données par défaut vides
export const emptyResumeData: ResumeData = {
  personal: {
    name: '',
    title: '',
    location: '',
    email: '',
    phone: '',
    github: '',
    github_url: '',
  },
  sections: [
    createSection('education', 'Education'),
    createSection('experiences', 'Experiences'),
    createSection('projects', 'Projects'),
    createSection('skills', 'Technical Skills'),
    createSection('leadership', 'Leadership & Community Involvement'),
    createSection('languages', 'Languages'),
  ],
  template_id: 'harvard',
};

// Titres par défaut pour chaque type de section
export const defaultSectionTitles: Record<SectionType, string> = {
  education: 'Education',
  experiences: 'Experiences',
  projects: 'Projects',
  skills: 'Technical Skills',
  leadership: 'Leadership & Community Involvement',
  languages: 'Languages',
  custom: 'Custom Section',
};
