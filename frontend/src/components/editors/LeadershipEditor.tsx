import { useTranslation } from 'react-i18next';
import { Plus, Trash2, X, Users } from 'lucide-react';
import { LeadershipItem, createEmptyLeadership } from '../../types';

interface LeadershipEditorProps {
  items: LeadershipItem[];
  onChange: (items: LeadershipItem[]) => void;
}

export default function LeadershipEditor({ items, onChange }: LeadershipEditorProps) {
  const { t } = useTranslation();

  const addItem = () => {
    onChange([...items, createEmptyLeadership()]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LeadershipItem, value: string | string[]) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addHighlight = (index: number) => {
    const updated = [...items];
    updated[index].highlights = [...updated[index].highlights, ''];
    onChange(updated);
  };

  const removeHighlight = (leadIndex: number, hlIndex: number) => {
    const updated = [...items];
    updated[leadIndex].highlights = updated[leadIndex].highlights.filter((_, i) => i !== hlIndex);
    onChange(updated);
  };

  const updateHighlight = (leadIndex: number, hlIndex: number, value: string) => {
    const updated = [...items];
    updated[leadIndex].highlights[hlIndex] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {items.map((lead, index) => (
        <div
          key={index}
          className="relative bg-primary-50/50 border border-primary-100 rounded-xl p-5"
        >
          <button
            onClick={() => removeItem(index)}
            className="absolute top-4 right-4 p-1.5 text-primary-400 hover:text-error-500
                       hover:bg-error-50 rounded-lg transition-colors"
            title={t('editors.leadership.deleteLeadership')}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 pr-10">
            <div className="form-group">
              <label className="label">{t('editors.leadership.role')}</label>
              <input
                type="text"
                value={lead.role}
                onChange={(e) => updateItem(index, 'role', e.target.value)}
                placeholder={t('editors.leadership.rolePlaceholder')}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">{t('editors.leadership.place')}</label>
              <input
                type="text"
                value={lead.place}
                onChange={(e) => updateItem(index, 'place', e.target.value)}
                placeholder={t('editors.leadership.placePlaceholder')}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">{t('editors.leadership.dates')}</label>
              <input
                type="text"
                value={lead.dates}
                onChange={(e) => updateItem(index, 'dates', e.target.value)}
                placeholder={t('editors.leadership.datesPlaceholder')}
                className="input"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">{t('editors.leadership.highlights')}</label>
              <button
                onClick={() => addHighlight(index)}
                className="text-sm font-medium text-primary-600 hover:text-primary-800
                           flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('common.add')}
              </button>
            </div>
            <div className="space-y-2">
              {lead.highlights.map((hl, hlIndex) => (
                <div key={hlIndex} className="flex items-center gap-2 group">
                  <div className="w-1.5 h-1.5 bg-primary-300 rounded-full flex-shrink-0" />
                  <input
                    type="text"
                    value={hl}
                    onChange={(e) => updateHighlight(index, hlIndex, e.target.value)}
                    placeholder={t('editors.leadership.highlightPlaceholder')}
                    className="input flex-1"
                  />
                  <button
                    onClick={() => removeHighlight(index, hlIndex)}
                    className="p-1.5 text-primary-300 hover:text-error-500 opacity-0 group-hover:opacity-100
                               transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {lead.highlights.length === 0 && (
                <p className="text-sm text-primary-400 italic py-2">
                  {t('editors.leadership.noHighlights')}
                </p>
              )}
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
        <Users className="w-5 h-5" />
        {t('editors.leadership.addLeadership')}
      </button>
    </div>
  );
}
