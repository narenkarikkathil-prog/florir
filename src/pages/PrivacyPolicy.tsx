import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Shield } from 'lucide-react';
import { FlowerLogo } from '@/src/components/FlowerLogo';

const LAST_UPDATED = 'May 5, 2026';
const CONTACT_EMAIL = 'tutoriq26@gmail.com';

const sections = [
  {
    title: '1. Who We Are',
    body: `Orati is a non-profit language learning platform ("we," "us," or "our") that uses AI-powered conversation to help students master French and Spanish. We are committed to protecting your personal information and being transparent about what we collect and why.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect the following types of information when you use Orati:

**Account Information:** When you create an account, we collect your email address and a hashed password. We do not store plain-text passwords.

**Learning Data:** We store your session history, practice scores, AP conversation results, vocabulary progress, and language level — all used solely to personalize your learning experience.

**Audio Data:** During speaking sessions, your microphone audio is processed in real time by Google's Gemini API to generate feedback. Audio is streamed directly to the API and is not stored on our servers or in our database. We do not retain recordings of your voice.

**Usage Data:** We collect basic usage information such as session timestamps and feature interactions to understand how the platform is being used and to improve it.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use the information we collect to:

• Provide and improve the Orati learning platform
• Personalize your learning path and track your progress
• Process real-time AI feedback on your spoken responses
• Communicate with you about your account or important updates
• Ensure the security and integrity of our platform

We do not sell, rent, or share your personal information with third parties for marketing purposes.`,
  },
  {
    title: '4. Third-Party Services',
    body: `Orati uses the following third-party services to operate:

**Supabase:** We use Supabase to store your account and learning data in a hosted PostgreSQL database. Data is encrypted at rest and in transit. See Supabase's Privacy Policy at supabase.com/privacy.

**Google Gemini API:** Your spoken audio and text inputs are processed by Google's Gemini API to generate feedback and conversation responses. Please review Google's Privacy Policy at policies.google.com/privacy.

**Vercel / Hosting Provider:** Our web application is hosted on cloud infrastructure. Server access logs may be retained for security purposes.

We take care to choose providers that maintain strong privacy and security standards.`,
  },
  {
    title: '5. Data Storage & Security',
    body: `Your data is stored in Supabase infrastructure, which uses industry-standard encryption (AES-256 at rest, TLS 1.2+ in transit). We enforce Row-Level Security (RLS) policies so that each user can only access their own data.

We retain your account and learning data for as long as your account is active. You may request deletion of your account and all associated data at any time by contacting us.`,
  },
  {
    title: '6. Children\'s Privacy',
    body: `Orati is used by students of all ages, including minors. We do not knowingly collect personal information from children under 13 without verified parental consent. If you are a parent or guardian and believe your child has provided us personal information without your consent, please contact us at ${CONTACT_EMAIL} and we will promptly delete it.

We do not display advertising, we do not sell data, and we design our platform with student privacy as a core principle.`,
  },
  {
    title: '7. Your Rights',
    body: `Depending on your location, you may have rights including:

• **Access:** Request a copy of the data we hold about you
• **Correction:** Ask us to correct inaccurate data
• **Deletion:** Request that we delete your account and all associated data
• **Portability:** Request your learning data in a portable format
• **Opt-out:** Opt out of any non-essential data processing

To exercise any of these rights, email us at ${CONTACT_EMAIL}. We will respond within 30 days.`,
  },
  {
    title: '8. Cookies',
    body: `Orati uses minimal, functional cookies and browser local storage to keep you signed in and remember your language preferences (e.g., French vs. Spanish). We do not use tracking cookies, advertising pixels, or third-party analytics cookies.`,
  },
  {
    title: '9. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. If the changes are significant, we will notify you via the email associated with your account.

Continued use of Orati after changes take effect constitutes your acceptance of the revised policy.`,
  },
  {
    title: '10. Contact Us',
    body: `If you have any questions, concerns, or requests about this Privacy Policy or your data, please contact us at:\n\n**Email:** ${CONTACT_EMAIL}\n\nAs a non-profit, we are a small team and genuinely care about getting this right. We will do our best to respond promptly.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-dark/40 hover:text-dark/70 transition-colors text-sm font-bold mb-8">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center">
              <Shield size={22} className="text-gold" />
            </div>
            <FlowerLogo size={24} className="text-gold" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-3">Privacy Policy</h1>
          <p className="text-dark/40 text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-dark/60 mt-4 leading-relaxed max-w-xl">
            Your privacy matters to us. This policy explains what information Orati collects, how we use it, and what rights you have over your data.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-3xl border border-beige-mid/20 p-7 shadow-sm"
            >
              <h2 className="text-lg font-serif font-bold mb-4 text-dark">{section.title}</h2>
              <div className="text-dark/65 text-sm leading-relaxed space-y-3">
                {section.body.split('\n\n').map((para, j) => (
                  <p key={j} className="whitespace-pre-line">
                    {para.split(/(\*\*[^*]+\*\*)/).map((chunk, k) =>
                      chunk.startsWith('**') && chunk.endsWith('**')
                        ? <strong key={k} className="font-bold text-dark/80">{chunk.slice(2, -2)}</strong>
                        : chunk
                    )}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center space-y-3">
          <p className="text-xs text-dark/30">This policy applies to orati.app and all associated services.</p>
          <div className="flex items-center justify-center gap-4 text-xs text-dark/40">
            <Link to="/terms" className="hover:text-gold transition-colors font-bold">Terms of Service</Link>
            <span>·</span>
            <Link to="/" className="hover:text-gold transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
