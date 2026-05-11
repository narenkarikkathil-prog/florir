import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Language } from '@/src/types';
import verbsData from '@/src/data/verbs.json';
import { useVerbProgress } from '@/src/hooks/useVerbProgress';
import confetti from 'canvas-confetti';

const correctSound = new Audio('/sounds/correct.mp3');
correctSound.preload = 'auto';
const wrongSound = new Audio('/sounds/wrong.mp3');
wrongSound.preload = 'auto';

const playSound = (audio: HTMLAudioElement) => {
  const clone = audio.cloneNode() as HTMLAudioElement;
  clone.play().catch(() => {});
};

type QuestionMode = 'mcq' | 'write';

export default function VerbPractice() {
  const { mode } = useParams<{ mode: string }>(); // 'easy', 'medium', 'hard', 'refresh'
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang') as Language || 'French';
  const navigate = useNavigate();

  const { getVerbState, markKnown, markMastered, recordFailure } = useVerbProgress(lang);

  const [activeVerbs, setActiveVerbs] = useState<any[]>([]);

  useEffect(() => {
    const langData = (verbsData as any)[lang] || { easy: [], medium: [], hard: [] };
    let list: any[] = [];
    
    if (mode === 'refresh') {
      const combined = [...langData.easy, ...langData.medium, ...langData.hard];
      list = combined.filter(v => ['known', 'mastered'].includes(getVerbState(v.english)));
      if (list.length === 0) {
        list = combined.slice(0, 20); // fallback if none known
      }
    } else if (mode === 'trouble') {
      const combined = [...langData.easy, ...langData.medium, ...langData.hard];
      list = combined.filter(v => getVerbState(v.english) === 'trouble');
      // No fallback for trouble mode. We want to show a success message.
    } else {
      list = langData[mode as string] || langData.easy;
    }
    
    // Shuffle and limit to 15
    const shuffled = [...list].sort(() => Math.random() - 0.5).slice(0, 15);
    setActiveVerbs(shuffled);
  }, [lang, mode]); // Only run on mount or when mode/lang changes

  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionMode, setQuestionMode] = useState<QuestionMode>('mcq');
  const [options, setOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);

  const currentVerb = activeVerbs[currentIndex];

  const generateOptions = (correct: string) => {
    const langData = (verbsData as any)[lang] || { easy: [], medium: [], hard: [] };
    const allTargets = [...langData.easy, ...langData.medium, ...langData.hard].map((v: any) => v.target);
    
    const opts = new Set<string>();
    opts.add(correct);
    while (opts.size < 4 && opts.size < allTargets.length) {
      opts.add(allTargets[Math.floor(Math.random() * allTargets.length)]);
    }
    return Array.from(opts).sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    if (!currentVerb) return;
    
    // Determine mode randomly, but favor what they need
    // If it's known, we want to push them to mastered -> writing
    // If it's unknown/trouble -> mcq first
    const state = getVerbState(currentVerb.english);
    let nextMode: QuestionMode = 'mcq';
    
    if (state === 'known') {
      nextMode = Math.random() > 0.3 ? 'write' : 'mcq';
    } else if (state === 'mastered') {
      nextMode = Math.random() > 0.5 ? 'write' : 'mcq';
    } else {
      nextMode = 'mcq'; // Must be correctly answered via MCQ first
    }

    setQuestionMode(nextMode);
    setAttempts(0);
    setInputValue('');
    setFeedback(null);

    if (nextMode === 'mcq') {
      setOptions(generateOptions(currentVerb.target));
    }
  }, [currentIndex, currentVerb]);

  const handleNext = () => {
    if (currentIndex < activeVerbs.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Done with list, go back to dashboard
      navigate('/verbs');
    }
  };

  const handleMCQ = (selected: string) => {
    if (feedback) return;

    if (selected === currentVerb.target) {
      setFeedback('success');
      markKnown(currentVerb.english);
      playSound(correctSound);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#D4AF37', '#F3EFE9'] });
      setTimeout(handleNext, 1500);
    } else {
      setFeedback('error');
      recordFailure(currentVerb.english);
      playSound(wrongSound);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setTimeout(handleNext, 2000); // 1 chance, move on
    }
  };

  const handleWriteSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || feedback) return;

    const isCorrect = inputValue.trim().toLowerCase() === currentVerb.target.toLowerCase();

    if (isCorrect) {
      setFeedback('success');
      markMastered(currentVerb.english);
      playSound(correctSound);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#D4AF37', '#F3EFE9'] });
      setTimeout(handleNext, 1500);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      playSound(wrongSound);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (newAttempts >= 3) {
        recordFailure(currentVerb.english);
        setFeedback('error');
        setTimeout(handleNext, 2000);
      }
    }
  };

  if (activeVerbs.length === 0 && mode === 'trouble') {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-cream flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[40px] shadow-xl border border-beige/20 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-dark mb-2">No Trouble Words!</h2>
          <p className="text-dark/60 mb-8">You don't have any verbs marked as trouble right now. Keep practicing!</p>
          <button
            onClick={() => navigate('/verbs')}
            className="px-8 py-4 bg-gold text-white font-bold rounded-2xl hover:bg-gold-dark transition-all w-full"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!currentVerb) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-cream flex flex-col items-center justify-center p-4">
      <button
        onClick={() => navigate('/verbs')}
        className="absolute top-8 right-8 p-3 bg-white text-dark/40 hover:bg-red-50 hover:text-red-500 rounded-2xl border border-beige/10 transition-all shadow-sm z-50"
      >
        <X size={22} />
      </button>

      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="text-sm font-bold text-dark/40 uppercase tracking-widest">
            {mode} Mode • {currentIndex + 1} / {activeVerbs.length}
          </div>
          <div className="text-sm font-bold text-gold uppercase tracking-widest flex items-center gap-2">
            {questionMode === 'mcq' ? 'Select the translation' : 'Type the translation'}
          </div>
        </div>

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, x: isShaking ? [-10, 10, -10, 10, 0] : 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-8 md:p-12 rounded-[40px] shadow-xl border border-beige/20 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark mb-10">
            {currentVerb.english}
          </h2>

          {questionMode === 'mcq' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {options.map((opt, idx) => {
                const isSelectedAndWrong = feedback === 'error'; // We don't track which one they clicked to simplify, just show correct
                const isCorrect = opt === currentVerb.target;
                
                return (
                  <button
                    key={idx}
                    disabled={feedback !== null}
                    onPointerDown={() => handleMCQ(opt)}
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all font-bold text-lg text-dark/80 flex items-center justify-center gap-3",
                      feedback === null ? "border-beige/20 hover:border-gold hover:text-gold hover:bg-gold/5" :
                      isCorrect && feedback === 'success' ? "border-green-500 bg-green-50 text-green-700" :
                      isCorrect && feedback === 'error' ? "border-green-500 bg-green-50 text-green-700" : // reveal correct answer
                      "border-beige/10 opacity-50"
                    )}
                  >
                    {isCorrect && feedback !== null && <CheckCircle2 size={20} className="text-green-500" />}
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleWriteSubmit} className="max-w-md mx-auto relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={feedback !== null}
                placeholder={`Type in ${lang}...`}
                className={cn(
                  "w-full bg-[#F3EFE9] border-2 rounded-2xl p-6 text-center text-xl font-bold focus:outline-none transition-all",
                  feedback === 'success' ? "border-green-500 text-green-700 bg-green-50" :
                  feedback === 'error' ? "border-red-500 text-red-700 bg-red-50" :
                  "border-transparent focus:border-gold"
                )}
                autoFocus
              />
              
              {feedback === null && (
                <div className="flex justify-center gap-2 mt-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all",
                        i < (3 - attempts) ? "bg-gold" : "bg-beige-mid/30"
                      )}
                    />
                  ))}
                </div>
              )}

              {feedback === 'error' && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex flex-col items-center gap-2 animate-fade-in">
                  <span className="text-sm font-bold uppercase tracking-wider opacity-60">Correct Answer</span>
                  <span className="text-2xl font-serif font-bold">{currentVerb.target}</span>
                </div>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
