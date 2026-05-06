-- ============================================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Vocab questions table (you upload questions here)
CREATE TABLE IF NOT EXISTS vocab_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL,                              -- 'French' or 'Spanish'
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  question_text TEXT NOT NULL,                         -- e.g. "Which word means 'library'?"
  audio_file_key TEXT,                                 -- storage path in vocab-audio bucket
  options JSONB NOT NULL DEFAULT '[]',                 -- [{text: "...", is_correct: bool}]
  theme TEXT,                                          -- e.g. "Education", "Environment"
  correct_answer TEXT NOT NULL,                        -- the correct translation/definition
  word TEXT NOT NULL,                                  -- the word being tested
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Per-user vocab progress (algorithm uses this)
CREATE TABLE IF NOT EXISTS vocab_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES vocab_questions(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  attempts INT DEFAULT 0,
  correct_count INT DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 3. Add AP progress column to profiles (if profiles table exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ap_progress JSONB DEFAULT '{}';

-- 4. Enable Row Level Security
ALTER TABLE vocab_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_progress ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Anyone authenticated can read questions
CREATE POLICY "Authenticated can read vocab questions"
  ON vocab_questions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only see/modify their own progress
CREATE POLICY "Users read own vocab progress"
  ON vocab_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own vocab progress"
  ON vocab_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own vocab progress"
  ON vocab_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- Storage Buckets (run in Supabase Dashboard > Storage)
-- OR use the SQL below if you have storage schema access:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ap-audio', 'ap-audio', false) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vocab-audio', 'vocab-audio', false) ON CONFLICT DO NOTHING;

-- Storage RLS for ap-audio (authenticated read, service-role write)
-- CREATE POLICY "Auth users can read ap audio" ON storage.objects FOR SELECT USING (bucket_id = 'ap-audio' AND auth.role() = 'authenticated');
-- CREATE POLICY "Auth users can read vocab audio" ON storage.objects FOR SELECT USING (bucket_id = 'vocab-audio' AND auth.role() = 'authenticated');

-- ============================================================
-- Sample vocab question insert (French, Easy)
-- ============================================================
-- INSERT INTO vocab_questions (language, difficulty, word, question_text, correct_answer, options, theme)
-- VALUES (
--   'French', 'easy', 'la bibliothèque',
--   'Select the correct English translation',
--   'the library',
--   '[{"text":"the library","is_correct":true},{"text":"the bookstore","is_correct":false},{"text":"the museum","is_correct":false},{"text":"the school","is_correct":false}]',
--   'Education'
-- );
