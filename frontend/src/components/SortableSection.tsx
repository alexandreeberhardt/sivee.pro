import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  CVSection,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  SkillsItem,
  LeadershipItem,
  CustomItem,
  SectionType,
} from '../types';
import EducationEditor from './editors/EducationEditor';
import ExperienceEditor from './editors/ExperienceEditor';
import ProjectEditor from './editors/ProjectEditor';
import SkillsEditor from './editors/SkillsEditor';
import LeadershipEditor from './editors/LeadershipEditor';
import LanguagesEditor from './editors/LanguagesEditor';
import CustomEditor from './editors/CustomEditor';
import SummaryEditor from './editors/SummaryEditor';

interface SortableSectionProps {
  section: CVSection;
  onUpdate: (updates: Partial<CVSection>) => void;
  onDelete: () => void;
}

export default function SortableSection({ section, onUpdate, onDelete }: SortableSectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(section.title);

  const getSectionTypeLabel = (type: SectionType): string => {
    const labels: Record<SectionType, string> = {
      summary: t('sections.summary'),
      education: t('sections.education'),
      experiences: t('sections.experience'),
      projects: t('sections.projects'),
      skills: t('sections.skills'),
      leadership: t('sections.leadership'),
      languages: t('sections.languages'),
      custom: t('sections.custom'),
    };
    return labels[type] || type;
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTitleSave = () => {
    onUpdate({ title: titleInput });
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTitleInput(section.title);
    setIsEditingTitle(false);
  };

  const renderEditor = () => {
    switch (section.type) {
      case 'summary':
        return (
          <SummaryEditor
            value={section.items as string}
            onChange={(items) => onUpdate({ items })}
          />
        );
      case 'education':
        return (
          <EducationEditor
            items={section.items as EducationItem[]}
            onChange={(items) => onUpdate({ items })}
          />
        );
      case 'experiences':
        return (
          <ExperienceEditor
            items={section.items as ExperienceItem[]}
            onChange={(items) => onUpdate({ items })}
          />
        );
      case 'projects':
        return (
          <ProjectEditor
            items={section.items as ProjectItem[]}
            onChange={(items) => onUpdate({ items })}
          />
        );
      case 'skills':
        return (
          <SkillsEditor
            data={section.items as SkillsItem}
            onChange={(items) => onUpdate({ items })}
          />
        );
      case 'leadership':
        return (
          <LeadershipEditor
            items={section.items as LeadershipItem[]}
            onChange={(items) => onUpdate({ items })}
          />
        );
      case 'languages':
        return (
          <LanguagesEditor
            value={section.items as string}
            onChange={(items) => onUpdate({ items })}
          />
        );
      case 'custom':
        return (
          <CustomEditor
            items={section.items as CustomItem[]}
            onChange={(items) => onUpdate({ items })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card transition-all duration-200 animate-fade-in ${
        isDragging ? 'shadow-elevated opacity-90 scale-[1.02]' : ''
      } ${!section.isVisible ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-primary-100">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 text-primary-300 hover:text-primary-500 rounded-lg
                     hover:bg-primary-50 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') handleTitleCancel();
                }}
                className="flex-1 px-3 py-1.5 text-base font-semibold border border-primary-300
                           rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2
                           focus:ring-primary-100"
                autoFocus
              />
              <button
                onClick={handleTitleSave}
                className="p-1.5 text-success-600 hover:bg-success-50 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleTitleCancel}
                className="p-1.5 text-primary-400 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-primary-900 truncate">
                {section.title}
              </h2>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1 text-primary-300 hover:text-primary-500 rounded transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <span className="badge">
                {getSectionTypeLabel(section.type)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ isVisible: !section.isVisible })}
            className={`p-2 rounded-lg transition-colors ${
              section.isVisible
                ? 'text-primary-400 hover:text-primary-600 hover:bg-primary-50'
                : 'text-accent-500 hover:text-accent-600 hover:bg-accent-50'
            }`}
            title={section.isVisible ? t('sections.hideInPdf') : t('sections.showInPdf')}
          >
            {section.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={onDelete}
            className="p-2 text-primary-400 hover:text-error-500 hover:bg-error-50
                       rounded-lg transition-colors"
            title={t('sections.deleteSection')}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-50
                       rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && section.isVisible && (
        <div className="p-5">{renderEditor()}</div>
      )}

      {/* Collapsed/Hidden message */}
      {isExpanded && !section.isVisible && (
        <div className="px-5 py-4 text-center">
          <p className="text-sm text-primary-400">
            {t('sections.hiddenMessage')}
          </p>
        </div>
      )}
    </div>
  );
}
