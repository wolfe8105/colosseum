-- ============================================================
-- THE MODERATOR — F-57 Modifier & Power-Up System (Phase 1)
-- Session 267 | April 12, 2026
--
-- SCOPE: Database foundation only. No score_debate_comment
-- integration (Phase 2). Gives F-10 (shop) and F-59 (invite
-- rewards) real tables to build against.
--
-- TABLES (5 new):
--   modifier_effects          — catalog, all 59 effects
--   user_modifiers            — owned modifier inventory (1 row per item)
--   user_powerups             — owned power-up inventory (quantity-based)
--   reference_sockets         — permanent socket assignments
--   debate_powerup_loadout    — pre-debate staging (max 3 per user/debate)
--
-- HELPERS (2):
--   _rarity_ordinal(text)     — common=1 … mythic=5, for tier-gate compare
--   _rarity_socket_count(text)— common=1 … mythic=5 socket slots
--
-- RPCs (6):
--   get_modifier_catalog()
--   buy_modifier(effect_id)
--   buy_powerup(effect_id, quantity)
--   socket_modifier(reference_id, socket_index, modifier_id)
--   equip_powerup_for_debate(debate_id, effect_id)
--   get_user_modifier_inventory(debate_id?)
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1: CATALOG TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.modifier_effects (
  id           TEXT PRIMARY KEY,                -- slug e.g. 'token_boost'
  effect_num   INTEGER NOT NULL UNIQUE,         -- 1-59 canonical ordering
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  category     TEXT NOT NULL,                   -- see CHECK below
  timing       TEXT NOT NULL CHECK (timing IN ('end_of_debate', 'in_debate')),
  tier_gate    TEXT NOT NULL CHECK (tier_gate IN ('common','uncommon','rare','legendary','mythic')),
  mod_cost     INTEGER NOT NULL CHECK (mod_cost > 0),
  pu_cost      INTEGER NOT NULL CHECK (pu_cost > 0)
);

ALTER TABLE public.modifier_effects
  ADD CONSTRAINT modifier_effects_category_check
  CHECK (category IN (
    'token','point','reference','elo_xp','crowd','survival',
    'self_mult','self_flat','opponent_debuff','cite_triggered','conditional','special'
  ));

COMMENT ON TABLE public.modifier_effects IS
  'F-57 canonical catalog of all 59 modifier/power-up effects. Read-only for clients.';

-- RLS: public SELECT, no write
ALTER TABLE public.modifier_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modifier_effects_select_all" ON public.modifier_effects
  FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────
-- SECTION 2: SEED CATALOG — 30 END-OF-DEBATE EFFECTS
-- ────────────────────────────────────────────────────────────

INSERT INTO public.modifier_effects
  (id, effect_num, name, description, category, timing, tier_gate, mod_cost, pu_cost)
VALUES
  -- Token modifiers (1–5)
  ('token_boost',       1,  'Token Boost',       '+10% tokens earned on win via cite',                           'token',   'end_of_debate', 'common',    40,  5),
  ('token_drain',       2,  'Token Drain',       '-8% opponent tokens on survived challenge',                    'token',   'end_of_debate', 'uncommon',  60,  8),
  ('token_multiplier',  3,  'Token Multiplier',  '2× all token earnings this debate',                            'token',   'end_of_debate', 'mythic',   500, 50),
  ('tip_magnet',        4,  'Tip Magnet',        '+15% spectator tips routed to you',                            'token',   'end_of_debate', 'rare',     100, 12),
  ('streak_saver',      5,  'Streak Saver',      'Loss does not break win streak',                               'token',   'end_of_debate', 'legendary',200, 25),

  -- Point modifiers (6–12)
  ('point_surge',       6,  'Point Surge',       '+1 point added to your final score',                           'point',   'end_of_debate', 'legendary',250, 30),
  ('point_shield',      7,  'Point Shield',      'Absorbs 1 opponent point modifier',                            'point',   'end_of_debate', 'rare',     120, 15),
  ('point_siphon',      8,  'Point Siphon',      '-1 point from opponent''s final score',                        'point',   'end_of_debate', 'mythic',   500, 50),
  ('momentum',          9,  'Momentum',          '+0.5 pts per consecutive round led',                           'point',   'end_of_debate', 'rare',     100, 12),
  ('comeback_engine',  10,  'Comeback Engine',   '+2 pts when trailing by 5+ at debate end',                     'point',   'end_of_debate', 'legendary',180, 20),
  ('last_word',        11,  'Last Word',         '+3 pts if speaking final round',                               'point',   'end_of_debate', 'rare',     120, 15),
  ('pressure_cooker',  12,  'Pressure Cooker',   '-1 pt if opponent cites no references by round 3',             'point',   'end_of_debate', 'legendary',200, 22),

  -- Reference modifiers (13–18)
  ('citation_shield',  13,  'Citation Shield',   'Reference cannot be challenged this debate',                   'reference','end_of_debate', 'rare',     100, 12),
  ('double_cite',      14,  'Double Cite',       'Each citation counts as 2 for stats',                          'reference','end_of_debate', 'uncommon',  60,  8),
  ('forge_accelerator',15,  'Forge Accelerator', '+3 citations instead of 1 for this debate',                    'reference','end_of_debate', 'common',    40,  5),
  ('counter_cite',     16,  'Counter Cite',      '+1 pt when opponent cites during debate',                      'reference','end_of_debate', 'legendary',250, 28),
  ('mirror',           17,  'Mirror',            'Copy random modifier from opponent''s best ref',                'reference','end_of_debate', 'mythic',   600, 60),
  ('burn_notice',      18,  'Burn Notice',       'On win, destroy one modifier from opponent''s ref',            'reference','end_of_debate', 'mythic',   600, 55),

  -- Elo + XP modifiers (19–23)
  ('elo_shield',       19,  'Elo Shield',        '-25% Elo loss on defeat',                                      'elo_xp',  'end_of_debate', 'rare',     100, 12),
  ('elo_amplifier',    20,  'Elo Amplifier',     '+15% Elo gain on win',                                         'elo_xp',  'end_of_debate', 'uncommon',  60,  8),
  ('xp_boost',         21,  'XP Boost',          '+20% XP earned this debate',                                   'elo_xp',  'end_of_debate', 'common',    35,  4),
  ('trophy_hunter',    22,  'Trophy Hunter',     'Beat 200+ Elo above you: double all rewards',                  'elo_xp',  'end_of_debate', 'legendary',200, 22),
  ('underdog',         23,  'Underdog',          '+1 pt per round if you have lower Elo',                        'elo_xp',  'end_of_debate', 'rare',     120, 15),

  -- Crowd + spectator modifiers (24–27)
  ('crowd_pleaser',    24,  'Crowd Pleaser',     'Tips on your side move the gauge 1.5×',                        'crowd',   'end_of_debate', 'rare',     100, 12),
  ('spectator_magnet', 25,  'Spectator Magnet',  'Debate ranks higher in spectator feed',                        'crowd',   'end_of_debate', 'uncommon',  50,  6),
  ('intimidation',     26,  'Intimidation',      'Opponent sees your loadout as a warning pre-debate',           'crowd',   'end_of_debate', 'legendary',180, 20),
  ('fog_of_war',       27,  'Fog of War',        'Your loadout is hidden from Reveal power-up',                  'crowd',   'end_of_debate', 'rare',     100, 12),

  -- Survival modifiers (28–30)
  ('insurance',        28,  'Insurance',         'On loss, modifiers socketed into this ref survive intact',     'survival','end_of_debate', 'legendary',250, 28),
  ('chain_reaction',   29,  'Chain Reaction',    'On win, one modifier regenerates as a free power-up',          'survival','end_of_debate', 'mythic',   500, 45),
  ('parasite',         30,  'Parasite',          'On win, steal one modifier from opponent into inventory',       'survival','end_of_debate', 'mythic',   700, 65)

ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- SECTION 3: SEED CATALOG — 29 IN-DEBATE EFFECTS
-- ────────────────────────────────────────────────────────────

INSERT INTO public.modifier_effects
  (id, effect_num, name, description, category, timing, tier_gate, mod_cost, pu_cost)
VALUES
  -- Self multipliers on scored comments (31–37)
  ('amplify',          31,  'Amplify',           'Next scored comment ×2',                                       'self_mult','in_debate', 'rare',      120, 15),
  ('surge',            32,  'Surge',             'Next scored comment ×1.5',                                     'self_mult','in_debate', 'uncommon',   60,  8),
  ('echo',             33,  'Echo',              'Next 2 scored comments ×1.25 each',                            'self_mult','in_debate', 'rare',      100, 12),
  ('rally',            34,  'Rally',             'All your scores this round ×1.5',                              'self_mult','in_debate', 'legendary', 250, 28),
  ('finisher',         35,  'Finisher',          'Your scores in round 4 ×2',                                    'self_mult','in_debate', 'rare',      120, 15),
  ('opening_gambit',   36,  'Opening Gambit',    'Your scores in round 1 ×2',                                    'self_mult','in_debate', 'uncommon',   60,  8),
  ('mic_drop',         37,  'Mic Drop',          'Your final comment of the debate ×3',                          'self_mult','in_debate', 'mythic',    500, 50),

  -- Self flat adders (38–42)
  ('boost',            38,  'Boost',             'Next scored comment +2 flat',                                  'self_flat','in_debate', 'common',     40,  5),
  ('double_tap',       39,  'Double Tap',        'Next 3 scored comments +1 each flat',                         'self_flat','in_debate', 'uncommon',   60,  8),
  ('citation_bonus',   40,  'Citation Bonus',    'Next scored comment that contains a cited ref +3 flat',        'self_flat','in_debate', 'rare',      100, 12),
  ('closer',           41,  'Closer',            'Last scored comment of the debate +5 flat',                    'self_flat','in_debate', 'legendary', 180, 20),
  ('banner',           42,  'Banner',            'Every scored comment this round +0.5 flat',                    'self_flat','in_debate', 'rare',      100, 12),

  -- Opponent debuffs (43–48)
  ('dampen',           43,  'Dampen',            'Opponent''s next scored comment ×0.5',                         'opponent_debuff','in_debate', 'rare',  120, 15),
  ('drain',            44,  'Drain',             'Opponent''s next scored comment ×0 (nullified)',                'opponent_debuff','in_debate', 'mythic',500, 50),
  ('choke',            45,  'Choke',             'Opponent''s next 2 scores -1 flat each',                       'opponent_debuff','in_debate', 'legendary',180, 20),
  ('static',           46,  'Static',            'Opponent''s first score this round ×0.5',                      'opponent_debuff','in_debate', 'rare',  100, 12),
  ('pressure',         47,  'Pressure',          'If opponent doesn''t score this round, they lose 2 pts at round end', 'opponent_debuff','in_debate', 'legendary',200, 22),
  ('interrupt',        48,  'Interrupt',         'Cancel the next opponent score entirely (counts as zero)',      'opponent_debuff','in_debate', 'mythic',600, 55),

  -- Cite-triggered (49–53)
  ('weaponize',        49,  'Weaponize',         'Your next cite''s comment scores ×2 automatically',            'cite_triggered','in_debate', 'rare',   120, 15),
  ('backfire',         50,  'Backfire',          'If opponent cites a challenged reference, you +3 inline',       'cite_triggered','in_debate', 'legendary',180, 20),
  ('counter_cite_idb', 51,  'Counter-Cite',      'When opponent cites, your next score +2 flat',                 'cite_triggered','in_debate', 'uncommon', 60,  8),
  ('mythic_echo',      52,  'Mythic Echo',       'Citing a Mythic ref triggers inline ×1.5 on that comment',     'cite_triggered','in_debate', 'legendary',250, 28),
  ('loadout_lock',     53,  'Loadout Lock',      'After your first cite, all following scores +1 flat',          'cite_triggered','in_debate', 'rare',   100, 12),

  -- Conditional / momentum (54–57)
  ('streak',           54,  'Streak',            'Each consecutive scored comment adds +0.5 to the next (stacks)','conditional','in_debate', 'rare',    120, 15),
  ('comeback',         55,  'Comeback',          'If trailing by 5+, your next 2 scores ×2',                     'conditional','in_debate', 'legendary',200, 22),
  ('underdog_surge',   56,  'Underdog Surge',    'If you have lower Elo, +1 flat on every scored comment',        'conditional','in_debate', 'rare',    120, 15),
  ('spite',            57,  'Spite',             'First score after opponent scores ×1.5',                        'conditional','in_debate', 'uncommon',  60,  8),

  -- Specials (58–59)
  ('overload',         58,  'Overload',          'Next score ×3, but only if mod''s base award is ≥3',            'special',  'in_debate', 'legendary', 200, 22),
  ('bait',             59,  'Bait',              'If opponent challenges one of your refs this debate, your next score ×2.5', 'special','in_debate', 'rare', 120, 15)

ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- SECTION 4: USER INVENTORY TABLES
-- ────────────────────────────────────────────────────────────

-- user_modifiers: one row per owned modifier item (not quantity-based)
CREATE TABLE IF NOT EXISTS public.user_modifiers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  effect_id        TEXT NOT NULL REFERENCES public.modifier_effects(id),
  acquisition_type TEXT NOT NULL DEFAULT 'purchase' CHECK (acquisition_type IN ('purchase','drop','reward')),
  acquired_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  socketed_in      UUID NULL REFERENCES public.arsenal_references(id) ON DELETE SET NULL
                   -- NULL = free in inventory; non-NULL = permanently socketed
);

CREATE INDEX idx_user_modifiers_user      ON public.user_modifiers(user_id);
CREATE INDEX idx_user_modifiers_unsocketed ON public.user_modifiers(user_id) WHERE socketed_in IS NULL;
CREATE INDEX idx_user_modifiers_socketed  ON public.user_modifiers(socketed_in) WHERE socketed_in IS NOT NULL;

COMMENT ON TABLE public.user_modifiers IS
  'Each row is one modifier item. socketed_in IS NULL = free inventory. Non-null = permanently socketed.';

ALTER TABLE public.user_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_modifiers_owner_select" ON public.user_modifiers
  FOR SELECT USING (auth.uid() = user_id);
-- All writes via SECURITY DEFINER RPCs only

-- user_powerups: quantity-based consumable stock
CREATE TABLE IF NOT EXISTS public.user_powerups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  effect_id  TEXT NOT NULL REFERENCES public.modifier_effects(id),
  quantity   INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE (user_id, effect_id)
);

CREATE INDEX idx_user_powerups_user ON public.user_powerups(user_id);

COMMENT ON TABLE public.user_powerups IS
  'Quantity-based consumable power-up stock. Upserted on purchase, decremented on equip.';

ALTER TABLE public.user_powerups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_powerups_owner_select" ON public.user_powerups
  FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- SECTION 5: REFERENCE SOCKETS TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reference_sockets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL REFERENCES public.arsenal_references(id) ON DELETE CASCADE,
  socket_index INTEGER NOT NULL CHECK (socket_index BETWEEN 0 AND 4), -- 0-based, max 5 sockets
  modifier_id  UUID NOT NULL REFERENCES public.user_modifiers(id),    -- back-ref for audit
  effect_id    TEXT NOT NULL REFERENCES public.modifier_effects(id),  -- denorm for fast reads
  socketed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reference_id, socket_index)
);

CREATE INDEX idx_reference_sockets_ref ON public.reference_sockets(reference_id);
CREATE INDEX idx_reference_sockets_mod ON public.reference_sockets(modifier_id);

COMMENT ON TABLE public.reference_sockets IS
  'Permanent socket assignments on arsenal_references. Never deleted — socketing is final.';

ALTER TABLE public.reference_sockets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reference_sockets_public_select" ON public.reference_sockets
  FOR SELECT USING (true); -- Leasers can see socket contents (F-55 leaser visibility rule)

-- ────────────────────────────────────────────────────────────
-- SECTION 6: PRE-DEBATE LOADOUT STAGING TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.debate_powerup_loadout (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  debate_id   UUID NOT NULL REFERENCES public.arena_debates(id) ON DELETE CASCADE,
  effect_id   TEXT NOT NULL REFERENCES public.modifier_effects(id),
  equipped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed    BOOLEAN NOT NULL DEFAULT FALSE, -- set TRUE when debate goes live (Phase 2)
  UNIQUE (user_id, debate_id, effect_id)
);

CREATE INDEX idx_debate_powerup_loadout_debate ON public.debate_powerup_loadout(debate_id);
CREATE INDEX idx_debate_powerup_loadout_user   ON public.debate_powerup_loadout(user_id, debate_id);

COMMENT ON TABLE public.debate_powerup_loadout IS
  'Pre-debate power-up staging. Max 3 per (user_id, debate_id). Quantity deducted from user_powerups at equip time.';

ALTER TABLE public.debate_powerup_loadout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debate_powerup_loadout_owner_select" ON public.debate_powerup_loadout
  FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- SECTION 7: HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Rarity ordinal for tier-gate comparison
CREATE OR REPLACE FUNCTION public._rarity_ordinal(p_rarity TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE STRICT
AS $$
  SELECT CASE p_rarity
    WHEN 'common'    THEN 1
    WHEN 'uncommon'  THEN 2
    WHEN 'rare'      THEN 3
    WHEN 'legendary' THEN 4
    WHEN 'mythic'    THEN 5
    ELSE 0
  END;
$$;

-- Socket count from reference rarity (Common 1 … Mythic 5)
CREATE OR REPLACE FUNCTION public._rarity_socket_count(p_rarity TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE STRICT
AS $$
  SELECT CASE p_rarity
    WHEN 'common'    THEN 1
    WHEN 'uncommon'  THEN 2
    WHEN 'rare'      THEN 3
    WHEN 'legendary' THEN 4
    WHEN 'mythic'    THEN 5
    ELSE 0
  END;
$$;

-- ────────────────────────────────────────────────────────────
-- SECTION 8: get_modifier_catalog
-- Public catalog read — no auth required.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_modifier_catalog()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',          id,
      'effect_num',  effect_num,
      'name',        name,
      'description', description,
      'category',    category,
      'timing',      timing,
      'tier_gate',   tier_gate,
      'mod_cost',    mod_cost,
      'pu_cost',     pu_cost
    )
    ORDER BY effect_num
  )
  FROM public.modifier_effects;
$$;

-- ────────────────────────────────────────────────────────────
-- SECTION 9: buy_modifier
-- Debit tokens and add one modifier item to user_modifiers.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.buy_modifier(p_effect_id TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$

DECLARE
  v_uid       UUID := auth.uid();
  v_effect    RECORD;
  v_debit     JSON;
  v_mod_id    UUID;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load effect
  SELECT * INTO v_effect FROM public.modifier_effects WHERE id = p_effect_id;
  IF v_effect IS NULL THEN
    RAISE EXCEPTION 'Unknown effect: %', p_effect_id;
  END IF;

  -- Debit tokens
  v_debit := public.debit_tokens(v_uid, v_effect.mod_cost, 'buy_modifier:' || p_effect_id);
  IF NOT (v_debit->>'success')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient tokens (need ' || v_effect.mod_cost || ')'
    );
  END IF;

  -- Add to inventory
  INSERT INTO public.user_modifiers (user_id, effect_id, acquisition_type)
  VALUES (v_uid, p_effect_id, 'purchase')
  RETURNING id INTO v_mod_id;

  RETURN json_build_object(
    'success',    true,
    'modifier_id', v_mod_id,
    'effect_id',  p_effect_id,
    'cost',       v_effect.mod_cost
  );
END;

$function$;

-- ────────────────────────────────────────────────────────────
-- SECTION 10: buy_powerup
-- Debit tokens and upsert quantity in user_powerups.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.buy_powerup(
  p_effect_id TEXT,
  p_quantity  INTEGER DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$

DECLARE
  v_uid        UUID := auth.uid();
  v_effect     RECORD;
  v_total_cost INTEGER;
  v_debit      JSON;
  v_new_qty    INTEGER;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate quantity
  IF p_quantity < 1 OR p_quantity > 99 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 99';
  END IF;

  -- Load effect
  SELECT * INTO v_effect FROM public.modifier_effects WHERE id = p_effect_id;
  IF v_effect IS NULL THEN
    RAISE EXCEPTION 'Unknown effect: %', p_effect_id;
  END IF;

  v_total_cost := v_effect.pu_cost * p_quantity;

  -- Debit tokens
  v_debit := public.debit_tokens(v_uid, v_total_cost, 'buy_powerup:' || p_effect_id);
  IF NOT (v_debit->>'success')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient tokens (need ' || v_total_cost || ')'
    );
  END IF;

  -- Upsert stock
  INSERT INTO public.user_powerups (user_id, effect_id, quantity)
  VALUES (v_uid, p_effect_id, p_quantity)
  ON CONFLICT (user_id, effect_id)
  DO UPDATE SET quantity = user_powerups.quantity + p_quantity
  RETURNING quantity INTO v_new_qty;

  RETURN json_build_object(
    'success',       true,
    'effect_id',     p_effect_id,
    'quantity_added', p_quantity,
    'new_quantity',  v_new_qty,
    'cost',          v_total_cost
  );
END;

$function$;

-- ────────────────────────────────────────────────────────────
-- SECTION 11: socket_modifier
-- Permanently socket a modifier into a reference.
-- Validates: ownership, unsocketed, tier-gate compat, slot open.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.socket_modifier(
  p_reference_id UUID,
  p_socket_index INTEGER,
  p_modifier_id  UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$

DECLARE
  v_uid           UUID := auth.uid();
  v_modifier      RECORD;
  v_ref           RECORD;
  v_effect        RECORD;
  v_socket_count  INTEGER;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load modifier — must be owned by caller and unsocketed
  SELECT um.*, me.tier_gate, me.id AS effect_id_val
  INTO v_modifier
  FROM public.user_modifiers um
  JOIN public.modifier_effects me ON me.id = um.effect_id
  WHERE um.id = p_modifier_id AND um.user_id = v_uid;

  IF v_modifier IS NULL THEN
    RAISE EXCEPTION 'Modifier not found or not owned by you';
  END IF;
  IF v_modifier.socketed_in IS NOT NULL THEN
    RAISE EXCEPTION 'This modifier is already socketed into a reference';
  END IF;

  -- Load reference — must be owned by caller
  SELECT * INTO v_ref
  FROM public.arsenal_references
  WHERE id = p_reference_id AND user_id = v_uid;

  IF v_ref IS NULL THEN
    RAISE EXCEPTION 'Reference not found or not owned by you';
  END IF;

  -- Validate socket_index is in range for this reference's rarity
  v_socket_count := public._rarity_socket_count(v_ref.rarity);
  IF p_socket_index < 0 OR p_socket_index >= v_socket_count THEN
    RAISE EXCEPTION 'Socket index % is out of range for a % reference (has % socket(s))',
      p_socket_index, v_ref.rarity, v_socket_count;
  END IF;

  -- Validate effect tier_gate <= reference rarity (can this effect go in this ref?)
  IF public._rarity_ordinal(v_modifier.tier_gate) > public._rarity_ordinal(v_ref.rarity) THEN
    RAISE EXCEPTION '% modifier requires at least a % reference; this ref is %',
      v_modifier.effect_id, v_modifier.tier_gate, v_ref.rarity;
  END IF;

  -- Check socket not already filled
  IF EXISTS (
    SELECT 1 FROM public.reference_sockets
    WHERE reference_id = p_reference_id AND socket_index = p_socket_index
  ) THEN
    RAISE EXCEPTION 'Socket % is already filled on this reference', p_socket_index;
  END IF;

  -- Mark modifier as socketed (permanent)
  UPDATE public.user_modifiers
  SET socketed_in = p_reference_id
  WHERE id = p_modifier_id;

  -- Create socket record
  INSERT INTO public.reference_sockets (reference_id, socket_index, modifier_id, effect_id)
  VALUES (p_reference_id, p_socket_index, p_modifier_id, v_modifier.effect_id);

  RETURN json_build_object(
    'success',       true,
    'reference_id',  p_reference_id,
    'socket_index',  p_socket_index,
    'effect_id',     v_modifier.effect_id,
    'modifier_id',   p_modifier_id
  );
END;

$function$;

-- ────────────────────────────────────────────────────────────
-- SECTION 12: equip_powerup_for_debate
-- Stage a power-up for the upcoming debate (max 3 per user/debate).
-- Deducts from inventory immediately — no refund if debate nulls.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.equip_powerup_for_debate(
  p_debate_id UUID,
  p_effect_id TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$

DECLARE
  v_uid        UUID := auth.uid();
  v_debate     RECORD;
  v_effect     RECORD;
  v_stock      RECORD;
  v_slot_count INTEGER;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load debate — must be pre-start
  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status NOT IN ('pending','lobby','matched') THEN
    RAISE EXCEPTION 'Can only equip power-ups before the debate goes live (status: %)', v_debate.status;
  END IF;

  -- Caller must be a debater in this debate
  IF v_uid != v_debate.debater_a AND v_uid != v_debate.debater_b THEN
    RAISE EXCEPTION 'You are not a debater in this debate';
  END IF;

  -- Validate effect exists and is a power-up type (timing check doesn't matter here — both types are valid)
  SELECT * INTO v_effect FROM public.modifier_effects WHERE id = p_effect_id;
  IF v_effect IS NULL THEN
    RAISE EXCEPTION 'Unknown effect: %', p_effect_id;
  END IF;

  -- Check stock
  SELECT * INTO v_stock
  FROM public.user_powerups
  WHERE user_id = v_uid AND effect_id = p_effect_id;

  IF v_stock IS NULL OR v_stock.quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'You do not own any ' || v_effect.name || ' power-ups');
  END IF;

  -- Check 3-power-up cap
  SELECT COUNT(*) INTO v_slot_count
  FROM public.debate_powerup_loadout
  WHERE user_id = v_uid AND debate_id = p_debate_id;

  IF v_slot_count >= 3 THEN
    RAISE EXCEPTION 'Power-up cap reached: maximum 3 per debate';
  END IF;

  -- Deduct 1 from stock immediately
  UPDATE public.user_powerups
  SET quantity = quantity - 1
  WHERE user_id = v_uid AND effect_id = p_effect_id AND quantity >= 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Concurrent equip conflict — retry');
  END IF;

  -- Insert into loadout (UNIQUE prevents double-equip of same effect in same debate)
  INSERT INTO public.debate_powerup_loadout (user_id, debate_id, effect_id)
  VALUES (v_uid, p_debate_id, p_effect_id)
  ON CONFLICT (user_id, debate_id, effect_id) DO NOTHING;

  RETURN json_build_object(
    'success',    true,
    'debate_id',  p_debate_id,
    'effect_id',  p_effect_id,
    'slots_used', v_slot_count + 1
  );
END;

$function$;

-- ────────────────────────────────────────────────────────────
-- SECTION 13: get_user_modifier_inventory
-- Returns caller's unsocketed modifiers, power-up stock,
-- and (optionally) equipped loadout for a specific debate.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_modifier_inventory(
  p_debate_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$

DECLARE
  v_uid              UUID := auth.uid();
  v_modifiers        jsonb;
  v_powerup_stock    jsonb;
  v_loadout          jsonb;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Unsocketed modifiers (free to socket or inspect)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'modifier_id',    um.id,
      'effect_id',      um.effect_id,
      'name',           me.name,
      'description',    me.description,
      'category',       me.category,
      'timing',         me.timing,
      'tier_gate',      me.tier_gate,
      'acquired_at',    um.acquired_at,
      'acquisition_type', um.acquisition_type
    )
    ORDER BY um.acquired_at
  ), '[]'::jsonb)
  INTO v_modifiers
  FROM public.user_modifiers um
  JOIN public.modifier_effects me ON me.id = um.effect_id
  WHERE um.user_id = v_uid AND um.socketed_in IS NULL;

  -- Power-up stock (all effects with quantity > 0)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'effect_id',   up.effect_id,
      'name',        me.name,
      'description', me.description,
      'category',    me.category,
      'timing',      me.timing,
      'tier_gate',   me.tier_gate,
      'quantity',    up.quantity,
      'pu_cost',     me.pu_cost
    )
    ORDER BY me.effect_num
  ), '[]'::jsonb)
  INTO v_powerup_stock
  FROM public.user_powerups up
  JOIN public.modifier_effects me ON me.id = up.effect_id
  WHERE up.user_id = v_uid AND up.quantity > 0;

  -- Equipped loadout for a specific debate (optional)
  IF p_debate_id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'effect_id',   dl.effect_id,
        'name',        me.name,
        'description', me.description,
        'category',    me.category,
        'timing',      me.timing,
        'consumed',    dl.consumed,
        'equipped_at', dl.equipped_at
      )
      ORDER BY dl.equipped_at
    ), '[]'::jsonb)
    INTO v_loadout
    FROM public.debate_powerup_loadout dl
    JOIN public.modifier_effects me ON me.id = dl.effect_id
    WHERE dl.user_id = v_uid AND dl.debate_id = p_debate_id;
  ELSE
    v_loadout := '[]'::jsonb;
  END IF;

  RETURN json_build_object(
    'unsocketed_modifiers', v_modifiers,
    'powerup_stock',        v_powerup_stock,
    'equipped_loadout',     v_loadout
  );
END;

$function$;

-- ────────────────────────────────────────────────────────────
-- DONE
-- Run in Supabase SQL Editor. Expected: no rows returned.
-- New tables: modifier_effects, user_modifiers, user_powerups,
--             reference_sockets, debate_powerup_loadout
-- New RPCs:   get_modifier_catalog, buy_modifier, buy_powerup,
--             socket_modifier, equip_powerup_for_debate,
--             get_user_modifier_inventory
-- Helpers:    _rarity_ordinal, _rarity_socket_count
-- ────────────────────────────────────────────────────────────
