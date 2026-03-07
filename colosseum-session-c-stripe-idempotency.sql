-- ============================================================
-- COLOSSEUM — SESSION C: Stripe Idempotency Table
-- Migration #21
-- Fixes: LM-130 (double-fire on retries)
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Table to track processed Stripe event IDs
-- Primary key prevents duplicate inserts — atomic idempotency
CREATE TABLE IF NOT EXISTS stripe_processed_events (
  id TEXT PRIMARY KEY,                         -- Stripe event ID (e.g. evt_xxxxx)
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT                              -- for debugging (e.g. checkout.session.completed)
);

-- Only service_role can touch this table
ALTER TABLE stripe_processed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_events_service_only"
  ON stripe_processed_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for cleanup queries (purge old events after 30 days)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
  ON stripe_processed_events (processed_at);

-- Optional: auto-cleanup function (run via pg_cron if desired)
-- Keeps the table small. Old events beyond Stripe's 3-day retry window are safe to delete.
CREATE OR REPLACE FUNCTION purge_old_stripe_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM stripe_processed_events
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$;
