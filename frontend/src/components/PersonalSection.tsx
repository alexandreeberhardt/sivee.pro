import { useTranslation } from 'react-i18next';
import { User, MapPin, Mail, Phone, Github } from 'lucide-react';
import { PersonalInfo } from '../types';

interface PersonalSectionProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

export default function PersonalSection({ data, onChange }: PersonalSectionProps) {
  const { t } = useTranslation();

  const updateField = (field: keyof PersonalInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="card p-6 animate-fade-in">
      <div className="section-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="section-title">{t('personal.title')}</h2>
            <p className="text-sm text-primary-500">{t('personal.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="form-group">
          <label className="label">{t('personal.fullName')}</label>
          <div className="relative">
            <input
              type="text"
              value={data.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={t('personal.fullNamePlaceholder')}
              className="input pl-10"
            />
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          </div>
        </div>

        <div className="form-group">
          <label className="label">{t('personal.professionalTitle')}</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder={t('personal.professionalTitlePlaceholder')}
            className="input"
          />
        </div>

        <div className="form-group">
          <label className="label">{t('personal.location')}</label>
          <div className="relative">
            <input
              type="text"
              value={data.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder={t('personal.locationPlaceholder')}
              className="input pl-10"
            />
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          </div>
        </div>

        <div className="form-group">
          <label className="label">{t('personal.email')}</label>
          <div className="relative">
            <input
              type="email"
              value={data.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder={t('personal.emailPlaceholder')}
              className="input pl-10"
            />
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          </div>
        </div>

        <div className="form-group">
          <label className="label">{t('personal.phone')}</label>
          <div className="relative">
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder={t('personal.phonePlaceholder')}
              className="input pl-10"
            />
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          </div>
        </div>

        <div className="form-group">
          <label className="label">{t('personal.github')}</label>
          <div className="relative">
            <input
              type="text"
              value={data.github}
              onChange={(e) => updateField('github', e.target.value)}
              placeholder={t('personal.githubPlaceholder')}
              className="input pl-10"
            />
            <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          </div>
        </div>

        <div className="form-group md:col-span-2">
          <label className="label">{t('personal.githubUrl')}</label>
          <input
            type="url"
            value={data.github_url}
            onChange={(e) => updateField('github_url', e.target.value)}
            placeholder={t('personal.githubUrlPlaceholder')}
            className="input"
          />
        </div>
      </div>
    </div>
  );
}
