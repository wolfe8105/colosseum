-- ============================================================
-- F-36: 7-Day Onboarding Drip
-- Session 274
--
-- Day 1: Show up          → Newcomer badge
-- Day 2: First vote       → Voter badge
-- Day 3: Watch a debate   → Spectator badge
-- Day 4: Post a hot take  → Hothead badge
-- Day 5: Complete a debate→ Rookie title
-- Day 6: Fill 3+ profile  → Regular title
-- Day 7: Win a debate     → Gladiator title
--
-- Rewards delivered via cosmetics + in-app notification.
-- ============================================================

-- ── 1. Tracking table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.onboarding_drip_log (
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day          SMALLINT    NOT NULL CHECK (day BETWEEN 1 AND 7),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.onboarding_drip_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drip_owner_all" ON public.onboarding_drip_log;
CREATE POLICY "drip_owner_all" ON public.onboarding_drip_log
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 2. Seed 7 onboarding cosmetic rewards ───────────────────
-- Widen the unlock_type check constraint to include 'onboarding'
ALTER TABLE public.cosmetic_items
  DROP CONSTRAINT IF EXISTS cosmetic_items_unlock_type_check;

ALTER TABLE public.cosmetic_items
  ADD CONSTRAINT cosmetic_items_unlock_type_check
  CHECK (unlock_type IN ('free','auto','depth','token','onboarding'));

INSERT INTO public.cosmetic_items
  (name, category, tier, unlock_type, token_cost, unlock_condition, sort_order)
SELECT 'Newcomer',  'badge', 1, 'onboarding', 0, 'onboarding_day_1', 100
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Newcomer' AND unlock_type = 'onboarding');

INSERT INTO public.cosmetic_items
  (name, category, tier, unlock_type, token_cost, unlock_condition, sort_order)
SELECT 'Voter',     'badge', 1, 'onboarding', 0, 'onboarding_day_2', 101
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Voter' AND unlock_type = 'onboarding');

INSERT INTO public.cosmetic_items
  (name, category, tier, unlock_type, token_cost, unlock_condition, sort_order)
SELECT 'Spectator', 'badge', 1, 'onboarding', 0, 'onboarding_day_3', 102
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Spectator' AND unlock_type = 'onboarding');

INSERT INTO public.cosmetic_items
  (name, category, tier, unlock_type, token_cost, unlock_condition, sort_order)
SELECT 'Hothead',   'badge', 2, 'onboarding', 0, 'onboarding_day_4', 103
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Hothead' AND unlock_type = 'onboarding');

INSERT INTO public.cosmetic_items
  (name, category, tier, unlock_type, token_cost, unlock_condition, sort_order)
SELECT 'Rookie',    'title', 2, 'onboarding', 0, 'onboarding_day_5', 104
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Rookie' AND unlock_type = 'onboarding');

INSERT INTO public.cosmetic_items
  (name, category, tier, unlock_type, token_cost, unlock_condition, sort_order)
SELECT 'Regular',   'title', 3, 'onboarding', 0, 'onboarding_day_6', 105
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Regular' AND unlock_type = 'onboarding');

INSERT INTO public.cosmetic_items
  (name, category, tier, unlock_type, token_cost, unlock_condition, sort_order)
SELECT 'Gladiator', 'title', 4, 'onboarding', 0, 'onboarding_day_7', 106
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Gladiator' AND unlock_type = 'onboarding');

-- ── 3. get_onboarding_progress RPC ──────────────────────────

DROP FUNCTION IF EXISTS public.get_onboarding_progress();

CREATE OR REPLACE FUNCTION public.get_onboarding_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_signup_date  TIMESTAMPTZ;
  v_days_since   INTEGER;
  v_completed    INTEGER[];
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT created_at INTO v_signup_date FROM profiles WHERE id = v_uid;
  v_days_since := EXTRACT(EPOCH FROM (NOW() - v_signup_date)) / 86400;

  SELECT ARRAY_AGG(day ORDER BY day)
  INTO v_completed
  FROM onboarding_drip_log
  WHERE user_id = v_uid;

  RETURN json_build_object(
    'success',      true,
    'days_since',   v_days_since,
    'completed',    COALESCE(v_completed, ARRAY[]::INTEGER[]),
    'all_done',     COALESCE(ARRAY_LENGTH(v_completed, 1), 0) = 7
  );
END;
$$;

-- ── 4. complete_onboarding_day RPC ──────────────────────────

DROP FUNCTION IF EXISTS public.complete_onboarding_day(smallint);

CREATE OR REPLACE FUNCTION public.complete_onboarding_day(p_day SMALLINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_cosmetic_id   UUID;
  v_cosmetic_name TEXT;
  v_condition     TEXT := 'onboarding_day_' || p_day;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_day < 1 OR p_day > 7 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid day');
  END IF;

  -- Idempotent — if already done just return success
  IF EXISTS (SELECT 1 FROM onboarding_drip_log WHERE user_id = v_uid AND day = p_day) THEN
    RETURN json_build_object('success', true, 'already_done', true);
  END IF;

  -- Record completion
  INSERT INTO onboarding_drip_log (user_id, day)
  VALUES (v_uid, p_day)
  ON CONFLICT DO NOTHING;

  -- Grant cosmetic reward
  SELECT id, name INTO v_cosmetic_id, v_cosmetic_name
  FROM cosmetic_items
  WHERE unlock_condition = v_condition AND unlock_type = 'onboarding'
  LIMIT 1;

  IF v_cosmetic_id IS NOT NULL THEN
    INSERT INTO user_cosmetics (user_id, cosmetic_id, acquired_via)
    VALUES (v_uid, v_cosmetic_id, 'onboarding')
    ON CONFLICT DO NOTHING;
  END IF;

  -- In-app notification
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_uid,
    'system',
    'Day ' || p_day || ' Complete!',
    COALESCE(v_cosmetic_name, 'Reward') || ' unlocked. Keep it up.',
    jsonb_build_object('onboarding_day', p_day, 'cosmetic', v_cosmetic_name)
  );

  RETURN json_build_object(
    'success',        true,
    'day',            p_day,
    'cosmetic_name',  v_cosmetic_name,
    'cosmetic_id',    v_cosmetic_id
  );
END;
$$;
