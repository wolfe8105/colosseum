-- ============================================================
-- F-29: Source Meta Report
-- Session 275 | April 12, 2026
--
-- Public-facing weekly report — no auth required.
-- Five sections:
--   1. Most cited source per category (highest strikes)
--   2. Most persuasive sources (best win rate when cited, min 3 cites)
--   3. Most contested references (most upheld challenges)
--   4. Biggest Elo movers this week (profiles)
--   5. Trending sources (most cited in last 7 days via royalty log)
--
-- Single RPC: get_source_meta_report()
-- Returns one JSONB with all five sections.
-- Called by the public moderator-source-report.html page.
-- ============================================================

CREATE OR REPLACE FUNCTION get_source_meta_report()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_top_per_category   JSONB;
  v_most_persuasive    JSONB;
  v_most_contested     JSONB;
  v_elo_movers         JSONB;
  v_trending           JSONB;
  v_generated_at       TIMESTAMPTZ := now();
BEGIN

  -- --------------------------------------------------------
  -- SECTION 1: Top source per category
  -- Highest strikes (total cites ever), one winner per category.
  -- Excludes deleted and frozen refs.
  -- --------------------------------------------------------
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'category'), '[]'::jsonb)
  INTO v_top_per_category
  FROM (
    SELECT DISTINCT ON (ar.category)
      jsonb_build_object(
        'category',     ar.category,
        'ref_id',       ar.id,
        'source_title', ar.source_title,
        'source_author',ar.source_author,
        'claim_text',   ar.claim_text,
        'source_type',  ar.source_type,
        'strikes',      ar.strikes,
        'rarity',       ar.rarity,
        'forger',       p.username,
        'source_url',   ar.source_url
      ) AS row,
      ar.category,
      ar.strikes
    FROM arsenal_references ar
    JOIN profiles p ON p.id = ar.user_id
    WHERE ar.deleted_at IS NULL
      AND ar.challenge_status <> 'frozen'
    ORDER BY ar.category, ar.strikes DESC
  ) sub;

  -- --------------------------------------------------------
  -- SECTION 2: Most persuasive sources
  -- Win rate = citer_won_debate count / total cites.
  -- Minimum 3 cites to qualify. Top 10 overall.
  -- --------------------------------------------------------
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'win_rate_pct')::NUMERIC DESC), '[]'::jsonb)
  INTO v_most_persuasive
  FROM (
    SELECT jsonb_build_object(
      'ref_id',        ar.id,
      'source_title',  ar.source_title,
      'source_author', ar.source_author,
      'category',      ar.category,
      'rarity',        ar.rarity,
      'total_cites',   COUNT(rl.id),
      'wins',          SUM(CASE WHEN rl.citer_won_debate THEN 1 ELSE 0 END),
      'win_rate_pct',  ROUND(
                         SUM(CASE WHEN rl.citer_won_debate THEN 1 ELSE 0 END)::NUMERIC
                         / COUNT(rl.id) * 100,
                         1
                       ),
      'forger',        p.username,
      'source_url',    ar.source_url
    ) AS row
    FROM reference_royalty_log rl
    JOIN arsenal_references ar ON ar.id = rl.reference_id
    JOIN profiles p ON p.id = ar.user_id
    WHERE ar.deleted_at IS NULL
    GROUP BY ar.id, ar.source_title, ar.source_author, ar.category,
             ar.rarity, p.username, ar.source_url
    HAVING COUNT(rl.id) >= 3
    ORDER BY
      SUM(CASE WHEN rl.citer_won_debate THEN 1 ELSE 0 END)::NUMERIC / COUNT(rl.id) DESC
    LIMIT 10
  ) sub;

  -- --------------------------------------------------------
  -- SECTION 3: Most contested references
  -- References with the most upheld challenges (successfully disputed).
  -- Min 1 upheld challenge. Top 10.
  -- --------------------------------------------------------
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'upheld_challenges')::INT DESC), '[]'::jsonb)
  INTO v_most_contested
  FROM (
    SELECT jsonb_build_object(
      'ref_id',            ar.id,
      'source_title',      ar.source_title,
      'source_author',     ar.source_author,
      'category',          ar.category,
      'challenge_status',  ar.challenge_status,
      'rarity',            ar.rarity,
      'upheld_challenges', COUNT(rc.id),
      'forger',            p.username,
      'source_url',        ar.source_url
    ) AS row
    FROM reference_challenges rc
    JOIN arsenal_references ar ON ar.id = rc.reference_id
    JOIN profiles p ON p.id = ar.user_id
    WHERE rc.status = 'upheld'
      AND ar.deleted_at IS NULL
    GROUP BY ar.id, ar.source_title, ar.source_author, ar.category,
             ar.challenge_status, ar.rarity, p.username, ar.source_url
    HAVING COUNT(rc.id) >= 1
    ORDER BY COUNT(rc.id) DESC
    LIMIT 10
  ) sub;

  -- --------------------------------------------------------
  -- SECTION 4: Biggest Elo movers (last 7 days)
  -- Uses arena_debates elo_change_a / elo_change_b columns.
  -- Top 10 gainers among debaters with at least 3 ranked debates
  -- completed in the window.
  -- --------------------------------------------------------
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'elo_gained')::INT DESC), '[]'::jsonb)
  INTO v_elo_movers
  FROM (
    SELECT jsonb_build_object(
      'user_id',    p.id,
      'username',   p.username,
      'elo_rating', p.elo_rating,
      'elo_gained', SUM(
        CASE
          WHEN ad.debater_a = p.id THEN COALESCE(ad.elo_change_a, 0)
          WHEN ad.debater_b = p.id THEN COALESCE(ad.elo_change_b, 0)
          ELSE 0
        END
      ),
      'debates',    COUNT(ad.id)
    ) AS row
    FROM arena_debates ad
    JOIN profiles p ON p.id = ad.debater_a OR p.id = ad.debater_b
    WHERE ad.status = 'complete'
      AND ad.ranked = true
      AND ad.updated_at >= now() - INTERVAL '7 days'
    GROUP BY p.id, p.username, p.elo_rating
    HAVING COUNT(ad.id) >= 3
       AND SUM(
         CASE
           WHEN ad.debater_a = p.id THEN COALESCE(ad.elo_change_a, 0)
           WHEN ad.debater_b = p.id THEN COALESCE(ad.elo_change_b, 0)
           ELSE 0
         END
       ) > 0
    ORDER BY SUM(
      CASE
        WHEN ad.debater_a = p.id THEN COALESCE(ad.elo_change_a, 0)
        WHEN ad.debater_b = p.id THEN COALESCE(ad.elo_change_b, 0)
        ELSE 0
      END
    ) DESC
    LIMIT 10
  ) sub;

  -- --------------------------------------------------------
  -- SECTION 5: Trending sources (most cited last 7 days)
  -- Uses reference_royalty_log.paid_at as the cite timestamp.
  -- Top 10. Excludes deleted refs.
  -- --------------------------------------------------------
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'recent_cites')::INT DESC), '[]'::jsonb)
  INTO v_trending
  FROM (
    SELECT jsonb_build_object(
      'ref_id',        ar.id,
      'source_title',  ar.source_title,
      'source_author', ar.source_author,
      'category',      ar.category,
      'rarity',        ar.rarity,
      'recent_cites',  COUNT(rl.id),
      'forger',        p.username,
      'source_url',    ar.source_url
    ) AS row
    FROM reference_royalty_log rl
    JOIN arsenal_references ar ON ar.id = rl.reference_id
    JOIN profiles p ON p.id = ar.user_id
    WHERE rl.paid_at >= now() - INTERVAL '7 days'
      AND ar.deleted_at IS NULL
    GROUP BY ar.id, ar.source_title, ar.source_author, ar.category,
             ar.rarity, p.username, ar.source_url
    ORDER BY COUNT(rl.id) DESC
    LIMIT 10
  ) sub;

  RETURN jsonb_build_object(
    'generated_at',      v_generated_at,
    'top_per_category',  v_top_per_category,
    'most_persuasive',   v_most_persuasive,
    'most_contested',    v_most_contested,
    'elo_movers',        v_elo_movers,
    'trending',          v_trending
  );

END;
$$;

-- Public: no auth required — this is a marketing page
GRANT EXECUTE ON FUNCTION get_source_meta_report() TO anon, authenticated;
