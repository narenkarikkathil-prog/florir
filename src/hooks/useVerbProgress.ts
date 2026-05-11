import { useState, useEffect } from 'react';
import { Language } from '../types';

export type VerbState = 'unknown' | 'known' | 'mastered' | 'trouble';

export interface VerbProgress {
  state: VerbState;
  failures: number;
}

export type LanguageVerbProgress = Record<string, VerbProgress>; // Key is the english verb string

export function useVerbProgress(lang: Language) {
  const [progress, setProgress] = useState<LanguageVerbProgress>({});

  useEffect(() => {
    const saved = localStorage.getItem(`verb_progress_${lang}`);
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse verb progress", e);
      }
    } else {
      setProgress({});
    }
  }, [lang]);

  const saveProgress = (newProgress: LanguageVerbProgress) => {
    setProgress(newProgress);
    localStorage.setItem(`verb_progress_${lang}`, JSON.stringify(newProgress));
  };

  const markKnown = (englishVerb: string) => {
    const current = progress[englishVerb] || { state: 'unknown', failures: 0 };
    if (current.state !== 'mastered') {
      const newProgress = { ...progress, [englishVerb]: { state: 'known' as VerbState, failures: 0 } };
      saveProgress(newProgress);
    } else if (current.failures > 0) {
      // If it's already mastered but had failures somehow, reset them
      const newProgress = { ...progress, [englishVerb]: { ...current, failures: 0 } };
      saveProgress(newProgress);
    }
  };

  const markMastered = (englishVerb: string) => {
    const current = progress[englishVerb] || { state: 'unknown', failures: 0 };
    const newProgress = { ...progress, [englishVerb]: { state: 'mastered' as VerbState, failures: 0 } };
    saveProgress(newProgress);
  };

  const recordFailure = (englishVerb: string) => {
    const current = progress[englishVerb] || { state: 'unknown', failures: 0 };
    const newFailures = current.failures + 1;
    
    // Any failure instantly puts it in 'trouble'
    const newState = 'trouble';

    const newProgress = { ...progress, [englishVerb]: { state: newState, failures: newFailures } };
    saveProgress(newProgress);
  };

  const getVerbState = (englishVerb: string): VerbState => {
    return progress[englishVerb]?.state || 'unknown';
  };

  const getFailures = (englishVerb: string): number => {
    return progress[englishVerb]?.failures || 0;
  };

  return {
    progress,
    markKnown,
    markMastered,
    recordFailure,
    getVerbState,
    getFailures
  };
}
