import { useTranslation } from 'react-i18next';
import { Trash2, GraduationCap } from 'lucide-react';
import { EducationItem, createEmptyEducation } from '../../types';

interface EducationEditorProps {
  items: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}

export default function EducationEditor({ items, onChange }: EducationEditorProps) {
  const { t } = useTranslation();

  const addItem = () => {
    onChange([...items, createEmptyEducation()]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof EducationItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {items.map((edu, index) => (
        <div
          key={index}
          className="relative bg-primary-50/50 border border-primary-100 rounded-xl p-5"
        >
          <button
            onClick={() => removeItem(index)}
            className="absolute top-4 right-4 p-1.5 text-primary-400 hover:text-error-500
                       hover:bg-error-50 rounded-lg transition-colors"
            title={t('editors.education.deleteEducation')}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
            <div className="form-group">
              <label className="label">{t('editors.education.school')}</label>
              <input
                type="text"
                value={edu.school}
                onChange={(e) => updateItem(index, 'school', e.target.value)}
                placeholder={t('editors.education.schoolPlaceholder')}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">{t('editors.education.degree')}</label>
              <input
                type="text"
                value={edu.degree}
                onChange={(e) => updateItem(index, 'degree', e.target.value)}
                placeholder={t('editors.education.degreePlaceholder')}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">{t('editors.education.dates')}</label>
              <input
                type="text"
                value={edu.dates}
                onChange={(e) => updateItem(index, 'dates', e.target.value)}
                placeholder={t('editors.education.datesPlaceholder')}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">{t('editors.education.subtitle')}</label>
              <input
                type="text"
                value={edu.subtitle}
                onChange={(e) => updateItem(index, 'subtitle', e.target.value)}
                placeholder={t('editors.education.subtitlePlaceholder')}
                className="input"
              />
            </div>
            <div className="form-group md:col-span-2">
              <label className="label">{t('editors.education.description')}</label>
              <textarea
                value={edu.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                rows={2}
                placeholder={t('editors.education.descriptionPlaceholder')}
                className="input resize-none"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="w-full py-4 border-2 border-dashed border-primary-200 rounded-xl
                   text-primary-500 hover:border-primary-400 hover:text-primary-700
                   hover:bg-primary-50/50 transition-all flex items-center justify-center gap-2"
      >
        <GraduationCap className="w-5 h-5" />
        {t('editors.education.addEducation')}
      </button>
    </div>
  );
}
