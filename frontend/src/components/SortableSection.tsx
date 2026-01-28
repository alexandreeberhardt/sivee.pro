import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Trash2, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { useState } from 'react';
import {
  CVSection,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  SkillsItem,
  LeadershipItem,
  CustomItem,
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(section.title);

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
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTitleSave = () => {
    onUpdate({ title: titleInput });
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
      className={`bg-white rounded-lg shadow ${!section.isVisible ? 'opacity-60' : ''}`}
    >
      {/* Header de la section */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-100">
        {/* Handle de drag */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Titre */}
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleTitleSave}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                OK
              </button>
              <button
                onClick={() => {
                  setTitleInput(section.title);
                  setIsEditingTitle(false);
                }}
                className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
              >
                Annuler
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                {section.type}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ isVisible: !section.isVisible })}
            className={`p-2 rounded transition-colors ${
              section.isVisible
                ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'
            }`}
            title={section.isVisible ? 'Masquer' : 'Afficher'}
          >
            {section.isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Contenu de la section */}
      {isExpanded && section.isVisible && (
        <div className="p-4">{renderEditor()}</div>
      )}
    </div>
  );
}
