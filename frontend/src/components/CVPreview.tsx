import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { ResumeData } from '../types';

const API_URL = import.meta.env.DEV ? '/api' : '';

interface CVPreviewProps {
  data: ResumeData;
  debounceMs?: number;
}

export default function CVPreview({ data, debounceMs = 1000 }: CVPreviewProps) {
  const { t, i18n } = useTranslation();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousDataRef = useRef<string>('');
  const isFirstLoadRef = useRef(true);

  // Check if data has meaningful content (not just empty defaults)
  const hasContent = useCallback((d: ResumeData) => {
    const hasPersonalInfo = d.personal.name || d.personal.title || d.personal.email;
    const hasSections = d.sections.length > 0;
    return hasPersonalInfo || hasSections;
  }, []);

  const generatePreview = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, lang: i18n.language }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || t('errors.generation'));
      }

      const blob = await response.blob();

      // Revoke previous URL to prevent memory leaks
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      setError(err instanceof Error ? err.message : t('errors.generation'));
    } finally {
      setLoading(false);
    }
  }, [data, i18n.language, pdfUrl, t]);

  // Debounced auto-refresh on data changes
  useEffect(() => {
    const dataString = JSON.stringify(data);

    // Skip if data hasn't changed
    if (dataString === previousDataRef.current) {
      return;
    }
    previousDataRef.current = dataString;

    // Clear any existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Generate immediately on first load with content (e.g., after PDF import)
    // Only mark as "loaded" once we have actual content
    if (isFirstLoadRef.current) {
      if (hasContent(data)) {
        isFirstLoadRef.current = false;
        generatePreview();
        return;
      }
      // Don't mark as loaded yet if data is empty - wait for real content
      return;
    }

    // Set a new debounced call for subsequent changes
    debounceRef.current = setTimeout(() => {
      generatePreview();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [data, debounceMs, generatePreview, hasContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (isCollapsed) {
    return (
      <div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-surface-0 border border-primary-200 rounded-xl text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          {t('preview.show')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold text-primary-900">{t('preview.title')}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={generatePreview}
            disabled={loading}
            className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
            title={t('preview.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
            title={t('preview.hide')}
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-primary-200 bg-surface-0 shadow-soft">
        {/* PDF Container */}
        <div className="aspect-[210/297] w-full bg-gray-100">
          {pdfUrl ? (
            <object
              data={pdfUrl}
              type="application/pdf"
              className="w-full h-full"
            >
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="CV Preview"
              />
            </object>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-400">
              <div className="text-center p-4">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t('preview.empty')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-surface-0/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
              <p className="text-sm text-primary-600">{t('preview.generating')}</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-x-0 bottom-0 bg-error-50 border-t border-error-200 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-error-700">{error}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-primary-400 mt-2 text-center">
        {t('preview.hint')}
      </p>
    </div>
  );
}
