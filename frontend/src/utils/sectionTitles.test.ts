import { describe, it, expect, vi } from 'vitest';
import {
  isDefaultTitle,
  getTranslatedSectionTitle,
  defaultTitlesAllLanguages,
} from './sectionTitles';
import type { SectionType } from '../types';

describe('defaultTitlesAllLanguages', () => {
  it('has entries for all section types', () => {
    const expectedTypes: SectionType[] = [
      'summary', 'education', 'experiences', 'projects',
      'skills', 'leadership', 'languages', 'custom',
    ];
    for (const type of expectedTypes) {
      expect(defaultTitlesAllLanguages[type]).toBeDefined();
      expect(Array.isArray(defaultTitlesAllLanguages[type])).toBe(true);
      expect(defaultTitlesAllLanguages[type].length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('isDefaultTitle', () => {
  it('returns true for English default titles', () => {
    expect(isDefaultTitle('summary', 'Summary')).toBe(true);
    expect(isDefaultTitle('education', 'Education')).toBe(true);
    expect(isDefaultTitle('experiences', 'Experience')).toBe(true);
    expect(isDefaultTitle('projects', 'Projects')).toBe(true);
    expect(isDefaultTitle('skills', 'Skills')).toBe(true);
    expect(isDefaultTitle('leadership', 'Leadership')).toBe(true);
    expect(isDefaultTitle('languages', 'Languages')).toBe(true);
    expect(isDefaultTitle('custom', 'Custom')).toBe(true);
  });

  it('returns true for French default titles', () => {
    expect(isDefaultTitle('summary', 'Résumé')).toBe(true);
    expect(isDefaultTitle('education', 'Formation')).toBe(true);
    expect(isDefaultTitle('experiences', 'Expérience')).toBe(true);
    expect(isDefaultTitle('projects', 'Projets')).toBe(true);
    expect(isDefaultTitle('skills', 'Compétences')).toBe(true);
    expect(isDefaultTitle('languages', 'Langues')).toBe(true);
    expect(isDefaultTitle('custom', 'Personnalisé')).toBe(true);
  });

  it('returns false for custom titles', () => {
    expect(isDefaultTitle('summary', 'About Me')).toBe(false);
    expect(isDefaultTitle('education', 'Academic Background')).toBe(false);
    expect(isDefaultTitle('experiences', 'Work History')).toBe(false);
    expect(isDefaultTitle('projects', 'My Projects')).toBe(false);
    expect(isDefaultTitle('skills', 'Technical Expertise')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDefaultTitle('summary', '')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isDefaultTitle('summary', 'summary')).toBe(false);
    expect(isDefaultTitle('education', 'EDUCATION')).toBe(false);
  });
});

describe('getTranslatedSectionTitle', () => {
  it('calls t function with correct translation keys', () => {
    const mockT = vi.fn((key: string) => `translated:${key}`) as unknown as import('i18next').TFunction;

    const result = getTranslatedSectionTitle('summary', mockT);
    expect(result).toBe('translated:sections.summary');
    expect(mockT).toHaveBeenCalledWith('sections.summary');
  });

  it('returns correct translation for each section type', () => {
    const translations: Record<string, string> = {
      'sections.summary': 'Résumé',
      'sections.education': 'Formation',
      'sections.experience': 'Expérience',
      'sections.projects': 'Projets',
      'sections.skills': 'Compétences',
      'sections.leadership': 'Leadership',
      'sections.languages': 'Langues',
      'sections.custom': 'Personnalisé',
    };
    const mockT = vi.fn((key: string) => translations[key] || key) as unknown as import('i18next').TFunction;

    expect(getTranslatedSectionTitle('summary', mockT)).toBe('Résumé');
    expect(getTranslatedSectionTitle('education', mockT)).toBe('Formation');
    expect(getTranslatedSectionTitle('experiences', mockT)).toBe('Expérience');
    expect(getTranslatedSectionTitle('projects', mockT)).toBe('Projets');
    expect(getTranslatedSectionTitle('skills', mockT)).toBe('Compétences');
    expect(getTranslatedSectionTitle('leadership', mockT)).toBe('Leadership');
    expect(getTranslatedSectionTitle('languages', mockT)).toBe('Langues');
    expect(getTranslatedSectionTitle('custom', mockT)).toBe('Personnalisé');
  });

  it('uses sections.experience (not sections.experiences) for experiences type', () => {
    const mockT = vi.fn((key: string) => key) as unknown as import('i18next').TFunction;
    getTranslatedSectionTitle('experiences', mockT);
    expect(mockT).toHaveBeenCalledWith('sections.experience');
  });
});
