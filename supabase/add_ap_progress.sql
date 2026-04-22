-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- Adds an ap_progress JSONB column to the existing profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ap_progress JSONB DEFAULT '{}';

-- The column stores data like:
-- {
--   "conversation": [1, 2, 3],     -- completed AP conversation prompt IDs
--   "speaking": [1, 2]              -- completed AP cultural comparison prompt IDs
-- }

COMMENT ON COLUMN profiles.ap_progress IS 'Tracks completed AP exam prompts per mode';
