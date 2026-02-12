import { SectionType, CVSection, CustomItem, generateId } from '../types';

export const KNOWN_SECTION_TYPES: SectionType[] = [
  'summary',
  'education',
  'experiences',
  'projects',
  'skills',
  'leadership',
  'languages',
  'custom',
];

export const isKnownSectionType = (type: string): type is SectionType => {
  return KNOWN_SECTION_TYPES.includes(type as SectionType);
};

export const convertToCustomItems = (items: unknown): CustomItem[] => {
  if (Array.isArray(items)) {
    return items.map((item) => {
      if (typeof item === 'string') {
        return {
          title: '',
          subtitle: '',
          dates: '',
          highlights: [item],
        };
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        let highlights: string[] = [];
        if (Array.isArray(obj.highlights)) {
          highlights = obj.highlights.filter((h): h is string => typeof h === 'string');
        } else if (Array.isArray(obj.points)) {
          highlights = obj.points.filter((p): p is string => typeof p === 'string');
        } else if (Array.isArray(obj.items)) {
          highlights = obj.items.filter((i): i is string => typeof i === 'string');
        } else if (typeof obj.description === 'string') {
          highlights = [obj.description];
        }

        return {
          title: typeof obj.title === 'string' ? obj.title : (typeof obj.name === 'string' ? obj.name : ''),
          subtitle: typeof obj.subtitle === 'string' ? obj.subtitle : (typeof obj.organization === 'string' ? obj.organization : ''),
          dates: typeof obj.dates === 'string' ? obj.dates : (typeof obj.date === 'string' ? obj.date : ''),
          highlights,
        };
      }
      return {
        title: '',
        subtitle: '',
        dates: '',
        highlights: [],
      };
    });
  }
  if (typeof items === 'string' && items.trim()) {
    return [{
      title: '',
      subtitle: '',
      dates: '',
      highlights: [items],
    }];
  }
  return [];
};

export const normalizeSection = (sectionData: Record<string, unknown>): CVSection => {
  const type = sectionData.type as string;
  const title = (sectionData.title as string) || type || 'Section';
  const isVisible = sectionData.isVisible !== false;
  const id = generateId();

  if (isKnownSectionType(type)) {
    return {
      id,
      type,
      title,
      isVisible,
      items: sectionData.items as CVSection['items'],
    };
  }

  console.log(`Section type "${type}" inconnu, conversion en custom avec titre "${title}"`);
  return {
    id,
    type: 'custom',
    title,
    isVisible,
    items: convertToCustomItems(sectionData.items),
  };
};
