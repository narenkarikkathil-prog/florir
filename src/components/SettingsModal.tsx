import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Gauge, Check, Mic } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

const VOICES = [
  { id: 'Kore', name: 'Kore (Recommended)', desc: 'Soft and calm female voice - Best for learning' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Balanced and clear' },
  { id: 'Puck', name: 'Puck', desc: 'Energetic and bright' },
  { id: 'Charon', name: 'Charon', desc: 'Deep and steady' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Bold and authoritative' },
];

const SPEEDS = [
  { label: 'Slower', value: 0.7 },
  { label: 'Slow', value: 1.0 },
  { label: 'Normal', value: 1.3 },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [voice, setVoice] = useState('Kore');
  const [speed, setSpeed] = useState(1.3);
  const [selectedMic, setSelectedMic] = useState('');
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      fetchMics();
    }
  }, [isOpen]);

  const fetchMics = async () => {
    try {
      // Request permission briefly to get device labels if not already available
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setMics(audioInputs);
    } catch (err) {
      console.error("Error fetching microphones:", err);
    }
  };

  const fetchSettings = async () => {
    // Try localStorage first for speed and fallback
    const localSettings = localStorage.getItem('user_settings');
    if (localSettings) {
      const parsed = JSON.parse(localSettings);
      setVoice('Kore'); // Force Kore
      setSpeed(parsed.playback_speed || 1.3);
      setSelectedMic(parsed.microphone_id || '');
    }

    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();
      
      if (profile?.settings) {
        setVoice('Kore'); // Force Kore
        setSpeed(profile.settings.playback_speed || 1.3);
        setSelectedMic(profile.settings.microphone_id || '');
        localStorage.setItem('user_settings', JSON.stringify({ 
          ...profile.settings, 
          voice_name: 'Kore' 
        }));
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const newSettings = {
      voice_name: 'Kore', // Force Kore
      playback_speed: speed,
      microphone_id: selectedMic
    };
    
    localStorage.setItem('user_settings', JSON.stringify(newSettings));

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase
            .from('profiles')
            .update({ settings: newSettings })
            .eq('id', user.id);
        } catch (err) {
          console.warn("Could not save settings to Supabase, using localStorage only:", err);
        }
      }
    }
    setIsSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-dark/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl border border-beige-mid/20 overflow-hidden"
          >
            <div className="p-8 border-b border-beige-mid/10 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Voice Settings</h2>
              <button onClick={onClose} className="p-2 hover:bg-beige rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Voice Selection - Removed as per request, keeping only Kore internally */}
              <div className="bg-beige/20 p-6 rounded-3xl border border-beige-mid/10">
                <div className="flex items-center gap-3 text-gold mb-2">
                  <Volume2 size={20} />
                  <span className="font-serif font-bold text-lg text-dark">Voice Profile</span>
                </div>
                <p className="text-sm text-dark/60">
                  Using a <strong>natural voice profile</strong> optimized for clear pronunciation and language learning.
                </p>
              </div>

              {/* Speed Selection */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-dark/40 uppercase tracking-widest text-xs font-bold">
                  <Gauge size={14} /> Playback Speed
                </div>
                <div className="flex flex-wrap gap-2">
                  {SPEEDS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSpeed(s.value)}
                      className={cn(
                        "flex-1 min-w-[80px] py-3 rounded-xl border-2 transition-all font-bold text-sm",
                        speed === s.value 
                          ? "border-gold bg-gold text-cream" 
                          : "border-beige-mid/10 hover:border-beige-mid/30 text-dark/40"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Microphone Selection */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-dark/40 uppercase tracking-widest text-xs font-bold">
                  <Mic size={14} /> Microphone Source
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedMic('')}
                    className={cn(
                      "w-full px-5 py-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                      selectedMic === '' 
                        ? "border-gold bg-gold/5 shadow-sm" 
                        : "border-beige-mid/10 hover:border-beige-mid/30"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className={cn("font-bold text-sm", selectedMic === '' ? "text-dark" : "text-dark/60")}>
                        System Default
                      </span>
                    </div>
                    {selectedMic === '' && <Check size={18} className="text-gold" />}
                  </button>

                  {mics.map((mic) => (
                    <button
                      key={mic.deviceId}
                      onClick={() => setSelectedMic(mic.deviceId)}
                      className={cn(
                        "w-full px-5 py-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                        selectedMic === mic.deviceId 
                          ? "border-gold bg-gold/5 shadow-sm" 
                          : "border-beige-mid/10 hover:border-beige-mid/30"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className={cn("font-bold text-sm truncate max-w-[280px]", selectedMic === mic.deviceId ? "text-dark" : "text-dark/60")}>
                          {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}...`}
                        </span>
                      </div>
                      {selectedMic === mic.deviceId && <Check size={18} className="text-gold" />}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-8 bg-beige/30 flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-full font-bold text-dark/60 hover:bg-beige transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-4 bg-gold text-cream rounded-full font-bold hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
