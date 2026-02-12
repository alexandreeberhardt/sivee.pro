import { SectionType } from '../types';
import { TFunction } from 'i18next';

export const getTranslatedSectionTitle = (type: SectionType, t: TFunction): string => {
  const titles: Record<SectionType, string> = {
    summary: t('sections.summary'),
    education: t('sections.education'),
    experiences: t('sections.experience'),
    projects: t('sections.projects'),
    skills: t('sections.skills'),
    leadership: t('sections.leadership'),
    languages: t('sections.languages'),
    custom: t('sections.custom'),
  };
  return titles[type];
};

export const defaultTitlesAllLanguages: Record<SectionType, string[]> = {
  summary: ['Summary', 'Résumé'],
  education: ['Education', 'Formation'],
  experiences: ['Experience', 'Expérience'],
  projects: ['Projects', 'Projets'],
  skills: ['Skills', 'Compétences'],
  leadership: ['Leadership', 'Leadership'],
  languages: ['Languages', 'Langues'],
  custom: ['Custom', 'Personnalisé'],
};

export const isDefaultTitle = (type: SectionType, title: string): boolean => {
  return defaultTitlesAllLanguages[type]?.includes(title) ?? false;
};
