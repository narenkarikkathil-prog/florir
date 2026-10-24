import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Language } from '@/src/types';

interface LanguageMeta {
  native: string;
  color: string;
}

const LANGUAGE_META: Record<string, LanguageMeta> = {
  'Arabic': { native: 'العربية', color: 'text-teal-600 bg-teal-50' },
  'Bosnian': { native: 'Bosanski', color: 'text-violet-600 bg-violet-50' },
  'Croatian': { native: 'Hrvatski', color: 'text-blue-600 bg-blue-50' },
  'Farsi (Persian)': { native: 'فارسی', color: 'text-rose-600 bg-rose-50' },
  'French': { native: 'Français', color: 'text-blue-600 bg-blue-50' },
  'German': { native: 'Deutsch', color: 'text-amber-700 bg-amber-50' },
  'Hindi': { native: 'हिन्दी', color: 'text-orange-600 bg-orange-50' },
  'Italian': { native: 'Italiano', color: 'text-emerald-600 bg-emerald-50' },
  'Malayalam': { native: 'മലയാളം', color: 'text-lime-700 bg-lime-50' },
  'Mandarin': { native: '普通话', color: 'text-amber-600 bg-amber-50' },
  'Russian': { native: 'Русский', color: 'text-indigo-600 bg-indigo-50' },
  'Serbian': { native: 'Српски', color: 'text-indigo-600 bg-indigo-50' },
  'Serbian, Croatian, and Bosnian': { native: 'Bosanski / Hrvatski / Srpski', color: 'text-purple-600 bg-purple-50' },
  'Spanish': { native: 'Español', color: 'text-red-600 bg-red-50' },
  'Tagalog (Filipino)': { native: 'Tagalog', color: 'text-sky-600 bg-sky-50' },
  'Thai': { native: 'ไทย', color: 'text-cyan-700 bg-cyan-50' },
  'Urdu': { native: 'اردو', color: 'text-green-700 bg-green-50' },
};

interface LanguageSelectorProps {
  selectedLang: Language;
  onSelectLang: (lang: Language) => void;
  availableLanguages: Language[];
  className?: string;
}

export default function LanguageSelector({
  selectedLang,
  onSelectLang,
  availableLanguages,
  className
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Lock body scroll on mobile when sheet is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!sheetRef.current || !sheetRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const timer = setTimeout(() => {
        if (window.innerWidth < 768) {
          mobileSearchRef.current?.focus();
        } else {
          desktopSearchRef.current?.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return availableLanguages;
    const query = searchQuery.toLowerCase().trim();
    return availableLanguages.filter(lang => {
      const meta = LANGUAGE_META[lang];
      const matchName = lang.toLowerCase().includes(query);
      const matchNative = meta?.native.toLowerCase().includes(query);
      return matchName || matchNative;
    });
  }, [availableLanguages, searchQuery]);

  const handleSelect = (lang: Language) => {
    onSelectLang(lang);
    setIsOpen(false);
  };

  const selectedMeta = LANGUAGE_META[selectedLang];

  return (
    <div ref={containerRef} className={cn("relative w-full sm:w-auto", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Current language: ${selectedLang}. Tap to switch language.`}
        className={cn(
          "flex items-center gap-3 px-5 py-3.5 bg-white border border-beige-mid/30 rounded-2xl shadow-sm",
          "hover:shadow-md hover:border-gold/40 transition-all w-full sm:w-auto min-w-[210px] justify-between group",
          isOpen && "ring-2 ring-gold/20 border-gold/50"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center transition-colors", selectedMeta?.color || "text-gold bg-gold/10")}>
            <Globe size={16} />
          </div>
          <div className="text-left">
            <span className="font-bold text-dark block leading-tight text-sm sm:text-base">{selectedLang}</span>
            {selectedMeta?.native && (
              <span className="text-[11px] text-dark/40 block leading-tight font-normal">{selectedMeta.native}</span>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "text-dark/40 transition-transform duration-200 group-hover:text-gold shrink-0 ml-2",
            isOpen && "rotate-180 text-gold"
          )}
        />
      </button>

      {/* Desktop Dropdown (hidden on mobile via CSS, shown on md:) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="hidden md:flex absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md border border-beige-mid/30 rounded-2xl shadow-2xl z-50 overflow-hidden flex-col"
          >
            {/* Search Header */}
            <div className="p-3 border-b border-beige-mid/20 bg-cream/40">
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3 text-dark/40 pointer-events-none" />
                <input
                  ref={desktopSearchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search languages..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-beige-mid/30 rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-dark placeholder:text-dark/40"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-1 text-dark/30 hover:text-dark rounded-full"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Language List */}
            <div className="max-h-80 overflow-y-auto overscroll-contain p-1.5 divide-y divide-beige-mid/10">
              {filteredLanguages.length === 0 ? (
                <div className="py-8 text-center text-xs text-dark/40">
                  No languages matching "{searchQuery}"
                </div>
              ) : (
                filteredLanguages.map((lang) => {
                  const isSelected = selectedLang === lang;
                  const meta = LANGUAGE_META[lang];
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleSelect(lang)}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between group",
                        isSelected
                          ? "bg-gold/10 text-gold font-bold shadow-xs"
                          : "text-dark/70 hover:bg-beige/30 hover:text-dark"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-colors",
                          meta?.color || "text-gold bg-gold/10"
                        )}>
                          <Globe size={13} />
                        </div>
                        <div>
                          <span className="block leading-tight">{lang}</span>
                          {meta?.native && (
                            <span className={cn(
                              "text-[11px] block leading-tight font-normal",
                              isSelected ? "text-gold/70" : "text-dark/40"
                            )}>
                              {meta.native}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                          <Check size={12} className="text-gold" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Sheet (shown on mobile via CSS, hidden on md:) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div ref={sheetRef} className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-dark/40 backdrop-blur-xs"
              />

              {/* Bottom Sheet Modal */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="relative z-10 bg-cream rounded-t-[32px] border-t border-beige-mid/40 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
              >
                {/* Drag Handle Bar */}
                <div className="pt-3 pb-2 flex justify-center">
                  <div className="w-12 h-1.5 bg-dark/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-3 pt-1 flex items-center justify-between border-b border-beige-mid/20">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-dark">Select Language</h3>
                    <p className="text-xs text-dark/50">Choose which language you want to practice</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close language selector"
                    className="p-2 text-dark/40 hover:text-dark hover:bg-beige rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-beige-mid/20 bg-white/40">
                  <div className="relative flex items-center">
                    <Search size={18} className="absolute left-3.5 text-dark/40 pointer-events-none" />
                    <input
                      ref={mobileSearchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search languages..."
                      className="w-full pl-10 pr-9 py-3 text-sm bg-white border border-beige-mid/30 rounded-2xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-dark placeholder:text-dark/40 shadow-xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-3 p-1.5 text-dark/40 hover:text-dark rounded-full bg-beige-mid/20"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable Language List */}
                <div className="overflow-y-auto overscroll-contain p-4 space-y-1.5 max-h-[55vh] pb-8">
                  {filteredLanguages.length === 0 ? (
                    <div className="py-12 text-center text-sm text-dark/40">
                      No languages found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredLanguages.map((lang) => {
                      const isSelected = selectedLang === lang;
                      const meta = LANGUAGE_META[lang];
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleSelect(lang)}
                          className={cn(
                            "w-full px-4 py-3.5 rounded-2xl text-left transition-all flex items-center justify-between border",
                            isSelected
                              ? "bg-white border-gold/40 shadow-sm text-gold"
                              : "bg-white/60 border-beige-mid/20 text-dark hover:bg-white hover:border-beige-mid/40 active:scale-[0.99]"
                          )}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-2xs",
                              meta?.color || "text-gold bg-gold/10"
                            )}>
                              <Globe size={18} />
                            </div>
                            <div>
                              <div className={cn("font-medium text-base leading-tight", isSelected && "font-bold")}>
                                {lang}
                              </div>
                              {meta?.native && (
                                <div className={cn(
                                  "text-xs leading-tight mt-0.5",
                                  isSelected ? "text-gold/70" : "text-dark/40"
                                )}>
                                  {meta.native}
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected ? (
                            <div className="w-7 h-7 rounded-full bg-gold text-cream flex items-center justify-center shadow-xs">
                              <Check size={16} strokeWidth={2.5} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-dark/10" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
