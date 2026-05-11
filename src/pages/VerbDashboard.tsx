import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, GraduationCap, RefreshCw, Filter, ShieldCheck, CheckCircle2, AlertCircle, CircleDashed } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Language } from '@/src/types';
import verbsData from '@/src/data/verbs.json';
import { useVerbProgress, VerbState } from '@/src/hooks/useVerbProgress';

export default function VerbDashboard() {
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang') as Language || 'French';
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<'all' | VerbState>('all');
  const { progress, getVerbState, getFailures } = useVerbProgress(lang);

  // Flatten all verbs for the current language
  const allVerbs = useMemo(() => {
    const langData = (verbsData as any)[lang] || { easy: [], medium: [], hard: [] };
    const combined = [
      ...langData.easy.map((v: any) => ({ ...v, difficulty: 'easy' })),
      ...langData.medium.map((v: any) => ({ ...v, difficulty: 'medium' })),
      ...langData.hard.map((v: any) => ({ ...v, difficulty: 'hard' }))
    ];
    return combined;
  }, [lang]);

  const filteredVerbs = useMemo(() => {
    if (activeFilter === 'all') return allVerbs;
    return allVerbs.filter(v => getVerbState(v.english) === activeFilter);
  }, [allVerbs, activeFilter, getVerbState]);

  const startPractice = (mode: string) => {
    navigate(`/verbs/practice/${mode}?lang=${lang}`);
  };

  const getStatusIcon = (state: VerbState) => {
    switch (state) {
      case 'mastered': return <ShieldCheck size={16} className="text-gold" />;
      case 'known': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'trouble': return <AlertCircle size={16} className="text-red-500" />;
      default: return <CircleDashed size={16} className="text-dark/20" />;
    }
  };

  const getStatusBadge = (state: VerbState, failures: number) => {
    switch (state) {
      case 'mastered': return <span className="px-2 py-0.5 rounded-md bg-gold/10 text-gold text-xs font-bold uppercase tracking-wider">Mastered</span>;
      case 'known': return <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-xs font-bold uppercase tracking-wider">Known</span>;
      case 'trouble': 
        if (failures >= 3) {
          return <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider">Trouble ({failures}x)</span>;
        } else {
          return <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-wider">Trouble ({failures}x)</span>;
        }
      default: return <span className="px-2 py-0.5 rounded-md bg-beige/30 text-dark/40 text-xs font-bold uppercase tracking-wider">Unknown</span>;
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-3 bg-white text-dark/40 hover:bg-beige hover:text-dark rounded-2xl border border-beige/10 transition-all shadow-sm"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-dark">Verb Practice</h1>
              <p className="text-dark/50 text-sm">Master your {lang} verbs through spaced repetition.</p>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (window.confirm('Reset all your verb progress?')) {
                localStorage.removeItem(`verb_progress_${lang}`);
                window.location.reload();
              }
            }}
            className="text-xs font-bold uppercase tracking-wider text-red-500/50 hover:text-red-500 transition-colors px-4 py-2 border border-red-500/20 hover:bg-red-50 rounded-lg"
          >
            Reset Progress
          </button>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(['easy', 'medium', 'hard'] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => startPractice(diff)}
              className="p-6 bg-white rounded-3xl border border-beige/20 shadow-sm hover:shadow-md hover:border-gold/30 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GraduationCap size={24} />
              </div>
              <h3 className="font-serif font-bold text-lg capitalize">{diff} Level</h3>
              <p className="text-xs text-dark/50 mt-1">Practice {diff} verbs.</p>
            </button>
          ))}
          
          <button
            onClick={() => startPractice('refresh')}
            className="p-6 bg-gold text-white rounded-3xl shadow-lg hover:bg-gold-dark hover:shadow-gold/20 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-180 transition-transform duration-500">
              <RefreshCw size={24} />
            </div>
            <h3 className="font-serif font-bold text-lg">Refresh Mode</h3>
            <p className="text-xs text-white/80 mt-1">Review known and mastered verbs.</p>
          </button>

          <button
            onClick={() => startPractice('trouble')}
            className="p-6 bg-red-50 text-red-600 rounded-3xl border border-red-100 shadow-sm hover:shadow-md hover:bg-red-100 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <AlertCircle size={24} />
            </div>
            <h3 className="font-serif font-bold text-lg">Trouble Mode</h3>
            <p className="text-xs text-red-600/70 mt-1">Target verbs you struggle with.</p>
          </button>
        </div>

        {/* Verb List Section */}
        <div className="bg-white rounded-[40px] border border-beige/20 shadow-xl overflow-hidden flex flex-col h-[600px] max-h-[70vh]">
          {/* Toolbar */}
          <div className="p-6 border-b border-beige/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-serif font-bold text-xl flex items-center gap-2">
              <Filter size={20} className="text-gold" /> Verb Library
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              {(['all', 'mastered', 'known', 'trouble', 'unknown'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all",
                    activeFilter === filter 
                      ? "bg-dark text-white shadow-md" 
                      : "bg-beige/20 text-dark/50 hover:bg-beige/40"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-[#F3EFE9]/30">
            {filteredVerbs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-dark/40">
                <CircleDashed size={48} className="mb-4 opacity-20" />
                <p className="font-medium">No verbs found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                {filteredVerbs.map((verb, idx) => {
                  const state = getVerbState(verb.english);
                  const failures = getFailures(verb.english);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                      key={`${verb.english}-${verb.difficulty}-${idx}`}
                      className="bg-white p-4 rounded-2xl border border-beige/20 shadow-sm flex items-center justify-between hover:border-gold/30 transition-colors group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-dark">{verb.target}</span>
                          <span className="text-[10px] uppercase font-bold text-dark/30 tracking-wider">
                            {verb.difficulty}
                          </span>
                        </div>
                        <p className="text-sm text-dark/60">{verb.english}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusIcon(state)}
                        {getStatusBadge(state, failures)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
