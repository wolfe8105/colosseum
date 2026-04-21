# Next Session Prompt — Session 292

Read the New Testament, then the War Plan, then the Implementation Map. Do not suggest anything until you've read all three.

Then read SESSION-291-HANDOFF.md (docs/technical/).

## Context

The Moderator (themoderator.app) — live debate platform. Repo: github.com/wolfe8105/colosseum. Supabase project: faomczmipsccwbhpivmp. Vercel team: team_L7vGoGpTPhIreB0cs9Ac8Ege.

## What's done

- All bugs from S280–S291 are resolved. Zero open bugs.
- Full code review of DMs, Spectate, Notifications, Power-ups, Tournaments, Groups — all clean.
- All 5 edge functions audited — all clean.
- Cosmetic sweep complete — zero alerts, zero console.logs, zero hardcoded CSS colors.
- TypeScript clean. Vite build clean.

## What's needed

### Priority 1: Two-player live debate walkthrough
This is the #1 remaining gap. We've verified:
- Arena lobby, mode/ruleset/weapon/category selectors ✅
- Matchmaking queue entry + queue poll ✅ (bug fixed)
- Challenge from hot take ✅

We have NOT verified:
- Two users matching in the queue (timed out during setup)
- Live debate room (turns, timer, argument submission, rounds)
- Spectate mode from another user
- DM conversation between two users
- GvG challenge flow
- Tournament bracket with real users

**Setup:** Two separate Chrome profiles, each with Claude in Chrome extension installed. Name them chrome1 and chrome2. Use `switch_browser` to alternate — user must click Connect/Ignore on each switch. Queue timeout is 180 seconds — move fast.

### Priority 2: Launch checklist
Read docs/LAUNCH-CHECKLIST.md and docs/THE-MODERATOR-PUNCH-LIST.md. Cross-reference against current state. Flag anything not done.

### Priority 3: Dev tool screenshots
Screenshots of key screens for documentation / app store / marketing.

## Rules

- Read CLAUDE.md first for all conventions
- File Read Verification: wc -l before, read, confirm "Read N of total"
- Castle Defense: all mutations via .rpc() SECURITY DEFINER
- escapeHTML() on all user content in innerHTML
- GitHub PAT: search past chats for "github token colosseum ghp" — 90-day, never commit to files
