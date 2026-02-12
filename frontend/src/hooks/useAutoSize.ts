import { useState, useEffect, useRef } from 'react';
import { ResumeData, SizeVariant, TemplateId, getBaseTemplateId } from '../types';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.DEV ? '/api' : '';

interface UseAutoSizeOptions {
  data: ResumeData;
  setData: React.Dispatch<React.SetStateAction<ResumeData>>;
}

export function useAutoSize({ data, setData }: UseAutoSizeOptions) {
  const { i18n } = useTranslation();
  const [autoSize, setAutoSize] = useState(true);
  const [recommendedSize, setRecommendedSize] = useState<SizeVariant>('normal');
  const [autoSizeLoading, setAutoSizeLoading] = useState(false);
  const autoSizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!autoSize) return;

    if (autoSizeTimeoutRef.current) {
      clearTimeout(autoSizeTimeoutRef.current);
    }

    const currentBase = getBaseTemplateId(data.template_id);

    autoSizeTimeoutRef.current = setTimeout(async () => {
      setAutoSizeLoading(true);
      try {
        const dataToSend = {
          ...data,
          template_id: currentBase,
          lang: i18n.language.substring(0, 2),
        };

        const response = await fetch(`${API_URL}/optimal-size`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });

        if (response.ok) {
          const result = await response.json();
          const newRecommendedSize = result.optimal_size as SizeVariant;
          setRecommendedSize(newRecommendedSize);

          const newTemplateId = result.template_id as TemplateId;
          setData(prev => {
            if (prev.template_id !== newTemplateId) {
              return { ...prev, template_id: newTemplateId };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Failed to get optimal size:', err);
      } finally {
        setAutoSizeLoading(false);
      }
    }, 1000);

    return () => {
      if (autoSizeTimeoutRef.current) {
        clearTimeout(autoSizeTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data.sections), JSON.stringify(data.personal), autoSize]);

  return { autoSize, setAutoSize, recommendedSize, autoSizeLoading };
}
