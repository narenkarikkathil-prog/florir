import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, BookOpen, MessageSquare, GraduationCap, Play, ChevronDown, Globe, PenLine } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Language, UserLevel } from '@/src/types';
import { supabase } from '@/src/lib/supabase';
import { FlowerLogo, BloomingFlower } from '@/src/components/FlowerLogo';

const allModes = [
  {
    id: 'ap-simulated',
    title: 'Conversation Practice',
    desc: 'The AI speaks — you respond. 5 rounds with feedback after each one.',
    icon: <GraduationCap size={24} />,
    color: 'bg-gold/10 text-gold',
    route: null,
  },
  {
    id: 'vocabulary',
    title: 'Vocabulary Practice',
    desc: 'Smart quiz sets that adapt to what you know and what you need to work on.',
    icon: <BookOpen size={24} />,
    color: 'bg-green-50 text-green-600',
    route: null,
  },
  {
    id: 'roleplay',
    title: 'Situational Learning',
    desc: 'Practice real-world scenarios with AI characters.',
    icon: <Mic size={24} />,
    color: 'bg-blue-50 text-blue-600',
    route: null,
  },
  {
    id: 'conversation',
    title: 'Free Conversation',
    desc: 'Talk about anything and get live feedback.',
    icon: <MessageSquare size={24} />,
    color: 'bg-purple-50 text-purple-600',
    route: null,
  },
  {
    id: 'essay-tips',
    title: 'Essay Writing Tips',
    desc: 'AP exam essay strategies — intros, conclusions, transitions, and theme vocab.',
    icon: <PenLine size={24} />,
    color: 'bg-rose-50 text-rose-600',
    route: '/essay-tips',
  },
];

export default function Dashboard() {
  const [selectedLang, setSelectedLang] = useState<Language>(() => {
    const saved = localStorage.getItem('selected_language');
    return (saved as Language) || 'French';
  });
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [stats, setStats] = useState({
    level: 'Beginner 1' as UserLevel,
    totalTime: 0,
    progress: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('selected_language', selectedLang);
  }, [selectedLang]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let { data: profile } = await supabase
          .from('profiles')
          .select('total_time, level_per_language')
          .eq('id', user.id)
          .single();

        if (!profile) {
          const initialProfile = {
            id: user.id,
            total_time: 0,
            level_per_language: { French: 'Beginner 1', Spanish: 'Beginner 1' },
            settings: { voice_name: 'Kore', playback_speed: 1.3 },
          };
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert(initialProfile)
            .select()
            .single();
          profile = newProfile;
        }

        if (profile) {
          const totalMinutes = (profile.total_time || 0) / 60;
          const level = profile.level_per_language?.[selectedLang] || 'Beginner 1';
          let progress = 0;
          if (totalMinutes < 30) progress = (totalMinutes / 30) * 100;
          else if (totalMinutes < 60) progress = ((totalMinutes - 30) / 30) * 100;
          else if (totalMinutes < 120) progress = ((totalMinutes - 60) / 60) * 100;
          else if (totalMinutes < 200) progress = ((totalMinutes - 120) / 80) * 100;
          else progress = 100;
          setStats({ level, totalTime: (profile.total_time || 0) / 3600, progress });
        }
      }
    };
    fetchStats();
  }, [selectedLang]);

  const startSession = (mode: typeof allModes[0]) => {
    if (mode.route) {
      navigate(`${mode.route}?lang=${selectedLang}`);
    } else if (mode.id === 'vocabulary') {
      navigate(`/session/vocabulary?lang=${selectedLang}`);
    } else {
      navigate(`/session/${mode.id}?lang=${selectedLang}`);
    }
  };

  const languages: Language[] = ['French', 'Spanish'];

  return (
    <div className="container mx-auto px-4 py-6 md:py-12 max-w-6xl relative">
      <BloomingFlower className="absolute -top-10 -right-10 text-gold hidden md:block" size={120} delay={0.2} />
      <BloomingFlower className="absolute bottom-0 -left-10 text-petal hidden md:block" size={150} delay={0.5} />

      <header className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FlowerLogo className="text-gold" size={28} />
            <h1 className="text-2xl md:text-4xl font-serif font-bold">My Learning</h1>
          </div>
          <p className="text-dark/50">Practice French and Spanish.</p>
        </div>

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-3 px-6 py-3 bg-white border border-beige-mid/20 rounded-2xl shadow-sm hover:shadow-md transition-all min-w-[180px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-gold" />
              <span className="font-bold text-dark">{selectedLang}</span>
            </div>
            <ChevronDown size={18} className={cn('text-dark/30 transition-transform', isLangDropdownOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {isLangDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsLangDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-full bg-white border border-beige-mid/20 rounded-2xl shadow-xl z-40 overflow-hidden"
                >
                  {languages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => { setSelectedLang(lang); setIsLangDropdownOpen(false); }}
                      className={cn(
                        'w-full px-6 py-3 text-left text-sm font-medium transition-colors hover:bg-beige/30',
                        selectedLang === lang ? 'text-gold bg-beige/10' : 'text-dark/70'
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Mode Cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allModes.map((mode, idx) => (
              <motion.button
                key={mode.id}
                onClick={() => startSession(mode)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                className="group p-6 bg-white rounded-[32px] border border-beige-mid/20 hover:border-gold/30 transition-all text-left flex flex-col h-full shadow-sm hover:shadow-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/[0.02] transition-colors" />
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 relative z-10', mode.color)}>
                  {mode.icon}
                </div>
                <h3 className="text-xl font-serif font-bold mb-2 relative z-10">{mode.title}</h3>
                <p className="text-sm text-dark/50 mb-8 flex-1 relative z-10 leading-relaxed">{mode.desc}</p>
                <div className="flex items-center justify-between mt-auto relative z-10">
                  <div className="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 text-gold font-bold text-sm bg-gold/10 md:bg-gold/5 px-6 py-3 md:px-4 md:py-2 rounded-xl md:rounded-full group-hover:bg-gold group-hover:text-cream transition-all">
                    Start Session <Play size={14} fill="currentColor" />
                  </div>
                  <div className="hidden md:block text-dark/10 group-hover:text-gold/20 transition-colors ml-4">
                    <ChevronDown size={24} className="-rotate-90" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gold text-cream p-8 rounded-[40px] shadow-lg shadow-gold/20">
            <div className="flex items-center gap-3 mb-4">
              <Globe size={20} />
              <h3 className="font-bold">Our Mission</h3>
            </div>
            <p className="text-sm text-cream/80 mb-6 leading-relaxed">
              Orati is a non-profit initiative dedicated to making high-quality language education accessible to everyone, everywhere.
            </p>
            <button
              onClick={() => navigate('/nonprofit')}
              className="w-full py-3 bg-white text-gold rounded-full font-bold text-sm hover:bg-beige transition-all shadow-md"
            >
              Learn More
            </button>
          </div>

          {/* Level card */}
          <div className="bg-white border border-beige-mid/20 p-6 rounded-[32px] shadow-sm">
            <p className="text-xs font-bold text-dark/30 uppercase tracking-wider mb-1">{selectedLang} Level</p>
            <h3 className="font-serif font-bold text-xl mb-3">{stats.level}</h3>
            <div className="w-full h-2 bg-beige-mid/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-gold to-petal rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stats.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-dark/30 mt-2">{Math.round(stats.totalTime * 10) / 10}h practiced</p>
          </div>
        </div>
      </div>
    </div>
  );
}
