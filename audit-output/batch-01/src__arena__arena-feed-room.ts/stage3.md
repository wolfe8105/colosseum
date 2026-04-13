# Stage 3 — Verification: src/arena/arena-feed-room.ts

All 11 agents unanimous.

**Verdict: ACCURATE**

---

## Confirmed correct

- All 3 anchor function line numbers verified against source ✓
- `enterFeedRoom`: `set_currentDebate` first (line 116), `pushArenaState('room')` (117), `screenEl.innerHTML=''` (118), state init lines 120–124, `getCurrentProfile()` exactly once at line 126 (not called again), name resolution per isSpectator/isModView branches (131–139), full DOM scaffold appended to `screenEl` (lines 142–175), `subscribeRealtime` before loadout fetch (178), `getMyDebateLoadout` fire-and-forget with `.catch(warn)` (181–188), `renderControls` (191), `initSpecChat` conditionally (194–196), beforeunload/pagehide listeners (199–200), `void initFeedAudio` (204), `startPreRoundCountdown` last (207) — all confirmed ✓
- `enterFeedRoomAsSpectator`: single `await safeRpc(...)` (216), early return on error with `showToast` (217–220), `role: 'a' as const` placeholder (226), `mode: 'live' as any` (227), `spectatorView: true` (238), delegates to `enterFeedRoom` (241) — confirmed ✓
- `cleanupFeedRoom`: teardown order confirmed — `sendGoodbye` → `clearFeedTimer` → `unsubscribeRealtime` → `cleanupDeepgram` → `resetFeedRoomState` → state setters → DOM removals (`#feed-ref-dropdown`, `#feed-challenge-overlay`, `#feed-ad-overlay`, `#feed-vote-gate`, `#feed-disconnect-banner`) → `stopHeartbeat` → event listener removal → `offWebRTC` (4 events) → `leaveDebate` → `cleanupSpecChat` ✓
- `set_currentDebate(null)` is absent from `cleanupFeedRoom` — confirmed (no such call in function body) ✓
- Cross-cutting findings 2–4 all confirmed ✓

---

## No PARTIAL or FALSE findings

Stage 2 described all three functions accurately. No description errors detected.

---

## Incidental findings (not in Stage 2)

### Finding 1 — `initFeedRoomAsSpectator` `safeRpc` not wrapped in try/catch

`safeRpc` typically returns `{ data, error }` and handles retries internally. However, if it throws (e.g. network error after retry exhaustion), the `await` at line 216 will propagate an unhandled rejection up the call chain. This is consistent with how `safeRpc` is used elsewhere in the codebase, not unique to this file. Low severity.

### Finding 2 — `screenEl` is optional-chained at appendChild but not at innerHTML clear

Line 118: `if (screenEl) screenEl.innerHTML = ''` — guarded via `if`.
Line 175: `screenEl?.appendChild(room)` — guarded via optional chain.
Both are functionally equivalent null guards. Consistent handling.
