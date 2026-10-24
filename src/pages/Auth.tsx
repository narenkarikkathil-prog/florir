import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Detect mode from search params or hash tokens
  useEffect(() => {
    const hash = window.location.hash;
    const isReset = searchParams.get('reset') === 'true' || searchParams.get('mode') === 'reset' || hash.includes('type=recovery');
    const isForgot = searchParams.get('forgot') === 'true' || searchParams.get('mode') === 'forgot';
    const isSignUp = searchParams.get('signup') === 'true' || searchParams.get('mode') === 'signup';

    if (isReset) {
      setMode('reset');
    } else if (isForgot) {
      setMode('forgot');
    } else if (isSignUp) {
      setMode('signup');
    } else {
      setMode('login');
    }
  }, [searchParams]);

  // Listen for Supabase password recovery event
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
    }
  }, []);

  const switchMode = (newMode: AuthMode) => {
    setError(null);
    setSuccessMsg(null);
    setResetEmailSent(false);
    setMode(newMode);

    if (newMode === 'signup') {
      setSearchParams({ signup: 'true' });
    } else if (newMode === 'forgot') {
      setSearchParams({ forgot: 'true' });
    } else if (newMode === 'reset') {
      setSearchParams({ reset: 'true' });
    } else {
      setSearchParams({});
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setSuccessMsg('Account created! Please check your email for the confirmation link.');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/dashboard');
      } else if (mode === 'forgot') {
        const redirectUrl = `${window.location.origin}/auth?reset=true`;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: redirectUrl,
        });
        if (error) throw error;
        setResetEmailSent(true);
        setSuccessMsg(`We've sent a password reset link to ${email.trim()}.`);
      } else if (mode === 'reset') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { error } = await supabase.auth.updateUser({
          password,
        });
        if (error) throw error;

        setSuccessMsg('Your password has been successfully updated! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[40px] p-8 md:p-12 shadow-xl shadow-beige-mid/20 border border-beige-mid/10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold mb-2">
            {mode === 'signup' && 'Create Account'}
            {mode === 'login' && 'Welcome Back'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'New Password'}
          </h1>
          <p className="text-dark/50 text-sm">
            {mode === 'signup' && 'Start your language journey today.'}
            {mode === 'login' && 'Continue your speaking practice.'}
            {mode === 'forgot' && "Enter your email and we'll send you a recovery link."}
            {mode === 'reset' && 'Please choose a new, secure password for your account.'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-start gap-2.5"
          >
            <span className="text-red-500 font-bold">•</span>
            <span className="flex-1">{error}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-50 text-emerald-800 text-sm rounded-2xl border border-emerald-100 flex items-start gap-2.5"
          >
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="flex-1">{successMsg}</span>
          </motion.div>
        )}

        {/* Forgot password success state */}
        {mode === 'forgot' && resetEmailSent ? (
          <div className="space-y-6">
            <div className="p-6 bg-beige/30 rounded-3xl border border-beige-mid/20 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-gold/10 text-gold flex items-center justify-center">
                <Mail size={24} />
              </div>
              <p className="text-sm text-dark/70 leading-relaxed">
                Check your inbox! Follow the link in the email to set a new password. If you don't see it within a couple minutes, check your spam folder.
              </p>
            </div>

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full py-4 bg-gold text-cream rounded-full font-bold text-base hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Full Name (Sign Up only) */}
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/30" size={20} />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-beige/20 border border-beige-mid/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all text-sm"
                />
              </div>
            )}

            {/* Email (Login, Sign Up, Forgot) */}
            {mode !== 'reset' && (
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/30" size={20} />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-beige/20 border border-beige-mid/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all text-sm"
                />
              </div>
            )}

            {/* Password (Login, Sign Up, Reset) */}
            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/30" size={20} />
                  <input
                    type="password"
                    placeholder={mode === 'reset' ? 'New Password (min 6 characters)' : 'Password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-beige/20 border border-beige-mid/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all text-sm"
                  />
                </div>

                {/* Forgot Password link in Login mode */}
                {mode === 'login' && (
                  <div className="flex justify-end pt-0.5 pr-1">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-gold hover:text-gold/80 hover:underline font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password (Reset mode only) */}
            {mode === 'reset' && (
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/30" size={20} />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-beige/20 border border-beige-mid/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all text-sm"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full py-4 bg-gold text-cream rounded-full font-bold text-base hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? (
                <span>Processing...</span>
              ) : mode === 'signup' ? (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              ) : mode === 'login' ? (
                <>
                  <span>Login</span>
                  <ArrowRight size={18} />
                </>
              ) : mode === 'forgot' ? (
                <>
                  <span>Send Reset Link</span>
                  <Mail size={18} />
                </>
              ) : (
                <>
                  <span>Update Password</span>
                  <CheckCircle2 size={18} />
                </>
              )}
            </button>

            {mode === 'signup' && (
              <p className="text-xs text-center text-dark/40 mt-3">
                By signing up, you agree to our{' '}
                <a href="/terms" className="underline hover:text-gold transition-colors">
                  Terms and Conditions
                </a>
                .
              </p>
            )}
          </form>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 text-center text-sm text-dark/50">
          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1.5 text-gold font-bold hover:underline"
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
          ) : mode === 'reset' ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1.5 text-gold font-bold hover:underline"
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
          ) : mode === 'signup' ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-gold font-bold hover:underline"
              >
                Login
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-gold font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
