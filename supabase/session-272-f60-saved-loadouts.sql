-- ============================================================
-- F-60: Saved Loadouts
-- Session 272 | April 12, 2026
-- Up to 6 named presets per user.
-- Each preset stores ref IDs + powerup effect IDs.
-- Applied at pre-debate — pre-selects refs and equips power-ups.
-- ============================================================

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_loadout_presets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 32),
  reference_ids UUID[]     NOT NULL DEFAULT '{}',
  powerup_effect_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_loadout_presets_user
  ON user_loadout_presets(user_id);

ALTER TABLE user_loadout_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own loadout presets"
  ON user_loadout_presets FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RPC: get_my_loadout_presets
-- Returns all presets for the current user, ordered by created_at.
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_loadout_presets()
RETURNS TABLE (
  id                UUID,
  name              TEXT,
  reference_ids     UUID[],
  powerup_effect_ids TEXT[],
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.reference_ids,
    p.powerup_effect_ids,
    p.created_at,
    p.updated_at
  FROM user_loadout_presets p
  WHERE p.user_id = auth.uid()
  ORDER BY p.created_at ASC;
END;
$$;

-- ============================================================
-- RPC: save_loadout_preset
-- Create a new preset or overwrite an existing one.
-- Enforces 6-preset cap per user.
-- Pass p_preset_id to overwrite; omit (NULL) to create new.
-- ============================================================

CREATE OR REPLACE FUNCTION save_loadout_preset(
  p_name              TEXT,
  p_reference_ids     UUID[],
  p_powerup_effect_ids TEXT[],
  p_preset_id         UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count   INT;
  v_id      UUID;
BEGIN
  -- Validate name
  IF p_name IS NULL OR char_length(trim(p_name)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name required');
  END IF;

  IF p_preset_id IS NOT NULL THEN
    -- Update existing — verify ownership
    UPDATE user_loadout_presets
    SET
      name               = trim(p_name),
      reference_ids      = COALESCE(p_reference_ids, '{}'),
      powerup_effect_ids = COALESCE(p_powerup_effect_ids, '{}'),
      updated_at         = now()
    WHERE id = p_preset_id AND user_id = auth.uid()
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Preset not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'id', v_id);
  ELSE
    -- Create new — enforce 6-preset cap
    SELECT COUNT(*) INTO v_count
    FROM user_loadout_presets
    WHERE user_id = auth.uid();

    IF v_count >= 6 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Maximum 6 presets allowed');
    END IF;

    INSERT INTO user_loadout_presets (user_id, name, reference_ids, powerup_effect_ids)
    VALUES (auth.uid(), trim(p_name), COALESCE(p_reference_ids, '{}'), COALESCE(p_powerup_effect_ids, '{}'))
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'id', v_id);
  END IF;
END;
$$;

-- ============================================================
-- RPC: delete_loadout_preset
-- Hard-delete. Owner only.
-- ============================================================

CREATE OR REPLACE FUNCTION delete_loadout_preset(
  p_preset_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM user_loadout_presets
  WHERE id = p_preset_id AND user_id = auth.uid();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Preset not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
