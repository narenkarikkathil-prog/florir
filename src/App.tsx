/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import APSession from './pages/APSession';
import VocabSession from './pages/VocabSession';
import EssayTips from './pages/EssayTips';
import AdminAudioUpload from './pages/AdminAudioUpload';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Demo from './pages/Demo';
import NonProfit from './pages/NonProfit';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/nonprofit" element={<NonProfit />} />
          <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />

          {/* AP Modes */}
          <Route path="/session/ap-simulated" element={user ? <APSession mode="ap-simulated" /> : <Navigate to="/auth" />} />
          <Route path="/session/ap-speaking" element={user ? <APSession mode="ap-speaking" /> : <Navigate to="/auth" />} />

          {/* Vocabulary Practice */}
          <Route path="/session/vocabulary" element={user ? <VocabSession /> : <Navigate to="/auth" />} />

          {/* Essay Writing Tips */}
          <Route path="/essay-tips" element={user ? <EssayTips /> : <Navigate to="/auth" />} />

          {/* Admin — Audio Upload (not linked from nav) */}
          <Route path="/admin/audio-upload" element={<AdminAudioUpload />} />

          {/* Legal */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* General session catch-all */}
          <Route path="/session/:mode" element={user ? <Session /> : <Navigate to="/auth" />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}
