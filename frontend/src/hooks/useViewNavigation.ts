import { useState, useEffect, useRef, useCallback } from 'react';

export type ViewState = { view: 'landing' | 'resumes' | 'editor' };

export function useViewNavigation() {
  const [showLanding, setShowLanding] = useState(true);
  const [showResumesPage, setShowResumesPage] = useState(false);

  const getCurrentView = useCallback((): ViewState['view'] => {
    if (showLanding) return 'landing';
    if (showResumesPage) return 'resumes';
    return 'editor';
  }, [showLanding, showResumesPage]);

  const applyView = useCallback((view: ViewState['view']) => {
    switch (view) {
      case 'landing':
        setShowLanding(true);
        setShowResumesPage(false);
        break;
      case 'resumes':
        setShowLanding(false);
        setShowResumesPage(true);
        break;
      case 'editor':
        setShowLanding(false);
        setShowResumesPage(false);
        break;
    }
  }, []);

  // Push history state when view changes
  const previousViewRef = useRef<ViewState['view']>('landing');
  useEffect(() => {
    const currentView = getCurrentView();
    if (currentView !== previousViewRef.current) {
      if (previousViewRef.current !== undefined) {
        window.history.pushState({ view: currentView }, '');
      }
      previousViewRef.current = currentView;
    }
  }, [showLanding, showResumesPage, getCurrentView]);

  // Replace initial history entry with current view state
  useEffect(() => {
    window.history.replaceState({ view: 'landing' }, '');
  }, []);

  // Listen for popstate (back/forward button)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as ViewState | null;
      if (state?.view) {
        previousViewRef.current = state.view;
        applyView(state.view);
      } else {
        previousViewRef.current = 'landing';
        applyView('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyView]);

  return {
    showLanding,
    setShowLanding,
    showResumesPage,
    setShowResumesPage,
    applyView,
  };
}
