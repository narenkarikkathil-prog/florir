import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, BookOpen, MessageSquare, GraduationCap, Play, Trophy, Clock, AlertCircle, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Language, UserLevel } from '@/src/types';
import { supabase } from '@/src/lib/supabase';

import { FlowerLogo, BloomingFlower } from '@/src/components/FlowerLogo';

const generalModes = [
  {
    id: 'roleplay',
    title: 'Situational Learning',
    desc: 'Practice real-world scenarios with AI characters.',
    icon: <Mic size={24} />,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'vocabulary',
    title: 'Vocabulary Listening',
    desc: 'Test your listening with multiple choice quizzes.',
    icon: <BookOpen size={24} />,
    color: 'bg-green-50 text-green-600',
  },
  {
    id: 'conversation',
    title: 'Free Conversation',
    desc: 'Talk about anything and get live feedback.',
    icon: <MessageSquare size={24} />,
    color: 'bg-purple-50 text-purple-600',
  },
];

const apModes = [
  {
    id: 'ap-simulated',
    title: 'Simulated Conversation',
    desc: 'Aligns with official AP exam formats.',
    icon: <GraduationCap size={24} />,
    color: 'bg-gold/10 text-gold',
  },
  {
    id: 'ap-speaking',
    title: '2-Minute Speaking Task',
    desc: 'Cultural comparison prompts with rubric scoring.',
    icon: <Mic size={24} />,
    color: 'bg-gold/10 text-gold',
  },
  {
    id: 'ap-listening',
    title: 'Listening Comprehension',
    desc: 'MCQ testing main ideas and inference.',
    icon: <BookOpen size={24} />,
    color: 'bg-gold/10 text-gold',
  },
];

const SHOW_PAID_FEATURES = false;

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'general' | 'ap'>('general');
  const [selectedLang, setSelectedLang] = useState<Language>(() => {
    const saved = localStorage.getItem('selected_language');
    return (saved as Language) || 'French';
  });
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('selected_language', selectedLang);
  }, [selectedLang]);
  const [stats, setStats] = useState({
    level: 'Beginner 1' as UserLevel,
    totalTime: 0,
    progress: 0
  });
  const navigate = useNavigate();

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
          // Create initial profile
          const initialProfile = {
            id: user.id,
            total_time: 0,
            level_per_language: {
              English: 'Beginner 1',
              French: 'Beginner 1',
              Mandarin: 'Beginner 1',
              Spanish: 'Beginner 1'
            },
            settings: {
              voice_name: 'Kore',
              playback_speed: 1.0
            }
          };
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert(initialProfile)
            .select()
            .single();
          profile = newProfile;
        }

        if (profile) {
          const timeInSeconds = profile.total_time || 0;
          const totalMinutes = timeInSeconds / 60;
          const level = profile.level_per_language?.[selectedLang] || 'Beginner 1';
          
          // Calculate progress to next level
          let progress = 0;
          if (totalMinutes < 30) progress = (totalMinutes / 30) * 100;
          else if (totalMinutes < 45) progress = ((totalMinutes - 30) / (45 - 30)) * 100;
          else if (totalMinutes < 60) progress = ((totalMinutes - 45) / (60 - 45)) * 100;
          else if (totalMinutes < 90) progress = ((totalMinutes - 60) / (90 - 60)) * 100;
          else if (totalMinutes < 120) progress = ((totalMinutes - 90) / (120 - 90)) * 100;
          else if (totalMinutes < 150) progress = ((totalMinutes - 120) / (150 - 120)) * 100;
          else if (totalMinutes < 200) progress = ((totalMinutes - 150) / (200 - 150)) * 100;
          else if (totalMinutes < 250) progress = ((totalMinutes - 200) / (250 - 200)) * 100;
          else progress = 100;

          setStats({
            level,
            totalTime: timeInSeconds / 3600, // hours
            progress
          });
        }
      }
    };

    fetchStats();
  }, [selectedLang]);

  const startSession = (modeId: string) => {
    navigate(`/session/${modeId}?lang=${selectedLang}`);
  };

  const allLanguages: Language[] = [
    'English', 'French', 'Mandarin', 'Spanish'
  ].sort() as Language[];
  const apLanguages: Language[] = ['French', 'Spanish', 'Mandarin'];
  const availableLanguages = activeTab === 'ap' ? apLanguages : allLanguages;

  // Ensure selected language is valid for the current tab
  useEffect(() => {
    if (activeTab === 'ap' && !apLanguages.includes(selectedLang)) {
      setSelectedLang('French');
    }
  }, [activeTab]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl relative">
      <BloomingFlower className="absolute -top-10 -right-10 text-gold" size={120} delay={0.2} />
      <BloomingFlower className="absolute bottom-0 -left-10 text-petal" size={150} delay={0.5} />

      <header className="mb-12 flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FlowerLogo className="text-gold" size={28} />
            <h1 className="text-4xl font-serif font-bold">My Learning</h1>
          </div>
          <p className="text-dark/50">Practice French, Spanish, Mandarin, and English.</p>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-3 px-6 py-3 bg-white border border-beige-mid/20 rounded-2xl shadow-sm hover:shadow-md transition-all min-w-[180px] justify-between group"
          >
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-gold" />
              <span className="font-bold text-dark">{selectedLang}</span>
            </div>
            <ChevronDown size={18} className={cn("text-dark/30 transition-transform", isLangDropdownOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isLangDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsLangDropdownOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-full bg-white border border-beige-mid/20 rounded-2xl shadow-xl z-40 overflow-hidden"
                >
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedLang(lang);
                        setIsLangDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full px-6 py-3 text-left text-sm font-medium transition-colors hover:bg-beige/30",
                        selectedLang === lang ? "text-gold bg-beige/10" : "text-dark/70"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tabs */}
          <div className="flex gap-8 border-b border-beige-mid/30">
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                "pb-4 text-lg font-serif font-bold transition-all relative",
                activeTab === 'general' ? "text-dark" : "text-dark/30 hover:text-dark/50"
              )}
            >
              General Learning
              {activeTab === 'general' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 w-full h-1 bg-gold rounded-full" />}
            </button>
            {SHOW_PAID_FEATURES && (
              <button
                onClick={() => setActiveTab('ap')}
                className={cn(
                  "pb-4 text-lg font-serif font-bold transition-all relative",
                  activeTab === 'ap' ? "text-dark" : "text-dark/30 hover:text-dark/50"
                )}
              >
                AP Exam Prep
                {activeTab === 'ap' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 w-full h-1 bg-gold rounded-full" />}
              </button>
            )}
          </div>

          {/* Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(activeTab === 'general' ? generalModes : apModes).map((mode) => (
              <button
                key={mode.id}
                onClick={() => startSession(mode.id)}
                className="group p-6 bg-white rounded-3xl border border-beige-mid/20 hover:border-gold/30 hover:shadow-lg transition-all text-left flex flex-col h-full"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", mode.color)}>
                  {mode.icon}
                </div>
                <h3 className="text-xl font-serif font-bold mb-2">{mode.title}</h3>
                <p className="text-sm text-dark/50 mb-6 flex-1">{mode.desc}</p>
                <div className="flex items-center gap-2 text-gold font-bold text-sm">
                  Start Session <Play size={14} fill="currentColor" />
                </div>
              </button>
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
              Florir is a non-profit initiative dedicated to making high-quality language education accessible to everyone, everywhere.
            </p>
            {SHOW_PAID_FEATURES ? (
              <button className="w-full py-3 bg-white text-gold rounded-full font-bold text-sm hover:bg-beige transition-all">
                Upgrade Now
              </button>
            ) : (
              <button 
                onClick={() => navigate('/nonprofit')}
                className="w-full py-3 bg-white text-gold rounded-full font-bold text-sm hover:bg-beige transition-all shadow-md"
              >
                Learn More
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
