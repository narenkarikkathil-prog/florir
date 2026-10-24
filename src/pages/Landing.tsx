import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mic, Globe, Zap, Heart, CheckCircle2, ArrowRight } from 'lucide-react';

import { FlowerLogo, BloomingFlower } from '@/src/components/FlowerLogo';

const languages = [
  { name: 'French', icon: <Globe size={14} className="text-blue-500" /> },
  { name: 'Spanish', icon: <Globe size={14} className="text-red-500" /> },
  { name: 'Mandarin', icon: <Globe size={14} className="text-amber-500" /> },
  { name: 'Italian', icon: <Globe size={14} className="text-emerald-500" /> },
  { name: 'German', icon: <Globe size={14} className="text-yellow-600" /> },
  { name: 'Hindi', icon: <Globe size={14} className="text-orange-500" /> },
  { name: 'Arabic', icon: <Globe size={14} className="text-teal-600" /> },
  { name: 'Russian', icon: <Globe size={14} className="text-indigo-500" /> },
  { name: 'Farsi (Persian)', icon: <Globe size={14} className="text-rose-500" /> },
  { name: 'Thai', icon: <Globe size={14} className="text-cyan-600" /> },
  { name: 'Urdu', icon: <Globe size={14} className="text-green-600" /> },
  { name: 'Tagalog (Filipino)', icon: <Globe size={14} className="text-sky-500" /> },
  { name: 'Serbian, Croatian & Bosnian', icon: <Globe size={14} className="text-purple-600" /> },
  { name: 'Malayalam', icon: <Globe size={14} className="text-lime-600" /> },
];

const modes = [
  {
    title: 'Situational Speaking',
    desc: 'Roleplay real-world scenarios like ordering coffee in Paris or checking into a hotel in Madrid.',
    icon: <Mic className="text-gold" size={24} />,
  },
  {
    title: 'Deep Listening',
    desc: 'Interactive listening exercises with real-time feedback and badge rewards.',
    icon: <Zap className="text-gold" size={24} />,
  },
  {
    title: 'Open Debate',
    desc: 'Speak freely on any topic and get instant grammar and pronunciation corrections.',
    icon: <Globe className="text-gold" size={24} />,
  },
];

export default function Landing() {
  return (
    <div className="overflow-hidden relative">
      {/* Decorative Blooming Flowers — hidden on mobile */}
      <BloomingFlower className="absolute top-20 left-10 text-gold hidden md:block" size={100} delay={0.2} />
      <BloomingFlower className="absolute top-1/3 right-10 text-petal hidden md:block" size={150} delay={0.5} />
      <BloomingFlower className="absolute bottom-1/3 left-20 text-leaf hidden md:block" size={120} delay={0.8} />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-4">
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-beige rounded-full text-gold font-bold text-xs mb-8 tracking-widest uppercase"
            >
              <FlowerLogo size={14} /> AI-Powered Language Mastery
            </motion.div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif font-bold text-dark mb-6 leading-tight">
              Learn by <span className="font-cursive text-gold text-4xl sm:text-6xl md:text-8xl inline-block mx-1 sm:mx-2 relative top-1 sm:top-2">
                {"blooming".split("").map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.4, delay: 1 + i * 0.1 }}
                  >
                    {char}
                  </motion.span>
                ))}
              </span> into<br />new conversations.
            </h1>
            <p className="text-lg md:text-xl text-dark/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              The first audio-first platform that uses real-time AI to help you master languages through natural conversation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth?signup=true"
                className="w-full sm:w-auto px-8 py-4 bg-gold text-cream rounded-full font-bold text-lg hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2 group animate-bloom"
              >
                Start Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/demo"
                className="w-full sm:w-auto px-8 py-4 bg-beige text-dark rounded-full font-bold text-lg hover:bg-beige-mid/50 transition-all"
              >
                See it in action
              </Link>
            </div>

            <div className="mt-16 flex flex-wrap justify-center gap-3">
              {languages.map((lang) => (
                <div key={lang.name} className="px-4 py-2 bg-white/50 border border-beige-mid/30 rounded-full flex items-center gap-2 text-sm font-medium shadow-sm">
                  {lang.icon}
                  <span>{lang.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-3xl -z-10" />
      </section>

      {/* Modes Section */}
      <section className="py-24 bg-beige/30 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-serif font-bold mb-4">Master Every Scenario</h2>
            <p className="text-dark/60 max-w-xl mx-auto">Choose from specialized modes designed to build confidence and fluency.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {modes.map((mode, i) => (
              <motion.div
                key={mode.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-cream p-8 rounded-3xl border border-beige-mid/20 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-beige rounded-2xl flex items-center justify-center mb-6">
                  {mode.icon}
                </div>
                <h3 className="text-2xl font-serif font-bold mb-3">{mode.title}</h3>
                <p className="text-dark/60 leading-relaxed">{mode.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-beige-mid/20">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-dark/35">
          <div className="flex items-center gap-2">
            <FlowerLogo size={14} className="text-gold/60" />
            <span>© {new Date().getFullYear()} Orati — Non-Profit Language Learning</span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <Link to="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gold transition-colors">Terms of Service</Link>
            <Link to="/nonprofit" className="hover:text-gold transition-colors">Our Mission</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
