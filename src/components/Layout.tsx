import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Menu, X, Globe, Settings, ArrowRight } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';
import SettingsModal from './SettingsModal';

import { FlowerLogo, BloomingFlower } from './FlowerLogo';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    navigate('/');
  };

  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-cream relative overflow-hidden">
      {/* Background Blooming Flowers — hidden on mobile to prevent overflow */}
      <BloomingFlower className="absolute -top-10 -left-10 text-gold hidden md:block" size={120} delay={0.2} />
      <BloomingFlower className="absolute top-1/4 -right-10 text-petal hidden md:block" size={180} delay={0.5} />
      <BloomingFlower className="absolute bottom-1/4 -left-10 text-leaf hidden md:block" size={140} delay={0.8} />
      <BloomingFlower className="absolute -bottom-10 -right-10 text-gold hidden md:block" size={160} delay={1.1} />

      <header className={cn(
        "sticky top-0 z-50 w-full border-b border-beige-mid/30 bg-cream/80 backdrop-blur-md transition-all",
        isLanding ? "bg-transparent border-transparent" : "bg-cream/80"
      )}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 group">
            <FlowerLogo className="text-gold" size={32} />
            <span className="font-serif text-2xl font-bold tracking-tight text-dark">Orati</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium text-dark/70 hover:text-gold transition-colors">Dashboard</Link>
                <div className="flex items-center gap-4 pl-4 border-l border-beige-mid/30">
                  <span className="text-xs text-dark/50 font-medium">{user.email}</span>
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 hover:bg-beige rounded-full transition-colors text-dark/70"
                    title="Settings"
                  >
                    <Settings size={18} />
                  </button>
                  <button 
                    onClick={handleSignOut}
                    className="p-2 hover:bg-beige rounded-full transition-colors text-dark/70"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/#pricing" className="text-sm font-medium text-dark/70 hover:text-gold transition-colors">Pricing</Link>
                <Link to="/auth" className="text-sm font-medium text-dark/70 hover:text-gold transition-colors">Login</Link>
                <Link 
                  to="/auth?signup=true" 
                  className="px-5 py-2 bg-gold text-cream rounded-full text-sm font-bold hover:bg-gold/90 transition-all shadow-sm animate-bloom"
                >
                  Start Free
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-dark" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-cream border-b border-beige-mid shadow-lg p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium p-2">Dashboard</Link>
                <button onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }} className="text-lg font-medium p-2 text-left">Settings</button>
                <button onClick={handleSignOut} className="text-lg font-medium p-2 text-left text-red-500">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium p-2">Login</Link>
                <Link to="/auth?signup=true" onClick={() => setIsMenuOpen(false)} className="bg-gold text-cream p-3 rounded-xl text-center font-bold">Start Free</Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <footer className="bg-beige py-12 border-t border-beige-mid/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <FlowerLogo className="text-gold" size={24} />
                <span className="font-serif text-xl font-bold tracking-tight">Orati</span>
              </div>
              <p className="text-dark/60 max-w-sm text-sm leading-relaxed">
                A speech-first language learning platform dedicated to helping you master French and Spanish through real-time AI conversations.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-dark/40">Languages</h4>
              <ul className="space-y-2 text-sm text-dark/70">
                <li>French</li>
                <li>Spanish</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-dark/40">Mission</h4>
              <p className="text-xs text-dark/60 leading-relaxed mb-4">
                Orati is a non-profit initiative dedicated to making high-quality language education accessible to everyone, everywhere.
              </p>
              <Link to="/nonprofit" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
                Learn More <ArrowRight size={12} />
              </Link>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-beige-mid/20 text-center text-xs text-dark/40">
            © {new Date().getFullYear()} Orati. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
