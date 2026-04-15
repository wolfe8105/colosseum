# CC Bug Fix Prompts — Execute in Order

Run each prompt in a fresh CC session. Wait for push confirmation before starting the next.
Reference: `BUG-FIX-PATTERNS.md` for full context on each finding.

---

## SETUP — Run once before anything else

```
Set the git remote to: https://YOUR_GITHUB_TOKEN@github.com/wolfe8105/colosseum.git
(token is in your chat history — search "ghp_" to find it)
Configure git user: name "Claude Code" email "cc@colosseum.app"
Confirm you can pull and push before proceeding.
```

---

## Sweep B — XSS fixes: Number() + escapeHTML() [~20 min]

**Priority: highest. Real XSS surfaces.**

```
Fix two related CLAUDE.md violations across these files:
modifiers.ts, home.arsenal-shop-render.ts, home.invite-html.ts,
async.render.ts, rivals-presence-popup.ts, arena-bounty-claim.ts

Rule 1 — Number() before innerHTML:
Any numeric value interpolated into innerHTML must be wrapped in Number().
Grep each file for innerHTML assignments and add Number() around any
numeric variable that is missing it.
Known sites:
- modifiers.ts:363 — pu.quantity
- home.arsenal-shop-render.ts — effect.mod_cost, effect.pu_cost
- home.invite-html.ts — stats.converts, stats.total_signups, stats.total_clicks
- async.render.ts — total, pctA, pctB

Rule 2 — escapeHTML() on all user-sourced strings in innerHTML:
- rivals-presence-popup.ts: safeName is missing escaping for ", ', and &
- arena-bounty-claim.ts: b.bounty_id, b.amount, b.attempt_fee need escapeHTML()
Use the project-standard escapeHTML() helper throughout. Do not use _esc().

Commit: "fix(security): Number() and escapeHTML() violations in innerHTML interpolations"
Push to main.
```

---

## Sweep A — try/finally + .catch() [~20 min]

```
Two related defensive coding fixes:

Fix 1 — disable-button-no-finally (7 files):
- arena-feed-wiring.ts — wireModControls score button
- groups.settings.ts — submitDeleteGroup
- reference-arsenal.render.ts — renderArmory second button
- arena-loadout-presets.ts — handleSave
- home.arsenal-shop-sheet.ts — openBottomSheet confirm handler
- home.invite-sheet.ts — openClaimSheet rejection
- arena-bounty-claim.ts — selectBountyClaim

In each: wrap the handler body in try/finally. Move button re-enable into
the finally block so it fires whether or not an error occurs.

Fix 2 — missing .catch() (7 instances, 5 files):
- home.ts: loadFollowCounts() and initTournaments() are bare calls
  → add .catch(e => console.error('[home]', e)) to each
- home.ts: drip card error handler is bare () => {}
  → add console.error
- home.nav.ts: loadArsenalScreen() has no .catch
  → add .catch(e => console.error('[home.nav]', e))
- rivals-presence-channel.ts: track() inside subscribe callback has no try/catch
  → wrap in try/catch
- home.invite-wiring.ts: openClaimSheet() is fire-and-forget
  → add .catch(e => console.error('[invite]', e))
- plinko.ts: void injectInviteNudge() has no .catch
  → add .catch(e => console.error('[plinko]', e))

Commit: "fix(reliability): try/finally on disable-button handlers, add missing .catch()"
Push to main.
```

---

## Sweep D — Hardcoded hex colors [~15 min]

```
Grep the entire codebase for hardcoded hex color values matching
/#[0-9a-fA-F]{3,6}\b/ in .ts and .js files.

Priority files with known violations:
- arena-css.ts — multiple in feed room section
- arena-types.ts — hex in MODES object
- arena-bounty-claim.ts — #F5A623, #0A1128

Replace every hardcoded hex with the appropriate CSS variable token from
the project design system. If a hex has no obvious matching token, add a
comment: // TODO: needs CSS var token — and leave the hex rather than guessing.

Commit: "style: replace hardcoded hex colors with CSS var tokens"
Push to main.
```

---

## Sweep C — Dead imports + dead code [~20 min]

```
Remove dead imports and obvious dead code.

Dead imports:
- arena-types.ts, groups.ts — remove any import never referenced in the file body
  (known: view, equippedForDebate, pauseFeed)
- home.arsenal-shop.ts — remove unused showToast import
- arena-room-setup.ts — remove removeShieldIndicator; verify TEXT_MAX_CHARS usage
- profile-debate-archive.ts — remove unused getCurrentUser import
- arena-loadout-presets.ts — remove redundant dynamic import of auth.ts

Dead code:
- home.arsenal-shop.ts — getUserInventory() result fetched but never used: remove call
  and dead ternary; remove dead async keyword on the affected function;
  fix wrong comment on buy button
- home.invite.ts — !grid guard is always false: remove it
- leaderboard.ts — currentTime written but never read: remove it
- async.fetch.ts — display_name selected from DB but never mapped to output:
  remove from select; tokens: 0 hardcoded on every hot-take: add TODO comment
- share.ts — _cachedRefCode written but never read back: remove it
- auth.profile.ts — profile.error check on a type with no .error field: remove the check

Commit: "chore: remove dead imports and dead code"
Push to main.
```

---

## Pattern 7 — Timer/cleanup gaps [~25 min]

```
Fix async resource leaks where timers or handlers are created but not stored
or cancelled on cleanup.

- arena-room-live-audio.ts: onWebRTC handlers stack with no deregistration.
  Store handler references in module state; deregister them in the destroy/cleanup function.

- rivals-presence-popup.ts: 300ms and 600ms setTimeout handles are anonymous.
  Store them in variables; cancel in cleanup.

- arena-ads.ts: setInterval tick has no destroy() exposed.
  Add a destroy() function to the module that clears the interval.

- arena-feed-spec-chat.ts: 3s error-hide setTimeout not stored.
  Store the handle; clear it before setting a new one.

- arena-entrance.ts: second playSound in setTimeout is outside try/catch.
  Wrap it in try/catch.

Rule: stored handles live in module-level state variables and are cleared/nulled
in the module's destroy() or cleanup function.

Commit: "fix(memory): store and cancel timer/handler references in cleanup"
Push to main.
```

---

## Pattern 8 — Stale module state [~25 min]

```
Fix module-level state that is not properly reset between UI transitions.

- groups.auditions.ts: modal input fields not cleared between groups.
  Reset all form fields to empty/default at the start of the modal open function.

- rivals-presence-channel.ts: rivalSet keeps stale data when re-init fails.
  Clear rivalSet before the re-init attempt, not after.

- arena-bounty-claim.ts: _attemptFeePaid not reset between renders.
  Reset to false at the top of the render/init function.

- arena-feed-room.ts: cleanupFeedRoom missing set_currentDebate(null).
  Add that call to cleanupFeedRoom.

- home.arsenal-shop.ts: _state filter not reset by cleanupShopScreen.
  Reset _state.filter to its default value inside cleanupShopScreen.

Commit: "fix(state): reset module-level state on cleanup/re-init"
Push to main.
```

---

## Do NOT touch today — save for night computer

Pattern 10 (race conditions): M-A1, M-B7, M-C4, M-J1, M-K1, L-N1
These need real reasoning. Rushing them introduces new bugs.
