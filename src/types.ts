export type Language = 
  | 'French' 
  | 'Spanish'
  | 'Japanese'
  | 'German'
  | 'Hindi'
  | 'Arabic'
  | 'Portuguese'
  | 'Russian'
  | 'Korean'
  | 'Italian'
  | 'Turkish'
  | 'Vietnamese'
  | 'Indonesian'
  | 'Bengali'
  | 'Marathi'
  | 'Tamil';

export type UserLevel = 
  | 'Beginner 1' | 'Beginner 2' | 'Beginner 3' 
  | 'Intermediate 1' | 'Intermediate 2' | 'Intermediate 3' 
  | 'Advanced 1' | 'Advanced 2' | 'Advanced 3';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  selected_languages: Language[];
  level_per_language: Record<Language, UserLevel>;
  total_time: number; // in seconds
  subscription_status: 'free' | 'supporter';
  settings?: {
    voice_name: string;
    playback_speed: number;
  };
}

export interface Session {
  id: string;
  user_id: string;
  mode: string;
  language: Language;
  accuracy_score: number;
  transcript: { role: 'user' | 'ai'; text: string }[];
  created_at: string;
}

export interface Mistake {
  id: string;
  user_id: string;
  session_id?: string;
  original_text: string;
  corrected_text: string;
  severity: number; // 0 to 10
  confidence: number; // 0 to 100
  explanation: string;
  language: Language;
  created_at: string;
}
