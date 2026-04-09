## F-23 DM / Chat System

**Not a social platform.** No feeds, no posts, no profiles-as-content-surfaces. Just 1:1 text messaging between users who share a debate link. Lifted from Product Vision §8 and fully walked S253.

**Core loop.** After a debate, energy has nowhere to go — winner's high, loser's fire, spectator opinions. F-23 keeps that energy inside The Moderator instead of leaking to Twitter or group chats. On the debate end screen, next to the Rematch button (§7.3) and the power-up drop, a **Message** button opens a DM thread with the opponent. Inbox icon sits in the top nav with an unread-count badge. Tapping the icon opens a full DM inbox page listing all threads by last-message-at, with per-thread unread count.

**Eligibility — shared-debate gate.** A user can DM another user only if the two have co-occurred in at least one debate as any combination of (debater × debater, debater × voter, debater × staker, debater × watcher, voter × voter, etc.). The gate is enforced via a materialized `dm_eligibility` table populated by triggers on `arena_debates` (debate creation), `arena_votes` (vote cast), `sentiment_tips` (F-58 tip), and `debate_watches` (F-58 watch log). Eligibility is permanent once established — you do not lose the ability to DM someone because a debate rolled off. The `send_dm` RPC does a single indexed lookup into `dm_eligibility` at send time; no runtime walks over debate tables. **One-time backfill at build time** for any pre-existing co-occurrence data.

No open inbox. No cold DMs from strangers. No follow system required. Spam prevention is structural, not rate-limit-dependent.

**1:1 only at launch.** No group threads. Vision §8.4 says "sender, receiver" (singular) and group threads balloon the schema (threads table + participants table + per-participant read receipts + moderation surface + UI). Revisit post-launch.

**No self-DM.** `sender_id = receiver_id` hard-rejected at the RPC level. DMs are strictly interpersonal; notes-to-self is a different product surface.

**Database schema.**

```sql
-- New table: dm_eligibility (materialized co-occurrence index)
CREATE TABLE dm_eligibility (
  user_a_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)  -- canonical ordering, no duplicate pairs
);
CREATE INDEX idx_dm_eligibility_a ON dm_eligibility(user_a_id);
CREATE INDEX idx_dm_eligibility_b ON dm_eligibility(user_b_id);

-- New table: dm_threads (1:1, canonical pair ordering)
CREATE TABLE dm_threads (
  id               BIGSERIAL PRIMARY KEY,
  user_a_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  user_b_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  last_message_at  TIMESTAMPTZ,
  a_last_read_at   TIMESTAMPTZ,
  b_last_read_at   TIMESTAMPTZ,
  a_archived       BOOLEAN NOT NULL DEFAULT false,
  b_archived       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);
CREATE INDEX idx_dm_threads_last_msg ON dm_threads(last_message_at DESC);
CREATE INDEX idx_dm_threads_user_a ON dm_threads(user_a_id);
CREATE INDEX idx_dm_threads_user_b ON dm_threads(user_b_id);

-- New table: dm_messages
CREATE TABLE dm_messages (
  id          BIGSERIAL PRIMARY KEY,
  thread_id   BIGINT NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,  -- soft-delete tombstone
  CHECK (sender_id <> receiver_id)
);
CREATE INDEX idx_dm_messages_thread ON dm_messages(thread_id, created_at DESC);
CREATE INDEX idx_dm_messages_receiver ON dm_messages(receiver_id, created_at DESC);

-- New table: dm_blocks (DM-scoped only, not full-block)
CREATE TABLE dm_blocks (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_dm_blocks_blocked ON dm_blocks(blocked_id);

-- New table: dm_reports
CREATE TABLE dm_reports (
  id           BIGSERIAL PRIMARY KEY,
  message_id   BIGINT NOT NULL REFERENCES dm_messages(id) ON DELETE CASCADE,
  reporter_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  resolution   TEXT
);
CREATE INDEX idx_dm_reports_unresolved ON dm_reports(created_at) WHERE resolved_at IS NULL;
```

RLS: all 5 tables service-role only, access exclusively via RPC (same pattern as F-58 `debate_watches`).

**Block model — DM-scoped, silent.** `dm_blocks` rejects sends from blocker's perspective, but from the blocked user's perspective the send **returns success** — the UI shows the message as delivered. The blocked user never learns they are blocked, which is the harassment-reduction gold standard (no retaliation, no alt-account escalation). The blocker's thread is auto-archived on block (hidden from inbox, recoverable on unblock). Old messages are preserved in the DB for report-trail continuity. Full-user-block (vote/stake/leaderboard/group hiding) is **explicitly out of scope** for F-23 — it's a separate future feature with cross-app surface area.

**Soft-delete by sender.** A sender can delete their own message any time after sending. The `deleted_at` tombstone hides the body from both sides in the UI with a "message deleted" placeholder. The row is preserved in the DB for the report trail. **No edit** — editing opens a harassment vector (send awful thing, wait for screenshot, edit to innocent, claim fabrication).

**Read state — per-thread, Slack-grade.** `dm_threads.a_last_read_at` / `b_last_read_at` tracks the per-user read position. Unread count is computed as `messages where created_at > last_read_at AND deleted_at IS NULL`. One write per inbox open, not one per message. **No "seen" indicator shown to the sender** — no "they read it and didn't reply" drama, no per-message read receipts. Upgrade to per-message later if the data says users want it.

**Realtime — single user-scoped channel.** Each logged-in user subscribes once to a single Supabase Realtime channel (`postgres_changes` on `dm_messages` filtered by `receiver_id = auth.uid()`). Client-side dispatches the received message to the correct thread view. **Not per-thread subscriptions** — subscribing per open thread would burn channel slots and Supabase has channel limits. Same pattern as the arena feed.

**Silent-block realtime enforcement.** When a message from a blocked user enters `dm_messages`, the realtime publish path must filter it **before** it reaches the blocker's channel. Implementation: either RLS on the realtime publication filters out rows where `(sender_id, receiver_id) ∈ dm_blocks`, or the `send_dm` RPC writes the row with a blocked flag and the channel filter strips it. This is **LM-219** — a silent-block leak via realtime would be invisible until a user complained, and it would defeat the entire silent-block design.

**Rate limits.** Enforced inside `send_dm`:
- **30 messages per minute across all threads per user** — catches spam bots.
- **5 brand-new threads opened per 24h per user** — catches the "DM everyone who watched my debate" spray pattern. A "new thread" = first message in a pair that had no prior `dm_threads` row.

Power users in an active back-and-forth are not affected; the global per-minute cap is well above any human conversation cadence.

**No attachments, no media, no links at launch.** Text only. Every media type opens a door:
- Link previews = fetch service + SSRF surface
- Images = storage + moderation + nudity scan
- Voice memos = the F-01 voice pipeline + transcription for moderation

Vision §8.3 is explicit: "not a social platform." Ship text. Auto-linkify is a one-line future update if users complain.

**Free forever.** No token cost per message, no unlock fee, no sender charge. Every other token sink in the app has a specific economic purpose; charging for DMs punishes the exact engagement loop §8.6 says is the highest-value advertiser signal. Rate limits + eligibility gate already solve the spam concern.

**No XP / engagement rewards on DMs.** XP-on-DM invites alt-farming (two alts spamming each other to level up). F-59 invite rewards already captures the "bring friends → get rewarded" loop. DMs stay off the reward grid entirely.

**Retention — forever.** Storage is cheap, deletion-by-default creates support headaches. User-initiated soft-delete covers the "I sent to the wrong person" case. Auto-purge is a future premium feature if storage pressure ever materializes (for text-only 1:1 it never will).

**Deleted users — `[deleted user]` label.** When a user deletes their account, their `profiles` row is soft-deleted (existing pattern). `dm_messages.sender_id` / `dm_threads.user_a_id` / `user_b_id` are `ON DELETE SET NULL`. UI renders null-sender messages as `[deleted user]` in the thread. Message content remains visible to the other party. Do not hard-delete; it corrupts thread context for the receiver and loses the report trail.

**No push notifications at launch.** Unread badge in top nav only. Push requires service workers + per-device token storage + permissions UX + quiet hours + a whole feature's worth of infrastructure. Add as a dedicated future feature covering DMs + debate events + invite rewards + royalty payouts in a single pass.

**RPC surface — 9 new RPCs.**

- `send_dm(p_receiver_id UUID, p_body TEXT)` — eligibility check, block check, rate-limit check, self-DM check, upsert thread, insert message, update thread `last_message_at`. Returns `message_id`.
- `get_inbox(p_limit INT, p_offset INT)` — returns threads where the caller is `user_a_id` or `user_b_id`, ordered by `last_message_at DESC`, with other-user display fields and unread count. Archived threads excluded.
- `get_thread(p_thread_id BIGINT, p_limit INT, p_before_id BIGINT)` — returns paginated messages for a thread the caller is a participant in. Includes deleted tombstones.
- `mark_thread_read(p_thread_id BIGINT)` — sets `a_last_read_at` or `b_last_read_at = now()` for the caller's side.
- `get_dm_eligibility_list(p_search TEXT, p_limit INT)` — returns the list of users the caller is eligible to DM, optionally filtered by display-name search. Powers the "new message" picker.
- `block_user(p_blocked_id UUID)` — inserts `dm_blocks` row, auto-archives the thread from blocker's side.
- `unblock_user(p_blocked_id UUID)` — deletes `dm_blocks` row, thread remains archived until blocker manually opens it.
- `report_message(p_message_id BIGINT, p_reason TEXT)` — inserts `dm_reports` row. Does not auto-hide the message.
- `delete_message(p_message_id BIGINT)` — sets `deleted_at = now()` on the message if caller is the sender.

Admin tools (`admin_get_reports`, `admin_resolve_report`, `admin_purge_thread`) are **out of scope for v1**. At launch Pat reviews `dm_reports` directly via Supabase SQL Editor. Build admin UI after report volume is known.

**Client surface.**

- `src/dm-inbox.ts` — new file, full inbox view + thread view + new-message picker.
- `src/dm-realtime.ts` — new file, single-channel subscription wrapper.
- `src/arena/arena-room-end.ts` — Message button added next to Rematch.
- `src/pages/home.ts` — inbox icon + unread badge in top nav.
- `src/nav.ts` — route wiring for `/dm` and `/dm/:thread_id`.

**Build dependencies.** **None.** F-23 is standalone — does not depend on F-57, F-58, or F-59. Can build any time. Eligibility triggers attach to existing tables (arena_debates, arena_votes) plus F-58's `sentiment_tips` / `debate_watches` **if those ship first**; if F-23 ships before F-58, the tip/watch triggers are added in F-58's migration. Either order works.

**Build size estimate.** Smaller than F-55. 5 tables + 9 RPCs + 2 new client files + 3 edited client files + 4 eligibility triggers + 1 backfill. Fits cleanly in one Claude Code session with a dedicated build brief. Should be written the same way as the F-55 brief: phased commit sequence, guardrails, test checklist.

**Land Mines to track at build time.**

- **LM-217** — `dm_eligibility` backfill must run atomically with the migration. Any gap between table creation and backfill = users temporarily unable to DM people they should be able to. Backfill in the same transaction as table creation.
- **LM-218** — Eligibility triggers on `arena_debates` / `arena_votes` / `sentiment_tips` / `debate_watches` must be **idempotent**. The `INSERT ... ON CONFLICT DO NOTHING` pattern is required. Replay-safe.
- **LM-219** — **Silent block realtime leak.** Blocked user's message must NOT publish to blocker's realtime channel. RLS on the realtime publication (or filter in `send_dm`) must strip rows where the `(sender, receiver)` pair exists in `dm_blocks`. This is invisible until a user complains, and it defeats the silent-block design entirely if broken. Explicit test at build time: block user B from user A's POV, send from B, verify A's realtime subscriber receives nothing.

**Test checklist.**

1. Forge eligibility: A and B debate, `dm_eligibility` row appears.
2. Eligibility via vote: C votes on A's debate, eligibility row A↔C created.
3. Eligibility via watch: D watches B's debate, eligibility row B↔D created.
4. Eligibility via tip (F-58 dependent): E tips on A's debate, eligibility A↔E created.
5. Send DM: A→B works, row in `dm_messages`, thread `last_message_at` updated.
6. Send to ineligible user: rejects with clear error.
7. Self-DM: hard rejected.
8. Rate limit: 31st message in 60s rejected.
9. New-thread cap: 6th brand-new thread in 24h rejected.
10. Block: A blocks B. B sends to A, gets success response.
11. **LM-219 critical**: A's realtime subscription does NOT receive B's blocked message.
12. Unblock: A unblocks B, thread recoverable from archived state.
13. Delete message: sender deletes, receiver sees "message deleted" tombstone.
14. Report: A reports B's message, `dm_reports` row created.
15. Read state: A opens thread, `a_last_read_at` updated, unread count zeroes.
16. Inbox order: most recent message thread appears first.
17. Realtime: A sends to B, B's open thread view updates without refresh.
18. Deleted user: delete test user, their messages render as `[deleted user]`.
19. Post-debate CTA: Message button visible on debate end screen, opens thread with opponent.
20. Inbox badge: unread badge count matches backend state.
21. Eligibility backfill: users with pre-F-23 co-occurrence can DM after migration runs.
22. 2000-char limit: message at limit sends, 2001 chars rejected.

**Status.** Fully specced S253. No parked items. Ready to build. Build order flexible — can ship before, after, or between F-57/F-58/F-59.
