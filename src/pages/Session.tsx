import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, X, MessageSquare, BarChart3, AlertCircle, ChevronRight, CheckCircle2, Volume2, Settings, Sliders, RefreshCw, Dices, Utensils, Plane, Hotel, Stethoscope, ShoppingBag, Trophy, Hash, Heart, Languages, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Type, Modality } from "@google/genai";
import { GeminiService } from '@/src/services/gemini';
import { Language, UserLevel } from '@/src/types';
import { supabase } from '@/src/lib/supabase';
import SettingsModal from '@/src/components/SettingsModal';
import vocabularyData from '@/src/data/vocabulary.json';

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

export default function Session() {
  const { mode } = useParams();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang') as Language || 'French';
  const navigate = useNavigate();

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState<{ 
    role: 'user' | 'ai'; 
    text: string; 
    timestamp: number;
    corrections?: { original: string; correction: string; explanation: string; severity: number; confidence: number }[];
    correctedSentence?: string;
    alternatives?: string[];
    translation?: string;
  }[]>([]);
  const [showTranslations, setShowTranslations] = useState(false);
  const [activeWordTranslations, setActiveWordTranslations] = useState<Record<string, string>>({});
  const [accuracy, setAccuracy] = useState(100);
  const [prevAccuracy, setPrevAccuracy] = useState(100);
  const [mistakes, setMistakes] = useState<{ original: string; correction: string; explanation: string; severity: number; confidence: number }[]>([]);
  const [lastCorrectedSentence, setLastCorrectedSentence] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<{ 
    correctedSentence: string; 
    mistakes: { original: string; correction: string; explanation: string; severity: number; confidence: number }[];
    alternatives: string[];
  } | null>(null);
  const [activePanel, setActivePanel] = useState<'none' | 'transcript'>('none');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState<string | null>(null);
  const [currentSubScenario, setCurrentSubScenario] = useState<string>("");
  const [questionCount, setQuestionCount] = useState(0);
  const [totalQuestions] = useState(7);
  const [correctCount, setCorrectCount] = useState(0);
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'hard'>('beginner');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [wrongOptions, setWrongOptions] = useState<number[]>([]);
  const [mcqQuestion, setMcqQuestion] = useState<{ 
    type: 'mcq' | 'written';
    question: string; 
    options?: string[]; 
    answer: string | number; 
    audioPrompt?: string;
  } | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [isDifficultySelected, setIsDifficultySelected] = useState(false);
  const [showTryAgain, setShowTryAgain] = useState(true);
  const [tip, setTip] = useState("");
  const [scores, setScores] = useState({ grammar: 100, fluency: 100, pronunciation: 100, vocabulary: 100 });
  const [voiceStatus, setVoiceStatus] = useState<'high-fidelity' | 'standard' | 'error'>('high-fidelity');
  const isQuotaExhaustedRef = useRef<boolean>(false);
  const audioCacheRef = useRef<Record<string, string>>({});
  const prefetchedAudioRef = useRef<Record<string, Promise<string | null> | string>>({});

  const geminiRef = useRef<GeminiService | null>(null);
  const quizAudioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const SITUATIONS = [
    { 
      id: 'restaurant', 
      title: 'At a Restaurant', 
      icon: <Utensils size={24} className="text-orange-500" />,
      prompt: "You are a waiter at a French restaurant. The user is a customer.",
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
  const provideFeedbackTool = {
    functionDeclarations: [{
      name: "provideFeedback",
      description: "Provide corrections and severity scores for the user's last statement. This is NOT spoken out loud.",
      parameters: {
        type: "OBJECT",
        properties: {
          correctedSentence: { type: "STRING", description: "The fully corrected version of what the user said." },
          mistakes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                original: { type: "STRING", description: "The original mistake." },
                correction: { type: "STRING", description: "The corrected version." },
                explanation: { type: "STRING", description: "A short explanation in simple English." },
                severity: { type: "NUMBER", description: "A severity score from 0 to 10." },
                confidence: { type: "NUMBER", description: "Confidence score from 0 to 100 (how sure you are this is a real mistake and not a mic/transcription error)." }
              },
              required: ["original", "correction", "explanation", "severity", "confidence"]
            }
          },
          alternatives: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "1-2 correct beginner-friendly alternative sentences."
          }
        },
        required: ["correctedSentence", "mistakes", "alternatives"]
      }
    }]
  };

  const provideVocabQuestionTool = {
    functionDeclarations: [{
      name: "provideVocabQuestion",
      description: "Provide a vocabulary or listening question for the user.",
      parameters: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["mcq", "written"] },
          question: { type: "STRING", description: "The question text (e.g., 'What did I just say?')" },
          audioPrompt: { type: "STRING", description: "The exact word or phrase you will speak out loud." },
          options: { 
            type: "ARRAY", 
            items: { type: "STRING" },
            description: "4 options for MCQ. Only required for type='mcq'."
          },
          answer: { 
            type: "STRING", 
            description: "The correct answer. For MCQ, this should be the index (0-3) as a string. For written, the exact word/phrase." 
          }
        },
        required: ["type", "question", "audioPrompt", "answer"]
      }
    }]
  };

  useEffect(() => {
    // Generate initial tip based on language
    const languageTips: Record<Language, string[]> = {
      'French': [
        "Focus on your 'r' sounds—they should be more guttural.",
        "Remember to use 'vous' for formal situations.",
        "Watch your gender agreement with adjectives."
      ],
      'Spanish': [
        "Practice the rolled 'rr' sound for better fluency.",
        "Don't forget to use 'usted' in professional settings.",
        "Pay attention to the difference between 'ser' and 'estar'."
      ],
      'Japanese': [
        "Focus on pitch accent to distinguish between similar words.",
        "Practice using honorifics (keigo) in formal situations.",
        "Pay attention to particles like 'wa', 'ga', and 'o'."
      ],
      'German': [
        "Focus on the three grammatical genders (der, die, das).",
        "Practice the 'ch' sound in words like 'ich' and 'ach'.",
        "Pay attention to verb placement in subordinate clauses."
      ],
      'Hindi': [
        "Focus on the distinction between aspirated and non-aspirated sounds.",
        "Practice the retroflex 't' and 'd' sounds.",
        "Pay attention to the gender of nouns."
      ],
      'Arabic': [
        "Focus on the unique guttural sounds like 'ayn' and 'qaf'.",
        "Practice the different forms of letters based on their position.",
        "Pay attention to the root system of words."
      ],
      'Portuguese': [
        "Focus on nasal vowels like in 'pão'.",
        "Practice the difference between 'ser' and 'estar'.",
        "Pay attention to the pronunciation of 'r' at the beginning of words."
      ],
      'Russian': [
        "Focus on the distinction between hard and soft consonants.",
        "Practice the six grammatical cases.",
        "Pay attention to the mobile stress in words."
      ],
      'Korean': [
        "Focus on the different levels of politeness in speech.",
        "Practice the distinction between plain, tense, and aspirated consonants.",
        "Pay attention to the subject and topic particles."
      ],
      'Italian': [
        "Focus on the double consonants—they are held longer.",
        "Practice the rolled 'r' sound.",
        "Pay attention to the musical rhythm of the language."
      ],
      'Turkish': [
        "Focus on vowel harmony—it's a key feature of the language.",
        "Practice the agglutinative nature of word formation.",
        "Pay attention to the absence of grammatical gender."
      ],
      'Vietnamese': [
        "Focus on the six different tones—they are essential.",
        "Practice the unique vowel sounds.",
        "Pay attention to the use of pronouns based on social relationships."
      ],
      'Indonesian': [
        "Focus on the absence of verb conjugation and grammatical gender.",
        "Practice the use of prefixes and suffixes to change word meaning.",
        "Pay attention to the formal vs. informal registers."
      ],
      'Bengali': [
        "Focus on the distinction between dental and retroflex sounds.",
        "Practice the unique vowel sounds.",
        "Pay attention to the use of honorifics."
      ],
      'Marathi': [
        "Focus on the retroflex sounds.",
        "Practice the three grammatical genders.",
        "Pay attention to the complex verb forms."
      ],
      'Tamil': [
        "Focus on the unique retroflex sounds.",
        "Practice the distinction between formal and informal Tamil.",
        "Pay attention to the agglutinative nature of the language."
      ]
    };
    const tips = languageTips[lang] || [
      "Practice speaking every day to build confidence.",
      "Don't be afraid to make mistakes—they are part of the learning process.",
      "Listen to native speakers to improve your pronunciation."
    ];
    setTip(tips[Math.floor(Math.random() * tips.length)]);
  }, [lang]);

  useEffect(() => {
    // Dynamically update scores based on mistakes and transcript length
    if (isActive && !(mode?.includes('vocabulary') || mode?.includes('listening'))) {
      const userMessages = transcript.filter(m => m.role === 'user');
      const totalUserTurns = userMessages.length;
      
      if (totalUserTurns === 0) {
        setAccuracy(100);
        return;
      }

      const numErrors = mistakes.length;
      // Calculate accuracy based on errors per turn
      // Each error reduces accuracy based on severity
      const totalSeverity = mistakes.reduce((acc, m) => acc + m.severity, 0);
      
      // Base accuracy starts at 100
      // We penalize based on severity relative to the number of turns
      // A severity 10 error in 1 turn = 0% accuracy
      // A severity 10 error in 10 turns = 90% accuracy
      const penalty = totalUserTurns > 0 ? (totalSeverity / totalUserTurns) * 10 : 0;
      const newAccuracy = Math.max(0, Math.min(100, 100 - penalty));
      
      setPrevAccuracy(accuracy);
      setAccuracy(Math.round(newAccuracy));
      
      // Update sub-scores
      setScores({
        grammar: Math.max(40, Math.min(100, 100 - (mistakes.filter(m => m.explanation.toLowerCase().includes('grammar')).length * 15))),
        fluency: Math.max(40, Math.min(100, 70 + (totalUserTurns * 5) - (numErrors * 8))),
        pronunciation: Math.max(40, Math.min(100, 85 + (totalUserTurns * 2) - (numErrors * 5))),
        vocabulary: Math.max(40, Math.min(100, 100 - (mistakes.filter(m => m.explanation.toLowerCase().includes('word') || m.explanation.toLowerCase().includes('vocabulary')).length * 15)))
      });
    }
  }, [mistakes, transcript.length, isActive]);

  useEffect(() => {
    if (activePanel === 'transcript' && transcriptScrollRef.current) {
      // Direct scroll on the container to avoid page-level jumps
      const container = transcriptScrollRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcript, activePanel]);
  const startTimeRef = useRef<number | null>(null);
  const totalSessionTimeRef = useRef<number>(0);

  const rerollSubScenario = (sitId: string) => {
    const sit = SITUATIONS.find(s => s.id === sitId);
    if (sit && sit.subScenarios) {
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

  const lastNudgeTimeRef = useRef<number>(0);
  const lastAudioActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isActive || isPaused || !geminiRef.current) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastAudioActivityRef.current;

      if (timeSinceActivity > 15000) {
        console.log("No sound detected for 15s, auto-pausing...");
        
        // Trigger the pause logic
        geminiRef.current?.pause();
        setIsPaused(true);
        if (startTimeRef.current) {
          totalSessionTimeRef.current += (Date.now() - startTimeRef.current) / 1000;
          startTimeRef.current = null;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  useEffect(() => {
    if (!isActive || isPaused || !geminiRef.current || transcript.length === 0) return;

    const lastMsg = transcript[transcript.length - 1];
    if (lastMsg.role !== 'user') return;

    const timeout = setTimeout(() => {
      const now = Date.now();
      // Check again if the last message is still the same user message
      const currentLastMsg = transcript[transcript.length - 1];
      if (currentLastMsg === lastMsg && now - lastNudgeTimeRef.current > 5000) {
        console.log("Silence detected, nudging AI...");
        geminiRef.current?.sendText("(The user has finished speaking and is waiting for your response. Please respond now.)");
        lastNudgeTimeRef.current = now;
      }
    }, 2500); // Nudge after 2.5 seconds of silence

    return () => clearTimeout(timeout);
  }, [isActive, isPaused, transcript]);

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
    
    // Set loading indicator
    setActiveWordTranslations(prev => ({ ...prev, [key]: "..." }));
    
    const translation = await translateToEnglish(cleanWord);
    if (translation) {
      setActiveWordTranslations(prev => ({ ...prev, [key]: translation }));
      // Optional: Auto-dismiss tooltip after a delay
      setTimeout(() => {
        setActiveWordTranslations(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 3500);
    } else {
      // Revert if failed
      setActiveWordTranslations(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const playQuizAudio = async (text: string, retryCount = 0) => {
    const liveKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    const ttsKey = import.meta.env.VITE_GEMINI_TTS_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    
    if (!ttsKey) return;

    // Check prefetch first
    if (prefetchedAudioRef.current[text]) {
      let base64Audio = prefetchedAudioRef.current[text];
      if (base64Audio instanceof Promise) {
        base64Audio = await base64Audio;
      }
      if (base64Audio && typeof base64Audio === 'string') {
        playFromBase64(base64Audio);
        return;
      }
    }

    // Check cache next
    if (audioCacheRef.current[text]) {
      const base64Audio = audioCacheRef.current[text];
      playFromBase64(base64Audio);
      return;
    }

    try {
      if (!geminiRef.current) {
        geminiRef.current = new GeminiService(liveKey, ttsKey);
      }
      
      const base64Audio = await geminiRef.current.generateSpeech(text);
      if (base64Audio) {
        audioCacheRef.current[text] = base64Audio; // Cache it
        playFromBase64(base64Audio);
        isQuotaExhaustedRef.current = false; // Reset if successful
      }
    } catch (error: any) {
      console.error("TTS Error:", error);
      
      let errorStr = "";
      try {
        errorStr = typeof error === 'string' ? error : JSON.stringify(error);
      } catch (e) {
        errorStr = error?.message || "";
      }

      const isQuotaError = errorStr.includes('429') || 
                          errorStr.includes('RESOURCE_EXHAUSTED') ||
                          error?.status === 'RESOURCE_EXHAUSTED';

      if (isQuotaError) {
        isQuotaExhaustedRef.current = true;
        setTimeout(() => { isQuotaExhaustedRef.current = false; }, 60000);
        console.log(`Quota hit, retrying in 2s... (Attempt ${retryCount + 1})`);
        setTimeout(() => playQuizAudio(text, retryCount + 1), 2000);
      }
    }
  };

  const prefetchAudio = async (text: string) => {
    if (!text || audioCacheRef.current[text] || prefetchedAudioRef.current[text] || isQuotaExhaustedRef.current) return;
    
    const liveKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    const ttsKey = import.meta.env.VITE_GEMINI_TTS_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    
    if (!ttsKey) return;

    try {
      if (!geminiRef.current) {
        geminiRef.current = new GeminiService(liveKey, ttsKey);
      }
      // Store the promise immediately so playQuizAudio can await it if called before completion
      const promise = geminiRef.current.generateSpeech(text);
      prefetchedAudioRef.current[text] = promise;
      
      const base64Audio = await promise;
      if (base64Audio) {
        prefetchedAudioRef.current[text] = base64Audio;
        isQuotaExhaustedRef.current = false;
      }
    } catch (error: any) {
      let errorStr = "";
      try {
        errorStr = typeof error === 'string' ? error : JSON.stringify(error);
      } catch (e) {
        errorStr = error?.message || "";
      }

      if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
        isQuotaExhaustedRef.current = true;
        setTimeout(() => { isQuotaExhaustedRef.current = false; }, 60000);
      }
      console.warn("Prefetch failed:", error);
    }
  };

  const playFromBase64 = async (base64Audio: string) => {
    if (!quizAudioContextRef.current) {
      quizAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioContext = quizAudioContextRef.current;
    
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
    source.onended = () => {
      if (currentAudioSourceRef.current === source) {
        currentAudioSourceRef.current = null;
      }
    };
    source.start(0);
  };

  const nextQuizQuestion = (index: number) => {
    if (index < quizQuestions.length) {
      const q = quizQuestions[index];
      setMcqQuestion({
        type: q.type === 'mcq' ? 'mcq' : 'written',
        question: "What did you hear?",
        audioPrompt: q.audio_text,
        options: q.options,
        answer: q.answer
      });
      setSelectedOption(null);
      setWrongOptions([]);
      setWrittenAnswer("");
      setAttemptsLeft(3);
      setIsAnswerCorrect(null);
      setCurrentQuestionIndex(index);
      setQuestionCount(index + 1);
      
      // Play current audio
      playQuizAudio(q.audio_text);

      // Prefetch next question's audio
      if (index + 1 < quizQuestions.length) {
        prefetchAudio(quizQuestions[index + 1].audio_text);
      }
    } else {
      endSession();
    }
  };

  const startMcqSession = async () => {
    const liveKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    const ttsKey = import.meta.env.VITE_GEMINI_TTS_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    
    if (!liveKey) {
      alert("Gemini API Key is missing. Please configure it in the Secrets panel.");
      return;
    }

    setIsGeneratingQuiz(true);
    setIsActive(true);
    setCorrectCount(0);
    setAccuracy(100);
    setWrongOptions([]);
    totalSessionTimeRef.current = 0;
    lastAudioActivityRef.current = Date.now();
    startTimeRef.current = Date.now();
    setTranscript([{ role: 'ai', text: 'Generating your vocabulary session...', timestamp: Date.now() }]);

    try {
      if (!geminiRef.current) {
        geminiRef.current = new GeminiService(liveKey, ttsKey);
      }

      // Check predefined vocabulary sets first
      let quizData: any = null;
      const progressKey = `vocab_progress_${lang}_${level}`;
      const completedSets = parseInt(localStorage.getItem(progressKey) || '0', 10);
      
      const availableSets = (vocabularyData as any)[lang]?.[level] || [];
      if (completedSets < availableSets.length) {
        // Use predefined set
        quizData = availableSets[completedSets];
        localStorage.setItem(progressKey, (completedSets + 1).toString());
      }

      if (!quizData) {
        // Fallback to Gemini AI Generation if no predefined sets are available or we ran out
        const response = await geminiRef.current.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are generating a ${lang} listening comprehension quiz focused on vocabulary recognition.

TASK:
Create exactly 7 questions for a listening-based exercise.

CORE MECHANIC:
- Each question presents a ${lang} word, phrase, or short sentence that is meant to be HEARD (audio will be generated separately).
- The user must identify what was said.

MODES:
You must support three difficulty modes: beginner, intermediate, advanced.
The mode will be provided as input: ${level}

DIFFICULTY RULES:

BEGINNER:
- 100% multiple choice (all 7 questions)
- Use simple, common vocabulary (A1 level)
- Answer choices should be clearly distinct (easy to differentiate)

INTERMEDIATE:
- 75% multiple choice (5 questions), 25% written response (2 questions)
- Use A2–B1 vocabulary
- Include somewhat similar-sounding words/phrases in multiple choice

ADVANCED:
- 50% multiple choice (3-4 questions), 50% written response (3-4 questions)
- Use B1–B2 vocabulary
- Use very similar-sounding words/phrases to increase difficulty

QUESTION FORMAT:

For MULTIPLE CHOICE:
- "type": "mcq"
- "audio_text": (the correct ${lang} word/phrase/sentence)
- "options": array of 4 choices (ONLY ONE correct)
- "answer": MUST be the index of the correct option (0, 1, 2, or 3) as a string.

For WRITTEN RESPONSE:
- "type": "typed"
- "audio_text": (the correct ${lang} word/phrase/sentence)
- "answer": correct spelling (accept only exact or near-exact matches)

GLOBAL RULES:
- Do NOT include translations, explanations, transcripts, or corrections.
- Focus purely on listening recognition accuracy.
- Keep all content in ${lang} except structural labels.
- Ensure realistic pronunciation distinctions (important for audio playback).
- Avoid ambiguous answers unless intentional (especially in higher levels).

TRACKER:
- Include a field for each question: "progress": "Question X/7"

OUTPUT FORMAT:
Return ONLY valid JSON in this structure:

{
  "mode": "${level}",
  "questions": [
    {
      "progress": "Question 1/7",
      "type": "mcq",
      "audio_text": "...",
      "options": ["...", "...", "...", "..."],
      "answer": "..."
    }
  ]
}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mode: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    progress: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["mcq", "typed"] },
                    audio_text: { type: Type.STRING },
                    options: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING } 
                    },
                    answer: { type: Type.STRING }
                  },
                  required: ["progress", "type", "audio_text", "answer"]
                }
              }
            },
            required: ["mode", "questions"]
          }
        }
      });

        quizData = JSON.parse(response.text);
      }

      setQuizQuestions(quizData.questions);
      setCurrentQuestionIndex(0);
      setQuestionCount(1);
      
      const firstQuestion = quizData.questions[0];
      setMcqQuestion({
        type: firstQuestion.type === 'mcq' ? 'mcq' : 'written',
        question: "What did you hear?",
        audioPrompt: firstQuestion.audio_text,
        options: firstQuestion.options,
        answer: firstQuestion.answer
      });

      // Prefetch the next question's audio if available
      if (quizData.questions.length > 1) {
        prefetchAudio(quizData.questions[1].audio_text);
      }

      // Play audio for the first question
      playQuizAudio(firstQuestion.audio_text);

    } catch (error) {
      console.error("Failed to generate quiz:", error);
      setIsActive(false);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const toggleSession = async () => {
    // Unlock AudioContext for mobile Safari immediately upon user interaction
    if (!quizAudioContextRef.current && (mode?.includes('vocabulary') || mode?.includes('listening'))) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        quizAudioContextRef.current = new AudioCtx({ sampleRate: 24000 });
        const buffer = quizAudioContextRef.current.createBuffer(1, 1, 22050);
        const source = quizAudioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(quizAudioContextRef.current.destination);
        source.start(0);
        if (quizAudioContextRef.current.state === 'suspended') {
          quizAudioContextRef.current.resume();
        }
      }
    }

    if (mode?.includes('vocabulary') || mode?.includes('listening')) {
      if (isActive) {
        setIsActive(false);
        setMcqQuestion(null);
      } else {
        startMcqSession();
      }
      return;
    }

    if (isActive) {
      if (isPaused) {
        // Resume
        geminiRef.current?.resume();
        setIsPaused(false);
        lastAudioActivityRef.current = Date.now();
        startTimeRef.current = Date.now();
      } else {
        // Pause
        geminiRef.current?.pause();
        setIsPaused(true);
        if (startTimeRef.current) {
          totalSessionTimeRef.current += (Date.now() - startTimeRef.current) / 1000;
          startTimeRef.current = null;
        }
      }
      return;
    }

    const liveKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    const ttsKey = import.meta.env.VITE_GEMINI_TTS_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    
    if (!liveKey) {
      alert("Gemini API Key is missing. Please configure it in the Secrets panel.");
      return;
    }

    geminiRef.current = new GeminiService(liveKey, ttsKey);
    
    // Fetch user settings (with localStorage fallback)
    const localSettings = localStorage.getItem('user_settings');
    if (localSettings) {
      const parsed = JSON.parse(localSettings);
      geminiRef.current.setVoiceName(parsed.voice_name || 'Kore');
      geminiRef.current.setPlaybackRate(parsed.playback_speed || 1.3);
    }

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single();
        
        if (profile?.settings) {
          geminiRef.current.setVoiceName(profile.settings.voice_name || 'Kore');
          geminiRef.current.setPlaybackRate(profile.settings.playback_speed || 1.3);
          localStorage.setItem('user_settings', JSON.stringify(profile.settings));
        }
      }
    }
    
    let currentSpeed = 1.0;
    const latestSettings = localStorage.getItem('user_settings');
    if (latestSettings) {
      currentSpeed = JSON.parse(latestSettings).playback_speed || 1.3;
    }

    let systemInstruction = `You are a helpful language learning assistant for ${lang}. IMPORTANT: You MUST adopt the persona of a young, energetic, and expressive female with a bright and friendly feminine voice. Always maintain this feminine persona. `;
    
    if (currentSpeed < 1.0) {
      systemInstruction += `CRITICAL INSTRUCTION: You must speak EXTREMELY SLOWLY and deliberately. Insert distinct pauses after every word so the user can hear the pronunciation perfectly. `;
    } else if (currentSpeed > 1.0) {
      systemInstruction += `Speak energetically and rapidly. `;
    }
    
    // Add difficulty guidance
    if (level === 'beginner') {
      systemInstruction += `The user is a beginner. Use simple, clear ${lang} (A1–A2 level). Use short, natural sentences. Speak as a native would, but simplified for a beginner. Avoid complex idioms or figures of speech. `;
    } else if (level === 'intermediate') {
      systemInstruction += `The user is at an intermediate level. Use more complex vocabulary, common figures of speech, and natural idioms in ${lang} (B1–B2 level). Your sentences can be longer and more descriptive. Urge yourself to use natural expressions that a native would use in daily life. `;
    } else if (level === 'hard') {
      systemInstruction += `The user is at an advanced level. Use sophisticated vocabulary, complex figures of speech, and advanced idioms in ${lang} (C1–C2 level). Speak exactly as a native would in a professional or intellectual setting. Use a wide range of grammatical structures and nuanced expressions. `;
    }

    if (mode === 'roleplay') {
      const situation = SITUATIONS.find(s => s.id === selectedSituation);
      systemInstruction = `You are a ${lang} conversation partner roleplaying as a real-world character (e.g., a waiter at a restaurant).

ROLEPLAY:
- Stay fully in character at all times.
- Create an immersive, realistic situation: ${situation?.title || 'At a Restaurant'} (${currentSubScenario || situation?.prompt || 'ordering food'}).
- Guide the conversation naturally based on the scenario.
- BE PROACTIVE: If the user stops speaking, respond immediately. Do not wait for long pauses.
- If the user gives a short answer, ask a follow-up question to keep the roleplay alive.

LANGUAGE:
- ALWAYS speak in ${lang}. NEVER use English or any other language.
- The transcripts you receive are from a Voice API. If the transcript contains words from a different language (e.g., Portuguese when the target is French), THE TRANSCRIPTION IS LIKELY WRONG. You MUST make your best guess of what the user said in ${lang} and provide corrections accordingly. NEVER switch the conversation to another language based on a likely transcription error.
- Use simple, clear ${lang} (A1–A2 level) if the user is a beginner.
- Use short, natural sentences.
- Speak as a native would, but simplified for a beginner.

CORRECTIONS & FEEDBACK (BACKGROUND TASK):
- After the user speaks, analyze their utterance for grammatical or vocabulary mistakes.
- **SPEED IS VITAL**: Your highest priority is a natural, immediate spoken response in ${lang}.
- You MUST call the 'provideFeedback' tool for every user turn to log mistakes, but DO NOT let this delay your speech.
- Start speaking your roleplay response immediately. The feedback tool call can happen in parallel.
- For each mistake, provide a 'confidence' score (0-100).
- High confidence (80-100) means you are sure it's a linguistic error.
- The 'correctedSentence' must be a natural sentence in ${lang}.
- Even if there are no mistakes, you MUST call 'provideFeedback' with the original sentence as 'correctedSentence'.
- DO NOT speak the corrections out loud. Only speak the roleplay part.

CONVERSATION FLOW:
- After calling 'provideFeedback', continue the roleplay in ${lang}.
- ALWAYS respond in ${lang}, even if the user speaks English.
- If the user is unclear, ask them to repeat or clarify in ${lang}.
- Ask a relevant follow-up question to keep the scenario going.

STARTING THE CONVERSATION:
- You MUST start the conversation immediately with a greeting or a relevant opening line in ${lang}. Do not wait for the user to speak first.
- Introduce the scene and set the stage.

TONE:
- Patient, encouraging, and concise.
- Never switch out of the roleplay character.`;
    } else if (mode === 'conversation') {
      systemInstruction += `Engage in a free conversation in ${lang}. 

LANGUAGE:
- ALWAYS speak in ${lang}. NEVER use English or any other language.
- The transcripts you receive are from a Voice API. If the transcript contains words from a different language, THE TRANSCRIPTION IS LIKELY WRONG. You MUST make your best guess of what the user said in ${lang} and provide corrections accordingly. NEVER switch the conversation to another language based on a likely transcription error.
- If the user speaks English, ignore the English and respond in ${lang} while correcting them via the tool.

CORRECTIONS & FEEDBACK (BACKGROUND TASK):
- After the user speaks, analyze their utterance for grammatical or vocabulary mistakes.
- **SPEED IS VITAL**: Your highest priority is a natural, immediate spoken response in ${lang}.
- You MUST call the 'provideFeedback' tool for every user turn to log mistakes, but DO NOT let this delay your speech.
- Start speaking immediately. The feedback tool call can happen in parallel.
- High confidence (80-100) means you are sure it's a linguistic error.
- The 'correctedSentence' must be a natural sentence in ${lang}.
- Even if there are no mistakes, you MUST call 'provideFeedback' with the original sentence as 'correctedSentence'.
- DO NOT speak the corrections out loud. Only speak your conversational response.

CONVERSATION FLOW:
- After calling 'provideFeedback', continue the conversation naturally in ${lang}.
- BE PROACTIVE: If the user stops speaking, respond immediately. Do not wait for long pauses.
- Ask relevant follow-up questions to keep the conversation flowing.
- If the user is unclear, ask them to repeat or clarify in ${lang}.

STARTING THE CONVERSATION:
- You MUST start the conversation immediately with a greeting in ${lang}. Do not wait for the user to speak first.

TONE:
- Patient, encouraging, and concise.`;
    } else if (mode?.startsWith('ap-')) {
      systemInstruction += `You are an AP ${lang} examiner. Follow the AP exam format for ${mode}.`;
    }

    setIsActive(true);
    setIsPaused(false);
    lastNudgeTimeRef.current = 0;
    lastAudioActivityRef.current = Date.now();
    totalSessionTimeRef.current = 0;
    startTimeRef.current = Date.now();
    setTranscript([{ role: 'ai', text: 'Connecting to Florir...', timestamp: Date.now() }]);

    try {
      await geminiRef.current.connect({
        systemInstruction,
        languageCode: LANGUAGE_CODES[lang] || 'en-US',
        voiceName: geminiRef.current.getVoiceName(),
        tools: [provideFeedbackTool],
        initialMessage: mode === 'roleplay' 
          ? `[SYSTEM: START THE ROLEPLAY NOW] Introduce the scene: ${currentSubScenario || 'a restaurant'} and greet me in ${lang} to start the roleplay. You MUST speak first. Do not wait for me to speak.` 
          : (mode === 'conversation' ? `[SYSTEM: START THE CONVERSATION NOW] Greet me in ${lang} to start our conversation. You MUST speak first. Do not wait for me to speak.` : undefined),
        onVolume: (volume) => {
          // Threshold for "activity" - 0.01 is a reasonable RMS for speech
          if (volume > 0.01) {
            lastAudioActivityRef.current = Date.now();
          }
        },
        onMessage: (text, role, toolCall) => {
          // AI activity also counts as activity to prevent auto-pause while AI is speaking
          if (role === 'ai' || text) {
            lastAudioActivityRef.current = Date.now();
          }
          
          if (toolCall && toolCall.name === 'provideFeedback') {
            console.log("FEEDBACK TOOL CALLED:", toolCall.args);
            const { correctedSentence, mistakes: rawMistakes, alternatives } = toolCall.args;
            
            // Filter out mistakes with confidence < 30%
            const filteredMistakes = (rawMistakes || []).filter((m: any) => (m.confidence || 0) >= 30);

            const feedback = {
              correctedSentence: correctedSentence || '',
              mistakes: filteredMistakes,
              alternatives: alternatives || []
            };
            
            setLastFeedback(feedback);
            if (correctedSentence) {
              setLastCorrectedSentence(correctedSentence);
            }

            // Attach corrections to the last user message in transcript
            setTranscript(prev => {
              const newTranscript = [...prev];
              let foundUser = false;
              for (let i = newTranscript.length - 1; i >= 0; i--) {
                if (newTranscript[i].role === 'user') {
                  newTranscript[i] = {
                    ...newTranscript[i],
                    corrections: feedback.mistakes,
                    correctedSentence: feedback.correctedSentence,
                    alternatives: feedback.alternatives
                  };
                  foundUser = true;
                  break;
                }
              }
              return newTranscript;
            });

            if (filteredMistakes && filteredMistakes.length > 0) {
              setMistakes(prev => {
                const existingKeys = new Set(prev.map(m => `${m.original}-${m.correction}-${m.explanation}`));
                const filteredNew = filteredMistakes.filter((m: any) => !existingKeys.has(`${m.original}-${m.correction}-${m.explanation}`));
                return [...prev, ...filteredNew];
              });
            }

            return;
          }

          if (!text.trim()) return;
          
          setTranscript(prev => {
            const now = Date.now();
            // Remove connection messages
            const filteredPrev = prev.filter(m => 
              m.text !== 'Connecting to Florir...' && 
              !m.text.startsWith('Connection established!')
            );
            
            if (filteredPrev.length === 0) {
              return [{ role, text, timestamp: now }];
            }

            const lastMsg = filteredPrev[filteredPrev.length - 1];
            const lastTimestamp = lastMsg.timestamp || (now - 1000); // Fallback for missing timestamp
            const timeDiff = now - lastTimestamp;
            
            // If same role and within a reasonable time window (10s), merge
            // We use a larger window for AI responses as they can have natural pauses
            const mergeWindow = role === 'ai' ? 10000 : 5000;

            if (lastMsg.role === role && timeDiff < mergeWindow) {
              const normalizedNew = text.trim();
              const normalizedOld = lastMsg.text.trim();
              
              // Refinement: New text starts with old text (common in streaming STT)
              if (normalizedNew.toLowerCase().startsWith(normalizedOld.toLowerCase())) {
                const newTranscript = [...filteredPrev];
                newTranscript[newTranscript.length - 1] = { 
                  ...lastMsg, 
                  text: normalizedNew, 
                  timestamp: now 
                };
                return newTranscript;
              }
              
              // Refinement: Old text already contains new text (ignore late arrival of shorter chunk)
              if (normalizedOld.toLowerCase().includes(normalizedNew.toLowerCase())) {
                return filteredPrev;
              }

              // Continuation: New words added to the turn
              // Only append if the new text doesn't look like a refinement that failed the startsWith check
              const newTranscript = [...filteredPrev];
              const separator = (lastMsg.text.endsWith(' ') || text.startsWith(' ') || !lastMsg.text) ? '' : ' ';
              newTranscript[newTranscript.length - 1] = { 
                ...lastMsg, 
                text: lastMsg.text + separator + text, 
                timestamp: now 
              };
              return newTranscript;
            }
            
            // New turn
            return [...filteredPrev, { role, text, timestamp: now }];
          });

        },
        onInterruption: () => {
          console.log("Interrupted");
        },
        onRawMessage: (msg) => {
        }
      });

      setTranscript(prev => {
        const filtered = prev.filter(m => m.text !== 'Connecting to Florir...');
        const introMsg = mode === 'roleplay' 
          ? `Connection established! Ready to speak. Setting the scene: You are at ${currentSubScenario || 'a restaurant'} where ${lang} is spoken.`
          : 'Connection established! Ready to speak.';
        return [{ role: 'ai', text: introMsg, timestamp: Date.now() }, ...filtered];
      });
    } catch (err) {
      console.error("Failed to connect:", err);
      setTranscript([{ role: 'ai', text: 'Failed to connect to Florir. Please check your internet and API key.', timestamp: Date.now() }]);
      setIsActive(false);
    }
  };

  const endSession = async () => {
    if (startTimeRef.current) {
      totalSessionTimeRef.current += (Date.now() - startTimeRef.current) / 1000;
    }
    
    geminiRef.current?.stop();
    setIsActive(false);
    setIsPaused(false);
    setIsDifficultySelected(false);

    // Save progress to Supabase
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update total time and potentially level
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_time, level_per_language')
          .eq('id', user.id)
          .single();

        if (profile) {
          const newTotalTime = (profile.total_time || 0) + totalSessionTimeRef.current;
          const totalMinutes = newTotalTime / 60;
          
          let newLevel: UserLevel = 'Beginner 1';
          if (totalMinutes >= 250) newLevel = 'Advanced 3';
          else if (totalMinutes >= 200) newLevel = 'Advanced 2';
          else if (totalMinutes >= 150) newLevel = 'Advanced 1';
          else if (totalMinutes >= 120) newLevel = 'Intermediate 3';
          else if (totalMinutes >= 90) newLevel = 'Intermediate 2';
          else if (totalMinutes >= 60) newLevel = 'Intermediate 1';
          else if (totalMinutes >= 45) newLevel = 'Beginner 3';
          else if (totalMinutes >= 30) newLevel = 'Beginner 2';
          
          const updatedLevels = { ...profile.level_per_language };
          updatedLevels[lang] = newLevel;

          await supabase
            .from('profiles')
            .update({ 
              total_time: newTotalTime,
              level_per_language: updatedLevels
            })
            .eq('id', user.id);
        }
      }
    }
    
    navigate('/dashboard');
  };

  useEffect(() => {
    return () => geminiRef.current?.stop();
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-cream flex flex-col relative overflow-hidden">
      {/* Background Blooming Flowers */}
      <BloomingFlower className="absolute -top-10 -left-10 text-gold" size={120} delay={0.2} />
      <BloomingFlower className="absolute top-1/4 -right-10 text-petal" size={180} delay={0.5} />
      <BloomingFlower className="absolute bottom-1/4 -left-10 text-leaf" size={140} delay={0.8} />
      <BloomingFlower className="absolute -bottom-10 -right-10 text-gold" size={160} delay={1.1} />

      {/* Top Navigation */}
      <div className="p-4 md:p-8 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-2 md:gap-4">
          <FlowerLogo className="text-gold shrink-0" size={32} />
          {/* Situation Badge - hidden on mobile, appears at bottom instead */}
          {mode === 'roleplay' && selectedSituation ? (
          <div className="hidden md:flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-beige/30 shadow-sm">
            <span className="text-xl">{SITUATIONS.find(s => s.id === selectedSituation)?.icon}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-dark/80">{SITUATIONS.find(s => s.id === selectedSituation)?.title}</span>
              {currentSubScenario && (
                <span className="text-[10px] text-dark/40 italic leading-none mt-0.5">{currentSubScenario}</span>
              )}
            </div>
            {!isActive && (
              <div className="flex items-center gap-2 ml-2 border-l border-beige/30 pl-2">
                <button 
                  onClick={() => rerollSubScenario(selectedSituation)}
                  title="Reroll scenario"
                  className="p-1 hover:bg-beige/20 rounded-lg transition-all text-gold"
                >
                  <Dices size={14} className="hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={() => {
                    setSelectedSituation(null);
                    setCurrentSubScenario("");
                    setIsDifficultySelected(false);
                  }}
                  className="text-[10px] uppercase tracking-widest text-gold font-bold hover:opacity-70 transition-opacity"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        ) : (mode?.includes('vocabulary') || mode?.includes('listening')) ? (
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-beige/30 shadow-sm">
              <BarChart3 size={18} className="text-gold" />
              <span className="text-sm font-bold text-dark/80 capitalize">{level} {mode}</span>
            </div>
            {isActive && (
              <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-beige/30 shadow-sm">
                <Hash size={18} className="text-gold" />
                <span className="text-sm font-bold text-dark/80">Question {questionCount}/{totalQuestions}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-beige/30 shadow-sm">
            <span className="text-sm font-bold text-dark/80 capitalize">{mode} Mode</span>
          </div>
        )}
      </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4">
          {!(mode?.includes('vocabulary') || mode?.includes('listening')) && (
            <>
              <button 
                onClick={() => setActivePanel(activePanel === 'transcript' ? 'none' : 'transcript')}
                className={cn(
                  "p-3 rounded-2xl transition-all",
                  activePanel === 'transcript' ? "bg-gold text-white shadow-lg shadow-gold/20" : "bg-white text-dark/40 hover:bg-beige/20 border border-beige/10"
                )}
              >
                <MessageSquare size={22} />
              </button>
            </>
          )}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-white text-dark/40 hover:bg-beige/20 rounded-2xl border border-beige/10 transition-all"
          >
            <Sliders size={22} />
          </button>
          <button 
            onClick={endSession}
            className="p-3 bg-white text-dark/40 hover:bg-red-50 hover:text-red-500 rounded-2xl border border-beige/10 transition-all ml-2"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center relative z-10 px-4 md:px-20 gap-8 md:gap-12">
        {mode === 'roleplay' && !selectedSituation ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="md:col-span-2 text-center mb-4">
              <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">Choose a Situation</h2>
              <p className="text-dark/50">Select where you'd like to practice your {lang}.</p>
            </div>
            {SITUATIONS.map((s) => (
              <div key={s.id} className="relative group">
                <button
                  onClick={() => {
                    if (selectedSituation !== s.id) {
                      setSelectedSituation(s.id);
                      setCurrentSubScenario("");
                      setIsDifficultySelected(false);
                    }
                  }}
                  className={cn(
                    "w-full p-6 bg-white rounded-3xl border transition-all text-left flex items-center gap-4",
                    selectedSituation === s.id ? "border-gold shadow-lg" : "border-beige-mid/20 hover:border-gold/30 hover:shadow-md"
                  )}
                >
                  <div className="text-3xl">{s.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-serif font-bold text-lg">{s.title}</h3>
                    <p className="text-xs text-dark/40">
                      {selectedSituation === s.id && currentSubScenario ? currentSubScenario : s.prompt}
                    </p>
                  </div>
                </button>
                {selectedSituation === s.id && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      rerollSubScenario(s.id);
                    }}
                    title="Reroll scenario"
                    className="absolute top-4 right-4 p-2 bg-gold/10 text-gold rounded-xl hover:bg-gold/20 transition-all"
                  >
                    <Dices size={24} />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        ) : ((mode === 'roleplay' && selectedSituation) || mode === 'conversation') && !isDifficultySelected ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-xl border border-beige-mid/20 text-center"
          >
            <div className="w-20 h-20 bg-gold/10 rounded-3xl flex items-center justify-center text-gold mx-auto mb-6">
              <Sliders size={40} />
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">Select Difficulty</h2>
            <p className="text-dark/50 mb-8 text-sm">Choose your level for this {mode} session.</p>
            
            <div className="grid grid-cols-1 gap-3 mb-8">
              {(['beginner', 'intermediate', 'hard'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all font-bold text-lg capitalize",
                    level === l 
                      ? "border-gold bg-gold/5 text-gold shadow-sm" 
                      : "border-beige-mid/10 hover:border-beige-mid/30 text-dark/40"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setIsDifficultySelected(true);
                toggleSession();
              }}
              className="w-full py-5 bg-gold text-white rounded-full font-bold text-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
            >
              Start Session
            </button>
            
            {mode === 'roleplay' && (
              <button 
                onClick={() => {
                  setSelectedSituation(null);
                  setIsDifficultySelected(false);
                }}
                className="mt-4 text-xs font-bold uppercase tracking-widest text-dark/30 hover:text-dark/60 transition-colors"
              >
                Back to Situations
              </button>
            )}
          </motion.div>
        ) : (mode?.includes('vocabulary') || mode?.includes('listening')) ? (
          !isActive ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-xl border border-beige-mid/20 text-center"
            >
              <div className="w-20 h-20 bg-gold/10 rounded-3xl flex items-center justify-center text-gold mx-auto mb-6">
                <BarChart3 size={40} />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">Select Difficulty</h2>
              <p className="text-dark/50 mb-8 text-sm">Choose your level for this vocabulary session.</p>
              
              <div className="grid grid-cols-1 gap-3 mb-8">
                {(['beginner', 'intermediate', 'hard'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all font-bold text-lg capitalize",
                      level === l 
                        ? "border-gold bg-gold/5 text-gold shadow-sm" 
                        : "border-beige-mid/10 hover:border-beige-mid/30 text-dark/40"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <button
                onClick={startMcqSession}
                className="w-full py-5 bg-gold text-white rounded-full font-bold text-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
              >
                Start Session
              </button>
            </motion.div>
          ) : mcqQuestion ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl bg-white p-8 md:p-12 rounded-[40px] shadow-xl border border-beige-mid/20"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => playQuizAudio(mcqQuestion.audioPrompt || '')}
                    className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center text-gold hover:bg-gold/20 transition-all"
                  >
                    <Volume2 size={24} />
                  </button>
                  <div className="flex flex-col">
                    <h3 className="text-2xl font-serif font-bold">Listen and Answer</h3>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {mcqQuestion.type === 'written' && (
                    <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full">
                      {[...Array(3)].map((_, i) => (
                        <Heart 
                          key={i} 
                          size={16} 
                          className={cn(
                            "transition-all",
                            i < attemptsLeft ? "text-red-500 fill-red-500" : "text-red-200"
                          )} 
                        />
                      ))}
                    </div>
                  )}
                  <div className="text-dark/30 font-bold text-sm bg-beige/10 px-3 py-1.5 rounded-xl">
                    {mcqQuestion.type.toUpperCase()}
                  </div>
                </div>
              </div>
              
              <p className="text-xl font-medium mb-8 text-dark/80">{mcqQuestion.question}</p>
              
              {mcqQuestion.type === 'mcq' ? (
                <div className="grid grid-cols-1 gap-3">
                  {mcqQuestion.options?.map((opt, i) => {
                    const isSelected = selectedOption === i;
                    const isWrong = wrongOptions.includes(i);
                    const isCorrect = i === parseInt(mcqQuestion.answer as string);
                    
                    return (
                      <button
                        key={i}
                        disabled={isAnswerCorrect === true}
                        onClick={() => {
                          setSelectedOption(i);
                          lastAudioActivityRef.current = Date.now();
                          const correct = i === parseInt(mcqQuestion.answer as string);
                          setIsAnswerCorrect(correct);
                          if (correct) {
                            setCorrectCount(prev => prev + 1);
                          } else {
                            if (!isWrong) {
                              setWrongOptions(prev => [...prev, i]);
                              setAccuracy(prev => Math.max(0, prev - 10));
                            }
                          }
                        }}
                        className={cn(
                          "p-5 rounded-2xl border-2 text-left transition-all font-medium",
                          isCorrect && isAnswerCorrect === true
                            ? "border-green-500 bg-green-50 text-green-600"
                            : isWrong
                              ? "border-red-500 bg-red-50 text-red-600"
                              : isSelected && !isCorrect
                                ? "border-red-500 bg-red-50 text-red-600"
                                : "border-beige-mid/10 hover:border-beige-mid/30 text-dark/60"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{opt}</span>
                          {(isCorrect && isAnswerCorrect === true) && (
                            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                          {isWrong && (
                            <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                              <X size={14} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6">
                  <input 
                    type="text"
                    value={writtenAnswer}
                    onChange={(e) => setWrittenAnswer(e.target.value)}
                    placeholder="Type what you heard..."
                    className="w-full p-6 bg-beige/5 border-2 border-beige-mid/20 rounded-3xl text-xl font-medium focus:border-gold outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && writtenAnswer.trim() && attemptsLeft > 0 && isAnswerCorrect !== true) {
                        lastAudioActivityRef.current = Date.now();
                        const userAns = writtenAnswer.trim().toLowerCase();
                        const correctAns = (mcqQuestion.answer as string).toLowerCase();
                        
                        // Exact match
                        const exact = userAns === correctAns;
                        
                        // Fuzzy match: Levenshtein distance
                        const levenshtein = (a: string, b: string): number => {
                          const m = a.length, n = b.length;
                          const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
                          for (let i = 0; i <= m; i++) dp[i][0] = i;
                          for (let j = 0; j <= n; j++) dp[0][j] = j;
                          for (let i = 1; i <= m; i++) {
                            for (let j = 1; j <= n; j++) {
                              dp[i][j] = a[i-1] === b[j-1]
                                ? dp[i-1][j-1]
                                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
                            }
                          }
                          return dp[m][n];
                        };
                        
                        // Strip accents for comparison too
                        const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        const accentMatch = stripAccents(userAns) === stripAccents(correctAns);
                        
                        const dist = levenshtein(userAns, correctAns);
                        const maxAllowedDist = correctAns.length <= 4 ? 1 : 2;
                        const fuzzyMatch = dist <= maxAllowedDist && dist > 0;
                        
                        if (exact || accentMatch || fuzzyMatch) {
                          setIsAnswerCorrect(true);
                          setCorrectCount(prev => prev + 1);
                          if (fuzzyMatch && !exact && !accentMatch) {
                            // Will show "Close enough" message
                            setWrittenAnswer(writtenAnswer.trim() + ' ✓');
                          }
                        } else {
                          const nextAttempts = attemptsLeft - 1;
                          setAttemptsLeft(nextAttempts);
                          setAccuracy(prev => Math.max(0, prev - 10));
                          
                          if (nextAttempts === 0) {
                            setIsAnswerCorrect(false);
                          }
                        }
                      }
                    }}
                  />
                  {isAnswerCorrect === false && attemptsLeft === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center space-y-2"
                    >
                      <p className="text-red-500 font-bold">Out of tries!</p>
                      <p className="text-dark/60">The correct answer was: <span className="text-gold font-bold">{mcqQuestion.answer}</span></p>
                    </motion.div>
                  )}
                  {isAnswerCorrect === false && attemptsLeft > 0 && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 font-medium text-center"
                    >
                      Try again! {attemptsLeft} {attemptsLeft === 1 ? 'try' : 'tries'} left.
                    </motion.p>
                  )}
                  {isAnswerCorrect === true && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-green-500 font-medium text-center flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> 
                      {writtenAnswer.includes('✓') 
                        ? <>Close enough! Correct: <span className="text-gold font-bold ml-1">{mcqQuestion.answer}</span></>
                        : 'Correct!'
                      }
                    </motion.p>
                  )}
                </div>
              )}

              {(isAnswerCorrect === true || (isAnswerCorrect === false && attemptsLeft === 0)) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 flex justify-center"
                >
                  <button
                    onClick={() => nextQuizQuestion(currentQuestionIndex + 1)}
                    className="flex items-center gap-2 px-8 py-4 bg-gold text-white rounded-2xl font-bold hover:bg-gold/90 transition-all shadow-lg shadow-gold/10"
                  >
                    Next Question <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-dark/40 font-medium">Generating your vocabulary session...</p>
            </div>
          )
        ) : (
          <>
            <motion.div 
              layout
              animate={{ 
                scale: activePanel === 'transcript' ? 0.75 : 1,
                x: activePanel === 'transcript' ? (window.innerWidth > 768 ? -50 : 0) : 0,
                y: activePanel === 'transcript' ? 0 : 0
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "flex flex-col items-center z-20",
                activePanel === 'transcript' ? "hidden md:flex" : "flex"
              )}
            >
              <motion.div 
                animate={{ 
                  scale: isActive && !isPaused ? [1, 1.05, 1] : 1,
                  boxShadow: isActive && !isPaused ? [
                    '0 0 0 0px rgba(196, 151, 106, 0.2)',
                    '0 0 0 40px rgba(196, 151, 106, 0)',
                    '0 0 0 0px rgba(196, 151, 106, 0)'
                  ] : 'none'
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2,
                  boxShadow: { repeat: Infinity, duration: 2, ease: "easeOut" }
                }}
                className="relative rounded-full"
              >
                <button
                  onClick={toggleSession}
                  className={cn(
                    "w-48 h-48 md:w-56 md:h-56 rounded-full flex items-center justify-center transition-all shadow-[0_20px_50px_-12px_rgba(196,151,106,0.3)] relative z-10",
                    isActive && !isPaused ? "bg-gold text-white" : 
                    isPaused ? "bg-yellow-500 text-white" :
                    "bg-gold text-white hover:scale-105"
                  )}
                >
                  <Mic size={isActive && !isPaused ? 80 : 72} className={cn(isActive && !isPaused && "animate-pulse")} />
                </button>
              </motion.div>
              
              <div className="mt-10 text-center">
                <h2 className="text-xl font-medium text-dark/40 tracking-wide">
                  {isActive ? (isPaused ? "Session Paused" : "I'm listening...") : "Tap to speak"}
                </h2>
              </div>
            </motion.div>

            {/* Floating Transcript Bubble */}
            <AnimatePresence>
              {activePanel === 'transcript' && (
                <motion.div
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="w-full max-w-[450px] h-[400px] md:h-[500px] bg-white/90 backdrop-blur-xl rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-beige/20 p-8 flex flex-col z-10"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-serif font-bold">Transcript</h3>
                    <div className="flex items-center gap-2">
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
                      <button 
                        onClick={() => setTranscript([])}
                        className="p-2 hover:bg-beige rounded-full transition-all text-dark/40 hover:text-red-500"
                        title="Clear Transcript"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => setActivePanel('none')} className="p-2 hover:bg-beige/20 rounded-xl transition-all">
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <div 
                    ref={transcriptScrollRef}
                    className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6"
                  >
                    {transcript.length === 0 && <p className="text-dark/30 italic text-center py-10">No conversation yet...</p>}
                    {transcript.map((msg, i) => (
                      <div key={i} className={cn(
                        "flex flex-col gap-2",
                        msg.role === 'user' ? "items-end" : "items-start"
                      )}>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-dark/20">
                          {msg.role === 'user' ? 'You' : 'Florir'}
                        </span>
                        <div className={cn(
                          "max-w-[90%] p-4 rounded-[24px] text-sm leading-relaxed shadow-sm transition-all duration-300",
                          msg.role === 'user' ? "bg-dark text-white rounded-tr-none" : "bg-[#F3EFE9] text-dark rounded-tl-none border border-beige/20"
                        )}>
                          {showTranslations ? (
                            <div className="flex flex-wrap gap-x-1 gap-y-1">
                              {msg.text.split(' ').map((word, wIdx) => {
                                const key = `${i}-${wIdx}`;
                                const translation = activeWordTranslations[key];
                                return (
                                  <span key={wIdx} className="relative group inline-block">
                                    <span 
                                      onClick={() => handleWordClick(i, wIdx, word)}
                                      className="cursor-pointer hover:bg-gold/30 hover:text-gold-dark rounded transition-colors px-1"
                                      title="Tap to translate this word"
                                    >
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

                        {/* Inline Correction for User Messages */}
                        {msg.role === 'user' && msg.correctedSentence && msg.correctedSentence !== msg.text && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-[90%] mt-1 p-4 bg-green-50 border border-green-100 rounded-[24px] rounded-tr-none text-xs text-green-900 flex flex-col gap-2 shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-green-500" />
                              <span className="font-bold uppercase text-[9px] tracking-wider opacity-60">Correction</span>
                            </div>
                            <p className="font-medium italic text-sm">"{msg.correctedSentence}"</p>
                            {showTryAgain && (
                              <div className="mt-2 flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    // Logic to "try again" - maybe clear last message or just highlight
                                    console.log("Try again clicked for:", msg.correctedSentence);
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white rounded-full text-[10px] font-bold hover:bg-green-700 transition-all shadow-sm"
                                >
                                  Try Again
                                </button>
                                <span className="text-[10px] font-bold text-green-700/60 uppercase">Say this instead!</span>
                              </div>
                            )}
                            {msg.alternatives && msg.alternatives.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <span className="text-[9px] font-bold text-green-700/40 uppercase">Alternatives</span>
                                {msg.alternatives.map((alt, ai) => (
                                  <p key={ai} className="text-[11px] text-green-800/80 italic">"{alt}"</p>
                                ))}
                              </div>
                            )}
                            {msg.corrections && msg.corrections.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1 pt-2 border-t border-green-100/50">
                                {msg.corrections.map((c, ci) => (
                                  <div key={ci} className="px-2 py-1 bg-white/80 rounded-lg border border-green-200/50 flex items-center gap-1.5 shadow-sm">
                                    <span className="line-through text-red-400 font-medium">{c.original}</span>
                                    <ChevronRight size={10} className="text-green-300" />
                                    <span className={cn(
                                      "font-bold",
                                      c.severity > 7 ? "text-red-600" : 
                                      c.severity > 4 ? "text-orange-600" :
                                      "text-green-600"
                                    )}>{c.correction}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                  
                  {/* Inline Mobile Mic (Shows only inside transcript when active on small screens) */}
                  <div className="md:hidden mt-4 pt-4 border-t border-beige/20 flex flex-col items-center gap-2">
                    <button
                      onClick={toggleSession}
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-[0_10px_25px_-5px_rgba(196,151,106,0.4)] relative",
                        isActive && !isPaused ? "bg-gold text-white" : 
                        isPaused ? "bg-yellow-500 text-white" :
                        "bg-gold text-white"
                      )}
                    >
                      <Mic size={24} className={cn(isActive && !isPaused && "animate-pulse")} />
                    </button>
                    <span className="text-[10px] font-bold text-dark/30 uppercase tracking-widest">
                      {isActive ? (isPaused ? "Paused" : "Listening...") : "Tap to speak"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Bottom Info Section */}
      <div className="mt-auto px-4 md:px-10 pb-6 pt-4 flex flex-col gap-4 z-10">
        
        {/* Mobile Settings Badges (Moved to bottom) */}
        <div className="md:hidden flex flex-wrap justify-center gap-2 mt-2">
          {mode === 'roleplay' && selectedSituation ? (
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-beige/30 shadow-sm text-sm">
              <span>{SITUATIONS.find(s => s.id === selectedSituation)?.icon}</span>
              <span className="font-bold text-dark/80">{SITUATIONS.find(s => s.id === selectedSituation)?.title}</span>
            </div>
          ) : (mode?.includes('vocabulary') || mode?.includes('listening')) ? (
             <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-beige/30 shadow-sm text-sm font-bold text-dark/80 capitalize">
               {level} {mode}
             </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-beige/30 shadow-sm text-sm font-bold text-dark/80 capitalize">
               {mode} Mode
            </div>
          )}
        </div>

        {/* Live Accuracy and Corrections */}
        {!(mode?.includes('vocabulary') || mode?.includes('listening')) && isActive && (
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 w-full">
            {/* Accuracy Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[32px] shadow-[0_12px_32px_-8px_rgba(44,35,24,0.06)] border border-beige/20 min-w-[200px]"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-dark/30 block mb-3">Live Accuracy</span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-serif font-bold text-dark">{accuracy}%</span>
              {accuracy !== prevAccuracy && (
                <span className={cn(
                  "text-sm font-bold",
                  accuracy > prevAccuracy ? "text-green-500" : "text-red-500"
                )}>
                  {accuracy > prevAccuracy ? '+' : ''}{accuracy - prevAccuracy}%
                </span>
              )}
            </div>
          </motion.div>

          {/* Recent Correction Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[32px] shadow-[0_12px_32px_-8px_rgba(44,35,24,0.06)] border border-beige/20 max-w-[320px] w-full"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-dark/30">Recent Correction</span>
              {lastFeedback && lastFeedback.mistakes.length > 0 && <AlertCircle size={14} className="text-red-400 animate-pulse" />}
            </div>
            {lastFeedback ? (
              <div className="space-y-3">
                <div className="text-sm text-dark font-medium leading-relaxed bg-green-50/50 p-3 rounded-2xl border border-green-100/50 italic">
                  "{lastFeedback.correctedSentence}"
                </div>
                {lastFeedback.mistakes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lastFeedback.mistakes.map((m, i) => (
                      <span key={i} className="text-[9px] font-bold uppercase tracking-widest text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                        {m.original} → {m.correction}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-dark/20 italic">No corrections yet</p>
            )}
          </motion.div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => {
          setIsSettingsOpen(false);
          // Apply settings immediately if session is active
          const localSettings = localStorage.getItem('user_settings');
          if (localSettings && geminiRef.current) {
            const parsed = JSON.parse(localSettings);
            geminiRef.current.setVoiceName(parsed.voice_name || 'Kore');
            geminiRef.current.setPlaybackRate(parsed.playback_speed || 1.3);
          }
        }} 
      />
    </div>
  );
}

function ControlButton({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all relative",
        active ? "bg-gold text-cream shadow-lg shadow-gold/20" : "bg-white text-dark/40 hover:text-dark/60 hover:bg-beige/50 border border-beige-mid/20"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-cream">
          {badge}
        </span>
      )}
    </button>
  );
}

function AccuracyBar({ label, value }: { label: string, value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-dark/40 uppercase tracking-widest mb-2">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 bg-beige rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className="h-full bg-gold rounded-full" 
        />
      </div>
    </div>
  );
}
