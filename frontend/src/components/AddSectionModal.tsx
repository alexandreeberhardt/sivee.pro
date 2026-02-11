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

export default function AddSectionModal({ onAdd, onClose }: AddSectionModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-primary-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-0 rounded-t-2xl sm:rounded-2xl shadow-elevated w-full sm:max-w-lg
                      max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-primary-100">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-primary-900">{t('addSection.title')}</h2>
            <p className="text-xs sm:text-sm text-primary-500 mt-0.5 truncate">
              {t('addSection.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100
                       rounded-xl transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-3 sm:p-4 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {sectionTypes.map((type) => {
            const isSelected = selectedType === type;

            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all
                           text-left group active:scale-[0.99] ${
                  isSelected
                    ? 'border-primary-900 bg-primary-50'
                    : 'border-transparent bg-primary-50/50 hover:border-primary-200 hover:bg-primary-50'
                }`}
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                    isSelected
                      ? 'bg-primary-900 text-primary-50'
                      : 'bg-primary-100 text-primary-600 group-hover:bg-primary-200'
                  }`}
                >
                  {sectionIcons[type]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-primary-900 text-sm sm:text-base">
                    {getSectionTitle(type)}
                  </span>
                  <p className="text-xs sm:text-sm text-primary-500 truncate">{getSectionDescription(type)}</p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-50" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom title input */}
        {selectedType === 'custom' && (
          <div className="px-4 sm:px-6 pb-4">
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
        <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-primary-100 bg-primary-50/50">
          <button onClick={onClose} className="btn-ghost text-sm sm:text-base">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedType || (selectedType === 'custom' && !customTitle.trim())}
            className="btn-primary text-sm sm:text-base"
          >
            {t('addSection.addButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
