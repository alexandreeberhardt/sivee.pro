import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertCircle, Eye, EyeOff, X, Maximize2 } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
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
        body: JSON.stringify({ ...data, lang: i18n.language.substring(0, 2) }),
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
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-0 border border-primary-100/80 rounded-xl text-primary-500 hover:text-primary-700 hover:bg-primary-50/50 hover:border-primary-200 transition-all text-sm"
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
        <h3 className="text-base font-semibold text-primary-900">{t('preview.title')}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={generatePreview}
            disabled={loading}
            className="p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
            title={t('preview.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
            title={t('preview.hide')}
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paper-like container */}
      <div
        className="relative cursor-pointer group"
        onClick={() => pdfUrl && setIsFullscreen(true)}
      >
        {/* Paper shadow effect */}
        <div className="absolute inset-0 bg-primary-900/5 rounded-lg translate-y-1 translate-x-0.5" />
        <div className="absolute inset-0 bg-primary-900/[0.03] rounded-lg translate-y-2 translate-x-1" />

        {/* Main paper */}
        <div className="relative bg-white rounded-lg overflow-hidden shadow-lg ring-1 ring-primary-900/5">
          {/* PDF Container */}
          <div className="aspect-[210/297] w-full bg-white">
            {pdfUrl ? (
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full pointer-events-none"
              >
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0 pointer-events-none"
                  title="CV Preview"
                />
              </object>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary-300">
                <div className="text-center p-4">
                  <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">{t('preview.empty')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen hint overlay */}
          {pdfUrl && !loading && (
            <div className="absolute inset-0 bg-primary-900/0 group-hover:bg-primary-900/10 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 shadow-md border border-primary-100/50 transform scale-95 group-hover:scale-100 transition-transform">
                <Maximize2 className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-medium text-primary-600">{t('preview.fullscreen')}</span>
              </div>
            </div>
          )}

          {/* Loading overlay - more elegant */}
          {loading && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-brand animate-spin" />
                <p className="text-xs text-primary-500 font-medium">{t('preview.generating')}</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && !loading && (
            <div className="absolute inset-x-0 bottom-0 bg-error-50/95 backdrop-blur-sm border-t border-error-100 p-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-error-500 flex-shrink-0" />
                <p className="text-xs text-error-600 truncate">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-primary-400 mt-2.5 text-center">
        {t('preview.hint')}
      </p>

      {/* Fullscreen Modal - rendered via portal to escape stacking context */}
      {isFullscreen && pdfUrl && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-primary-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* PDF Container with paper effect */}
          <div
            className="relative max-w-4xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Paper shadows */}
            <div className="absolute inset-0 bg-black/10 rounded-xl translate-y-2 translate-x-1" />
            <div className="absolute inset-0 bg-black/5 rounded-xl translate-y-4 translate-x-2" />

            {/* Main paper */}
            <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden aspect-[210/297]">
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="CV Preview Fullscreen"
                />
              </object>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
