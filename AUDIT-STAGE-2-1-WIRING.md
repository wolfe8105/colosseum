# STAGE 2.1 — WIRING CHECK
### Attack Plan Stage 2.1 | Run as a standalone CC session. Do NOT mix with 2.2 or 2.3.

---

## YOUR JOB

Read THE-MODERATOR-UI-INTERACTION-MAP.md. For every screen (A–BI) and every numbered element in it, verify all four checks. Then run the LM hunting list below. One combined report at the end.

---

## FOUR CHECKS PER ELEMENT

For EVERY numbered element in the UI map:

1. **EXISTS** — Find the DOM element in HTML or the TS that creates it. Confirm the ID, class, or data-attribute matches exactly.
2. **WIRED** — Confirm an addEventListener or delegated event handler is attached. If using data-action pattern, confirm the action string is handled in the delegation listener.
3. **WORKS** — Trace the handler. Does it call the right function? Does that function exist? Does it pass the right parameters?
4. **REACHABLE** — Can the user actually navigate to this element? Is the parent screen/overlay reachable? Is there a code path that shows/renders it?

Key files:
- HTML: `index.html`, `moderator-go.html`, `moderator-debate-landing.html`, `moderator-login.html`, `moderator-plinko.html`, `moderator-settings.html`, `moderator-profile-depth.html`, `moderator-groups.html`, `moderator-spectate.html`, `moderator-cosmetics.html`, `moderator-terms.html`, `moderator-privacy.html`, `moderator-challenge.html`, `moderator-source-report.html`
- TypeScript: `src/pages/*.ts`, `src/arena/*.ts`, `src/*.ts`

Also flag:
- Any `addEventListener` on an element ID that doesn't exist in the HTML
- Any `data-action` value with no handler in the delegation listener
- Any screen that exists in code but has no navigation path to reach it
- Any CSS `overflow:hidden` on parents of scrollable content trapping it
- Any inline `onclick` or `javascript:` in HTML (CSP violation)

---

## LM HUNTING LIST — CHECK EVERY ONE OF THESE

These are known historical failure patterns. Find them. Report whether they're currently clean or broken.

**LM-020:** Every page that needs auth state must use the `readyPromise` pattern, not `setTimeout`. Find every page init function and confirm it waits on `readyPromise` or equivalent before reading `currentUser`. Do NOT accept setTimeout(fn, 800) as valid.

**LM-050:** Feature flags in `src/config.ts` — confirm that every UI feature guarded by a flag is actually enabled. List any flags that are `false` that guard visible UI.

**LM-053:** Touch targets — spot-check 10 interactive elements across mobile screens. Are they ≥44px in height? Check CSS for any buttons/links with fixed heights under 44px.

**LM-084:** Members Zone auth gate — every protected page must gate on auth before showing content. Confirm the pattern is consistent across all 14 HTML pages.

**LM-129:** SPA back button — any overlay or screen that uses `pushState` on open must use `history.back()` (or equivalent popstate handler) on close. Check arena overlays, modals, sheets.

**LM-154:** `colo-shimmer` CSS class — confirm it only exists in `index.html`. If it appears in moderator-*.html pages or src/ files, flag it.

**LM-196:** `get_arena_feed` RPC — find where it's called. Does the client handle `p_category = NULL` (all categories) correctly? Is pagination handled?

**LM-197:** `/go` page (`moderator-go.html`) — confirm it is fully standalone. It must NOT import from `arena.ts`, must NOT call `supabase.auth`, must NOT reference `currentUser`. Any import from the main app bundle is a bug.

**LM-198:** Plinko flow — confirm it is 5 steps, not 4. Verify step numbering in `src/pages/plinko-step*.ts` files and in the HTML.

**LM-201:** Spectator entry — confirm two paths exist: (1) direct lobby entry via moderator-spectate.html, (2) `?spectate=` URL param from arena redirecting correctly. Both must work. The old spectate page must still serve completed debate replays.

**LM-225:** `arena-lobby.ts` is an async-only dynamic chunk — confirm it is NEVER statically imported anywhere in `src/`. Any `import ... from './arena/arena-lobby'` (non-dynamic) is a critical bug that defeats chunk splitting.

---

## OUTPUT FORMAT

**Per screen (A through BI):**
- ✅ Element # — one line summary (all 4 checks pass)
- ⚠️ Element # — what's wrong
- ❌ Element # — missing or completely broken

**LM findings (one per entry):**
- ✅ LM-XXX — clean, one line
- ❌ LM-XXX — broken, what's wrong, which file, which line

**Summary block:**
```
WIRING SUMMARY
Total elements checked: N
✅ Passing: N
⚠️ Warnings: N — list them
❌ Broken: N — list them

LM SUMMARY
✅ Clean: N
❌ Broken: N — list them
```

---

## RULES

- Do NOT guess. If you cannot find an element, say so explicitly.
- Do NOT skip screens. A through BI in order.
- If a handler calls an RPC, note the RPC name but do NOT verify Supabase-side — that is Stage 3.1's job.
- This is Pass A only. Do NOT run security or timing checks here — those are 2.2 and 2.3.
- When done, save full output to `AUDIT-RESULTS-2-1-WIRING.md` in repo root and push to GitHub.
