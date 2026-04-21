/**
 * RPC Contract Schemas — Zod runtime validation for Supabase RPC responses.
 *
 * Each export matches a Postgres RPC function name. When passed to safeRpc(),
 * the response is validated against the schema at runtime:
 *   - DEV:  throw on mismatch (catch shape bugs immediately)
 *   - PROD: log violation + fall through with raw data (no user-facing crash)
 *
 * Batch 1: 6 high-risk untyped RPCs (blind `as` casts in calling code).
 * Batch 2: 6 more high-risk untyped RPCs.
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


// =====================================================================
// BATCH 2: 6 more high-risk untyped RPCs
// =====================================================================

// ── get_debate_replay_data ───────────────────────────────────────
// Called by: spectate.ts:197
// Frontend casts to: ReplayData
// Reads: .power_ups[], .references[], .mod_scores[], .point_awards[], .speech_events[]

const ReplayPowerUpSchema = z.object({
  power_up_id: z.string(),
  user_id: z.string(),
  activated_at: z.string(),
  power_up_name: z.string(),
  power_up_icon: z.string(),
  user_name: z.string(),
  side: z.string(),
}).passthrough();

const ReplayReferenceSchema = z.object({
  id: z.string(),
  submitter_id: z.string(),
  round: z.number().nullable(),
  url: z.string(),
  description: z.string(),
  supports_side: z.string(),
  ruling: z.string(),
  ruling_reason: z.string().nullable(),
  created_at: z.string(),
  ruled_at: z.string().nullable(),
  submitter_name: z.string(),
  side: z.string(),
}).passthrough();

const ReplayModScoreSchema = z.object({
  scorer_id: z.string(),
  scorer_role: z.string(),
  score: z.number(),
  created_at: z.string(),
  scorer_name: z.string(),
}).passthrough();

const PointAwardMetaSchema = z.object({
  scored_event_id: z.string(),
  score_a_after: z.number(),
  score_b_after: z.number(),
  base_score: z.number(),
  in_debate_multiplier: z.number(),
  in_debate_flat: z.number(),
  final_contribution: z.number(),
}).passthrough();

const ReplayPointAwardSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  round: z.number().nullable(),
  side: z.string(),
  base_score: z.number(),
  metadata: PointAwardMetaSchema,
}).passthrough();

const ReplaySpeechEventSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  round: z.number().nullable(),
  side: z.string(),
  content: z.string().nullable(),
  user_id: z.string().nullable(),
  debater_name: z.string(),
}).passthrough();

export const get_debate_replay_data = z.object({
  power_ups: z.array(ReplayPowerUpSchema),
  references: z.array(ReplayReferenceSchema),
  mod_scores: z.array(ReplayModScoreSchema),
  point_awards: z.array(ReplayPointAwardSchema),
  speech_events: z.array(ReplaySpeechEventSchema),
}).passthrough();


// ── get_spectator_chat ───────────────────────────────────────────
// Called by: spectate.ts:184, spectate.chat.ts:130, arena-feed-spec-chat.ts:137
// Frontend casts to: SpectatorChatMessage[] / SpecChatMessage[]
// Reads: .id, .user_id, .display_name, .avatar_url, .message, .created_at

const SpectatorChatMessageSchema = z.object({
  id: z.string().optional(),        // spectate.types omits id; arena-feed-spec-chat requires it
  user_id: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable().optional(),
  message: z.string().nullable(),
  created_at: z.string().nullable(),
}).passthrough();

export const get_spectator_chat = z.array(SpectatorChatMessageSchema);


// ── get_modifier_catalog ─────────────────────────────────────────
// Called by: modifiers-catalog.ts:23
// Frontend casts to: ModifierEffect[]
// Reads: .id, .effect_num, .name, .description, .category, .timing, .tier_gate, .mod_cost, .pu_cost

const ModifierCategorySchema = z.enum([
  'token', 'point', 'reference', 'elo_xp', 'crowd', 'survival',
  'self_mult', 'self_flat', 'opponent_debuff', 'cite_triggered',
  'conditional', 'special',
]);

const ModifierTimingSchema = z.enum(['end_of_debate', 'in_debate']);

const RarityTierSchema = z.enum(['common', 'uncommon', 'rare', 'legendary', 'mythic']);

const ModifierEffectSchema = z.object({
  id: z.string(),
  effect_num: z.number(),
  name: z.string(),
  description: z.string(),
  category: ModifierCategorySchema,
  timing: ModifierTimingSchema,
  tier_gate: RarityTierSchema,
  mod_cost: z.number(),
  pu_cost: z.number(),
}).passthrough();

export const get_modifier_catalog = z.array(ModifierEffectSchema);


// ── get_user_modifier_inventory ──────────────────────────────────
// Called by: modifiers-rpc.ts:94
// Frontend casts to: UserInventory
// Reads: .unsocketed_modifiers[], .powerup_stock[], .equipped_loadout[]

const OwnedModifierSchema = z.object({
  modifier_id: z.string(),
  effect_id: z.string(),
  name: z.string(),
  description: z.string(),
  category: ModifierCategorySchema,
  timing: ModifierTimingSchema,
  tier_gate: RarityTierSchema,
  acquired_at: z.string(),
  acquisition_type: z.enum(['purchase', 'drop', 'reward']),
}).passthrough();

const PowerUpStockSchema = z.object({
  effect_id: z.string(),
  name: z.string(),
  description: z.string(),
  category: ModifierCategorySchema,
  timing: ModifierTimingSchema,
  tier_gate: RarityTierSchema,
  quantity: z.number(),
  pu_cost: z.number(),
}).passthrough();

const EquippedLoadoutEntrySchema = z.object({
  effect_id: z.string(),
  name: z.string(),
  description: z.string(),
  category: ModifierCategorySchema,
  timing: ModifierTimingSchema,
  consumed: z.boolean(),
  equipped_at: z.string(),
}).passthrough();

export const get_user_modifier_inventory = z.object({
  unsocketed_modifiers: z.array(OwnedModifierSchema),
  powerup_stock: z.array(PowerUpStockSchema),
  equipped_loadout: z.array(EquippedLoadoutEntrySchema),
});


// ── get_my_groups ────────────────────────────────────────────────
// Called by: groups.load.ts:33, arena-private-picker.ts:230
// Frontend casts to: GroupListItem[] / { id, name, member_count }[]
// Reads: .id, .name, .avatar_emoji, .description, .member_count, .elo_rating, .role, .is_member

const GroupListItemSchema = z.object({
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
}).passthrough();

export const get_my_groups = z.array(GroupListItemSchema);


// ── get_my_invite_stats ──────────────────────────────────────────
// Called by: home.invite.ts:24
// Frontend casts to: InviteStats
// Reads: .ref_code, .invite_url, .total_clicks, .total_signups, .total_converts,
//        .next_milestone, .unclaimed_rewards[], .activity[]

const InviteRewardSchema = z.object({
  id: z.string(),
  milestone: z.number(),
  reward_type: z.enum(['legendary_powerup', 'mythic_powerup', 'mythic_modifier']),
  pending_review: z.boolean(),
  awarded_at: z.string(),
}).passthrough();

const ActivityEntrySchema = z.object({
  status: z.string(),
  username: z.string().nullable(),
  event_at: z.string(),
}).passthrough();

export const get_my_invite_stats = z.object({
  ref_code: z.string().nullable(),
  invite_url: z.string().nullable(),
  total_clicks: z.number(),
  total_signups: z.number(),
  total_converts: z.number(),
  next_milestone: z.number(),
  unclaimed_rewards: z.array(InviteRewardSchema),
  activity: z.array(ActivityEntrySchema),
});


// =====================================================================
// BATCH 3: 6 more high-risk untyped RPCs
// =====================================================================

// ── send_spectator_chat ──────────────────────────────────────────
// Called by: arena-feed-spec-chat.ts:217, spectate.chat.ts:73
// Frontend casts to: { success?: boolean; error?: string; display_name?: string }

export const send_spectator_chat = z.object({
  success: z.boolean().optional(),
  error: z.string().optional(),
  display_name: z.string().optional(),
}).passthrough();


// ── complete_onboarding_day ──────────────────────────────────────
// Called by: onboarding-drip.ts:184
// Frontend casts to: { success: boolean; cosmetic_name?: string; already_done?: boolean }

export const complete_onboarding_day = z.object({
  success: z.boolean(),
  cosmetic_name: z.string().optional(),
  already_done: z.boolean().optional(),
}).passthrough();


// ── get_group_challenges ─────────────────────────────────────────
// Called by: groups.challenges.ts:179
// Frontend casts to: Record<string, unknown>[]

const GroupChallengeSchema = z.object({
  id: z.string(),
  status: z.string(),
  challenger_group_id: z.string().nullable().optional(),
  defender_group_id: z.string().nullable().optional(),
  challenger_name: z.string().nullable().optional(),
  defender_name: z.string().nullable().optional(),
  challenger_emoji: z.string().nullable().optional(),
  defender_emoji: z.string().nullable().optional(),
  challenger_elo: z.union([z.number(), z.string()]).nullable().optional(),
  defender_elo: z.union([z.number(), z.string()]).nullable().optional(),
}).passthrough();

export const get_group_challenges = z.array(GroupChallengeSchema);


// ── get_group_leaderboard ────────────────────────────────────────
// Called by: groups.load.ts:50
// Frontend casts to: GroupListItem[] (same shape as get_my_groups)

export const get_group_leaderboard = z.array(GroupListItemSchema);


// ── get_group_members ────────────────────────────────────────────
// Called by: groups.members.ts:31
// Frontend casts to: GroupMember[]

const GroupMemberSchema = z.object({
  user_id: z.string(),
  role: z.string(),
  joined_at: z.string().optional(),
  username: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  elo_rating: z.union([z.number(), z.string()]).optional(),
  wins: z.union([z.number(), z.string()]).optional(),
  losses: z.union([z.number(), z.string()]).optional(),
  level: z.union([z.number(), z.string()]).optional(),
}).passthrough();

export const get_group_members = z.array(GroupMemberSchema);


// ── get_user_watch_tier ──────────────────────────────────────────
// Called by: arena-feed-wiring-spectator.ts:28
// Frontend handles both array-of-one and single-row shapes

const WatchTierRowSchema = z.object({
  tier: z.string(),
}).passthrough();

export const get_user_watch_tier = z.union([
  z.array(WatchTierRowSchema),
  WatchTierRowSchema,
]);


// =====================================================================
// BATCH 4: 6 more high-risk untyped RPCs
// =====================================================================

// ── cast_sentiment_tip ───────────────────────────────────────────
// Called by: arena-feed-wiring-spectator.ts:72
// Frontend casts to: { success?: boolean; error?: string; new_total_a?: number; new_total_b?: number; new_balance?: number }

export const cast_sentiment_tip = z.object({
  success: z.boolean().optional(),
  error: z.string().optional(),
  new_total_a: z.number().optional(),
  new_total_b: z.number().optional(),
  new_balance: z.number().optional(),
}).passthrough();


// ── discover_groups ──────────────────────────────────────────────
// Called by: groups.load.ts:18
// Frontend casts to: GroupListItem[] (same shape as get_my_groups)

export const discover_groups = z.array(GroupListItemSchema);


// ── create_group ─────────────────────────────────────────────────
// Called by: groups.create.ts:33
// Frontend reads: .group_id

export const create_group = z.object({
  group_id: z.string().optional(),
  error: z.string().optional(),
  success: z.boolean().optional(),
}).passthrough();


// ── create_group_challenge ───────────────────────────────────────
// Called by: groups.challenges.ts:143
// Frontend reads: .error, or returns challenge data on success

export const create_group_challenge = z.object({
  error: z.string().optional(),
  success: z.boolean().optional(),
  challenge_id: z.string().optional(),
}).passthrough();


// ── respond_to_group_challenge ───────────────────────────────────
// Called by: groups.challenges.ts:247
// Frontend reads: .error

export const respond_to_group_challenge = z.object({
  error: z.string().optional(),
  success: z.boolean().optional(),
}).passthrough();


// ── request_audition ─────────────────────────────────────────────
// Called by: groups.auditions.ts:71
// Frontend reads error via throw; success returns data object

export const request_audition = z.object({
  success: z.boolean().optional(),
  error: z.string().optional(),
  audition_id: z.string().optional(),
}).passthrough();
