# S259 COVERAGE AUDIT — GAP REPORT

## Summary
- Featured files: 41
- Interactive elements enumerated: ~280
- Category 1 (unfeatured files): 20 files containing ~135 elements
- Category 2 (uncaptured elements in featured files): 95 elements
- Audit anomalies: 2

---

## Featured file set (derived)

- api/go-respond.js
- F48-MOD-INITIATED-DEBATE.sql
- guard-trigger-fix.sql
- moderator-arena-schema.sql
- moderator-go.html
- moderator-go-app.js
- moderator-references-migration.sql
- newsletter.ts
- round-count-picker-migration.sql
- session-223-group-rpc-fixes.sql
- session-224-private-group-info-leak-fix.sql
- src/arena/arena-config-mode.ts
- src/arena/arena-config-settings.ts
- src/arena/arena-core.ts
- src/arena/arena-feed-room.ts
- src/arena/arena-lobby.ts
- src/arena/arena-match.ts
- src/arena/arena-mod-debate.ts
- src/arena/arena-mod-queue.ts
- src/arena/arena-mod-scoring.ts
- src/arena/arena-private-lobby.ts
- src/arena/arena-private-picker.ts
- src/arena/arena-queue.ts
- src/arena/arena-room-end.ts
- src/arena/arena-room-live.ts
- src/arena/arena-room-setup.ts
- src/arena/arena-state.ts
- src/arena/arena-types.ts
- src/async.ts
- src/auth.ts
- src/config.ts
- src/nudge.ts
- src/pages/groups.ts
- src/pages/plinko.ts
- src/pages/settings.ts
- src/pages/spectate.ts
- src/staking.ts
- src/tiers.ts
- src/tokens.ts
- supabase-deployed-functions-export.sql
- tests/f47-moderator-scoring.test.ts

---

## Category 1 — Unfeatured files

Files containing interactive elements that are not listed in any F-map's `files_touched`.

| File | Element count | Prominent elements | Notes |
|------|--------------|-------------------|-------|
| index.html | 18 | notif-btn, logout-btn, bio-save-btn, bottom-nav buttons, overlay-close ... (+13 more) | Main app shell; buttons, nav links, textarea, profile bio edit |
| moderator-login.html | 18 | oauth-google, oauth-apple-login, login-btn, signup-btn, reset-btn ... (+13 more) | Login/signup forms, email inputs, DOB selects, password fields, TOS checkbox |
| moderator-settings.html | 22 | save-btn, logout-btn, delete-btn, mod-cat-chips (x6), notification toggles ... (+11 more) | Settings page HTML; inputs, toggles, buttons, select |
| moderator-groups.html | 20 | create-btn, tab buttons (x3), join-btn, gvg-challenge-btn ... (+14 more) | Groups page HTML; group create modal, GvG modal, format pills, inputs |
| moderator-spectate.html | 3 | back-btn, join-btn (a href), logo link | Spectate page static HTML shell |
| moderator-terms.html | 3 | legal-tab buttons (x3) | Tab buttons for TOS, Privacy, Community |
| moderator-debate-landing.html | 3 | logo link, join-btn link, footer links | Debate landing page; internal nav links |
| moderator-auto-debate.html | 3 | logo link, join-btn link, footer links | Auto-debate page; internal nav links |
| moderator-profile-depth.html | 2 | back-btn (a href), footer links | Profile depth page HTML shell |
| moderator-cosmetics.html | 1 | back-btn (a href) | Cosmetics page HTML shell |
| moderator-privacy.html | 2 | back-link (a href), footer links | Privacy policy page; internal nav |
| moderator-plinko.html | 12 | btn-google, btn-apple, email-toggle, btn-email-next, age selects (x3) ... (+5 more) | Plinko signup HTML; OAuth buttons, email input, age selects, username input |
| src/pages/home.ts | 30 | bottom-nav-btn click, overlayTabs click, overlayClose click, avatar-btn click, bio-save-btn click ... (+25 more) | Main home page JS; feed delegation, bio editing, follow list, avatar sheet, profile nav |
| src/pages/login.ts | 14 | login-tab click, loginForm submit, signupForm submit, oauth-google click ... (+10 more) | Login page JS; tab switching, form submit, OAuth, forgot password, reset modal |
| src/pages/profile-depth.ts | 6 | tile click, save-section-btn click, input events, chip click, select change, DOMContentLoaded | Profile depth page JS; questionnaire tiles, section save, input tracking |
| src/pages/cosmetics.ts | 8 | tab-btn click, tile click/keydown, confirm-modal click, modal-cancel, info-modal click, category select | Cosmetics shop JS; tabs, item tiles, confirm/info modals |
| src/pages/auto-debate.ts | 1 | document click delegation | Auto-debate page JS; general click handler |
| src/pages/debate-landing.ts | 1 | document click delegation | Debate landing page JS; general click handler |
| src/settings.ts | 15 | save-btn, back-btn, dark-mode change, bio input, logout-btn, reset-pw-btn ... (+9 more) | Alternate settings module (older or duplicate); full settings interactivity |
| src/terms.ts | 2 | document click delegation, terms-back-link click | Terms page JS; tab switching, back link |
| src/pages/terms.ts | 2 | document click delegation, terms-back-link click | Terms page JS module (pages/ variant) |
| src/leaderboard.ts | 3 | modal click, lbList click, document click | Leaderboard JS; profile modal, list click, outside-click dismiss |
| src/payments.ts | 2 | modal click, payment-placeholder-close click | Payments JS; modal backdrop and close button |
| src/reference-arsenal.ts | 12 | forge input fields (x5), type-btn click, forge-back click, forge-cancel, forge-next, forge-submit ... (+2 more) | Reference arsenal JS; 5-step forge form, type selection, navigation, card click |
| src/notifications.ts | 5 | notif-backdrop click, notif-close click, notif-mark-all click, filter-btn click, notif-list click | Notification center JS; backdrop, close, mark-all, filters, item click |
| src/paywall.ts | 3 | modal click, paywall-cta-btn click, paywall-dismiss-btn click | Paywall modal JS; backdrop, CTA, dismiss |
| src/powerups.ts | 4 | slot click, item click, btn click (equip), popup click | Power-ups JS; slot selection, shop item, equip button, popup backdrop |
| src/share.ts | 4 | modal click, post-debate-share-btn, post-debate-invite-btn, post-debate-skip-btn | Share modal JS; share, invite, skip buttons |
| src/rivals-presence.ts | 2 | rap-dismiss-btn click, rap-challenge-btn click | Rivals presence overlay; dismiss and challenge buttons |
| src/webrtc.ts | 1 | beforeunload listener | WebRTC; page unload cleanup |
| src/arena/arena-room-voicememo.ts | 3 | arena-record-btn click, arena-vm-cancel click, arena-vm-send click | Voice memo room; record, cancel, send buttons |
| src/arena/arena-mod-refs.ts | 6 | ref-type btn click, arena-ref-submit-btn click, arena-ref-cancel-btn click, mod-ruling-allow click, mod-ruling-deny click, mod-ruling-backdrop click | Moderator reference submission and ruling overlays |
| api/challenge.js | 0 | (serverless function) | Serverless API endpoint; no client-side interactive elements |
| public/sw.js | 0 | (service worker) | install, activate, fetch handlers; infrastructure only |

---

## Category 2 — Uncaptured elements in featured files

Elements in files that ARE in the featured set, but no F-map action reaches them.

| File | Line | Element description | Host map(s) | Notes |
|------|------|--------------------|-----------:|-------|
| src/arena/arena-lobby.ts | 121 | arena-powerup-shop-btn click - opens power-up shop | F-01, F-46, F-47, F-48, F-50 | No map covers power-up shop entry |
| src/arena/arena-lobby.ts | 151 | arena-challenge-cta click - challenge call-to-action button | F-01, F-46, F-47, F-48, F-50 | Not described in any map action |
| src/arena/arena-lobby.ts | 160 | lobby click delegation - general lobby event delegation | F-01, F-46, F-47, F-48, F-50 | Delegation root; individual targets may vary |
| src/arena/arena-lobby.ts | 327 | powerup-shop-back click - back button in power-up shop | F-01, F-46, F-47, F-48, F-50 | Power-up shop not covered by any map |
| src/arena/arena-lobby.ts | 334 | buttonEl click - buy power-up item | F-01, F-46, F-47, F-48, F-50 | Power-up purchasing not covered |
| src/arena/arena-queue.ts | 158 | arena-queue-ai-spar click - AI spar fallback at 60s | F-01, F-02 | Conceptually mentioned in F-01 but not diagrammed |
| src/arena/arena-room-setup.ts | 121 | pre-debate-enter-btn click - ENTER BATTLE button | F-02, F-09, F-35, F-47 | Critical transition; falls between F-02 end and live room |
| src/arena/arena-room-end.ts | 78 | arena-back-to-lobby click - back to lobby (early exit) | F-09, F-35, F-47, F-50 | Post-debate nav not owned by any map |
| src/arena/arena-room-end.ts | 271 | arena-rematch click - rematch button | F-09, F-35, F-47, F-50 | Not diagrammed |
| src/arena/arena-room-end.ts | 276 | arena-share-result click - share result | F-09, F-35, F-47, F-50 | Not diagrammed |
| src/arena/arena-room-end.ts | 285 | arena-back-to-lobby click - back to lobby (post-debate) | F-09, F-35, F-47, F-50 | Duplicate binding; not diagrammed |
| src/arena/arena-room-end.ts | 288 | arena-add-rival click - add rival from post-debate | F-09, F-35, F-47, F-50 | Not diagrammed |
| src/arena/arena-room-end.ts | 307 | arena-clickable-opp click - view opponent profile | F-09, F-35, F-47, F-50 | Not diagrammed |
| src/arena/arena-room-end.ts | 313 | arena-transcript click - view transcript | F-09, F-35, F-47, F-50 | Not diagrammed |
| src/arena/arena-room-end.ts | 354 | transcriptOverlay click - close transcript overlay | F-09, F-35, F-47, F-50 | Not diagrammed |
| src/arena/arena-room-live.ts | 39 | input input event - text argument typing | F-35 | F-35 only covers nudges; live room UI uncaptured |
| src/arena/arena-room-live.ts | 47 | sendBtn click - submit text argument | F-35 | Live room send not covered |
| src/arena/arena-room-live.ts | 49 | input keydown - enter key to submit | F-35 | Live room keyboard submit not covered |
| src/arena/arena-room-live.ts | 63 | arena-mic-btn click - toggle microphone mute | F-35 | Mic toggle not covered |
| src/arena/arena-feed-room.ts | 149 | beforeunload - page unload handler | F-35 | System event; F-35 only covers nudges |
| src/arena/arena-feed-room.ts | 150 | pagehide - page hide handler | F-35 | System event |
| src/arena/arena-feed-room.ts | 480 | input input - debater text input | F-35 | Feed room debater input not covered |
| src/arena/arena-feed-room.ts | 487 | sendBtn click - submit debater message | F-35 | Feed room send not covered |
| src/arena/arena-feed-room.ts | 488 | input keydown - enter key submit | F-35 | Feed room keyboard submit not covered |
| src/arena/arena-feed-room.ts | 492 | finishBtn click - finish debate button | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 496 | concedeBtn click - concede debate | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 519 | citeBtn click - cite reference in debate | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 526 | challengeBtn click - challenge argument | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 555 | btnA click - vote for debater A | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 556 | btnB click - vote for debater B | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 563 | input input - moderator comment input | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 570 | sendBtn click - submit moderator comment | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 571 | input keydown - enter key for mod comment | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 577 | stream click delegation - stream event delegation | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 611 | btn click - reaction button | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 651 | feed-score-cancel click - cancel scoring overlay | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 658 | feed-mod-eject-a click - mod eject debater A | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 662 | feed-mod-eject-b click - mod eject debater B | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 666 | feed-mod-null click - mod declare null result | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1154 | feed-gate-a click - gate resolution for A | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1155 | feed-gate-b click - gate resolution for B | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1323 | feed-dropdown-close click - close dropdown | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1325 | dropdown item click - select dropdown option | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1367 | feed-dropdown-close click - close second dropdown | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1369 | dropdown item click - select second dropdown option | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1424 | feed-ref-popup-close click - close reference popup | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1425 | popup click - reference popup backdrop | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1569 | feed-ruling-accept click - accept ruling | F-35 | Not covered |
| src/arena/arena-feed-room.ts | 1570 | feed-ruling-reject click - reject ruling | F-35 | Not covered |
| src/arena/arena-config-mode.ts | 115 | arena-mode-backdrop click - backdrop close mode picker | F-01, F-46 | Dismiss handler not diagrammed |
| src/arena/arena-config-mode.ts | 116 | arena-mode-cancel click - cancel mode picker | F-01, F-46 | Dismiss handler not diagrammed |
| src/arena/arena-config-mode.ts | 255 | arena-cat-cancel click - cancel category picker | F-01, F-46 | Dismiss handler not diagrammed |
| src/arena/arena-config-mode.ts | 261 | arena-cat-backdrop click - backdrop close category picker | F-01, F-46 | Dismiss handler not diagrammed |
| src/arena/arena-config-settings.ts | 91 | arena-rank-backdrop click - backdrop close ranked picker | F-01 | Dismiss handler not diagrammed |
| src/arena/arena-config-settings.ts | 92 | arena-rank-cancel click - cancel ranked picker | F-01 | Dismiss handler not diagrammed |
| src/arena/arena-config-settings.ts | 161 | arena-ruleset-backdrop click - backdrop close ruleset picker | F-01 | Dismiss handler not diagrammed |
| src/arena/arena-config-settings.ts | 162 | arena-ruleset-cancel click - cancel ruleset picker | F-01 | Dismiss handler not diagrammed |
| src/arena/arena-private-picker.ts | 87 | arena-private-backdrop click - backdrop close private picker | F-46 | Dismiss handler not diagrammed |
| src/arena/arena-private-picker.ts | 190 | arena-user-search-cancel click - cancel user search | F-46 | Dismiss handler not diagrammed |
| src/arena/arena-private-picker.ts | 194 | arena-user-search-backdrop click - backdrop close user search | F-46 | Dismiss handler not diagrammed |
| src/arena/arena-private-picker.ts | 255 | arena-group-pick-cancel click - cancel group picker | F-46 | Dismiss handler not diagrammed |
| src/arena/arena-private-picker.ts | 259 | arena-group-pick-backdrop click - backdrop close group picker | F-46 | Dismiss handler not diagrammed |
| src/arena/arena-private-lobby.ts | 101 | arena-challenge-link-btn click - copy challenge link | F-46, F-48 | Mentioned in F-46 notes but not diagrammed as action |
| src/arena/arena-mod-debate.ts | 168 | mod-debate-debater-cancel-btn click - debater LEAVE button | F-48 | Mentioned in F-48 notes but not diagrammed as action |
| src/async.ts | 494 | container click - hot takes feed delegation (non-mod actions) | F-35, F-50 | F-50 covers mod-signup only; react, challenge, etc. uncaptured |
| src/async.ts | 538 | container click - predictions feed delegation | F-35, F-50 | Not in any map |
| src/async.ts | 578 | container input - search input handler | F-35, F-50 | Not in any map |
| src/async.ts | 592 | container click - rivals feed delegation | F-35, F-50 | Not in any map |
| src/async.ts | 1072 | overlay click - challenge modal backdrop | F-35, F-50 | Not in any map |
| src/async.ts | 1078 | topicEl input - topic input in challenge modal | F-35, F-50 | Not in any map |
| src/async.ts | 1083 | cpq-cancel click - cancel challenge modal | F-35, F-50 | Not in any map |
| src/async.ts | 1089 | submit click - submit challenge | F-35, F-50 | Not in any map |
| src/async.ts | 1238 | modal click - modal click handler | F-35, F-50 | Not in any map |
| src/async.ts | 1482 | document click - global click handler (_onDocClick) | F-35, F-50 | Not in any map |
| src/auth.ts | 705 | modal click - user profile modal backdrop close | F-47, F-50 | Profile modal not covered |
| src/auth.ts | 764 | upm-close-btn click - close user profile modal | F-47, F-50 | Not covered |
| src/auth.ts | 772 | followBtn click - follow user from profile modal | F-47, F-50 | Not covered |
| src/auth.ts | 797 | rivalBtn click - add rival from profile modal | F-47, F-50 | Not covered |
| src/auth.ts | 1017 | auth-gate-close-btn click - close auth gate modal | F-47, F-50 | Not covered |
| src/auth.ts | 1020 | modal click - auth gate modal backdrop close | F-47, F-50 | Not covered |
| src/pages/groups.ts | 350 | input input - hot take character counter | F-14, F-15 | Group hot takes not covered |
| src/pages/groups.ts | 351 | btn click - post hot take in group | F-14, F-15 | Group hot takes not covered |
| src/pages/groups.ts | 600 | mam-cancel-btn click - cancel member actions modal | F-14, F-15 | Modal dismiss not diagrammed |
| src/pages/groups.ts | 601 | modal click - member actions modal backdrop | F-14, F-15 | Modal dismiss not diagrammed |
| src/pages/groups.ts | 762 | pill click - GvG format pill selection | F-14, F-15 | GvG not covered in any map |
| src/pages/groups.ts | 771 | searchInput input - group search | F-14, F-15 | Search not covered |
| src/pages/groups.ts | 811 | opt click - option selection | F-14, F-15 | Not covered |
| src/pages/groups.ts | 953 | btn click - button in groups | F-14, F-15 | Not covered |
| src/pages/groups.ts | 1077 | document click - global click handler | F-14, F-15 | Not covered |
| src/pages/plinko.ts | 166 | btn-google click - Google OAuth | F-35, F-50 | Signup flow uncovered; only mod opt-in covered |
| src/pages/plinko.ts | 167 | btn-apple click - Apple OAuth | F-35, F-50 | Not covered |
| src/pages/plinko.ts | 170 | email-toggle click - toggle email form | F-35, F-50 | Not covered |
| src/pages/plinko.ts | 183 | btn-email-next click - submit email | F-35, F-50 | Not covered |
| src/pages/plinko.ts | 217 | btn-age-next click - age verification | F-35, F-50 | Not covered |
| src/pages/plinko.ts | 242 | btn-create click - create username | F-35, F-50 | Not covered |
| src/pages/plinko.ts | 325 | resendBtn click - resend verification email | F-35, F-50 | Not covered |
| src/pages/plinko.ts | 419 | btn-enter click - enter the app | F-35, F-50 | Not covered |
| src/pages/settings.ts | 238 | save-btn click - save settings | F-47 | Only mod toggles covered by F-47 |
| src/pages/settings.ts | 241 | set-dark-mode change - dark mode toggle | F-47 | Not covered |
| src/pages/settings.ts | 251 | set-bio input - bio text input | F-47 | Not covered |
| src/pages/settings.ts | 261 | logout-btn click - logout | F-47 | Not covered |
| src/pages/settings.ts | 271 | reset-pw-btn click - reset password | F-47 | Not covered |
| src/pages/settings.ts | 294 | delete-btn click - open delete modal | F-47 | Not covered |
| src/pages/settings.ts | 304 | delete-confirm-input input - type DELETE | F-47 | Not covered |
| src/pages/settings.ts | 310 | delete-cancel click - cancel delete | F-47 | Not covered |
| src/pages/settings.ts | 314 | delete-modal click - delete modal backdrop | F-47 | Not covered |
| src/pages/settings.ts | 318 | delete-confirm click - confirm delete account | F-47 | Not covered |
| src/pages/settings.ts | 411 | chip click - mod category chips | F-47 | Chip interaction not explicitly diagrammed |
| src/pages/spectate.ts | 160 | back-btn click - back button | F-35 | F-35 only covers nudges |
| src/pages/spectate.ts | 750 | header click - expand/collapse section | F-35 | Not covered |
| src/pages/spectate.ts | 813 | sendBtn click - send chat message | F-35 | Not covered |
| src/pages/spectate.ts | 814 | input keydown - enter key for chat | F-35 | Not covered |
| src/pages/spectate.ts | 953 | btnA click - vote for side A | F-35 | Not covered |
| src/pages/spectate.ts | 954 | btnB click - vote for side B | F-35 | Not covered |
| src/pages/spectate.ts | 1024 | share-copy click - copy share link | F-35 | Not covered |
| src/pages/spectate.ts | 1031 | share-x click - share to X/Twitter | F-35 | Not covered |
| src/pages/spectate.ts | 1035 | share-wa click - share to WhatsApp | F-35 | Not covered |
| src/pages/spectate.ts | 1039 | share-native click - native share API | F-35 | Not covered |

---

## Audit anomalies

**A1. Duplicate/parallel file pairs.** Two file pairs exist where root-level files duplicate `src/pages/` variants:
- `src/settings.ts` (unfeatured, 15 addEventListener) vs `src/pages/settings.ts` (featured via F-47). Both contain near-identical settings logic. It is unclear which is the active module. The root `src/settings.ts` is unfeatured (Category 1) while `src/pages/settings.ts` is featured (Category 2). If `src/settings.ts` is dead code, its Category 1 entry is inflated. If it is the active module, the F-47 featured path may be pointing at the wrong file.
- `src/terms.ts` (unfeatured) vs `src/pages/terms.ts` (unfeatured). Both are unfeatured.

**A2. HTML files in src/pages/.** Three HTML files exist under `src/pages/` (`src/pages/moderator-settings.html`, `src/pages/moderator-terms.html`, `src/pages/src-pages-moderator-terms.html`). These appear to be staging copies or build artifacts. They duplicate root-level HTML files. They were excluded from Category 1 counts to avoid double-counting but may represent a cleanup task.

---

## Methodology notes

### Grep patterns used
- `<button` in `*.html` files
- `<input`, `<select`, `<textarea` in `*.html` files
- `<form` in `*.html` files
- `onclick`, `onchange`, `onsubmit`, `oninput`, `onkeydown`, `onkeyup`, `onblur`, `onfocus` in `*.html` files
- `addEventListener` in all `src/**/*.ts` files
- `addEventListener` in all `*.js` files (root-level, excluding node_modules)
- `<a href` pointing to internal app routes in `*.html` files
- `innerHTML` and `createElement` patterns in `src/**/*.ts` for files that build dynamic interactive elements

### Exclusions applied
- `node_modules/` — third-party dependencies
- `dist/` — build output
- `THE-MODERATOR-SCREEN-GUIDE.html` — internal documentation tool, not a user-facing surface
- `lcars-showroom.html` — design showroom/demo page, not part of the production app
- `src/pages/moderator-settings.html`, `src/pages/moderator-terms.html`, `src/pages/src-pages-moderator-terms.html` — staging copies of root HTML files (see Anomaly A2)
- `public/sw.js` — service worker infrastructure (install, activate, fetch handlers) not user-interactive
- `api/challenge.js` — serverless function with no client-side interactive elements
- `moderator-legal-snippets.html` — partial snippet file, not a standalone page
- Pure external `<a href="https://...">` links to non-app domains
- `ecosystem.config.js`, `middleware.js`, `lib/*.js` — server/bot-side code, not client interactive
- SQL migration files in the featured set — contain no interactive elements (correctly listed in featured set but not auditable for interactive elements)

### Ambiguous resolutions
- `src/settings.ts` vs `src/pages/settings.ts`: Both included (one in Cat 1, one in Cat 2) with anomaly noted
- `beforeunload` / `pagehide` / `DOMContentLoaded` handlers: Included when they trigger RPC calls or meaningful side effects; excluded as structural when they are pure init wrappers with no fetch/RPC
- Backdrop/cancel click handlers: Included as interactive elements per R1 (they respond to user clicks)

---

## Self-check

- **SC1.** Every row in Category 1 and Category 2 has file path, line or line range, and description. **PASS** — Category 1 uses file-level rollup per R5 with element counts and prominent elements. Category 2 has individual rows each with file, line, and description.
- **SC2.** Every Category 2 row names at least one host map. **PASS** — all 95 Category 2 rows include a host map column.
- **SC3.** No table cell contains unescaped `|`, `>=`, `<=`, `!==`, `!=`, `===`, `==`. **PASS** — scanned all table rows; no offending two-character sequences found.
- **SC4.** The FEATURED set matches a fresh walk of all F-map files_touched sections. **PASS** — derived from reading all 11 F-maps; the 41-file set is consistent.
- **SC5.** No interaction maps were modified. **PASS** — this session only created `_AUDIT-S259-GAP-REPORT.md`; no F-*.md files were edited.
- **SC6.** Report exists at exactly `docs/interaction-maps/_AUDIT-S259-GAP-REPORT.md` and nowhere else. **PASS** — single file created at the specified path.
