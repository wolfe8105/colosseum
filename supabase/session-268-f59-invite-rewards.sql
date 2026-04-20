-- ============================================================
-- F-59 — Invite Rewards (Growth Loop)
-- Session 268 | April 12, 2026
-- ============================================================

-- ── 1. ref_code column on profiles ───────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ref_code TEXT UNIQUE;

-- ── 2. referrals table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referrals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ref_code            TEXT NOT NULL,
  invitee_ip          TEXT,
  invitee_device_id   TEXT,
  invitee_email_domain TEXT,
  status              TEXT NOT NULL DEFAULT 'clicked'
    CHECK (status IN ('clicked','signed_up','converted','rejected_fraud','paid')),
  fraud_reason        TEXT,
  clicked_at          TIMESTAMPTZ DEFAULT now(),
  signed_up_at        TIMESTAMPTZ,
  converted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_invitee
  ON public.referrals(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_ref_code_status
  ON public.referrals(ref_code, status);
CREATE INDEX IF NOT EXISTS idx_referrals_ip_device
  ON public.referrals(invitee_ip, invitee_device_id)
  WHERE status = 'clicked';

-- ── 3. invite_rewards_log table ──────────────────────────

CREATE TABLE IF NOT EXISTS public.invite_rewards_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone       INTEGER NOT NULL,
  reward_type     TEXT NOT NULL
    CHECK (reward_type IN ('legendary_powerup','mythic_powerup','mythic_modifier')),
  reward_effect_id INTEGER,    -- populated at claim time (user picks item)
  claimed         BOOLEAN NOT NULL DEFAULT false,
  pending_review  BOOLEAN NOT NULL DEFAULT false,
  awarded_at      TIMESTAMPTZ DEFAULT now(),
  claimed_at      TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_rewards_user_unclaimed
  ON public.invite_rewards_log(user_id)
  WHERE claimed = false;

-- ── 4. RLS ───────────────────────────────────────────────

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_rewards_log ENABLE ROW LEVEL SECURITY;

-- Referrers see their own rows; invitees cannot see referral rows at all
DROP POLICY IF EXISTS referrals_referrer_read ON public.referrals;
CREATE POLICY referrals_referrer_read ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid());

DROP POLICY IF EXISTS invite_rewards_own ON public.invite_rewards_log;
CREATE POLICY invite_rewards_own ON public.invite_rewards_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── 5. RPC: get_my_invite_link ───────────────────────────
-- Returns the caller's stable ref_code, generating it on first call.
-- Gated behind Plinko completion (onboarding_complete flag).

CREATE OR REPLACE FUNCTION public.get_my_invite_link()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_ref_code    TEXT;
  v_onboarded   BOOLEAN;
  v_candidate   TEXT;
  v_attempt     INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Check onboarding gate
  SELECT (username IS NOT NULL), ref_code
  INTO v_onboarded, v_ref_code
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT v_onboarded THEN
    RETURN jsonb_build_object('error', 'onboarding_incomplete');
  END IF;

  -- Return existing code
  IF v_ref_code IS NOT NULL THEN
    RETURN jsonb_build_object('ref_code', v_ref_code, 'url', 'https://themoderator.app/i/' || v_ref_code);
  END IF;

  -- Generate a unique 5-char base36 code
  LOOP
    v_candidate := lower(substring(md5(v_user_id::text || now()::text || v_attempt::text) FROM 1 FOR 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE ref_code = v_candidate);
    v_attempt := v_attempt + 1;
    IF v_attempt > 20 THEN
      RETURN jsonb_build_object('error', 'code_generation_failed');
    END IF;
  END LOOP;

  UPDATE public.profiles SET ref_code = v_candidate WHERE id = v_user_id;

  RETURN jsonb_build_object('ref_code', v_candidate, 'url', 'https://themoderator.app/i/' || v_candidate);
END;
$$;

-- ── 6. RPC: record_invite_click ──────────────────────────
-- Called from the /i/:code API route (unauthenticated context, service role).
-- Inserts a 'clicked' referral row.

CREATE OR REPLACE FUNCTION public.record_invite_click(
  p_ref_code    TEXT,
  p_device_id   TEXT DEFAULT NULL,
  p_ip          TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Resolve ref code → referrer
  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE ref_code = p_ref_code;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_code');
  END IF;

  -- Insert click row (don't fail if duplicate — best-effort)
  INSERT INTO public.referrals (referrer_user_id, ref_code, invitee_ip, invitee_device_id)
  VALUES (v_referrer_id, p_ref_code, p_ip, p_device_id);

  RETURN jsonb_build_object('ok', true, 'referrer_id', v_referrer_id);
END;
$$;

-- ── 7. RPC: attribute_signup ─────────────────────────────
-- Called from plinko.ts after account creation.
-- Matches the new user to the most recent clicked row for the ref code.

CREATE OR REPLACE FUNCTION public.attribute_signup(
  p_ref_code  TEXT,
  p_device_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitee_id  UUID := auth.uid();
  v_referral_id UUID;
  v_referrer_id UUID;
BEGIN
  IF v_invitee_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Block self-invite
  SELECT id INTO v_referrer_id FROM public.profiles WHERE ref_code = p_ref_code;
  IF v_referrer_id = v_invitee_id THEN
    RETURN jsonb_build_object('error', 'self_invite');
  END IF;

  -- Block existing users (invitee already has a profile with wins/losses)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_invitee_id AND (wins > 0 OR losses > 0 OR username IS NOT NULL)
  ) THEN
    RETURN jsonb_build_object('error', 'existing_user');
  END IF;

  -- Device fingerprint fraud check
  IF p_device_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrer_user_id = v_referrer_id
      AND invitee_device_id = p_device_id
      AND status IN ('signed_up','converted')
  ) THEN
    -- Mark as fraud but don't block the signup itself
    INSERT INTO public.referrals
      (referrer_user_id, invitee_user_id, ref_code, invitee_device_id, status, fraud_reason)
    VALUES
      (v_referrer_id, v_invitee_id, p_ref_code, p_device_id, 'rejected_fraud', 'shared_device');
    RETURN jsonb_build_object('error', 'fraud_shared_device');
  END IF;

  -- Match to most recent clicked row for this code within 30 days
  SELECT id INTO v_referral_id
  FROM public.referrals
  WHERE ref_code = p_ref_code
    AND status = 'clicked'
    AND clicked_at > now() - INTERVAL '30 days'
  ORDER BY clicked_at DESC
  LIMIT 1;

  IF v_referral_id IS NULL THEN
    -- No click row found; insert a fresh signed_up row anyway (fallback attribution)
    INSERT INTO public.referrals
      (referrer_user_id, invitee_user_id, ref_code, invitee_device_id, status, signed_up_at)
    VALUES
      (v_referrer_id, v_invitee_id, p_ref_code, p_device_id, 'signed_up', now());
  ELSE
    UPDATE public.referrals
    SET status = 'signed_up',
        invitee_user_id = v_invitee_id,
        invitee_device_id = COALESCE(invitee_device_id, p_device_id),
        signed_up_at = now()
    WHERE id = v_referral_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 8. RPC: convert_referral ─────────────────────────────
-- Called internally from end-of-debate RPC when a user completes
-- their first ranked debate. Awards 500 tokens to invitee,
-- increments referrer's milestone counter, inserts reward rows.

CREATE OR REPLACE FUNCTION public.convert_referral(
  p_invitee_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id   UUID;
  v_referrer_id   UUID;
  v_invite_count  INTEGER;
  v_reward_type   TEXT;
  v_milestone     INTEGER;
BEGIN
  -- Find the signed_up referral for this invitee
  SELECT id, referrer_user_id INTO v_referral_id, v_referrer_id
  FROM public.referrals
  WHERE invitee_user_id = p_invitee_user_id
    AND status = 'signed_up'
  ORDER BY signed_up_at DESC
  LIMIT 1;

  IF v_referral_id IS NULL THEN
    -- No referral to convert — normal (user came in organically)
    RETURN jsonb_build_object('ok', true, 'converted', false);
  END IF;

  -- Flip status
  UPDATE public.referrals
  SET status = 'converted', converted_at = now()
  WHERE id = v_referral_id;

  -- Award 500 tokens to invitee as welcome gift
  UPDATE public.profiles
  SET token_balance = token_balance + 500
  WHERE id = p_invitee_user_id;

  -- Count successful invites for referrer (now including this one)
  SELECT COUNT(*) INTO v_invite_count
  FROM public.referrals
  WHERE referrer_user_id = v_referrer_id AND status = 'converted';

  -- Milestone evaluation
  -- 1 invite → Legendary power-up
  -- 5 invites → Mythic power-up
  -- 25 invites → Mythic modifier (pending_review=true)
  -- Every 25 after 25 → Mythic power-up
  IF v_invite_count = 1 THEN
    v_milestone := 1; v_reward_type := 'legendary_powerup';
  ELSIF v_invite_count = 5 THEN
    v_milestone := 5; v_reward_type := 'mythic_powerup';
  ELSIF v_invite_count = 25 THEN
    v_milestone := 25; v_reward_type := 'mythic_modifier';
  ELSIF v_invite_count > 25 AND (v_invite_count - 25) % 25 = 0 THEN
    v_milestone := v_invite_count; v_reward_type := 'mythic_powerup';
  END IF;

  IF v_reward_type IS NOT NULL THEN
    INSERT INTO public.invite_rewards_log
      (user_id, milestone, reward_type, pending_review)
    VALUES (
      v_referrer_id,
      v_milestone,
      v_reward_type,
      v_reward_type = 'mythic_modifier'  -- manual review for the big one
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'converted', true,
    'invite_count', v_invite_count,
    'reward_granted', v_reward_type IS NOT NULL,
    'reward_type', v_reward_type
  );
END;
$$;

-- ── 9. RPC: claim_invite_reward ──────────────────────────
-- User picks an effect from the eligible tier and claims their reward.

CREATE OR REPLACE FUNCTION public.claim_invite_reward(
  p_reward_id   UUID,
  p_effect_id   INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_reward      RECORD;
  v_effect      RECORD;
  v_tier_ok     BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_reward
  FROM public.invite_rewards_log
  WHERE id = p_reward_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'reward_not_found');
  END IF;

  IF v_reward.claimed THEN
    RETURN jsonb_build_object('error', 'already_claimed');
  END IF;

  IF v_reward.pending_review THEN
    RETURN jsonb_build_object('error', 'pending_review');
  END IF;

  -- Validate effect matches reward tier
  SELECT * INTO v_effect FROM public.modifier_effects WHERE effect_num = p_effect_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_effect');
  END IF;

  v_tier_ok := CASE v_reward.reward_type
    WHEN 'legendary_powerup' THEN v_effect.tier_gate = 'legendary'
    WHEN 'mythic_powerup'    THEN v_effect.tier_gate = 'mythic'
    WHEN 'mythic_modifier'   THEN v_effect.tier_gate = 'mythic'
    ELSE false
  END;

  IF NOT v_tier_ok THEN
    RETURN jsonb_build_object('error', 'tier_mismatch');
  END IF;

  -- Add to inventory
  IF v_reward.reward_type IN ('legendary_powerup','mythic_powerup') THEN
    INSERT INTO public.user_powerups (user_id, effect_id, quantity)
    VALUES (v_user_id, v_effect.id, 1)
    ON CONFLICT (user_id, effect_id)
    DO UPDATE SET quantity = user_powerups.quantity + 1;
  ELSE
    -- mythic_modifier → user_modifiers
    INSERT INTO public.user_modifiers (user_id, effect_id)
    VALUES (v_user_id, v_effect.id);
  END IF;

  -- Mark claimed
  UPDATE public.invite_rewards_log
  SET claimed = true, claimed_at = now(), reward_effect_id = p_effect_id
  WHERE id = p_reward_id;

  RETURN jsonb_build_object('ok', true, 'effect_id', p_effect_id, 'effect_name', v_effect.name);
END;
$$;

-- ── 10. RPC: get_my_invite_stats ─────────────────────────
-- Returns everything the Invite & Rewards screen needs.

CREATE OR REPLACE FUNCTION public.get_my_invite_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_ref_code       TEXT;
  v_total_clicks   INTEGER;
  v_total_signups  INTEGER;
  v_total_converts INTEGER;
  v_unclaimed      JSONB;
  v_activity       JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT ref_code INTO v_ref_code FROM public.profiles WHERE id = v_user_id;

  -- Auto-generate ref_code if user doesn't have one yet
  IF v_ref_code IS NULL THEN
    PERFORM get_my_invite_link();
    SELECT ref_code INTO v_ref_code FROM public.profiles WHERE id = v_user_id;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status = 'clicked')   INTO v_total_clicks
  FROM public.referrals WHERE referrer_user_id = v_user_id;

  SELECT
    COUNT(*) FILTER (WHERE status = 'signed_up') INTO v_total_signups
  FROM public.referrals WHERE referrer_user_id = v_user_id;

  SELECT
    COUNT(*) FILTER (WHERE status = 'converted') INTO v_total_converts
  FROM public.referrals WHERE referrer_user_id = v_user_id;

  -- Unclaimed rewards
  SELECT jsonb_agg(jsonb_build_object(
    'id',             id,
    'milestone',      milestone,
    'reward_type',    reward_type,
    'pending_review', pending_review,
    'awarded_at',     awarded_at
  ) ORDER BY awarded_at DESC)
  INTO v_unclaimed
  FROM public.invite_rewards_log
  WHERE user_id = v_user_id AND claimed = false;

  -- Recent activity (last 20 referral events, show username not email)
  SELECT jsonb_agg(jsonb_build_object(
    'status',        r.status,
    'username',      p.username,
    'event_at',      COALESCE(r.converted_at, r.signed_up_at, r.clicked_at)
  ) ORDER BY COALESCE(r.converted_at, r.signed_up_at, r.clicked_at) DESC)
  INTO v_activity
  FROM public.referrals r
  LEFT JOIN public.profiles p ON p.id = r.invitee_user_id
  WHERE r.referrer_user_id = v_user_id
    AND r.status != 'rejected_fraud'
  LIMIT 20;

  RETURN jsonb_build_object(
    'ref_code',       v_ref_code,
    'invite_url',     CASE WHEN v_ref_code IS NOT NULL
                        THEN 'https://themoderator.app/i/' || v_ref_code
                        ELSE NULL END,
    'total_clicks',   COALESCE(v_total_clicks, 0),
    'total_signups',  COALESCE(v_total_signups, 0),
    'total_converts', COALESCE(v_total_converts, 0),
    'next_milestone', CASE
      WHEN COALESCE(v_total_converts,0) < 1  THEN 1
      WHEN COALESCE(v_total_converts,0) < 5  THEN 5
      WHEN COALESCE(v_total_converts,0) < 25 THEN 25
      ELSE (FLOOR((COALESCE(v_total_converts,0) - 25)::float / 25) + 1)::int * 25 + 25
    END,
    'unclaimed_rewards', COALESCE(v_unclaimed, '[]'::jsonb),
    'activity',          COALESCE(v_activity, '[]'::jsonb)
  );
END;
$$;
