-- ============================================================
-- COLOSSEUM MIGRATION: Voice Memo Support (Item 14.3.3.2)
-- Run AFTER colosseum-schema-production.sql
-- Adds voice memo columns to hot_takes table
-- Creates Supabase Storage bucket for audio files
-- ============================================================

-- Add voice memo columns to hot_takes
ALTER TABLE public.hot_takes
  ADD COLUMN IF NOT EXISTS voice_memo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS voice_memo_path TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS voice_memo_duration INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_id UUID DEFAULT NULL REFERENCES public.hot_takes(id) ON DELETE SET NULL;

-- Allow content to be nullable for voice-only takes
ALTER TABLE public.hot_takes
  ALTER COLUMN content DROP NOT NULL;

-- Add default text for voice takes that have no text
ALTER TABLE public.hot_takes
  ADD CONSTRAINT hot_takes_has_content
  CHECK (content IS NOT NULL OR voice_memo_url IS NOT NULL);

-- Index for finding voice takes
CREATE INDEX IF NOT EXISTS idx_hot_takes_voice ON public.hot_takes(voice_memo_url)
  WHERE voice_memo_url IS NOT NULL;

-- Index for threaded replies
CREATE INDEX IF NOT EXISTS idx_hot_takes_parent ON public.hot_takes(parent_id)
  WHERE parent_id IS NOT NULL;

-- ============================================================
-- STORAGE BUCKET
-- Note: You must also create this bucket in Supabase Dashboard:
-- Storage → New Bucket → Name: "debate-audio" → Public: ON
-- Or run this (may need to be done via Dashboard if SQL doesn't work):
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('debate-audio', 'debate-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload their own audio
CREATE POLICY "Users upload own audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'debate-audio'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'voice-memos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Anyone can read audio (public playback)
CREATE POLICY "Public audio read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'debate-audio');

-- Users can delete their own audio
CREATE POLICY "Users delete own audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'debate-audio'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
