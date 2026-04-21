-- Session 292: expire_stale_debates — zombie debate cleanup
-- pg_cron job runs every 5 minutes
-- Per F-61 spec from Session 279

CREATE OR REPLACE FUNCTION public.expire_stale_debates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count integer := 0;
  v_batch integer := 0;
BEGIN
  -- Cancel debates that are pending/waiting/live with no opponent for 30+ minutes
  UPDATE arena_debates
  SET status = 'cancelled'
  WHERE status IN ('pending', 'waiting', 'live')
    AND debater_b IS NULL
    AND created_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Also cancel debates stuck in 'matched' status for 10+ minutes
  -- (match found but debate never started)
  UPDATE arena_debates
  SET status = 'cancelled'
  WHERE status = 'matched'
    AND created_at < NOW() - INTERVAL '10 minutes'
    AND debater_b IS NULL;

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  v_count := v_count + v_batch;

  RETURN v_count;
END;
$$;

-- Schedule: every 5 minutes
SELECT cron.schedule(
  'expire-stale-debates',
  '*/5 * * * *',
  'SELECT expire_stale_debates()'
);
