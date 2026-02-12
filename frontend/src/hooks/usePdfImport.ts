import { useState, useRef, useEffect } from 'react';
import { ResumeData } from '../types';
import { normalizeSection } from '../utils/sectionNormalizer';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.DEV ? '/api' : '';

interface UsePdfImportOptions {
  setData: React.Dispatch<React.SetStateAction<ResumeData>>;
  setShowLanding: (v: boolean) => void;
  setHasImported: (v: boolean) => void;
  setEditorStep: (v: number) => void;
  setError: (v: string | null) => void;
}

export function usePdfImport({
  setData,
  setShowLanding,
  setHasImported,
  setEditorStep,
  setError,
}: UsePdfImportOptions) {
  const { t } = useTranslation();
  const [importLoading, setImportLoading] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset import step when not loading
  useEffect(() => {
    if (!importLoading) {
      setImportStep(0);
    }
  }, [importLoading]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setError(null);
    setShowLanding(false);

    const initialData: ResumeData = {
      personal: { name: '', title: '', location: '', email: '', phone: '', links: [] },
      sections: [],
      template_id: 'harvard',
    };
    setData(initialData);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/import-stream`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || t('errors.import'));
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream non disponible');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              switch (event.type) {
                case 'status':
                  if (event.message === 'extracting') {
                    setImportStep(0);
                  } else if (event.message === 'processing') {
                    setImportStep(1);
                  }
                  break;

                case 'personal':
                  setData(prev => ({
                    ...prev,
                    personal: event.data,
                  }));
                  setImportStep(2);
                  break;

                case 'section': {
                  const normalizedSection = normalizeSection(event.data as Record<string, unknown>);
                  setData(prev => ({
                    ...prev,
                    sections: [...prev.sections, normalizedSection],
                  }));
                  setImportStep(3);
                  break;
                }

                case 'complete': {
                  const processedData: ResumeData = {
                    ...event.data,
                    sections: event.data.sections.map((section: Record<string, unknown>) =>
                      normalizeSection(section)
                    ),
                  };
                  setData(processedData);
                  setHasImported(true);
                  setEditorStep(999);
                  setImportStep(4);
                  break;
                }

                case 'error':
                  throw new Error(event.message);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
                console.error('SSE parse error:', parseErr);
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return { importLoading, importStep, fileInputRef, handleImport };
}
