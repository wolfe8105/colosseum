-- ============================================================
-- THE COLOSSEUM — BOT ARMY DATABASE SUPPORT
-- Paste this into Supabase SQL Editor AFTER your existing schema.
-- Creates the bot_activity tracking table + bot user account.
-- Fixed Session 27: leg constraint includes 3 for auto-debates.
-- ============================================================

-- 1. Bot activity tracking table
CREATE TABLE IF NOT EXISTS bot_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  leg INTEGER NOT NULL CHECK (leg IN (1, 2, 3)),
  platform TEXT NOT NULL,                          -- 'reddit', 'twitter', 'discord', 'news', 'supabase'
  action_type TEXT NOT NULL,                       -- 'reply', 'post', 'scan', 'debate_created', 'auto_debate_created'
  source_url TEXT,
  generated_text TEXT,
  debate_id UUID,                                  -- references hot_takes(id) or auto_debates(id)
  success BOOLEAN DEFAULT true NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for stats queries
CREATE INDEX IF NOT EXISTS idx_bot_activity_created ON bot_activity (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_activity_leg ON bot_activity (leg, platform);
CREATE INDEX IF NOT EXISTS idx_bot_activity_type ON bot_activity (action_type);

-- RLS: bot_activity is server-side only (service role key bypasses RLS)
ALTER TABLE bot_activity ENABLE ROW LEVEL SECURITY;
-- No public policies — only service role can read/write

-- 2. Add bot-specific columns to hot_takes (if they don't exist)
-- These let you filter bot-generated content from human content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hot_takes' AND column_name = 'is_bot_generated'
  ) THEN
    ALTER TABLE hot_takes ADD COLUMN is_bot_generated BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hot_takes' AND column_name = 'source_headline'
  ) THEN
    ALTER TABLE hot_takes ADD COLUMN source_headline TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hot_takes' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE hot_takes ADD COLUMN source_url TEXT;
  END IF;
END $$;

-- 3. View: bot stats summary (handy for monitoring)
CREATE OR REPLACE VIEW bot_stats_24h AS
SELECT
  leg,
  platform,
  action_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE success = true) AS successes,
  COUNT(*) FILTER (WHERE success = false) AS failures,
  MIN(created_at) AS first_action,
  MAX(created_at) AS last_action
FROM bot_activity
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY leg, platform, action_type
ORDER BY leg, platform;

-- ============================================================
-- DONE. The bot army now has database support.
-- ============================================================
