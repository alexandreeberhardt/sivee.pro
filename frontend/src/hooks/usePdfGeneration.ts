import { useState } from 'react';
import { ResumeData } from '../types';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.DEV ? '/api' : '';

interface UsePdfGenerationOptions {
  data: ResumeData;
  setError: (v: string | null) => void;
}

export function usePdfGeneration({ data, setError }: UsePdfGenerationOptions) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, lang: i18n.language.substring(0, 2) }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || t('errors.generation'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = data.personal.name
        ? `${data.personal.name.trim().replace(/\s+/g, '_')}_CV.pdf`
        : 'CV.pdf';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleGenerate };
}
