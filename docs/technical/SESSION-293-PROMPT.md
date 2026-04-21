# Next Session Prompt — Session 293

Read the New Testament, then the War Plan, then the Implementation Map. Do not suggest anything until you've read all three.

Then read SESSION-292-HANDOFF.md (docs/technical/).

## Context

The Moderator (themoderator.app) — live debate platform. Repo: github.com/wolfe8105/colosseum. Supabase project: faomczmipsccwbhpivmp. Vercel team: team_L7vGoGpTPhIreB0cs9Ac8Ege.

## What's done

- All bugs from S280–S292 are resolved. Zero open bugs.
- Full page audit: 13 pages, zero console errors.
- Deploys flowing (lockfile fixed S292, 14-deploy backlog cleared).
- CSP fully hardened (Google Ads script/connect/frame/img, Google Fonts, PostHog).
- Service worker fixed — HTML no longer cached, CSP changes deploy instantly.
- `expire_stale_debates` cron running every 5 min (no more zombie debates).
- Public profile username lookup is now case-insensitive.
- All session handoffs S280–S292 consolidated in docs/technical/.

## What's needed

### Priority 1: Two-player live debate walkthrough
This is the #1 remaining gap. We have NOT verified:
- Two users matching in the queue
- Live debate room (turns, timer, argument submission, rounds)
- Spectate mode from another user
- DM conversation between two users
- GvG challenge flow
- Tournament bracket with real users

**Setup:** Two separate Chrome profiles, each with Claude in Chrome extension installed. Name them chrome1 and chrome2. Use `switch_browser` to alternate — user must click Connect/Ignore on each switch. Queue timeout is 180 seconds — move fast.

### Priority 2: Launch checklist
Read docs/LAUNCH-CHECKLIST.md. Cross-reference against current state. Flag anything not done.

### Priority 3: Dev tool screenshots
Screenshots of key screens for documentation / app store / marketing.

## Rules

- Read CLAUDE.md first for all conventions
- File Read Verification: wc -l before, read, confirm "Read N of total"
- Castle Defense: all mutations via .rpc() SECURITY DEFINER
- escapeHTML() on all user content in innerHTML
- GitHub PAT: search past chats for "github token colosseum ghp" — 90-day, never commit to files
