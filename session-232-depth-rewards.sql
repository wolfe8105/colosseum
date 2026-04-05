-- SESSION 232: Profile Depth Reward System
-- Replaces fake discount waterfall with real power-up + cosmetic rewards
--
-- Run in Supabase SQL Editor. Safe to re-run (all statements are idempotent).
-- ================================================================

-- 1. Tracking table: prevents double-claiming section rewards
CREATE TABLE IF NOT EXISTS profile_depth_rewards (
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  section_id TEXT        NOT NULL,
  power_up_id TEXT       NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section_id)
);

ALTER TABLE profile_depth_rewards ENABLE ROW LEVEL SECURITY;

-- Drop policy first if it exists (makes re-run safe)
DROP POLICY IF EXISTS "Users can read own depth rewards" ON profile_depth_rewards;
CREATE POLICY "Users can read own depth rewards"
  ON profile_depth_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Four permanent cosmetic items at 25/50/75/100% depth
-- Idempotent: skips any that already exist by name
INSERT INTO cosmetic_items (name, category, unlock_type, depth_threshold, sort_order, tier, unlock_condition)
SELECT 'Deep Diver', 'title', 'depth', 0.25, 200, 1, 'Complete 25% of your profile'
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Deep Diver');

INSERT INTO cosmetic_items (name, category, unlock_type, depth_threshold, sort_order, tier, unlock_condition)
SELECT 'Insight Frame', 'border', 'depth', 0.50, 201, 2, 'Complete 50% of your profile'
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Insight Frame');

INSERT INTO cosmetic_items (name, category, unlock_type, depth_threshold, sort_order, tier, unlock_condition)
SELECT 'Scholar''s Aura', 'profile_background', 'depth', 0.75, 202, 3, 'Complete 75% of your profile'
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Scholar''s Aura');

INSERT INTO cosmetic_items (name, category, unlock_type, depth_threshold, sort_order, tier, unlock_condition)
SELECT 'Grand Reveal', 'entrance_animation', 'depth', 1.00, 203, 3, 'Complete 100% of your profile'
WHERE NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE name = 'Grand Reveal');

-- 3. RPC: claim a free power-up when a section is completed
CREATE OR REPLACE FUNCTION public.claim_section_reward(p_section_id TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_power_up_id TEXT;
  v_power_up_name TEXT;
  v_new_qty INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Section → power-up mapping (5 of each type across 20 sections)
  CASE p_section_id
    WHEN 'basics'        THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'politics'      THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    WHEN 'sports'        THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'entertainment' THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'debate_style'  THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'opinions'      THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'values'        THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    WHEN 'media'         THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'lifestyle'     THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'competition'   THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'social'        THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'identity'      THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    WHEN 'money'         THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'health'        THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'technology'    THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'food'          THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'shopping'      THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    WHEN 'trust'         THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'wheels'        THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'persuasion'    THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    ELSE
      RETURN json_build_object('success', false, 'error', 'Unknown section');
  END CASE;

  -- Duplicate check
  IF EXISTS (
    SELECT 1 FROM profile_depth_rewards
    WHERE user_id = v_uid AND section_id = p_section_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed');
  END IF;

  -- Record claim
  INSERT INTO profile_depth_rewards (user_id, section_id, power_up_id)
  VALUES (v_uid, p_section_id, v_power_up_id);

  -- Grant power-up (upsert into inventory)
  INSERT INTO user_power_ups (user_id, power_up_id, quantity)
  VALUES (v_uid, v_power_up_id, 1)
  ON CONFLICT (user_id, power_up_id)
  DO UPDATE SET quantity = user_power_ups.quantity + 1
  RETURNING quantity INTO v_new_qty;

  RETURN json_build_object(
    'success', true,
    'power_up_id', v_power_up_id,
    'power_up_name', v_power_up_name,
    'new_quantity', v_new_qty
  );
END;
$$;
