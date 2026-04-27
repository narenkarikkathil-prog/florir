import React from 'react';
import { motion } from 'motion/react';
import { Play, Mic, MessageSquare, Zap, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FlowerLogo, BloomingFlower } from '@/src/components/FlowerLogo';

export default function Demo() {
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
              <Play size={14} /> Product Showcase
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-dark mb-6 leading-tight">
              See Orati in <span className="text-gold italic">Action</span>.
            </h1>
            <p className="text-lg md:text-xl text-dark/60 max-w-2xl mx-auto leading-relaxed">
              Experience the future of language learning. No more tapping on screens—just natural, real-time conversation with AI that understands you.
            </p>
          </motion.div>
        </div>

        {/* Demo Video/Interface Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-[16/10] bg-[#FDFBF7] rounded-[40px] shadow-2xl overflow-hidden border-8 border-white/10 relative p-8 flex flex-col gap-6">
              {/* Mock UI Header */}
              <div className="flex justify-between items-center">
                <div className="w-32 h-4 bg-beige rounded-full opacity-20" />
                <div className="flex gap-2">
                  <div className="w-4 h-4 bg-gold/20 rounded-full" />
                  <div className="w-4 h-4 bg-gold/20 rounded-full" />
                </div>
              </div>

              <div className="flex-1 flex gap-6 relative">
                {/* Left Side: Mic and Accuracy */}
                <div className="w-1/3 flex flex-col justify-between py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 bg-gold/20 rounded-full flex items-center justify-center text-gold relative">
                      <div className="absolute inset-0 bg-gold/10 rounded-full animate-ping" />
                      <Mic size={40} />
                    </div>
                    <div className="text-dark/40 font-serif italic text-sm">I'm listening...</div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-beige-mid/10">
                    <div className="text-[10px] font-bold text-dark/30 uppercase tracking-widest mb-1">Live Accuracy</div>
                    <div className="text-3xl font-serif font-bold text-dark">50%</div>
                  </div>
                </div>

                {/* Right Side: Transcript and Correction */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="bg-white p-6 rounded-[32px] shadow-lg border border-beige-mid/10 flex-1 flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-serif font-bold text-lg">Transcript</h4>
                      <div className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100">TRY AGAIN: ON</div>
                    </div>

                    <div className="bg-green-50/30 p-4 rounded-2xl border border-green-100/50">
                      <div className="text-dark font-serif italic mb-3">"J'aime beaucoup voyager en France."</div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full">Try Again</div>
                        <div className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest">Say this instead!</div>
                      </div>
                      <div className="text-[10px] text-dark/30 font-bold uppercase tracking-widest mb-1">Alternatives</div>
                      <div className="text-xs text-dark/60 italic leading-relaxed">
                        "J'adore voyager en France."<br/>
                        "Voyager en France est ma passion."
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100/50">
                      <div className="flex-1 text-[10px] text-red-500 line-through decoration-red-300">I like travel in France.</div>
                      <ArrowRight size={12} className="text-red-300" />
                      <div className="flex-1 text-[10px] font-bold text-red-600">J'aime voyager en France.</div>
                    </div>

                    <div className="mt-auto">
                      <div className="text-[8px] font-bold text-dark/20 uppercase tracking-widest mb-2">Orati</div>
                      <div className="bg-beige/20 p-4 rounded-2xl rounded-tl-none text-xs text-dark/70 leading-relaxed">
                        C'est génial ! Quelle est votre ville préférée en France ? J'adore Paris, mais Lyon est aussi magnifique.
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl shadow-md border border-beige-mid/10 flex items-center gap-4">
                    <div className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                      <AlertCircle size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[8px] font-bold text-dark/30 uppercase tracking-widest mb-1">Recent Correction</div>
                      <div className="text-[10px] text-red-600 font-medium">I like travel in France. → <span className="font-bold">J'aime voyager en France.</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-dark">How it works</h2>
            <div className="space-y-6">
              {[
                {
                  icon: <Mic className="text-gold" />,
                  title: "Speak Naturally",
                  desc: "Just start talking. Our AI listens and understands your intent, even if you make mistakes."
                },
                {
                  icon: <MessageSquare className="text-gold" />,
                  title: "Get Instant Feedback",
                  desc: "Receive real-time corrections on grammar, vocabulary, and pronunciation as you speak."
                },
                {
                  icon: <Zap className="text-gold" />,
                  title: "Adaptive Learning",
                  desc: "The AI adjusts its complexity based on your level, helping you grow at your own pace."
                }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-6 p-6 rounded-3xl hover:bg-white transition-colors border border-transparent hover:border-beige-mid/20"
                >
                  <div className="w-12 h-12 bg-beige rounded-2xl flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold mb-2">{item.title}</h3>
                    <p className="text-dark/60 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          <div className="bg-white p-10 rounded-[40px] border border-beige-mid/20 shadow-sm text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FlowerLogo size={32} />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">Situational Roleplay</h3>
            <p className="text-dark/60 text-sm leading-relaxed">
              Practice ordering coffee, checking into hotels, or negotiating business deals in a safe environment.
            </p>
          </div>
          <div className="bg-white p-10 rounded-[40px] border border-beige-mid/20 shadow-sm text-center">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">Free Conversation</h3>
            <p className="text-dark/60 text-sm leading-relaxed">
              Talk about your day, your hobbies, or deep philosophical questions. The AI is always ready to listen.
            </p>
          </div>
          <div className="bg-white p-10 rounded-[40px] border border-beige-mid/20 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Zap size={32} />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">Live Corrections</h3>
            <p className="text-dark/60 text-sm leading-relaxed">
              Don't wait until the end of a lesson. Get immediate, helpful feedback while the context is fresh.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/auth?signup=true"
            className="inline-flex items-center gap-2 px-10 py-5 bg-gold text-cream rounded-full font-bold text-xl hover:bg-gold/90 transition-all shadow-xl shadow-gold/20 group"
          >
            Start Your Journey <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
