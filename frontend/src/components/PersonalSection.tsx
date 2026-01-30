import { useTranslation } from 'react-i18next';
import { User, MapPin, Mail, Phone, Link, Plus, Trash2, Linkedin, Globe, ExternalLink } from 'lucide-react';
import { PersonalInfo, ProfessionalLink, PlatformType, createEmptyLink } from '../types';

interface PersonalSectionProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

const PLATFORM_OPTIONS: { value: PlatformType; icon: React.ReactNode }[] = [
  { value: 'linkedin', icon: <Linkedin className="w-4 h-4" /> },
  { value: 'github', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> },
  { value: 'portfolio', icon: <ExternalLink className="w-4 h-4" /> },
  { value: 'behance', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14h-8.027c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988h-6.466v-14.967h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zm-3.466-8.988h3.584c2.508 0 2.906-3-.312-3h-3.272v3zm3.391 3h-3.391v3.016h3.341c3.055 0 2.868-3.016.05-3.016z"/></svg> },
  { value: 'website', icon: <Globe className="w-4 h-4" /> },
  { value: 'other', icon: <Link className="w-4 h-4" /> },
];

export default function PersonalSection({ data, onChange }: PersonalSectionProps) {
  const { t } = useTranslation();

  const updateField = (field: keyof Omit<PersonalInfo, 'links'>, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const addLink = () => {
    onChange({
      ...data,
      links: [...(data.links || []), createEmptyLink()],
    });
  };

  const updateLink = (index: number, field: keyof ProfessionalLink, value: string) => {
    const newLinks = [...(data.links || [])];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange({ ...data, links: newLinks });
  };

  const removeLink = (index: number) => {
    const newLinks = (data.links || []).filter((_, i) => i !== index);
    onChange({ ...data, links: newLinks });
  };

  const getPlatformIcon = (platform: PlatformType) => {
    return PLATFORM_OPTIONS.find(p => p.value === platform)?.icon || <Link className="w-4 h-4" />;
  };

  return (
    <div className="card p-4 sm:p-6 animate-fade-in">
      <div className="section-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <h2 className="section-title text-base sm:text-lg">{t('personal.title')}</h2>
            <p className="text-xs sm:text-sm text-primary-500 truncate">{t('personal.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
      </div>

      {/* Section Liens Professionnels */}
      <div className="mt-6 pt-5 border-t border-primary-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-primary-500" />
            <h3 className="font-medium text-primary-700">{t('personal.links.title')}</h3>
          </div>
          <button
            type="button"
            onClick={addLink}
            className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t('personal.links.add')}
          </button>
        </div>

        {(!data.links || data.links.length === 0) && (
          <p className="text-sm text-primary-400 italic">{t('personal.links.empty')}</p>
        )}

        <div className="space-y-3">
          {(data.links || []).map((link, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-primary-50 rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary-500 border border-primary-100">
                {getPlatformIcon(link.platform)}
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="form-group mb-0">
                  <select
                    value={link.platform}
                    onChange={(e) => updateLink(index, 'platform', e.target.value)}
                    className="input text-sm py-2"
                  >
                    {PLATFORM_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {t(`personal.links.platforms.${opt.value}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group mb-0">
                  <input
                    type="text"
                    value={link.username}
                    onChange={(e) => updateLink(index, 'username', e.target.value)}
                    placeholder={t('personal.links.usernamePlaceholder')}
                    className="input text-sm py-2"
                  />
                </div>

                <div className="form-group mb-0">
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    placeholder={t('personal.links.urlPlaceholder')}
                    className="input text-sm py-2"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeLink(index)}
                className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
