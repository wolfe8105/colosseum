/**
 * RPC Contract Schemas — Zod runtime validation for Supabase RPC responses.
 *
 * Each export matches a Postgres RPC function name. When passed to safeRpc(),
 * the response is validated against the schema at runtime:
 *   - DEV:  throw on mismatch (catch shape bugs immediately)
 *   - PROD: log violation + fall through with raw data (no user-facing crash)
 *
 * Batch 1: 6 high-risk untyped RPCs (blind `as` casts in calling code).
 */

import { z } from 'zod';

// ── get_arena_debate_spectator ───────────────────────────────────
// Called by: arena-feed-room.ts:215, spectate.ts:27, spectate.ts:93, spectate.vote.ts:53
// Frontend casts to: Record<string, unknown> / SpectateDebate
// Reads: .topic, .current_round, .total_rounds, .moderator_name,
//        .debater_a_name, .debater_b_name, .status, .mode, .spectator_count,
//        .vote_count_a, .vote_count_b, .score_a, .score_b, .winner, .ai_scorecard

const AICriterionSchema = z.object({
  score: z.number(),
  reason: z.string(),
});

const AISideScoresSchema = z.object({
  logic: AICriterionSchema,
  evidence: AICriterionSchema,
  delivery: AICriterionSchema,
  rebuttal: AICriterionSchema,
});

const AIScorecardSchema = z.object({
  side_a: AISideScoresSchema,
  side_b: AISideScoresSchema,
  overall_winner: z.string(),
  verdict: z.string(),
});

export const get_arena_debate_spectator = z.object({
  status: z.string().nullable(),
  mode: z.string().nullable(),
  topic: z.string().nullable(),
  debater_a_name: z.string().nullable(),
  debater_a_elo: z.number().nullable(),
  debater_a_avatar: z.string().nullable(),
  debater_b_name: z.string().nullable(),
  debater_b_elo: z.number().nullable(),
  debater_b_avatar: z.string().nullable(),
  moderator_type: z.string().nullable(),
  moderator_id: z.string().nullable(),
  moderator_name: z.string().nullable(),
  ruleset: z.string().nullable(),
  spectator_count: z.number().nullable(),
  current_round: z.number().nullable(),
  total_rounds: z.number().nullable(),
  vote_count_a: z.number().nullable(),
  vote_count_b: z.number().nullable(),
  score_a: z.number().nullable(),
  score_b: z.number().nullable(),
  winner: z.string().nullable(),
  ai_scorecard: AIScorecardSchema.nullable(),
}).passthrough(); // allow extra columns from Postgres without failing


// ── apply_end_of_debate_modifiers ────────────────────────────────
// Called by: arena-room-end-finalize.ts:29
// Frontend casts to: EndOfDebateBreakdown
// Reads: .debater_a.final_score, .debater_b.final_score, .debater_a.raw_score,
//        .debater_b.raw_score, .debater_a.adjustments[], .debater_b.adjustments[]

const AdjustmentSchema = z.object({
  effect_name: z.string(),
  delta: z.number(),
  source: z.string().optional(),
});

const DebaterBreakdownSchema = z.object({
  raw_score: z.number(),
  adjustments: z.array(AdjustmentSchema),
  final_score: z.number(),
});

const InventoryEffectSchema = z.union([
  z.object({ effect: z.literal('mirror'), copied_effect_id: z.string(), from_ref_id: z.string(), new_modifier_id: z.string() }),
  z.object({ effect: z.literal('burn_notice'), burned_effect_id: z.string(), from_ref_id: z.string() }),
  z.object({ effect: z.literal('parasite'), stolen_effect_id: z.string(), source: z.enum(['free_inventory', 'socketed']), modifier_id: z.string(), from_ref_id: z.string().optional() }),
  z.object({ effect: z.literal('chain_reaction'), regenerated_effect: z.string(), new_powerup_qty: z.number() }),
]);

export const apply_end_of_debate_modifiers = z.object({
  debater_a: DebaterBreakdownSchema,
  debater_b: DebaterBreakdownSchema,
  inventory_effects: z.array(InventoryEffectSchema).optional(),
});


// ── get_onboarding_progress ──────────────────────────────────────
// Called by: onboarding-drip.ts:159
// Frontend casts to: DripProgress
// Reads: .days_since, .all_done, .completed, .success

export const get_onboarding_progress = z.object({
  success: z.boolean(),
  days_since: z.number(),
  completed: z.array(z.number()),
  all_done: z.boolean(),
});


// ── get_group_details ────────────────────────────────────────────
// Called by: groups.detail.ts:39
// Frontend casts to: GroupDetail (extends GroupListItem)
// Reads: .name, .avatar_emoji, .description, .member_count, .elo_rating,
//        .my_role, .is_member, .shared_fate_pct, .join_mode, etc.

export const get_group_details = z.object({
  id: z.string(),
  name: z.string(),
  avatar_emoji: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  member_count: z.union([z.number(), z.string()]).optional(),
  elo_rating: z.union([z.number(), z.string()]).optional(),
  role: z.string().nullable().optional(),
  rank: z.union([z.number(), z.string()]).nullable().optional(),
  is_member: z.boolean().optional(),
  my_role: z.string().nullable().optional(),
  // GroupDetail extensions
  slug: z.string().nullable().optional(),
  owner_id: z.string().nullable().optional(),
  is_public: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
  join_mode: z.enum(['open', 'requirements', 'audition', 'invite_only']).optional(),
  entry_requirements: z.object({
    min_elo: z.number().optional(),
    min_tier: z.string().optional(),
    require_profile_complete: z.boolean().optional(),
  }).nullable().optional(),
  audition_config: z.object({
    rule: z.string().optional(),
    locked_topic: z.string().nullable().optional(),
    locked_category: z.string().nullable().optional(),
    locked_ruleset: z.string().nullable().optional(),
    locked_total_rounds: z.number().nullable().optional(),
  }).nullable().optional(),
  gvg_wins: z.number().optional(),
  gvg_losses: z.number().optional(),
  banner_tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  banner_static_url: z.string().nullable().optional(),
  banner_animated_url: z.string().nullable().optional(),
  shared_fate_pct: z.number().optional(),
}).passthrough();


// ── get_my_invite_link ───────────────────────────────────────────
// Called by: share.ts:62, plinko-invite-nudge.ts:12
// Frontend casts to: { url?: string; ref_code?: string }
// Reads: .url, .ref_code

export const get_my_invite_link = z.object({
  url: z.string().optional(),
  ref_code: z.string().optional(),
}).passthrough();


// ── get_debate_messages ──────────────────────────────────────────
// Called by: spectate.ts:53, spectate.ts:168, arena-room-live-poll.ts:43
// Frontend casts to: DebateMessage[]
// Reads: .round, .side, .is_ai, .content, .created_at

const DebateMessageSchema = z.object({
  round: z.number().nullable(),
  side: z.string().nullable(),
  is_ai: z.boolean().nullable(),
  content: z.string().nullable(),
  created_at: z.string().nullable(),
}).passthrough();

export const get_debate_messages = z.array(DebateMessageSchema);
