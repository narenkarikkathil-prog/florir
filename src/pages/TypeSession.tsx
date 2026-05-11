import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, AlertCircle, ChevronRight, CheckCircle2, Sliders, Dices, Utensils, Plane, Hotel, Stethoscope, ShoppingBag, Send, Languages, Volume2, VolumeX, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiService } from '@/src/services/gemini';
import { Language, UserLevel } from '@/src/types';
import { supabase } from '@/src/lib/supabase';
import { FlowerLogo, BloomingFlower } from '@/src/components/FlowerLogo';

const LANGUAGE_CODES: Record<Language, string> = {
  'French': 'fr-FR',
  'Spanish': 'es-ES',
  'German': 'de-DE',
  'Portuguese': 'pt-BR',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'Hindi': 'hi-IN',
  'Arabic': 'ar-SA',
  'Russian': 'ru-RU',
  'Italian': 'it-IT',
  'Turkish': 'tr-TR',
  'Vietnamese': 'vi-VN',
  'Indonesian': 'id-ID',
  'Bengali': 'bn-BD',
  'Marathi': 'mr-IN',
  'Tamil': 'ta-IN'
};

const SITUATIONS = [
  {
    id: 'free',
    title: 'Free Conversation',
    icon: <MessageSquare size={24} className="text-purple-500" />,
    prompt: "Engage in a casual, free-flowing conversation.",
    subScenarios: []
  },
  {
    id: 'restaurant',
    title: 'At a Restaurant',
    icon: <Utensils size={24} className="text-orange-500" />,
    prompt: "You are a waiter at a restaurant. The user is a customer.",
    subScenarios: [
      "Ordering a three-course meal at a fancy bistro.",
      "Complaining about a cold dish to the waiter.",
      "Asking for recommendations and dietary restrictions.",
      "Splitting the bill with a group of friends."
    ]
  },
  {
    id: 'airport',
    title: 'Airport Check-in',
    icon: <Plane size={24} className="text-blue-500" />,
    prompt: "You are an airport check-in agent. The user is a passenger.",
    subScenarios: [
      "Checking in for an international flight with extra baggage.",
      "Dealing with a delayed flight and asking for compensation.",
      "Going through security and explaining a liquid item.",
      "Asking for directions to the lounge or gate."
    ]
  },
  {
    id: 'hotel',
    title: 'Hotel Reception',
    icon: <Hotel size={24} className="text-indigo-500" />,
    prompt: "You are a hotel receptionist. The user is a guest.",
    subScenarios: [
      "Checking in and asking for a room with a better view.",
      "Reporting a broken air conditioner in your room.",
      "Asking for local sightseeing tips from the concierge.",
      "Checking out early and disputing a minibar charge."
    ]
  },
  {
    id: 'doctor',
    title: 'Doctor Visit',
    icon: <Stethoscope size={24} className="text-red-500" />,
    prompt: "You are a doctor. The user is a patient.",
    subScenarios: [
      "Describing flu-like symptoms to a general practitioner.",
      "Asking about side effects of a new prescription.",
      "Scheduling a follow-up appointment at the front desk.",
      "Explaining a sports injury to a physiotherapist."
    ]
  },
  {
    id: 'shopping',
    title: 'Local Market',
    icon: <ShoppingBag size={24} className="text-green-500" />,
    prompt: "You are a market vendor. The user is a shopper.",
    subScenarios: [
      "Bargaining for a handmade souvenir.",
      "Asking about the ingredients in a local street food.",
      "Trying on clothes and asking for a different size.",
      "Finding a specific spice or local specialty."
    ]
  }
];

export default function TypeSession() {
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang') as Language || 'French';
  const navigate = useNavigate();

  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<{
    role: 'user' | 'ai';
    text: string;
    corrections?: { original: string; correction: string; explanation: string; severity: number; confidence: number }[];
    correctedSentence?: string;
  }[]>([]);
  const [showTranslations, setShowTranslations] = useState(false);
  const [activeWordTranslations, setActiveWordTranslations] = useState<Record<string, string>>({});
  const [selectedSituation, setSelectedSituation] = useState<string | null>(null);
  const [currentSubScenario, setCurrentSubScenario] = useState<string>("");
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'hard'>('beginner');
  const [isDifficultySelected, setIsDifficultySelected] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isResponseHidden, setIsResponseHidden] = useState(false);
  
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ttsServiceRef = useRef<GeminiService | null>(null);

  // Keep a ref to the latest state so handleSendMessage can read it without staleness
  const isVoiceEnabledRef = useRef(isVoiceEnabled);
  useEffect(() => {
    isVoiceEnabledRef.current = isVoiceEnabled;
  }, [isVoiceEnabled]);
  
  useEffect(() => {
    if (transcriptScrollRef.current) {
      const container = transcriptScrollRef.current;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [transcript]);

  const rerollSubScenario = (sitId: string) => {
    const sit = SITUATIONS.find(s => s.id === sitId);
    if (sit && sit.subScenarios.length > 0) {
      const randomSub = sit.subScenarios[Math.floor(Math.random() * sit.subScenarios.length)];
      setCurrentSubScenario(randomSub);
      return randomSub;
    }
    return "";
  };

  useEffect(() => {
    if (selectedSituation && !currentSubScenario) {
      rerollSubScenario(selectedSituation);
    }
  }, [selectedSituation]);

  const playFromBase64 = async (base64Audio: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioContext = audioContextRef.current;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pcm = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768.0;

    const buffer = audioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }

    const source = audioContext.createBufferSource();
    currentAudioSourceRef.current = source;
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  };

  const playTTS = async (text: string) => {
    if (!ttsServiceRef.current) {
        const apiKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
        ttsServiceRef.current = new GeminiService(apiKey, apiKey);
    }
    try {
        const base64Audio = await ttsServiceRef.current.generateSpeech(text);
        if (base64Audio) playFromBase64(base64Audio);
    } catch (e) {
        console.error("TTS Error:", e);
    }
  };

  const translateToEnglish = async (text: string): Promise<string> => {
    if (!text.trim()) return "";
    try {
      const sourceLang = LANGUAGE_CODES[lang]?.split('-')[0] || 'auto';
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=en&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      return data[0][0][0] || "";
    } catch (error) {
      console.error("Translation error:", error);
      return "";
    }
  };

  const handleWordClick = async (msgIndex: number, wordIndex: number, wordText: string) => {
    const key = `${msgIndex}-${wordIndex}`;
    const cleanWord = wordText.replace(/[.,!?()[\]{}"']/g, "");
    if (!cleanWord) return;

    setActiveWordTranslations(prev => ({ ...prev, [key]: "..." }));
    const translation = await translateToEnglish(cleanWord);
    if (translation) {
      setActiveWordTranslations(prev => ({ ...prev, [key]: translation }));
      setTimeout(() => {
        setActiveWordTranslations(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 3500);
    } else {
      setActiveWordTranslations(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const startSession = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert("API Key is missing.");
      return;
    }

    aiRef.current = new GoogleGenAI({ apiKey });
    setIsActive(true);
    
    // Initial AI greeting
    setTranscript([{ role: 'ai', text: 'Typing...' }]);
    setIsLoading(true);

    let systemInstruction = `You are a helpful language learning assistant for ${lang}. `;
    if (level === 'beginner') {
      systemInstruction += `The user is a beginner. Use simple, clear ${lang} (A1-A2 level). Use short, natural sentences. `;
    } else if (level === 'intermediate') {
      systemInstruction += `The user is at an intermediate level. Use B1-B2 level vocabulary and idioms. `;
    } else if (level === 'hard') {
      systemInstruction += `The user is at an advanced level. Use C1-C2 level vocabulary, complex structures, and nuances. `;
    }

    const situation = SITUATIONS.find(s => s.id === selectedSituation);
    if (selectedSituation !== 'free') {
      systemInstruction += `\n\nROLEPLAY:\n- You are a ${lang} speaker roleplaying as a real-world character.\n- Scenario: ${situation?.title} (${currentSubScenario || situation?.prompt}).\n- Stay in character at all times. Guide the conversation naturally.\n- Start the conversation right now by introducing the scene and greeting the user in character.`;
    } else {
      systemInstruction += `\n\nCONVERSATION:\n- Engage in a free-flowing, casual conversation.\n- Ask questions to keep the conversation going.\n- Start the conversation right now by greeting the user.`;
    }

    systemInstruction += `\n\nIMPORTANT: ALWAYS respond in ${lang}.`;

    try {
      const response = await aiRef.current.models.generateContent({
        model: "gemini-2.5-flash",
        contents: systemInstruction,
      });
      const aiResponseText = response.text || `Bonjour! Let's practice ${lang}.`;
      setTranscript([{ role: 'ai', text: aiResponseText }]);
      if (isVoiceEnabledRef.current) playTTS(aiResponseText);
    } catch (e) {
      console.error(e);
      const errorText = `Hello! Ready to practice ${lang}?`;
      setTranscript([{ role: 'ai', text: errorText }]);
      if (isVoiceEnabledRef.current) playTTS(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');
    
    const newTranscript = [...transcript, { role: 'user' as const, text: userText }];
    setTranscript(newTranscript);
    setIsLoading(true);

    try {
      let systemInstruction = `You are a language learning assistant for ${lang}. The user is at ${level} level. `;
      const situation = SITUATIONS.find(s => s.id === selectedSituation);
      if (selectedSituation !== 'free') {
        systemInstruction += `Roleplay scenario: ${situation?.title} (${currentSubScenario || situation?.prompt}). Stay in character. `;
      }
      systemInstruction += `\n\nTASK:\nRespond to the conversation naturally in ${lang}.\nAlso provide feedback/corrections on the user's latest message.\nIf there are mistakes, explain them simply. If the user's sentence is perfect, leave the mistakes array empty and the correctedSentence as their original sentence.\n\nYou must return a JSON object with this structure:\n{ "response": "Your conversational reply in ${lang}", "feedback": { "correctedSentence": "The grammatically correct version of the user's message", "mistakes": [ { "original": "wrong word", "correction": "right word", "explanation": "why it is wrong", "severity": 5, "confidence": 90 } ] } }`;

      const chatHistory = newTranscript.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));
      // Replace the last user message with the system instruction included as context for this turn, or just pass system instruction in config.
      
      const response = await aiRef.current?.models.generateContent({
        model: "gemini-2.5-flash",
        contents: chatHistory,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: { type: Type.STRING },
              feedback: {
                type: Type.OBJECT,
                properties: {
                  correctedSentence: { type: Type.STRING },
                  mistakes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        original: { type: Type.STRING },
                        correction: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        severity: { type: Type.NUMBER },
                        confidence: { type: Type.NUMBER }
                      },
                      required: ["original", "correction", "explanation", "severity", "confidence"]
                    }
                  }
                },
                required: ["correctedSentence", "mistakes"]
              }
            },
            required: ["response", "feedback"]
          }
        }
      });

      if (response && response.text) {
        const data = JSON.parse(response.text);
        
        // Update user message with feedback
        setTranscript(prev => {
          const updated = [...prev];
          const lastUserIndex = updated.map(m => m.role).lastIndexOf('user');
          if (lastUserIndex !== -1) {
            updated[lastUserIndex].correctedSentence = data.feedback.correctedSentence;
            updated[lastUserIndex].corrections = data.feedback.mistakes;
          }
          return [...updated, { role: 'ai', text: data.response }];
        });
        
        if (isVoiceEnabledRef.current) {
          playTTS(data.response);
        }
      }
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMsg = "Sorry, I had trouble processing that. Could you try again?";
      setTranscript(prev => [...prev, { role: 'ai', text: errorMsg }]);
      if (isVoiceEnabledRef.current) playTTS(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-cream flex flex-col relative overflow-hidden">
      <BloomingFlower className="absolute -top-10 -left-10 text-gold" size={120} delay={0.2} />
      <BloomingFlower className="absolute bottom-1/4 -right-10 text-petal" size={180} delay={0.5} />

      {/* Header */}
      <div className="p-4 md:p-8 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-4">
          <FlowerLogo className="text-gold shrink-0" size={32} />
          {selectedSituation && (
            <div className="hidden md:flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-beige/30 shadow-sm">
              <span className="text-xl">{SITUATIONS.find(s => s.id === selectedSituation)?.icon}</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-dark/80">{SITUATIONS.find(s => s.id === selectedSituation)?.title}</span>
                {currentSubScenario && (
                  <span className="text-[10px] text-dark/40 italic leading-none mt-0.5">{currentSubScenario}</span>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="p-3 bg-white text-dark/40 hover:bg-red-50 hover:text-red-500 rounded-2xl border border-beige/10 transition-all"
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 w-full max-w-4xl mx-auto pb-6">
        {!selectedSituation ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="md:col-span-2 text-center mb-4">
              <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">Choose a Scenario</h2>
              <p className="text-dark/50">Select a topic for your text conversation in {lang}.</p>
            </div>
            {SITUATIONS.map((s) => (
              <div key={s.id} className="relative group">
                <button
                  onClick={() => setSelectedSituation(s.id)}
                  className="w-full p-6 bg-white rounded-3xl border border-beige-mid/20 hover:border-gold/30 hover:shadow-md transition-all text-left flex items-center gap-4"
                >
                  <div className="text-3xl">{s.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-serif font-bold text-lg">{s.title}</h3>
                    <p className="text-xs text-dark/40">{s.prompt}</p>
                  </div>
                </button>
              </div>
            ))}
          </motion.div>
        ) : !isDifficultySelected ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-xl border border-beige-mid/20 text-center"
          >
            <div className="w-20 h-20 bg-gold/10 rounded-3xl flex items-center justify-center text-gold mx-auto mb-6">
              <Sliders size={40} />
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">Select Difficulty</h2>
            <div className="grid grid-cols-1 gap-3 mb-8 mt-6">
              {(['beginner', 'intermediate', 'hard'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all font-bold text-lg capitalize",
                    level === l ? "border-gold bg-gold/5 text-gold shadow-sm" : "border-beige-mid/10 hover:border-beige-mid/30 text-dark/40"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setIsDifficultySelected(true);
                startSession();
              }}
              className="w-full py-5 bg-gold text-white rounded-full font-bold text-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
            >
              Start Chat
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-[600px] max-h-[80vh] flex flex-col bg-white/90 backdrop-blur-xl rounded-[40px] shadow-xl border border-beige/20 p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-beige/30">
              <h3 className="text-xl font-serif font-bold">Text Conversation</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                    isVoiceEnabled ? "bg-dark text-white" : "bg-beige/50 text-dark/60 hover:bg-beige"
                  )}
                >
                  {isVoiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  {isVoiceEnabled ? "Voice On" : "Voice Off"}
                </button>
                {isVoiceEnabled && (
                  <button
                    onClick={() => setIsResponseHidden(!isResponseHidden)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                      isResponseHidden ? "bg-dark text-white" : "bg-beige/50 text-dark/60 hover:bg-beige"
                    )}
                  >
                    {isResponseHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    {isResponseHidden ? "Text Hidden" : "Hide Text"}
                  </button>
                )}
                <button
                  onClick={() => setShowTranslations(!showTranslations)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                    showTranslations ? "bg-dark text-white" : "bg-beige/50 text-dark/60 hover:bg-beige"
                  )}
                >
                  <Languages size={12} />
                  {showTranslations ? "Word Translate Active" : "Tap Words to Translate"}
                </button>
              </div>
            </div>

            <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-4">
              {transcript.map((msg, i) => (
                <div key={i} className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-dark/20">
                    {msg.role === 'user' ? 'You' : 'Florir AI'}
                  </span>
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-[24px] text-sm leading-relaxed shadow-sm",
                    msg.role === 'user' ? "bg-dark text-white rounded-tr-none" : "bg-[#F3EFE9] text-dark rounded-tl-none border border-beige/20",
                    (msg.role === 'ai' && isVoiceEnabled && isResponseHidden) ? "opacity-40 blur-sm hover:opacity-100 hover:blur-none transition-all duration-300 select-none" : ""
                  )}>
                    {showTranslations ? (
                      <div className="flex flex-wrap gap-x-1 gap-y-1">
                        {msg.text.split(' ').map((word, wIdx) => {
                          const key = `${i}-${wIdx}`;
                          const translation = activeWordTranslations[key];
                          return (
                            <span key={wIdx} className="relative group inline-block">
                              <span onClick={() => handleWordClick(i, wIdx, word)} className="cursor-pointer hover:bg-gold/30 hover:text-gold-dark rounded transition-colors px-1">
                                {word}
                              </span>
                              {translation && (
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-dark text-white text-[10px] font-bold tracking-wider uppercase rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
                                  {translation}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                  
                  {msg.role === 'user' && msg.correctedSentence && msg.correctedSentence !== msg.text && (
                    <div className="max-w-[85%] mt-1 p-4 bg-green-50 border border-green-100 rounded-[24px] rounded-tr-none text-xs text-green-900 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <span className="font-bold uppercase text-[9px] tracking-wider opacity-60">Correction</span>
                      </div>
                      <p className="font-medium italic text-sm">"{msg.correctedSentence}"</p>
                      {msg.corrections && msg.corrections.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1 pt-2 border-t border-green-100/50">
                          {msg.corrections.map((c, ci) => (
                            <div key={ci} className="px-2 py-1 bg-white/80 rounded-lg border border-green-200/50 flex items-center gap-1.5" title={c.explanation}>
                              <span className="line-through text-red-400 font-medium">{c.original}</span>
                              <ChevronRight size={10} className="text-green-300" />
                              <span className="font-bold text-green-600">{c.correction}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="p-4 bg-[#F3EFE9] text-dark rounded-[24px] rounded-tl-none border border-beige/20 text-sm italic opacity-70">
                    Typing...
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-beige/30 flex items-end gap-3">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Type your message in ${lang}...`}
                className="flex-1 bg-beige/10 border-2 border-beige/30 rounded-2xl p-4 focus:outline-none focus:border-gold resize-none custom-scrollbar"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="w-14 h-14 rounded-2xl bg-gold text-white flex items-center justify-center hover:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <Send size={24} className={inputValue.trim() ? "translate-x-0.5" : ""} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
