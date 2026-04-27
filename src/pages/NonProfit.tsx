import React from 'react';
import { motion } from 'motion/react';
import { Heart, ShieldCheck, DollarSign, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FlowerLogo, BloomingFlower } from '@/src/components/FlowerLogo';

export default function NonProfit() {
  return (
    <div className="min-h-screen bg-cream relative overflow-hidden pt-20 pb-32">
      {/* Background Decorations */}
      <BloomingFlower className="absolute top-20 -left-10 text-gold" size={150} delay={0.2} />
      <BloomingFlower className="absolute bottom-20 -right-10 text-petal" size={200} delay={0.5} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-beige rounded-full text-gold font-bold text-xs mb-8 tracking-widest uppercase">
              <Heart size={14} /> Our Mission
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-dark mb-6 leading-tight">
              A Mission to <span className="text-gold italic">Connect</span>,<br />Not to Profit.
            </h1>
            <p className="text-lg md:text-xl text-dark/60 max-w-2xl mx-auto leading-relaxed">
              Orati is built on the belief that language learning should be accessible to everyone. We operate as a non-profit framing, where every dollar goes directly to covering AI costs.
            </p>
          </motion.div>
        </div>

        {/* Core Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-gold/10 text-gold rounded-[30px] flex items-center justify-center mx-auto mb-8">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">100% Transparency</h3>
            <p className="text-dark/60 text-sm leading-relaxed">
              We publish our operational costs. You know exactly where your contributions go—straight to the AI infrastructure that powers your learning.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-gold/10 text-gold rounded-[30px] flex items-center justify-center mx-auto mb-8">
              <DollarSign size={40} />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">$0 Profit Model</h3>
            <p className="text-dark/60 text-sm leading-relaxed">
              No shareholders, no venture capital, no profit motives. Our goal is to break even and keep the lights on for our global community.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-gold/10 text-gold rounded-[30px] flex items-center justify-center mx-auto mb-8">
              <Users size={40} />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">Community Driven</h3>
            <p className="text-dark/60 text-sm leading-relaxed">
              Orati is built by language lovers, for language lovers. Your feedback and support directly shape the future of the platform.
            </p>
          </motion.div>
        </div>

        {/* Detailed Explanation */}
        <div className="bg-white rounded-[60px] p-10 md:p-20 border border-beige-mid/20 shadow-xl mb-32 relative overflow-hidden">
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark mb-10 text-center">Why Non-Profit?</h2>
            <div className="space-y-8 text-lg text-dark/70 leading-relaxed">
              <p>
                Real-time AI processing is expensive. Most platforms charge high subscription fees to generate profit margins. We chose a different path.
              </p>
              <p>
                By operating as a non-profit framing, we can offer high-quality, real-time AI conversations at a fraction of the cost. We believe that the ability to communicate across cultures is a fundamental human right, not a luxury.
              </p>
              <div className="bg-beige/20 p-8 rounded-3xl border border-gold/10">
                <h4 className="text-gold font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} /> Our Commitment
                </h4>
                <ul className="space-y-4">
                  {[
                    "No data selling. Your conversations are yours.",
                    "No advertisements. Ever.",
                    "Open-source spirit in our development.",
                    "Fair access for learners in all economic regions."
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-dark/80">
                      <CheckCircle2 className="text-gold" size={18} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          {/* Decorative Flower */}
          <FlowerLogo className="absolute -bottom-10 -right-10 text-gold/5" size={300} />
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="text-3xl font-serif font-bold text-dark mb-8">Help us keep blooming.</h3>
          <Link
            to="/auth?signup=true"
            className="inline-flex items-center gap-2 px-10 py-5 bg-gold text-cream rounded-full font-bold text-xl hover:bg-gold/90 transition-all shadow-xl shadow-gold/20 group"
          >
            Join the Community <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
