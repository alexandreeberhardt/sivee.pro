import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  GraduationCap,
  Briefcase,
  FolderKanban,
  Wrench,
  Users,
  Languages,
  FileText,
  User,
  Check,
} from 'lucide-react';
import { SectionType } from '../types';

interface AddSectionModalProps {
  onAdd: (type: SectionType, title: string) => void;
  onClose: () => void;
  existingSections: SectionType[];
}

const sectionIcons: Record<SectionType, React.ReactNode> = {
  summary: <User className="w-5 h-5" />,
  education: <GraduationCap className="w-5 h-5" />,
  experiences: <Briefcase className="w-5 h-5" />,
  projects: <FolderKanban className="w-5 h-5" />,
  skills: <Wrench className="w-5 h-5" />,
  leadership: <Users className="w-5 h-5" />,
  languages: <Languages className="w-5 h-5" />,
  custom: <FileText className="w-5 h-5" />,
};

const sectionTypes: SectionType[] = [
  'summary',
  'education',
  'experiences',
  'projects',
  'skills',
  'leadership',
  'languages',
  'custom',
];

export default function AddSectionModal({ onAdd, onClose, existingSections }: AddSectionModalProps) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<SectionType | null>(null);
  const [customTitle, setCustomTitle] = useState('');

  const getSectionTitle = (type: SectionType): string => {
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

  const getSectionDescription = (type: SectionType): string => {
    const descriptions: Record<SectionType, string> = {
      summary: t('addSection.summaryDesc'),
      education: t('addSection.educationDesc'),
      experiences: t('addSection.experienceDesc'),
      projects: t('addSection.projectsDesc'),
      skills: t('addSection.skillsDesc'),
      leadership: t('addSection.leadershipDesc'),
      languages: t('addSection.languagesDesc'),
      custom: t('addSection.customDesc'),
    };
    return descriptions[type];
  };

  const handleAdd = () => {
    if (!selectedType) return;

    const title = selectedType === 'custom' && customTitle
      ? customTitle
      : getSectionTitle(selectedType);

    onAdd(selectedType, title);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-primary-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-0 rounded-2xl shadow-elevated w-full max-w-lg
                      max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-primary-100">
          <div>
            <h2 className="text-xl font-semibold text-primary-900">{t('addSection.title')}</h2>
            <p className="text-sm text-primary-500 mt-0.5">
              {t('addSection.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100
                       rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {sectionTypes.map((type) => {
            const isExisting = existingSections.includes(type) && type !== 'custom';
            const isSelected = selectedType === type;

            return (
              <button
                key={type}
                onClick={() => !isExisting && setSelectedType(type)}
                disabled={isExisting}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                           text-left group ${
                  isSelected
                    ? 'border-primary-900 bg-primary-50'
                    : isExisting
                    ? 'border-primary-100 bg-primary-50/50 opacity-50 cursor-not-allowed'
                    : 'border-transparent bg-primary-50/50 hover:border-primary-200 hover:bg-primary-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-primary-900 text-white'
                      : 'bg-primary-100 text-primary-600 group-hover:bg-primary-200'
                  }`}
                >
                  {sectionIcons[type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary-900">
                      {getSectionTitle(type)}
                    </span>
                    {isExisting && (
                      <span className="text-xs text-primary-400 bg-primary-100 px-2 py-0.5 rounded-md">
                        {t('addSection.alreadyAdded')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-primary-500 truncate">{getSectionDescription(type)}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-primary-900 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom title input */}
        {selectedType === 'custom' && (
          <div className="px-6 pb-4">
            <label className="label">{t('addSection.customTitle')}</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={t('addSection.customPlaceholder')}
              className="input"
              autoFocus
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary-100 bg-primary-50/50">
          <button onClick={onClose} className="btn-ghost">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedType || (selectedType === 'custom' && !customTitle.trim())}
            className="btn-primary"
          >
            {t('addSection.addButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
