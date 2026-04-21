# THE MODERATOR — LAUNCH CHECKLIST
### Last Updated: April 19, 2026
### Status: PostHog live ✅ · Build clean ✅ · All Mediums fixed ✅ · 85/85 audit batches complete ✅

---

## YOU (no code, just you)

- [ ] **Phone smoke test** — open `themoderator.app` on your Android, walk through `WALKTHROUGH-TEST-PLAN.md`. 10 flows, 25 minutes. This is the only thing that catches real touch/mobile/WebRTC issues on actual hardware.
- [ ] **Negative YubiKey test** — try logging into Vercel, Supabase, GitHub WITHOUT the YubiKey. Confirm it blocks you. SSH to VPS with password — confirm rejected. Deferred since Session 3. Takes 20 minutes.
- [ ] **Second YubiKey TOTP seeds** — Supabase and Vercel seeds only on primary key. Deferred since Session 3.
- [ ] **Minors policy decision** — Play Store data safety form requires an answer. Recommendation: 18+. See `TWA-SETUP-GUIDE.md` for reasoning.

---

## QUICK CODE TASKS (30 min each)

- [ ] **Peermetrics** — WebRTC debate audio monitoring. Same process as PostHog. Go to `peermetrics.io`, create account, get snippet, paste key here and I'll wire it in. Catches debate audio quality issues in production.
- [ ] **Outside-in Claude review** — open a completely fresh Claude chat with zero context. Paste only: *"Clone https://github.com/wolfe8105/colosseum and tell me what concerns you most about this codebase from an architectural, security, or maintainability standpoint."* Don't mention audits, don't give context. Read what it says.

---

## WHEN YOU HAVE A BUYER (not now)

- [ ] **F-42 B2B data dashboard** — don't build until first buyer is close. Design concept is in `THE-MODERATOR-B2B-DASHBOARD-CONCEPT.md`. War Chest has the pitch, pricing tiers, and the 45-day auction script.

---

## OPEN KNOWN BUGS (low priority, no urgency)

- `LM-PU-003` — `wireLoadout` queries `.powerup-slot` globally — breaks if two loadout panels open simultaneously. Parked.

---

## LIVING DOCS (keep these, read them)

| Doc | When to read |
|-----|-------------|
| `THE-MODERATOR-NEW-TESTAMENT.md` | Every session — architecture, decisions, what exists |
| `THE-MODERATOR-PUNCH-LIST.md` | Picking next work |
| `THE-MODERATOR-LAND-MINE-MAP.md` | Before any SQL, schema, or auth change |
| `THE-MODERATOR-WAR-CHEST.md` | Pitching, pricing, B2B |
| `THE-MODERATOR-SECURITY-ROADMAP.md` | At 100 users, 1000 users milestones |
| `CLAUDE.md` | Claude Code sessions — rules, conventions |
| `AUDIT-FINDINGS.md` | If a bug surfaces — check if it was already documented |
| `WALKTHROUGH-TEST-PLAN.md` | Phone smoke test |
| `TWA-SETUP-GUIDE.md` | Google Play submission steps |
| `THE-MODERATOR-FEATURE-SPECS-PENDING.md` | Building any new feature |
| `THE-MODERATOR-FEATURE-SPECS-PENDING.md` | F-55, F-57, F-58, F-59 specs (all shipped — reference only) |

---

## MONITORING (now live)

- **PostHog** — `us.posthog.com/project/388572` — pageviews, events, session replay
- **Vercel** — auto-deploys from GitHub main
- **Supabase** — dashboard for DB, auth, edge functions
- **UptimeRobot** — set up when ready for uptime alerts (free, 5 min setup)

---

*Everything else is either shipped, scratched, or deferred to when you have real users. Go launch.*
