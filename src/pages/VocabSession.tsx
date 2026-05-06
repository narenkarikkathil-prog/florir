import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Volume2, ChevronRight, RotateCcw, Trophy, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Language } from '@/src/types';
import { supabase } from '@/src/lib/supabase';

// ─── Types ───
interface VocabQuestion {
  id: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  audio_file_key: string | null;
  options: { text: string; is_correct: boolean }[];
  theme: string | null;
  correct_answer: string;
  word: string;
}

interface VocabProgress {
  question_id: string;
  attempts: number;
  correct_count: number;
  last_seen: string;
}

type SessionPhase = 'select' | 'quiz' | 'results';

// Weighted question selection: unseen > wrong > partially correct
function selectWeightedQuestions(
  questions: VocabQuestion[],
  progress: VocabProgress[],
  count: number,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
): VocabQuestion[] {
  const progressMap = new Map(progress.map(p => [p.question_id, p]));

  let pool = difficulty === 'mixed'
    ? questions
    : questions.filter(q => q.difficulty === difficulty);

  const weighted = pool.map(q => {
    const p = progressMap.get(q.id);
    if (!p || p.attempts === 0) return { q, weight: 4 }; // unseen — highest priority
    const accuracy = p.correct_count / p.attempts;
    if (accuracy < 0.5) return { q, weight: 3 }; // mostly wrong
    if (accuracy < 0.8) return { q, weight: 2 }; // partially correct
    return { q, weight: 1 }; // mastered
  });

  // Weighted shuffle
  const result: VocabQuestion[] = [];
  const remaining = [...weighted];
  while (result.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((s, x) => s + x.weight, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < remaining.length; i++) {
      rand -= remaining[i].weight;
      if (rand <= 0) {
        result.push(remaining[i].q);
        remaining.splice(i, 1);
        break;
      }
    }
  }
  return result;
}

// Fetch audio from storage
async function fetchStorageAudio(key: string): Promise<string | null> {
  if (!supabase || !key) return null;
  try {
    const { data, error } = await supabase.storage.from('vocab-audio').download(key);
    if (error || !data) return null;
    const ab = await data.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  } catch { return null; }
}

export default function VocabSession() {
  const [searchParams] = useSearchParams();
  const lang = (searchParams.get('lang') as Language) || 'French';
  const navigate = useNavigate();

  const [phase, setPhase] = useState<SessionPhase>('select');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [allQuestions, setAllQuestions] = useState<VocabQuestion[]>([]);
  const [progress, setProgress] = useState<VocabProgress[]>([]);
  const [sessionQuestions, setSessionQuestions] = useState<VocabQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<{ question: VocabQuestion; correct: boolean }[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load questions + progress
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        if (!supabase) { setIsLoading(false); return; }

        const { data: questions } = await supabase
          .from('vocab_questions')
          .select('*')
          .eq('language', lang);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prog } = await supabase
            .from('vocab_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('language', lang);
          setProgress(prog || []);
        }
        setAllQuestions(questions || []);
      } catch (e) {
        console.error('Failed to load vocab questions:', e);
      }
      setIsLoading(false);
    };
    load();
  }, [lang]);

  const startSession = () => {
    const selected = selectWeightedQuestions(allQuestions, progress, 10, difficulty);
    setSessionQuestions(selected);
    setCurrentIdx(0);
    setSelectedOption(null);
    setSessionResults([]);
    setPhase('quiz');
  };

  const handleAnswer = async (option: { text: string; is_correct: boolean }) => {
    if (selectedOption !== null) return;
    setSelectedOption(option.text);
    const question = sessionQuestions[currentIdx];
    const correct = option.is_correct;
    const newResults = [...sessionResults, { question, correct }];
    setSessionResults(newResults);

    // Update progress in Supabase
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const existing = progress.find(p => p.question_id === question.id);
          if (existing) {
            await supabase.from('vocab_progress').update({
              attempts: existing.attempts + 1,
              correct_count: existing.correct_count + (correct ? 1 : 0),
              last_seen: new Date().toISOString(),
            }).eq('user_id', user.id).eq('question_id', question.id);
          } else {
            await supabase.from('vocab_progress').insert({
              user_id: user.id,
              question_id: question.id,
              language: lang,
              attempts: 1,
              correct_count: correct ? 1 : 0,
            });
          }
        }
      } catch (e) { console.warn('Progress save error:', e); }
    }

    // Auto-advance after 1.5s
    setTimeout(() => {
      if (currentIdx + 1 >= sessionQuestions.length) {
        setPhase('results');
      } else {
        setCurrentIdx(prev => prev + 1);
        setSelectedOption(null);
      }
    }, 1500);
  };

  const playAudio = useCallback(async (key: string | null) => {
    if (!key || isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      const b64 = await fetchStorageAudio(key);
      if (b64) {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioContext();
        }
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const pcm = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768.0;
        const buf = audioCtxRef.current.createBuffer(1, float32.length, 24000);
        buf.getChannelData(0).set(float32);
        const src = audioCtxRef.current.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtxRef.current.destination);
        src.onended = () => setIsPlayingAudio(false);
        src.start();
      } else {
        setIsPlayingAudio(false);
      }
    } catch { setIsPlayingAudio(false); }
  }, [isPlayingAudio]);

  const diffStats = {
    easy: { total: allQuestions.filter(q => q.difficulty === 'easy').length, done: 0 },
    medium: { total: allQuestions.filter(q => q.difficulty === 'medium').length, done: 0 },
    hard: { total: allQuestions.filter(q => q.difficulty === 'hard').length, done: 0 },
  };
  progress.forEach(p => {
    const q = allQuestions.find(q => q.id === p.question_id);
    if (!q) return;
    if (p.correct_count > 0) diffStats[q.difficulty as keyof typeof diffStats].done++;
  });

  const currentQ = sessionQuestions[currentIdx];
  const score = sessionResults.filter(r => r.correct).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => phase === 'select' ? navigate('/dashboard') : setPhase('select')}
            className="p-2 rounded-full hover:bg-beige transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-serif font-bold">Vocabulary Practice</h1>
            <p className="text-xs text-dark/40">{lang}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'select' && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {allQuestions.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <BookOpen size={48} className="mx-auto text-dark/20" />
                  <h2 className="text-xl font-serif font-bold text-dark/40">No Questions Yet</h2>
                  <p className="text-sm text-dark/40">Questions for {lang} haven't been uploaded yet. Check back soon!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-serif font-bold mb-1">Choose Difficulty</h2>
                    <p className="text-dark/50 text-sm">The algorithm picks 10 questions based on what you need to work on most.</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {(['easy', 'medium', 'hard'] as const).map(d => (
                      <div key={d} className="bg-white rounded-2xl border border-beige-mid/20 p-4 text-center">
                        <div className="text-2xl font-bold text-gold">{diffStats[d].done}/{diffStats[d].total}</div>
                        <div className="text-xs text-dark/40 capitalize font-bold mt-1">{d}</div>
                      </div>
                    ))}
                  </div>

                  {/* Difficulty picker */}
                  <div className="grid grid-cols-2 gap-3">
                    {(['easy', 'medium', 'hard', 'mixed'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={cn(
                          "p-4 rounded-2xl border-2 text-left transition-all font-bold capitalize",
                          difficulty === d
                            ? "border-gold bg-gold/5 text-gold"
                            : "border-beige-mid/20 bg-white text-dark/60 hover:border-gold/40"
                        )}
                      >
                        {d === 'mixed' ? '🎲 Mixed' : d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={startSession}
                    className="w-full py-4 bg-gold text-cream rounded-full font-bold text-lg hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
                  >
                    Start 10-Question Set →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {phase === 'quiz' && currentQ && (
            <motion.div key={`quiz-${currentIdx}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-beige-mid/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-gold to-petal rounded-full"
                      animate={{ width: `${((currentIdx) / sessionQuestions.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-dark/40">{currentIdx + 1}/{sessionQuestions.length}</span>
                </div>

                {/* Difficulty badge */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                    currentQ.difficulty === 'easy' && "bg-green-100 text-green-600",
                    currentQ.difficulty === 'medium' && "bg-yellow-100 text-yellow-600",
                    currentQ.difficulty === 'hard' && "bg-red-100 text-red-600",
                  )}>{currentQ.difficulty}</span>
                  {currentQ.theme && <span className="text-xs text-dark/30">{currentQ.theme}</span>}
                </div>

                {/* Question */}
                <div className="bg-white rounded-3xl border border-beige-mid/20 p-8 text-center shadow-sm">
                  <p className="text-sm text-dark/40 mb-3 font-bold uppercase tracking-wider">What does this mean?</p>
                  <div className="flex items-center justify-center gap-3">
                    <h2 className="text-4xl font-serif font-bold text-dark">{currentQ.word}</h2>
                    {currentQ.audio_file_key && (
                      <button
                        onClick={() => playAudio(currentQ.audio_file_key)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                          isPlayingAudio ? "bg-gold/20 text-gold animate-pulse" : "bg-gold/10 text-gold hover:bg-gold/20"
                        )}
                      >
                        <Volume2 size={18} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-dark/40 mt-3 italic">{currentQ.question_text}</p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 gap-3">
                  {currentQ.options.map((opt, i) => {
                    const isSelected = selectedOption === opt.text;
                    const revealed = selectedOption !== null;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        disabled={revealed}
                        whileHover={!revealed ? { scale: 1.01 } : {}}
                        whileTap={!revealed ? { scale: 0.99 } : {}}
                        className={cn(
                          "w-full p-4 rounded-2xl border-2 text-left font-medium transition-all",
                          !revealed && "border-beige-mid/20 bg-white hover:border-gold/40 hover:shadow-sm",
                          revealed && opt.is_correct && "border-green-400 bg-green-50 text-green-700",
                          revealed && isSelected && !opt.is_correct && "border-red-400 bg-red-50 text-red-700",
                          revealed && !isSelected && !opt.is_correct && "border-beige-mid/10 bg-beige/20 text-dark/30",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{opt.text}</span>
                          {revealed && opt.is_correct && <CheckCircle2 size={18} className="text-green-500 shrink-0" />}
                          {revealed && isSelected && !opt.is_correct && <XCircle size={18} className="text-red-500 shrink-0" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="space-y-6">
                <div className="text-center bg-gradient-to-br from-gold/10 to-petal/10 rounded-[32px] p-8 border border-gold/20">
                  <Trophy size={48} className="mx-auto text-gold mb-4" />
                  <div className="text-5xl font-bold text-gold mb-2">{score}/10</div>
                  <p className="text-dark/50 text-sm">
                    {score >= 9 ? 'Excellent work! 🎉' : score >= 7 ? 'Great job! Keep going.' : score >= 5 ? 'Good effort — review the missed ones.' : 'Keep practicing — you\'ll get there!'}
                  </p>
                </div>

                {/* Review */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {sessionResults.map((r, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border",
                      r.correct ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                    )}>
                      {r.correct ? <CheckCircle2 size={16} className="text-green-500 shrink-0" /> : <XCircle size={16} className="text-red-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm">{r.question.word}</span>
                        <span className="text-dark/40 text-sm"> → {r.question.correct_answer}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setPhase('select')} className="flex-1 py-4 bg-white border-2 border-beige-mid/20 rounded-full font-bold hover:bg-beige/30 transition-all flex items-center justify-center gap-2">
                    <RotateCcw size={16} /> New Set
                  </button>
                  <button onClick={startSession} className="flex-1 py-4 bg-gold text-cream rounded-full font-bold hover:bg-gold/90 transition-all shadow-lg shadow-gold/20">
                    Try Again →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
