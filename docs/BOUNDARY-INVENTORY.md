# Colosseum — Boundary Crossing Inventory

> Generated 2026-04-21 · Steps 1–2 of the contract testing attack plan.
> Every place where one system hands data to another system.

---

## Summary

| Boundary type | Count | Contract enforced? |
|---|---|---|
| RPC calls (frontend → PostgREST → Postgres) | 164 unique functions | 73 typed, **95 blind** |
| Direct table queries (.from()) | 11 tables | TypeScript types exist via `database.ts` |
| Vercel rewrites | 12 routes | Static config, no runtime check |
| HTML entry points (Vite) | 14 files | Build-time only |
| API serverless functions | 9 files | No contract |
| Storage buckets | 3 | No contract |
| Realtime channels | 4 | No contract |
| Edge function calls | 5 | No contract |
| External APIs | 2 | No contract |

**Total crossing points: ~213**
**Contract-enforced: ~73 (TypeScript annotations only — no runtime validation)**
**Completely blind: ~140**

---

## 1. RPC Calls — Frontend → PostgREST → Postgres

The single largest boundary surface. Every call goes through `safeRpc()` in `auth.rpc.ts`, which wraps `supabase.rpc()` with 401 recovery. The response comes back as `{ data, error }`.

### 1a. Typed RPC calls (73) — frontend declares expected shape

These have a `safeRpc<SomeType>(...)` annotation. TypeScript checks usage at compile time, but **PostgREST can still return a different shape at runtime** (array vs object, null vs string, missing field). No runtime validation exists.

Types used: `ArenaFeedItem[]`, `MatchData`, `ModQueueItem[]`, `PrivateLobbyResult`, `JoinPrivateLobbyResult`, `CheckPrivateLobbyResult`, `MatchAcceptResponse`, `UpdateDebateResult`, `ModStatusResult`, `ModDebateCheckResult`, `LeaderboardRpcRow[]`, `UnifiedFeedCard[]`, `PublicProfile`, `SearchUser[]`, `ArsenalReference[]`, `TrendingReference[]`, `ArchiveEntry[]`, `LoadoutPreset[]`, `DMThread[]`, `DMMessage[]`, `Tournament[]`, `BracketMatch[]`, `TournamentMatch[]`, `PendingChallenge[]`, `CosmeticItem[]`, `RivalData[]`, `StandaloneQuestion[]`, `PowerUpResult`, `MyPowerUpsResult`, `ForgeResult`, `EditResult`, `SecondResult`, `ChallengeResult`, `CiteResult2`, `ChallengeResult2`, `PostBountyResult`, `MyBountiesResult`, `OpponentBounty[]`, `SelectClaimResult`, `StakeResult`, `PoolData`, `SettleResult`, `ModeratorInfo[]`, `DebateReference[]`, `RankedCheckResult`, `LoadoutRef[]`, `CastVoteResult`, `PlacePredictionResult`, `RecentDebate[]`, `DMSendResult`, `ModDebateJoinResult`, inline object shapes.

### 1b. Untyped RPC calls (95) — frontend takes whatever comes back

Split into two risk tiers:

#### HIGH RISK — Response data is read and used (32 functions)

These cast `data as SomeType` or access properties directly. A shape mismatch = crash or wrong behavior.

| RPC function | File | What frontend assumes |
|---|---|---|
| `apply_end_of_debate_modifiers` | arena-room-end-finalize.ts:29 | Cast to `EndOfDebateBreakdown`, reads `.debater_a.final_score` |
| `get_arena_debate_spectator` | arena-feed-room.ts:215 | Cast to `Record<string, unknown>`, reads `.topic`, `.current_round`, `.total_rounds`, `.moderator_name`, `.debater_a_name`, `.debater_b_name`, `.language` |
| `get_arena_debate_spectator` | spectate.ts:27 | Cast to `SpectateDebate`, reads `.spectator_count`, `.vote_count_a`, `.vote_count_b`, `.status` |
| `get_debate_messages` | spectate.ts:53 | Cast to `DebateMessage[]` |
| `get_debate_replay_data` | spectate.ts:196 | Cast to `ReplayData` |
| `get_spectator_chat` | arena-feed-spec-chat.ts:137 | Cast to array, reads `.created_at` |
| `send_spectator_chat` | arena-feed-spec-chat.ts:216 | Reads response data |
| `get_modifier_catalog` | modifiers-catalog.ts:23 | Reads `.data` directly |
| `get_user_modifier_inventory` | modifiers-rpc.ts:94 | Reads result |
| `get_my_groups` | groups.load.ts:33 | Reads data |
| `get_my_invite_link` | share.ts:62 | Cast to `{ url?: string; ref_code?: string }` |
| `get_my_invite_stats` | home.invite.ts:24 | Reads result |
| `get_onboarding_progress` | onboarding-drip.ts:159 | Cast to `DripProgress`, reads `.days_since`, `.all_done` |
| `complete_onboarding_day` | onboarding-drip.ts:183 | Reads result data |
| `get_group_details` | groups.detail.ts:39 | Reads `.name`, `.avatar_emoji`, `.description`, `.member_count`, `.elo_rating`, `.my_role`, `.is_member`, `.shared_fate_pct` |
| `get_group_challenges` | groups.challenges.ts:179 | Reads data |
| `get_group_leaderboard` | groups.load.ts:49 | Reads data |
| `get_group_members` | groups.members.ts:31 | Reads data |
| `get_user_watch_tier` | arena-feed-wiring-spectator.ts:28 | Reads data |
| `cast_sentiment_tip` | arena-feed-wiring-spectator.ts:71 | Reads data |
| `discover_groups` | groups.load.ts:17 | Reads data |
| `create_group` | groups.create.ts:33 | Reads data |
| `create_group_challenge` | groups.challenges.ts:142 | Reads data |
| `respond_to_group_challenge` | groups.challenges.ts:246 | Reads data |
| `request_audition` | groups.auditions.ts:71 | Reads data |
| `get_pending_auditions` | groups.auditions.ts:103 | Reads data |
| `claim_invite_reward` | home.invite-sheet.ts:69 | Reads result |
| `claim_section_reward` | profile-depth.section.ts:153 | Reads result |
| `increment_questions_answered` | profile-depth.section.ts:140 | Reads result |
| `create_debate_card` | home.feed.ts:158 | Reads result |
| `cancel_debate_card` | home.feed.ts:237 | Reads data |
| `place_prediction` | async.actions-predict.ts:38 | Reads data |

#### LOW RISK — Fire-and-forget (63 functions)

These only check `error` and ignore `data`. A contract violation here means a silent failure, not a crash. Still worth validating eventually, but not the priority.

Includes: `respond_to_match`, `request_mod_for_debate`, `cancel_private_lobby`, `update_arena_debate`, `submit_debate_message`, `close_debate_round`, `respond_to_mod_request`, `cancel_mod_debate`, `leave_debate_queue`, `resolve_bounty_attempt`, `save_ai_scorecard`, `settle_sentiment_tips`, `pay_reference_royalties`, `resolve_audition_from_debate`, `convert_referral`, `bump_spectator_count`, `log_debate_watch`, `log_event`, `insert_feed_event`, `mark_notifications_read`, `follow_user`, `unfollow_user`, `block_dm_user`, `unblock_dm_user`, `vote_arena_debate`, `record_mod_dropout`, `mod_null_debate`, `score_debate_comment`, `pin_feed_event`, `equip_cosmetic`, `soft_delete_account`, `set_profile_dob`, `toggle_mod_available`, `toggle_moderator_status`, `update_mod_categories`, `submit_reference`, `rule_on_reference`, `score_moderator`, `assign_moderator`, `update_profile`, `update_archive_entry`, `remove_from_archive`, `add_debate_to_archive`, `delete_loadout_preset`, `save_profile_depth`, `save_user_settings`, `save_intro_music`, `create_voice_take`, `attribute_signup`, `leave_group`, `join_group`, `delete_group`, `update_group_settings`, `ban_group_member`, `kick_group_member`, `promote_group_member`, `save_group_banner`, `equip_powerup_for_debate`, `socket_modifier`, `buy_modifier`, `buy_powerup`, `pick_prediction`, `create_prediction_question`.

---

## 2. Direct Table Queries (.from())

| Table | Files | Operations |
|---|---|---|
| `profiles` | auth.core.ts, multiple | select, update |
| `arena_debates` | spectate.ts, arena-feed-room.ts | select (fallback when RPC fails) |
| `debate_messages` | spectate.ts | select (fallback) |
| `debate_reactions` | arena-feed-events.ts | select |
| `notifications` | notifications.ts | select |
| `groups` | groups pages | select |
| `follows` | auth.follows.ts | select |
| `user_settings` | settings pages | select |

Storage buckets used via `.from()`:
| Bucket | File | Operation |
|---|---|---|
| `debate-audio` | voicememo.upload.ts | upload, getPublicUrl |
| `group-banners` | group-banner-upload.ts | upload, getPublicUrl |
| `intro-music` | intro-music-save.ts | upload |

---

## 3. Vercel Routing → HTML

| Clean URL | Destination | Status |
|---|---|---|
| `/` | `index.html` | ✓ default |
| `/challenge` | `/api/challenge` (serverless) | ⚠️ NOT `moderator-challenge.html` |
| `/go` | `moderator-go.html` | ✓ |
| `/debate/:id` | `moderator-spectate.html?id=:id` | ✓ |
| `/debate` | `moderator-debate-landing.html` | ✓ |
| `/login` | `moderator-login.html` | ✓ |
| `/settings` | `moderator-settings.html` | ✓ |
| `/terms` | `moderator-terms.html` | ✓ |
| `/privacy` | `moderator-privacy.html` | ✓ |
| `/profile-depth` | `moderator-profile-depth.html` | ✓ |
| `/groups` | `moderator-groups.html` | ✓ |
| `/i/:code` | `/api/invite` (serverless) | ✓ |
| `/u/:username` | `/api/profile` (serverless) | ✓ |

**Pages with NO clean URL rewrite (direct filename access only):**
- `moderator-cosmetics.html`
- `moderator-plinko.html`
- `moderator-source-report.html`
- `moderator-challenge.html` (⚠️ exists as file but `/challenge` route goes to API instead)

---

## 4. Client-Side Navigation Crossings

These are `window.location.href` assignments that cross the Vercel routing boundary:

| From file | Navigation target | Risk |
|---|---|---|
| arena-lobby.ts:235 | `moderator-plinko.html` | Direct file, no rewrite |
| arena-private-picker.ts:15 | `moderator-plinko.html` | Direct file, no rewrite |
| arena-config-mode-select.ts:20 | `moderator-plinko.html` | Direct file, no rewrite |
| arena-config-settings.ts:16 | `moderator-plinko.html` | Direct file, no rewrite |
| arena-config-settings.ts:73 | `moderator-profile-depth.html` | Direct file (has `/profile-depth` rewrite) |
| depth-gate.ts:37 | `moderator-profile-depth.html` | Direct file (has rewrite) |
| leaderboard.render.ts:90 | `/u/` + username | Uses clean URL ✓ |
| arena-room-predebate.ts:155 | `/?spectate=` + id | Query param on root |
| auth.ops.ts:89 | `moderator-login.html?reset=true` | Direct file (has `/login` rewrite) |

---

## 5. Edge Function Calls

| Edge function | Called from | Response shape checked? |
|---|---|---|
| `turn-credentials` | webrtc.ice.ts | Reads JSON response |
| `deepgram-token` | arena-deepgram.token.ts | Reads `.key` from JSON |
| `ai-debate-response` | arena-room-ai-response.ts | Reads streaming response |
| `ai-mod-refs` | arena-mod-refs-ai.ts | Reads JSON |
| `ai-scoring` | arena-room-ai-scoring.ts | Reads JSON |

---

## 6. Realtime Channels

| Channel | File | Events |
|---|---|---|
| Arena feed | arena-feed-realtime.ts | postgres_changes on arena_debates |
| DM | dm.ts | postgres_changes on dm_messages |
| WebRTC signaling | webrtc.signaling.ts | broadcast messages |
| Presence | rivals-presence-channel.ts | presence join/leave |

---

## 7. External APIs

| API | File | Purpose |
|---|---|---|
| Stripe | payments.ts | Checkout sessions |
| HaveIBeenPwned | plinko-password.ts | Password breach check |
| Scrape OG | api/scrape-og.js (internal) | Open Graph metadata |

---

## Priority Order for Zod Contracts (Step 3)

1. **32 HIGH-RISK untyped RPCs** — data is consumed, no type, cast with `as`. One wrong shape = crash.
2. **73 typed RPCs** — have TypeScript annotations but no runtime validation. PostgREST could still surprise them.
3. **5 edge function responses** — JSON parsed and consumed without validation.
4. **Vercel routing mismatches** — `/challenge` route vs `moderator-challenge.html` file.
5. **Fire-and-forget RPCs** — lowest priority, but worth validating error shapes.
