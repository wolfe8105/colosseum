# THE MODERATOR — Agent Handoff Document
### Created: Session 272 (April 12, 2026)
### Status: LIVING DOCUMENT — updated every session until punch list is complete

> This document feeds the 3-step 11-agent process at launch.
> Two sections: (1) the ordered attack list of remaining work, (2) every file pushed to the repo since Session 260.
> Both sections grow until the punch list is done. When this doc is complete, the app is complete.

---

## SECTION 1: ATTACK LIST (build order)

| Order | # | Feature | Status |
|---|---|---------|--------|
| 1 | F-60 | Saved Loadouts | ✅ S272 |
| 2 | F-54 | Private Profile Toggle | ✅ S272 |
| 3 | F-53 | Profile Debate Archive | ✅ S273 |
| 4 | F-33 | Verified Gladiator Badge | ✅ S273 |
| 5 | F-35.3 | Orange Dot Indicator | ✅ S274 |
| 6 | F-39 | Embeddable Challenge Links | ✅ S274 |
| 7 | F-21 | Intro Music | ✅ S274 |
| 8 | F-03 | Entrance Sequence / Battle Animations | ✅ S274 |
| 9 | F-19 | Three-Tier Banner Progression | ✅ S274 |
| 10 | F-20 | Shared Fate Mechanic | ✅ S274 |
| 11 | F-26 | Follow Notifications | ✅ S274 |
| 12 | F-37 | Granular Notification Preferences | ✅ S274 |
| 13 | F-36 | 7-Day Onboarding Drip | ✅ S274 |
| 14 | F-28 | Bounty Board | ⏳ specced, not built |
| 15 | F-29 | Source Meta Report | ⏳ specced, not built |
| 16 | F-43 | Google Ads in Structural Slots | ⏳ not started |

---

## SECTION 2: FILE MANIFEST (all files pushed since Session 260)

### Session 261–271

**Handoffs / Docs**
- SESSION-265-HANDOFF.md
- SESSION-266-HANDOFF.md
- SESSION-267-HANDOFF.md
- SESSION-268-HANDOFF.md
- SESSION-269-HANDOFF.md
- SESSION-270-HANDOFF.md
- THE-MODERATOR-NEW-TESTAMENT.md
- THE-MODERATOR-PUNCH-LIST.md

**Client — Arena**
- src/arena/arena-css.ts
- src/arena/arena-feed-events.ts
- src/arena/arena-feed-machine.ts
- src/arena/arena-feed-room.ts
- src/arena/arena-feed-ui.ts
- src/arena/arena-feed-wiring.ts
- src/arena/arena-room-end.ts
- src/arena/arena-room-live.ts
- src/arena/arena-types.ts

**Client — Pages**
- src/pages/groups.ts
- src/pages/groups.types.ts
- src/pages/groups.settings.ts (new S265)
- src/pages/groups.auditions.ts (new S265)
- src/pages/home.ts
- src/pages/home.nav.ts
- src/pages/home.arsenal.ts
- src/pages/home.arsenal-shop.ts (new S268)
- src/pages/home.invite.ts (new S268)
- src/pages/plinko.ts
- src/pages/spectate.ts

**Client — Other**
- src/modifiers.ts (new S267)
- src/reference-arsenal.ts
- src/reference-arsenal.types.ts
- src/reference-arsenal.rpc.ts
- src/reference-arsenal.render.ts
- src/rivals-presence.ts
- src/share.ts

**HTML**
- index.html
- moderator-groups.html

**API / Config**
- api/invite.js (new S268)
- vercel.json

**Supabase SQL**
- supabase/session-266-f25-presence-policy.sql
- supabase/session-266-f58-sentiment-tipping.sql
- supabase/session-267-f57-phase1-modifier-system.sql
- supabase/session-267-f57-phase2-scoring-integration.sql
- supabase/session-267-f57-phase3-end-of-debate-modifiers.sql
- supabase/session-267-f57-phase4-finish.sql
- supabase/session-268-f59-invite-rewards.sql
- supabase/session-269-f55-overhaul.sql
- supabase/session-269-f57-deferred-token-tip-shield.sql
- supabase/session-270-f27-armory.sql
- supabase/session-270-f57-final-effects.sql
- supabase/session-270-f57-inventory-cluster.sql
- supabase/session-270-f57-round-end-cluster.sql
- supabase/session-270-h08-rls-fix.sql
- supabase/session-270-h08-rls-fix-final.sql

### Session 272

**Client — Arena**
- src/arena/arena-loadout-presets.ts (new)
- src/arena/arena-room-setup.ts
- src/arena/arena-css.ts

**Client — Auth**
- src/auth.types.ts
- src/auth.profile.ts

**Client — Pages**
- src/pages/settings.ts
- src/reference-arsenal.loadout.ts

**Supabase SQL**
- supabase/session-272-f60-saved-loadouts.sql
- supabase/session-272-f54-private-profile.sql

**Docs**
- THE-MODERATOR-AGENT-HANDOFF.md (new)

### Session 273

**Client — New**
- src/badge.ts (new — vgBadge() utility, single source of truth for 🎖️ badge)
- src/profile-debate-archive.ts (new — F-53 full archive module)

**Client — Modified**
- src/async.fetch.ts
- src/async.render.ts
- src/async.types.ts
- src/auth.profile.ts
- src/auth.types.ts
- src/leaderboard.ts
- src/pages/home.feed.ts
- src/pages/home.nav.ts
- index.html

**Supabase SQL**
- supabase/session-273-f53-debate-archive.sql
- supabase/session-273-f33-verified-gladiator.sql

### Session 274

**Client — New**
- src/intro-music.ts (new — Tier 2 custom upload picker, S2 depth gate, Supabase Storage)
- src/arena/arena-entrance.ts (new — 3-tier animated entrance reveal)
- src/pages/group-banner.ts (new — banner render: CSS/img/video by tier)

**Client — Modified**
- src/arena/arena-sounds.ts (10 synthesized intro tracks + playIntroMusic/stopIntroMusic)
- src/arena/arena-room-end.ts
- src/arena/arena-core.ts (localStorage('mod_pending_challenge') consumer)
- src/pages/home.feed.ts
- src/pages/home.ts
- src/pages/plinko.ts (drip trigger point)
- src/pages/spectate.ts (drip trigger point)
- src/tokens.ts (drip trigger point, setOrangeDotUnread exported)
- src/notifications.ts (pushes unread count to orange dot on poll + logout)
- src/pages/groups.ts (banner zone wired)
- moderator-groups.html (#detail-banner zone added)
- moderator-challenge.html (new public landing page)
- index.html

**Supabase SQL**
- supabase/session-274-f21-intro-music.sql
- supabase/session-274-f19-group-banners.sql
- supabase/session-274-f20-shared-fate.sql
- supabase/session-274-f26-follow-notifications.sql
- supabase/session-274-f37-notif-prefs.sql
- supabase/session-274-f36-onboarding-drip.sql

**Docs**
- SESSION-274-HANDOFF.md

### Session 275

**Client — New**
- src/bounties.ts (new — all bounty RPCs + bountyDot() + loadBountyDotSet() + renderProfileBountySection() + renderMyBountiesSection())
- src/arena/arena-bounty-claim.ts (new — pre-debate dropdown UI)
- moderator-source-report.html (new — standalone public Source Meta Report page)

**Client — Modified**
- src/arena/arena-room-setup.ts (bounty zone in pre-debate, ranked+real gate)
- src/auth.profile.ts (bounty section in showUserProfile)
- src/arena/arena-room-end.ts (resolve_bounty_attempt post-debate)
- vite.config.ts (moderator-source-report entry added)

**Supabase SQL**
- supabase/session-275-f28-bounty-board.sql
- supabase/session-275-f29-source-meta-report.sql

**Docs**
- SESSION-275-HANDOFF.md

### Session 276

**Client — Modified**
- src/leaderboard.ts (bountyDot on every row)
- src/async.render.ts (bountyDot on hot take cards)
- src/pages/home.feed.ts (bountyDot on live feed debater names)
- src/pages/home.types.ts (debater_a_id / debater_b_id on LiveDebate)
- src/pages/home.ts (loadBountyDotSet() on init)
- src/arena/arena-room-setup.ts (bountyDot on opponent name)
- src/auth.profile.ts (bountyDot in profile modal + renderMyBountiesSection wired)
- src/arena/arena-room-end.ts (ad slots 1+2)
- src/arena/arena-mod-scoring.ts (ad slot 3)
- src/profile-debate-archive.ts (ad slot 5 interstitial)

**Client — New**
- src/arena/arena-ads.ts (new — injectAdSlot() + showAdInterstitial())

**Docs**
- SESSION-276-HANDOFF.md
- THE-MODERATOR-PUNCH-LIST.md

### Session 277

**Client — New**
- src/arena/arena-feed-spec-chat.ts (new — in-debate spectator chat panel)
- public/.well-known/assetlinks.json (new — TWA domain verification)

**Client — Modified**
- src/pages/spectate.ts (spectate.types.ts + spectate.render.ts — replay point awards, speech events, formatPointBadge())
- src/arena/arena-room-setup.ts ("SHARE TO WATCH LIVE" pre-debate share link)
- vercel.json (Cross-Origin-Resource-Policy header for assetlinks route)
- public/icon-192.png (real branded PWA icon)
- public/icon-512.png (real branded PWA icon)
- public/icon-192-maskable.png (real branded PWA icon)
- public/icon-512-maskable.png (real branded PWA icon)

**Supabase SQL**
- supabase/session-277-f05-replay-point-awards.sql
- supabase/session-277-f07-spectator-chat-cleanup.sql

**Docs**
- SESSION-277-HANDOFF.md
- TWA-SETUP-GUIDE.md (new)

---

*Last updated: Session 277*
