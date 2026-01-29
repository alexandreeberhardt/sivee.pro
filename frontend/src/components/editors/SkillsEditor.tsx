import { useTranslation } from 'react-i18next';
import { Code2, Wrench } from 'lucide-react';
import { SkillsItem } from '../../types';

interface SkillsEditorProps {
  data: SkillsItem;
  onChange: (data: SkillsItem) => void;
}

export default function SkillsEditor({ data, onChange }: SkillsEditorProps) {
  const { t } = useTranslation();

  const updateField = (field: keyof SkillsItem, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      <div className="form-group">
        <label className="label flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary-500" />
          {t('editors.skills.languages')}
        </label>
        <input
          type="text"
          value={data.languages}
          onChange={(e) => updateField('languages', e.target.value)}
          placeholder={t('editors.skills.languagesPlaceholder')}
          className="input"
        />
        <p className="text-xs text-primary-400 mt-1.5">
          {t('editors.skills.languagesHint')}
        </p>
      </div>

      <div className="form-group">
        <label className="label flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary-500" />
          {t('editors.skills.tools')}
        </label>
        <input
          type="text"
          value={data.tools}
          onChange={(e) => updateField('tools', e.target.value)}
          placeholder={t('editors.skills.toolsPlaceholder')}
          className="input"
        />
        <p className="text-xs text-primary-400 mt-1.5">
          {t('editors.skills.toolsHint')}
        </p>
      </div>
    </div>
  );
}
