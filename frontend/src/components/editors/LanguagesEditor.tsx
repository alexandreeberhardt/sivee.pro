import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

interface LanguagesEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function LanguagesEditor({ value, onChange }: LanguagesEditorProps) {
  const { t } = useTranslation();

  return (
    <div className="form-group">
      <label className="label flex items-center gap-2">
        <Languages className="w-4 h-4 text-primary-500" />
        {t('editors.languagesSpoken.label')}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('editors.languagesSpoken.placeholder')}
        className="input"
      />
      <p className="text-xs text-primary-400 mt-1.5">
        {t('editors.languagesSpoken.hint')}
      </p>
    </div>
  );
}
