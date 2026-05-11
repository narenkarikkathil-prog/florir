import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, FileText } from 'lucide-react';
import { FlowerLogo } from '@/src/components/FlowerLogo';

const LAST_UPDATED = 'May 5, 2026';
const CONTACT_EMAIL = 'tutoriq26@gmail.com';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By creating an account or using the Orati platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.

Orati is operated as a non-profit educational initiative. Our goal is to make high-quality language education accessible to everyone, everywhere.`,
  },
  {
    title: '2. Eligibility',
    body: `You may use Orati if:

• You are 13 years of age or older, or have verifiable parental or guardian consent if under 13
• You are not prohibited from using the Service under applicable law
• You will comply with these Terms and all applicable local, national, and international laws

If you are using Orati as part of a school or educational program, your institution may have additional policies that apply.`,
  },
  {
    title: '3. Your Account',
    body: `When you create an account, you agree to:

• Provide accurate and complete information
• Maintain the security of your password and account
• Notify us immediately of any unauthorized access at ${CONTACT_EMAIL}
• Accept responsibility for all activity that occurs under your account

You may not create accounts on behalf of others without their consent or use another person's account without permission.`,
  },
  {
    title: '4. Permitted Use',
    body: `Orati grants you a limited, non-exclusive, non-transferable, revocable license to use the Service for personal, non-commercial educational purposes.

You agree NOT to:

• Use the Service for any unlawful purpose
• Attempt to reverse engineer, copy, or resell any part of the platform
• Upload harmful, abusive, or inappropriate content via speaking sessions
• Attempt to bypass, damage, or disrupt our systems or security measures
• Use automated tools (bots, scrapers) to access the Service
• Impersonate Orati staff, teachers, or other users`,
  },
  {
    title: '5. AI-Powered Features',
    body: `Orati uses artificial intelligence, including Google's Gemini API, to provide real-time language feedback. You understand and agree that:

• AI feedback is provided for educational purposes and may not be perfectly accurate
• AI-generated scores and comments are not official academic assessments
• Orati does not guarantee specific learning outcomes
• Your voice and text inputs are processed by third-party AI services as described in our Privacy Policy

The AI is designed to be encouraging and supportive. However, no AI system is infallible — please treat feedback as guidance, not judgment.`,
  },
  {
    title: '6. Audio & Microphone Access',
    body: `Many features of Orati require access to your device's microphone. By enabling microphone access, you understand that:

• Audio is processed in real time to generate language feedback
• Audio is not recorded or stored by Orati on our servers
• Audio is transmitted to Google's Gemini API for processing; Google's own terms and privacy policies apply to that processing
• You may revoke microphone access at any time through your browser settings, though this will disable speaking features`,
  },
  {
    title: '7. Intellectual Property',
    body: `All content on Orati — including lesson content, UI design, essay tips, conversation scripts, vocabulary questions, and the Orati name and logo — is owned by Orati or its contributors and is protected by applicable intellectual property laws.

You may not reproduce, distribute, or create derivative works from our content without explicit written permission.

Any feedback, suggestions, or ideas you share with us about improving Orati may be used by us freely and without obligation to you.`,
  },
  {
    title: '8. Non-Profit Status & Payments',
    body: `Orati is operated as a non-profit initiative. If we accept voluntary supporter contributions or donations, these are used exclusively to cover operating costs — including AI API costs, hosting, and infrastructure. We take no profit.

All contributions are voluntary and non-refundable unless we state otherwise at the time of the transaction. We will always maintain a free tier of access.`,
  },
  {
    title: '9. Disclaimer of Warranties',
    body: `The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied. We do not warrant that:

• The Service will be uninterrupted, timely, or error-free
• AI feedback will be perfectly accurate or appropriate for all learning contexts
• The Service will meet your specific educational requirements

To the fullest extent permitted by law, Orati disclaims all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.`,
  },
  {
    title: '10. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, Orati and its team members shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of data, loss of learning progress, or service interruption — arising from your use of the Service.

Because Orati is a non-profit operated by a small team, our total liability to you for any claims arising from use of the Service is limited to $0 USD (i.e., we provide the Service free of charge with no warranty).`,
  },
  {
    title: '11. Termination',
    body: `We reserve the right to suspend or terminate your account at any time if you violate these Terms, abuse the platform, or engage in behaviour that harms other users or the integrity of the Service.

You may delete your account at any time by contacting us at ${CONTACT_EMAIL}. Upon deletion, your learning data will be removed from our active systems.`,
  },
  {
    title: '12. Changes to These Terms',
    body: `We may update these Terms from time to time. When we do, we will update the "Last updated" date and, for significant changes, notify you via the email associated with your account.

Continued use of Orati after updated Terms take effect constitutes your acceptance of the revised Terms.`,
  },
  {
    title: '13. Governing Law',
    body: `These Terms are governed by the laws of the United States. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts located in the applicable jurisdiction.`,
  },
  {
    title: '14. Contact',
    body: `If you have questions about these Terms, please reach out to us:\n\n**Email:** ${CONTACT_EMAIL}\n\nWe are a small, mission-driven team and we're happy to answer any questions you have.`,
  },
];

export default function TermsOfService() {
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
              <FileText size={22} className="text-gold" />
            </div>
            <FlowerLogo size={24} className="text-gold" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-3">Terms of Service</h1>
          <p className="text-dark/40 text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-dark/60 mt-4 leading-relaxed max-w-xl">
            Please read these terms carefully before using Orati. By using the platform, you agree to these terms.
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
          <p className="text-xs text-dark/30">These terms apply to orati.app and all associated services.</p>
          <div className="flex items-center justify-center gap-4 text-xs text-dark/40">
            <Link to="/privacy" className="hover:text-gold transition-colors font-bold">Privacy Policy</Link>
            <span>·</span>
            <Link to="/" className="hover:text-gold transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
