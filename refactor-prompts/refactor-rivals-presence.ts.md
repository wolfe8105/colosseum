# Refactor Prompt — rivals-presence.ts (314 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/rivals-presence.ts (314 lines).

Read CLAUDE.md first, then read src/rivals-presence.ts in full before touching anything. The file is F-25 Rivals Presence — Supabase Realtime presence channel that alerts the user when accepted rivals come online. Has types, module state, injected CSS, popup DOM helpers, the queue/alert flow, the presence channel, and a public init/destroy API.

SPLIT MAP (verify against the file before executing):

1. rivals-presence.ts (orchestrator, ~60 lines)
   Keeps: PresencePayload interface, the shared module state (rivalSet, onlineRivals, alertQueue, alertActive, presenceChannel, initialized), exported init/destroy, and the default export object. Imports _buildRivalSet and _startPresence from the channel module and _queueAlert from the popup module.

2. rivals-presence-css.ts (~95 lines)
   `export function injectRivalsPresenceCSS(): void`
   The `_injectCSS` function and the full CSS string (keyframes rivalSlideIn/rivalSlideOut, #rival-alert-popup styles, nested .rap-* element styles). Leaf module — no other imports from the rivals-presence family.

3. rivals-presence-popup.ts (~95 lines)
   `export function queueAlert(payload: PresencePayload, state: { queue: PresencePayload[]; active: boolean; setActive: (v: boolean) => void }): void`
   `export function dismissPopup(state: { queue: PresencePayload[]; active: boolean; setActive: (v: boolean) => void }): void`
   `export function showNext(state: ...): void`
   The queue + popup flow: showNext pops from queue, builds popup DOM, wires challenge/dismiss buttons, auto-dismisses after 8s. Imports injectRivalsPresenceCSS. Because queue state is shared with the orchestrator, the popup module takes a state-accessor object rather than importing module globals — this breaks the cycle back to the orchestrator.

4. rivals-presence-channel.ts (~95 lines)
   `export async function buildRivalSet(rivalSet: Set<string>): Promise<void>`
   `export async function startPresence(state: { rivalSet: Set<string>; onlineRivals: Set<string>; channel: Channel | null; setChannel: (c: Channel | null) => void; onAlert: (p: PresencePayload) => void }): Promise<void>`
   The Supabase presence channel setup: getMyRivals fetch + rivalSet population, channel subscription, join/leave event handlers that call onAlert for new rivals, realtime.setAuth for private channel RLS. Same state-accessor pattern to avoid the orchestrator cycle.

5. Delete rivals-presence.ts only if every consumer can be updated to import from the new orchestrator file. Most callers import the default export; keep the default export on the new orchestrator for backward compatibility.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports (PresencePayload, RivalEntry, Channel).
- Dependency direction: css is a leaf. popup imports css. channel imports nothing from popup or css (calls onAlert callback instead). orchestrator imports all three.
- Target under 300 lines, preference 150. CSS file is ~95, all others under 100.
- Run `npm run build` after the split, report chunk sizes and line counts.
- Run `npm run typecheck` and confirm zero NEW errors.

LANDMINES — log these as `// LANDMINE [LM-RIVALS-NNN]: description` comments. Do NOT fix them:

- LM-RIVALS-001 (in rivals-presence-popup.ts at showNext, already catalogued as M-E4 in AUDIT-FINDINGS.md): `safeName = displayName.toUpperCase().replace(/[<>]/g, '')` strips `<` and `>` but does NOT escape `"`, `'`, or `&`. The resulting string is interpolated directly into innerHTML. CLAUDE.md requires `escapeHTML()` on user content entering innerHTML. This is a real XSS surface and a direct rule violation. Fix requires importing escapeHTML and replacing the regex strip with a proper escape.

- LM-RIVALS-002 (in rivals-presence-channel.ts at buildRivalSet, already catalogued as M-E5 in AUDIT-FINDINGS.md): If `getMyRivals()` rejects, `rivalSet.clear()` (on the line after the failed await) never runs. The catch block only logs. rivalSet keeps whatever data it had from the previous init cycle. Invisible on a fresh page load (empty set) but on reinit after destroy+init or on reconnect, stale rival IDs persist. **First unanimous Stage 2 miss in the audit** — all 5 agents described it wrong in the same way. Fix: move `rivalSet.clear()` BEFORE the await, or into a finally block.

- LM-RIVALS-003 (in rivals-presence-popup.ts at _dismissPopup, already catalogued as M-E6 in AUDIT-FINDINGS.md): The 300ms and 600ms setTimeout handles are anonymous — never stored anywhere. If `destroy()` is called while a dismiss animation is in flight, the timers still fire and call `_showNext()` against torn-down state. Fix: store timer IDs in module state and clear them in destroy().

- LM-RIVALS-004 (in rivals-presence-popup.ts at _dismissPopup, already catalogued as M-E7 in AUDIT-FINDINGS.md): If `getElementById('rival-alert-popup')` returns null (popup already removed), the function early-returns WITHOUT setting `alertActive = false`. Any subsequent _queueAlert call sees alertActive === true and silently queues without ever showing. Only recovery is calling destroy(). Edge case but real.

- LM-RIVALS-005 (in rivals-presence-channel.ts at startPresence subscribe callback, already catalogued as L-E1 in AUDIT-FINDINGS.md): The `status === 'SUBSCRIBED'` branch does `await presenceChannel!.track(...)` with no try/catch. Network failure on track() causes an unhandled promise rejection inside the async callback.

- LM-RIVALS-006 (in rivals-presence-popup.ts at the challenge button click handler, line 188 of the original): The dynamic `import('./auth.ts').then(({ showUserProfile }) => ...)` is redundant — `./auth.ts` is already statically imported at the top of the file via `getSupabaseClient`, etc. Could be added to the static import list. Cosmetic.

Do NOT fix landmines — they're tracked in AUDIT-FINDINGS.md for Phase 2 cleanup. Refactor only.

Wait for approval of the split map before writing any code.
```
