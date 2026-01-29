import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';

interface SummaryEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SummaryEditor({ value, onChange }: SummaryEditorProps) {
  const { t } = useTranslation();

  return (
    <div className="form-group">
      <label className="label flex items-center gap-2">
        <User className="w-4 h-4 text-primary-500" />
        {t('editors.summary.label')}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('editors.summary.placeholder')}
        rows={4}
        className="input resize-y min-h-[100px]"
      />
      <p className="text-xs text-primary-400 mt-1.5">
        {t('editors.summary.hint')}
      </p>
    </div>
  );
}
