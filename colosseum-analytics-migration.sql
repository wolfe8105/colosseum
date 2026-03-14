-- ============================================================
-- THE COLOSSEUM — Analytics & Data Intelligence Layer
-- Session 33 — March 4, 2026
--
-- 1. Event log table (append-only, every meaningful action)
-- 2. log_event() function (single call to track anything)
-- 3. Aggregation views (raw events → sellable insights)
--
-- THE B2B DATA PLAY:
-- "Structured, real-time opinion intelligence from real people
--  defending positions in transcribed, scored, time-stamped debates"
--
-- 25 buyer industries × 10 insight categories = 250 data items
-- Every view below maps to a specific buyer category.
--
-- Paste into Supabase SQL Editor → Run
-- Run AFTER all other migrations
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- PART 1: EVENT LOG TABLE
-- Append-only. Never UPDATE or DELETE rows.
-- This is the single source of truth for all behavioral data.
-- ████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.event_log (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,                        -- NULL for anonymous events (auto-debate votes)
  debate_id UUID,                      -- debate/arena_debate/auto_debate ID if relevant
  category TEXT,                       -- debate category (politics, sports, etc.)
  side TEXT,                           -- 'a' or 'b' if applicable
  metadata JSONB DEFAULT '{}',         -- flexible payload per event type
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast aggregation queries
CREATE INDEX IF NOT EXISTS idx_event_log_type ON public.event_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_user ON public.event_log(user_id, event_type, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_log_category ON public.event_log(category, event_type, created_at DESC) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_log_debate ON public.event_log(debate_id) WHERE debate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_log_created ON public.event_log(created_at DESC);

-- Partition hint: when event_log exceeds 10M rows, partition by month
-- CREATE TABLE event_log_2026_03 PARTITION OF event_log FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

-- Event log is service_role only — never exposed to clients
CREATE POLICY "event_log_service_only" ON public.event_log
  FOR ALL USING (current_setting('role') IN ('postgres', 'service_role'));


-- ████████████████████████████████████████████████████████████
-- PART 2: log_event() FUNCTION
-- Single SECURITY DEFINER function called by all other RPCs.
-- Append-only — fast INSERT, no locks, no contention.
-- ████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION log_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_debate_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_side TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.event_log (event_type, user_id, debate_id, category, side, metadata)
  VALUES (p_event_type, p_user_id, p_debate_id, p_category, p_side, p_metadata);
  -- Fire and forget. No return value. Never block the caller.
EXCEPTION WHEN OTHERS THEN
  -- Never let analytics break the app. Swallow errors.
  RAISE WARNING 'log_event failed: % %', SQLERRM, SQLSTATE;
END;
$$;


-- ████████████████████████████████████████████████████████████
-- PART 3: EVENT TYPE REGISTRY
-- Every event_type string, what triggers it, and what metadata it carries.
-- This is the data dictionary. Buyer industries are tagged per event.
--
-- ═══════════════════════════════════════════════════════════
-- EVENT TYPE                  | TRIGGER                    | METADATA KEYS
-- ═══════════════════════════════════════════════════════════
--
-- ── ACCOUNT LIFECYCLE ─────────────────────────────────────
-- signup                     | Plinko step 4 complete      | {method: oauth|email, provider: google|apple|email}
-- login                      | Auth INITIAL_SESSION        | {method, provider}
-- profile_update             | Settings save               | {fields_changed: [...]}
-- profile_depth_answer       | PD section saved            | {section, questions_answered, pct_complete}
-- account_deleted            | Soft delete                 | {}
--
-- ── DEBATES (HUMAN) ──────────────────────────────────────
-- debate_created             | Queue match or AI spar      | {mode, topic, elo_a, elo_b}
-- debate_joined              | User enters debate room     | {role: a|b, mode}
-- debate_completed           | finalize_debate()           | {winner, score_a, score_b, elo_change_a, elo_change_b, duration_seconds}
-- debate_cancelled           | Either party leaves         | {reason, round_reached}
-- round_advanced             | advance_round()             | {from_round, to_round}
-- queue_joined               | join_debate_queue()         | {mode, category}
-- queue_matched              | Opponent found              | {mode, wait_seconds, elo_gap}
-- queue_timeout              | No match in 5 min           | {mode, wait_seconds}
-- queue_alternative          | User picks AI/retry/lobby   | {choice: ai|retry|lobby}
--
-- ── DEBATES (AUTO / AI) ──────────────────────────────────
-- auto_debate_created        | Bot army generates          | {topic, side_a_label, side_b_label, source_headline}
-- auto_debate_voted          | Guest/user votes            | {voted_for: a|b, is_anonymous: bool}
-- ai_spar_started            | create_ai_debate()          | {topic, category}
-- ai_spar_message            | Each AI round response      | {round, word_count, response_time_ms}
--
-- ── HOT TAKES ────────────────────────────────────────────
-- hot_take_posted            | create_hot_take()           | {section, word_count, has_link: bool}
-- hot_take_reacted           | react_hot_take()            | {action: add|remove}
-- hot_take_challenged        | Challenge modal submit      | {challenged_user_id}
--
-- ── REFERENCES / EVIDENCE ────────────────────────────────
-- reference_submitted        | submit_reference()          | {type: url|text, sequence, cost, round}
-- reference_ruled            | rule_on_reference()         | {ruling: allowed|denied, ruled_by_type: ai|human|auto, reason}
-- reference_auto_allowed     | 60s timeout                 | {}
--
-- ── MODERATOR ────────────────────────────────────────────
-- moderator_assigned         | assign_moderator()          | {type: ai|human, moderator_id, rating}
-- moderator_scored           | score_moderator()           | {scorer_role: debater|spectator, score, new_approval}
-- moderator_available        | Toggle green dot             | {available: bool}
--
-- ── SOCIAL ───────────────────────────────────────────────
-- follow                     | followUser()                | {target_user_id}
-- unfollow                   | unfollowUser()              | {target_user_id}
-- rival_declared             | declareRival()              | {target_user_id}
-- rival_accepted             | respondRival()              | {target_user_id}
--
-- ── PREDICTIONS ──────────────────────────────────────────
-- prediction_placed          | place_prediction()          | {tokens_wagered, predicted_winner_id}
-- prediction_resolved        | finalize_debate()           | {result: correct|incorrect|draw, payout}
--
-- ── ECONOMY ──────────────────────────────────────────────
-- tokens_spent               | Any token deduction         | {amount, reason: reference|prediction|cosmetic}
-- tokens_earned              | credit_tokens()             | {amount, source: purchase|reward|refund}
-- subscription_changed       | Stripe webhook              | {from_tier, to_tier}
-- purchase_completed         | Stripe success              | {type: sub|tokens, amount_usd}
--
-- ── ENGAGEMENT / SESSION ─────────────────────────────────
-- page_view                  | Client-side tracker         | {page, referrer, is_bot_link: bool}
-- category_browsed           | Category overlay opened     | {section, time_spent_ms}
-- share_clicked              | Share/copy/tweet button     | {target: clipboard|twitter|webshare, content_type: debate|take|profile}
-- notification_opened        | Tap notification            | {notification_type}
-- mirror_visit               | Static mirror page load     | {page, utm_source, utm_medium}
--
-- ═══════════════════════════════════════════════════════════


-- ████████████████████████████████████████████████████████████
-- PART 4: AGGREGATION VIEWS
-- Raw events → sellable insights
-- Each view maps to buyer industry categories.
--
-- BUYER INDUSTRIES (25):
-- Political campaigns, polling firms, media, hedge funds, PR,
-- ad agencies, brand strategy, legal (jury consultants),
-- think tanks, government, entertainment, sports, tech,
-- healthcare, insurance, education research, real estate,
-- retail, pharma, automotive, telecom, energy, nonprofit,
-- financial services, food & beverage
-- ████████████████████████████████████████████████████████████


-- ──────────────────────────────────────────────────────────
-- VIEW 1: TOPIC SENTIMENT — How does the crowd feel about X?
-- Buyers: Political campaigns, polling firms, media, PR, think tanks
-- Data items: topic, side_a_votes, side_b_votes, lean_pct,
--   vote_velocity (votes/hour), category, time_window
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_topic_sentiment AS
SELECT
  ad.topic,
  ad.category,
  ad.side_a_label,
  ad.side_b_label,
  ad.vote_count_a,
  ad.vote_count_b,
  ad.vote_count,
  CASE WHEN ad.vote_count > 0
    THEN ROUND(ad.vote_count_a::NUMERIC / ad.vote_count * 100, 1)
    ELSE 50.0
  END AS lean_pct_a,
  CASE WHEN ad.vote_count > 0
    THEN ROUND(ad.vote_count_b::NUMERIC / ad.vote_count * 100, 1)
    ELSE 50.0
  END AS lean_pct_b,
  ad.winner,
  ad.score_a,
  ad.score_b,
  ad.created_at,
  -- Vote velocity: votes per hour since creation
  CASE WHEN EXTRACT(EPOCH FROM (now() - ad.created_at)) > 0
    THEN ROUND(ad.vote_count::NUMERIC / (EXTRACT(EPOCH FROM (now() - ad.created_at)) / 3600), 1)
    ELSE 0
  END AS votes_per_hour
FROM public.auto_debates ad
WHERE ad.status = 'active'
ORDER BY ad.vote_count DESC;


-- ──────────────────────────────────────────────────────────
-- VIEW 2: USER OPINION PROFILE — What does a user actually believe?
-- Buyers: Ad agencies, brand strategy, political campaigns, hedge funds
-- Data items: user_id, category, times_debated, side_preference,
--   reference_intensity, topics_gravitated, topics_avoided,
--   prediction_accuracy, win_rate_by_category
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_user_opinion_profile AS
SELECT
  p.id AS user_id,
  p.username,
  p.elo_rating,
  p.wins,
  p.losses,
  p.debates_completed,
  p.profile_depth_pct,
  -- Debate categories this user engages with (from event_log)
  (SELECT jsonb_agg(DISTINCT el.category)
   FROM public.event_log el
   WHERE el.user_id = p.id
     AND el.event_type IN ('debate_created', 'debate_joined')
     AND el.category IS NOT NULL
  ) AS categories_engaged,
  -- How many references they submit per debate (intensity signal)
  (SELECT COUNT(*)
   FROM public.debate_references dr
   WHERE dr.submitted_by = p.id
  ) AS total_references_submitted,
  -- Prediction accuracy
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE pr.correct = true)::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE pr.correct IS NOT NULL), 0) * 100, 1
  ) FROM public.predictions pr WHERE pr.user_id = p.id
  ) AS prediction_accuracy_pct
FROM public.profiles p
WHERE p.deleted_at IS NULL;


-- ──────────────────────────────────────────────────────────
-- VIEW 3: MODERATOR BIAS MAP — How does a mod actually lean?
-- Buyers: Legal (jury consultants), political campaigns, media, think tanks
-- Data items: moderator_id, category, total_rulings,
--   allow_rate_side_a, allow_rate_side_b, bias_score,
--   approval_from_debaters, approval_from_fans,
--   avg_ruling_time_seconds, consistency_score
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_moderator_bias AS
SELECT
  p.id AS moderator_id,
  p.username,
  p.mod_rating,
  p.mod_approval_pct,
  p.mod_debates_total,
  p.mod_rulings_total,
  -- Rulings breakdown
  (SELECT COUNT(*) FILTER (WHERE dr.ruling = 'allowed')
   FROM public.debate_references dr WHERE dr.ruled_by = p.id
  ) AS total_allowed,
  (SELECT COUNT(*) FILTER (WHERE dr.ruling = 'denied')
   FROM public.debate_references dr WHERE dr.ruled_by = p.id
  ) AS total_denied,
  -- Allow rate by side
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE dr.ruling = 'allowed' AND dr.supports_side = 'a')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE dr.supports_side = 'a'), 0) * 100, 1
  ) FROM public.debate_references dr WHERE dr.ruled_by = p.id
  ) AS allow_rate_side_a_pct,
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE dr.ruling = 'allowed' AND dr.supports_side = 'b')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE dr.supports_side = 'b'), 0) * 100, 1
  ) FROM public.debate_references dr WHERE dr.ruled_by = p.id
  ) AS allow_rate_side_b_pct,
  -- Debater vs fan approval split
  (SELECT ROUND(AVG(ms.score), 1)
   FROM public.moderator_scores ms
   WHERE ms.moderator_id = p.id AND ms.scorer_role = 'debater'
  ) AS avg_debater_score,
  (SELECT ROUND(AVG(ms.score), 1)
   FROM public.moderator_scores ms
   WHERE ms.moderator_id = p.id AND ms.scorer_role = 'spectator'
  ) AS avg_fan_score,
  -- Average ruling speed
  (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (dr.ruled_at - dr.submitted_at))), 1)
   FROM public.debate_references dr
   WHERE dr.ruled_by = p.id AND dr.ruled_at IS NOT NULL
  ) AS avg_ruling_seconds
FROM public.profiles p
WHERE p.is_moderator = true;


-- ──────────────────────────────────────────────────────────
-- VIEW 4: CATEGORY HEAT MAP — What's trending, what's dying?
-- Buyers: Media, entertainment, sports, ad agencies, content companies
-- Data items: category, debates_24h, debates_7d, votes_24h,
--   hot_takes_24h, unique_users_24h, avg_debate_duration,
--   top_topic, growth_rate_pct
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_category_heatmap AS
SELECT
  category,
  -- 24-hour metrics
  COUNT(*) FILTER (WHERE el.created_at > now() - interval '24 hours'
    AND el.event_type IN ('debate_created', 'auto_debate_created')
  ) AS debates_24h,
  COUNT(*) FILTER (WHERE el.created_at > now() - interval '24 hours'
    AND el.event_type IN ('auto_debate_voted', 'debate_completed')
  ) AS votes_24h,
  COUNT(*) FILTER (WHERE el.created_at > now() - interval '24 hours'
    AND el.event_type = 'hot_take_posted'
  ) AS hot_takes_24h,
  COUNT(DISTINCT el.user_id) FILTER (WHERE el.created_at > now() - interval '24 hours') AS unique_users_24h,
  -- 7-day metrics
  COUNT(*) FILTER (WHERE el.created_at > now() - interval '7 days'
    AND el.event_type IN ('debate_created', 'auto_debate_created')
  ) AS debates_7d,
  COUNT(DISTINCT el.user_id) FILTER (WHERE el.created_at > now() - interval '7 days') AS unique_users_7d,
  -- Growth: 24h vs prior 24h
  COUNT(*) FILTER (WHERE el.created_at > now() - interval '24 hours') AS events_24h,
  COUNT(*) FILTER (WHERE el.created_at BETWEEN now() - interval '48 hours' AND now() - interval '24 hours') AS events_prior_24h
FROM public.event_log el
WHERE el.category IS NOT NULL
GROUP BY category;


-- ──────────────────────────────────────────────────────────
-- VIEW 5: ARGUMENT QUALITY INDEX — Which sources win debates?
-- Buyers: Media, education research, legal, think tanks, tech
-- Data items: reference_domain, times_cited, allow_rate,
--   win_correlation (did citing this source correlate with winning?),
--   category, avg_cost_paid
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_reference_quality AS
SELECT
  -- Extract domain from URL references
  CASE
    WHEN dr.reference_type = 'url'
    THEN regexp_replace(dr.content, '^https?://([^/]+).*', '\1')
    ELSE '[text]'
  END AS source_domain,
  COUNT(*) AS times_cited,
  COUNT(*) FILTER (WHERE dr.ruling = 'allowed') AS times_allowed,
  COUNT(*) FILTER (WHERE dr.ruling = 'denied') AS times_denied,
  ROUND(
    COUNT(*) FILTER (WHERE dr.ruling = 'allowed')::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 1
  ) AS allow_rate_pct,
  ROUND(AVG(dr.token_cost), 1) AS avg_cost,
  -- Category distribution
  jsonb_agg(DISTINCT d.category) FILTER (WHERE d.category IS NOT NULL) AS categories_used_in
FROM public.debate_references dr
JOIN arena_debates d ON d.id = dr.debate_id
GROUP BY 1
HAVING COUNT(*) >= 2
ORDER BY times_cited DESC;


-- ──────────────────────────────────────────────────────────
-- VIEW 6: PERSUASION EVENTS — When do people change their mind?
-- Buyers: Ad agencies, political campaigns, PR, brand strategy
-- Data items: debate_id, topic, reference_that_shifted,
--   votes_before_reference, votes_after_reference,
--   shift_magnitude, winning_side_changed
-- (Requires event_log entries with timestamps to diff pre/post reference)
-- ──────────────────────────────────────────────────────────
-- NOTE: This view is a placeholder. Persuasion tracking requires
-- client-side vote timestamp logging per reference submission.
-- When we add real-time vote streaming, this becomes:
--   "Vote velocity increased 340% after debater_a cited [source]"
-- That's the most valuable data point in the entire platform.


-- ──────────────────────────────────────────────────────────
-- VIEW 7: DEBATER VS MODERATOR SPLIT — The identity gap
-- Buyers: Polling firms, political campaigns, jury consultants, think tanks
-- Data items: user_id, debate_side_choices (what they argue),
--   moderator_ruling_lean (how they judge), consistency_score,
--   category_specific_lean
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_debater_vs_moderator AS
SELECT
  p.id AS user_id,
  p.username,
  -- As debater: which categories they enter
  (SELECT jsonb_object_agg(sub.category, sub.cnt)
   FROM (
     SELECT el.category, COUNT(*) AS cnt
     FROM public.event_log el
     WHERE el.user_id = p.id AND el.event_type = 'debate_joined' AND el.category IS NOT NULL
     GROUP BY el.category
   ) sub
  ) AS debate_categories,
  -- As debater: side preference per category
  (SELECT jsonb_object_agg(sub.cat_side, sub.cnt)
   FROM (
     SELECT el.category || ':' || el.side AS cat_side, COUNT(*) AS cnt
     FROM public.event_log el
     WHERE el.user_id = p.id AND el.event_type = 'debate_joined' AND el.side IS NOT NULL
     GROUP BY el.category, el.side
   ) sub
  ) AS debate_side_choices,
  -- As moderator: ruling lean
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE dr.ruling = 'allowed' AND dr.supports_side = 'a')::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 1
  ) FROM public.debate_references dr WHERE dr.ruled_by = p.id
  ) AS mod_allow_rate_side_a_pct,
  p.mod_rulings_total,
  p.debates_completed,
  p.mod_approval_pct
FROM public.profiles p
WHERE p.deleted_at IS NULL
  AND p.debates_completed > 0
  AND p.mod_rulings_total > 0;


-- ──────────────────────────────────────────────────────────
-- VIEW 8: TOKEN ECONOMY FLOW — Where does money move?
-- Buyers: Financial services, hedge funds, ad agencies, retail
-- Data items: event_type, total_tokens, unique_users,
--   avg_per_transaction, category_breakdown, time_window
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_token_economy AS
SELECT
  el.event_type,
  el.category,
  DATE_TRUNC('day', el.created_at) AS day,
  COUNT(*) AS event_count,
  COUNT(DISTINCT el.user_id) AS unique_users,
  SUM((el.metadata->>'amount')::INTEGER) AS total_tokens,
  ROUND(AVG((el.metadata->>'amount')::NUMERIC), 1) AS avg_tokens
FROM public.event_log el
WHERE el.event_type IN ('tokens_spent', 'tokens_earned', 'purchase_completed', 'subscription_changed')
GROUP BY el.event_type, el.category, DATE_TRUNC('day', el.created_at)
ORDER BY day DESC, event_type;


-- ──────────────────────────────────────────────────────────
-- VIEW 9: ENGAGEMENT FUNNEL — Where do users drop off?
-- Buyers: Tech, ad agencies, media, entertainment, retail
-- Data items: funnel_step, user_count, conversion_rate,
--   avg_time_between_steps, drop_off_pct
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_engagement_funnel AS
SELECT
  'mirror_visit' AS step, 1 AS step_order,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'mirror_visit') AS users
FROM public.event_log
UNION ALL
SELECT 'auto_debate_voted', 2,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'auto_debate_voted' AND user_id IS NOT NULL)
FROM public.event_log
UNION ALL
SELECT 'signup', 3,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'signup')
FROM public.event_log
UNION ALL
SELECT 'hot_take_posted', 4,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'hot_take_posted')
FROM public.event_log
UNION ALL
SELECT 'debate_joined', 5,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'debate_joined')
FROM public.event_log
UNION ALL
SELECT 'debate_completed', 6,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'debate_completed')
FROM public.event_log
UNION ALL
SELECT 'purchase_completed', 7,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'purchase_completed')
FROM public.event_log
ORDER BY step_order;


-- ──────────────────────────────────────────────────────────
-- VIEW 10: RIVALRY NETWORK — Who fights who, and why?
-- Buyers: Entertainment, sports, media, ad agencies
-- Data items: user_a, user_b, matchup_count, category,
--   head_to_head_record, intensity_score (references per matchup)
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_rivalry_network AS
SELECT
  LEAST(ad.debater_a, ad.debater_b) AS user_a,
  GREATEST(ad.debater_a, ad.debater_b) AS user_b,
  pa.username AS username_a,
  pb.username AS username_b,
  COUNT(*) AS matchup_count,
  COUNT(*) FILTER (WHERE ad.winner = 'a' AND ad.debater_a = LEAST(ad.debater_a, ad.debater_b)) +
  COUNT(*) FILTER (WHERE ad.winner = 'b' AND ad.debater_b = LEAST(ad.debater_a, ad.debater_b)) AS wins_user_a,
  COUNT(*) FILTER (WHERE ad.winner = 'b' AND ad.debater_b = GREATEST(ad.debater_a, ad.debater_b)) +
  COUNT(*) FILTER (WHERE ad.winner = 'a' AND ad.debater_a = GREATEST(ad.debater_a, ad.debater_b)) AS wins_user_b,
  jsonb_agg(DISTINCT ad.category) FILTER (WHERE ad.category IS NOT NULL) AS categories
FROM public.arena_debates ad
JOIN public.profiles pa ON pa.id = LEAST(ad.debater_a, ad.debater_b)
JOIN public.profiles pb ON pb.id = GREATEST(ad.debater_a, ad.debater_b)
WHERE ad.debater_b IS NOT NULL
  AND ad.status = 'complete'
GROUP BY LEAST(ad.debater_a, ad.debater_b), GREATEST(ad.debater_a, ad.debater_b), pa.username, pb.username
HAVING COUNT(*) >= 2
ORDER BY matchup_count DESC;


-- ████████████████████████████████████████████████████████████
-- PART 5: THE 250 DATA ITEMS — MAPPED BY BUYER INDUSTRY
--
-- Each line = one sellable data point.
-- Format: [INDUSTRY] → data_item (source_view or source_table)
--
-- ═══════════════════════════════════════════════════════════
--
-- [POLITICAL CAMPAIGNS] (15 items)
--   1. Topic-level voter sentiment by side (v_topic_sentiment)
--   2. Vote velocity on political topics — momentum tracking (v_topic_sentiment)
--   3. User political lean derived from debate side selection (v_user_opinion_profile)
--   4. User political lean derived from moderator rulings (v_moderator_bias)
--   5. Debater vs moderator consistency — do they argue what they believe? (v_debater_vs_moderator)
--   6. Geographic lean (future: IP/timezone bucketing in event_log metadata)
--   7. Age bracket opinion split (profile_depth_answers → date_of_birth)
--   8. Persuasion events — which arguments change votes (v_persuasion_events)
--   9. Hot take virality — which political opinions get the most reactions (hot_takes + reactions)
--   10. Political topic fatigue — declining engagement over time (v_category_heatmap)
--   11. Time-of-day political engagement peaks (event_log timestamps)
--   12. Source credibility in political debates (v_reference_quality)
--   13. Prediction market accuracy on political outcomes (predictions)
--   14. Rival network in political category (v_rivalry_network)
--   15. Moderator bias distribution in political debates (v_moderator_bias + category)
--
-- [POLLING FIRMS] (10 items)
--   16. Real-time opinion polling via auto-debate votes (auto_debates)
--   17. Sentiment shift over time — time-series vote data (event_log)
--   18. Demographic cross-tabs via profile depth (profile_depth_answers)
--   19. Behavioral vs stated preference gap (v_debater_vs_moderator)
--   20. Prediction accuracy as proxy for confidence (predictions)
--   21. Engagement intensity as proxy for passion (token spend per topic)
--   22. Topic salience ranking — what people choose to debate (v_category_heatmap)
--   23. Side switching frequency (event_log debate_joined side history)
--   24. Cross-topic correlation — users who care about X also care about Y (event_log)
--   25. Sample representativeness metrics (profile_depth demographics)
--
-- [MEDIA] (10 items)
--   26. Trending debate topics — real-time editorial signal (v_category_heatmap)
--   27. Most controversial auto-debates by vote split (v_topic_sentiment)
--   28. User-generated hot takes as content source (hot_takes)
--   29. Which news sources users cite most (v_reference_quality)
--   30. Topic lifecycle — birth, peak, death of a news cycle (event_log time series)
--   31. Audience engagement by category (v_category_heatmap)
--   32. Comment/reaction volume as virality predictor (hot_take_reactions)
--   33. Debate transcript summaries as article seeds (debate_messages)
--   34. Moderator commentary as expert opinion proxy (ruling_reason in debate_references)
--   35. Source trust ranking by allow/deny rate (v_reference_quality)
--
-- [HEDGE FUNDS] (10 items)
--   36. Consumer sentiment on brands/products via debate topics (auto_debates)
--   37. Prediction market data — crowd forecasting accuracy (predictions)
--   38. Engagement velocity as leading indicator (v_category_heatmap)
--   39. Token economy flow as micro-economy signal (v_token_economy)
--   40. Topic emergence timing — early signal before mainstream (event_log first-seen)
--   41. Category rotation patterns — what's gaining/losing attention (v_category_heatmap)
--   42. User conviction strength — tokens wagered per prediction (predictions)
--   43. Contrarian indicator — topics where AI picks unpopular winner (auto_debates margin)
--   44. Debate completion rates as engagement quality metric (event_log)
--   45. Subscription/purchase patterns as economic sentiment (v_token_economy)
--
-- [PR / AD AGENCIES] (10 items)
--   46. Brand mention sentiment in debates (debate_messages full text search)
--   47. Ad placement targeting by user opinion profile (v_user_opinion_profile)
--   48. Category affinity for audience segmentation (v_user_opinion_profile)
--   49. Persuasion event data — what arguments change minds (v_persuasion_events)
--   50. Source credibility for influencer vetting (v_reference_quality)
--   51. Hot take themes for campaign messaging (hot_takes text analysis)
--   52. Engagement timing for optimal ad delivery (event_log time patterns)
--   53. Rivalry dynamics for competitive brand positioning (v_rivalry_network)
--   54. Funnel conversion data for campaign ROI modeling (v_engagement_funnel)
--   55. User persona clusters from profile depth + behavior (v_user_opinion_profile + profile_depth)
--
-- [LEGAL / JURY CONSULTANTS] (10 items)
--   56. Moderator bias profiles for juror prediction modeling (v_moderator_bias)
--   57. Debater vs moderator identity gap — predicts juror behavior (v_debater_vs_moderator)
--   58. Topic-specific ruling patterns (v_moderator_bias + category)
--   59. Source credibility perception by demographic (v_reference_quality + profile_depth)
--   60. Argument persuasion effectiveness (v_persuasion_events)
--   61. User reaction to authority vs evidence (ruling patterns)
--   62. Consistency scoring — do they rule the same way repeatedly? (v_moderator_bias)
--   63. Emotional vs logical argument correlation with outcomes (debate_messages analysis)
--   64. Demographic ruling tendencies (profile_depth + moderator_scores)
--   65. Speed of judgment as confidence proxy (avg_ruling_seconds in v_moderator_bias)
--
-- [BRAND STRATEGY] (10 items)
--   66-75: Category engagement depth, user loyalty metrics, opinion
--          evolution tracking, cross-category interest mapping,
--          brand advocate identification, competitor mention tracking,
--          sentiment trajectory per topic, community influence scoring,
--          user segment behavioral patterns, referral/share patterns
--
-- [THINK TANKS / GOVERNMENT] (10 items)
--   76-85: Policy opinion tracking, demographic opinion breakdowns,
--          argument quality metrics, evidence usage patterns,
--          topic polarization index, deliberation quality scoring,
--          cross-partisan engagement rates, opinion change catalysts,
--          civic engagement proxies, institutional trust signals
--
-- [ENTERTAINMENT / SPORTS] (10 items)
--   86-95: Fan rivalry intensity, matchup engagement prediction,
--          content virality scoring, audience retention curves,
--          debate topic trending for programming, fan sentiment
--          on teams/players/shows, prediction accuracy leaderboards,
--          engagement by time of day/day of week, cross-interest mapping,
--          community formation patterns
--
-- [TECH / HEALTHCARE / INSURANCE] (10 items)
--   96-105: User behavior modeling, engagement pattern analysis,
--           churn prediction signals, feature adoption curves,
--           health topic sentiment, risk perception patterns,
--           decision-making speed metrics, trust authority signals,
--           information verification behavior, source diversity index
--
-- [RETAIL / F&B / AUTOMOTIVE / PHARMA] (10 items)
--   106-115: Consumer opinion on products/brands, purchase intent
--            signals from debate topics, category interest mapping,
--            seasonal engagement patterns, price sensitivity proxies,
--            brand loyalty indicators, competitor sentiment tracking,
--            demographic preference patterns, influence chain mapping,
--            product category engagement depth
--
-- [EDUCATION RESEARCH] (10 items)
--   116-125: Argumentation quality metrics, evidence usage patterns,
--            critical thinking indicators, source evaluation behavior,
--            deliberation process modeling, perspective-taking frequency,
--            knowledge domain mapping, engagement with opposing views,
--            information literacy signals, collaborative vs competitive
--            reasoning patterns
--
-- [FINANCIAL SERVICES / ENERGY / TELECOM / NONPROFIT] (10 items)
--   126-135: Sentiment on financial topics, trust in institutions,
--            opinion on regulations/policy, engagement with social
--            causes, donation/spending correlation with debate topics,
--            risk tolerance signals, technology adoption sentiment,
--            infrastructure opinion tracking, community mobilization
--            patterns, advocacy intensity metrics
--
-- [CROSS-INDUSTRY PREMIUM INSIGHTS] (115 items → items 136-250)
-- These are composite insights requiring multiple views:
--   - Behavioral segmentation clusters (all views combined)
--   - Predictive opinion modeling (event_log time series + ML)
--   - Influence network mapping (follows + rivals + debate history)
--   - Real-time dashboard feeds (all views, websocket-ready)
--   - Custom cohort analysis (any filter combination)
--   - Longitudinal opinion tracking (event_log, monthly snapshots)
--   - A/B topic testing (auto_debate creation + vote measurement)
--   - Moderator selection optimization (v_moderator_bias)
--   - Argument effectiveness scoring (debate outcomes + references)
--   - Cross-platform correlation (bot army source tracking)
--   ... and 105 more granular permutations of the above
--       across category × demographic × time window × metric type
--
-- ═══════════════════════════════════════════════════════════
-- Total: 250 data items across 25 industries
-- All derived from 1 event log + 10 aggregation views + existing tables
-- No surveys. No opt-ins. Pure behavioral intelligence.
-- ═══════════════════════════════════════════════════════════


-- ████████████████████████████████████████████████████████████
-- PART 6: DAILY SNAPSHOT TABLE
-- Materialized summary for B2B API / dashboard delivery.
-- Cron job (pg_cron or VPS) runs nightly.
-- ████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.daily_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT '_global',
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date, category, metric)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON public.daily_snapshots(snapshot_date DESC, category);

ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_service_only" ON public.daily_snapshots
  FOR ALL USING (current_setting('role') IN ('postgres', 'service_role'));


-- ════════════════════════════════════════════════════════════
-- NIGHTLY SNAPSHOT FUNCTION
-- Call via pg_cron: SELECT run_daily_snapshot();
-- Or from VPS: curl the Edge Function wrapper
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION run_daily_snapshot()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_count INTEGER := 0;
BEGIN
  -- Total users
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_users', (SELECT COUNT(*) FROM profiles WHERE deleted_at IS NULL))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Total debates
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_debates', (SELECT COUNT(*) FROM arena_debates WHERE status = 'complete'))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Total auto_debate votes
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_auto_votes', (SELECT COALESCE(SUM(vote_count), 0) FROM auto_debates))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Total moderator rulings
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_mod_rulings', (SELECT COUNT(*) FROM debate_references WHERE ruling != 'pending'))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Active moderators
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'active_moderators', (SELECT COUNT(*) FROM profiles WHERE is_moderator = true AND mod_available = true))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Events today
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'events_today', (SELECT COUNT(*) FROM event_log WHERE created_at::DATE = v_date))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Per-category debate counts
  INSERT INTO daily_snapshots (snapshot_date, category, metric, value)
  SELECT v_date, category, 'debates_today', COUNT(*)
  FROM event_log
  WHERE event_type IN ('debate_created', 'auto_debate_created')
    AND created_at::DATE = v_date
    AND category IS NOT NULL
  GROUP BY category
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;

  RETURN v_count;
END;
$$;
