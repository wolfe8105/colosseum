# Code Review Fix — Batch 10: TypeScript — any casts and void async

**Layer:** 1B (TypeScript — runs parallel with 1A SQL, but start after Batch 01)
**Guide reference:** Colosseum-TS-Review-Checklist.docx, Sections 2 and 3
**Dependency:** Batch 01 (JSON) must be committed. SQL batches do NOT need to be
complete before this runs — Layer 1B is independent of Layer 1A.

---


## SETUP

Read the GitHub token from the repo README:
```bash
TOKEN=$(grep "GITHUB_TOKEN=" docs/technical/code-review/README.md | cut -d'=' -f2)
```

Then clone and configure:
```bash
git clone https://${TOKEN}@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://${TOKEN}@github.com/wolfe8105/colosseum.git
```

---
## MANDATORY FILE READ VERIFICATION

Every file you read must follow this exact sequence. No exceptions.

  Step 1: run `wc -l <filename>` and note the total.
  Step 2: read the file.
  Step 3: confirm "Read [N] lines of [total] total."

If N ≠ total: stop, re-read. Do not proceed on a partial read.

---

## BEFORE STARTING

1. Read `docs/technical/AUDIT-FINDINGS.md` — do not re-apply any fix already marked FIXED.
2. Confirm Batch 01 (JSON) is committed: `git log --oneline -5`.
3. Read `CLAUDE.md` in full (verify line count first) — essential context for
   the data shapes and RPC patterns in this codebase.
4. This batch touches these files:
   - `src/pages/home.feed.ts` (FIX — line 21)
   - `src/pages/home.depth.ts` (FIX — line 124)
   - `src/async.wiring.ts` (WATCH — void async calls at L53, L116, L121, L160)
   - `src/share.ts` (WATCH — void async calls)
   - `src/tokens.ts` (WATCH — void async at L28)
   - `src/webrtc.signaling.ts` (WATCH — void async at L38, L48)

---

## FIX 1: home.feed.ts — L21 `any` cast

**Read the file first (verify line count).**

At line 21, `data.map((d: any) => ({` — this is a Supabase RPC result being
mapped with an `any` type, bypassing all type checking.

**What to do:**
1. Identify what RPC this function calls (look at the `.rpc()` call above line 21).
2. In `src/` find the return type for that RPC — likely in a `.types.ts` file
   or defined inline.
3. Replace `(d: any)` with the correct typed parameter.
4. If no type exists yet, define a minimal interface above the function:
   ```typescript
   interface FeedItem {
     id: string;
     topic: string;
     // add fields actually used in the map below
   }
   ```
   Then replace `(d: any)` with `(d: FeedItem)`.

Do NOT change the function logic — only the type annotation.

---

## FIX 2: home.depth.ts — L124 `any` cast

**Read the file first (verify line count).**

At line 124, `result.data.map((row: any) => {` — same pattern.

**What to do:**
1. Look at what `result.data` comes from — the RPC call above it.
2. Find or create the typed interface for `row`.
3. The function switches on `type` ('followers' / 'following') — the shape
   differs by type. Use a union type or a shared base interface.
4. Replace `(row: any)` with the typed parameter.

---

## FIX 3 (WATCH): void async calls — audit and document

**Read each file first (verify line count).**

For each file with void async calls, evaluate whether the fire-and-forget
pattern is intentional and safe. The rule from the JS guide applies here too:
`void` is acceptable only for side effects that MUST NOT block the response
and where failure is genuinely non-critical.

**Files and locations:**

`src/async.wiring.ts`:
- L53: `void toggleModerator(true).then(...)` — moderator state change. Is failure silent acceptable?
- L116: `void placePrediction(...)` — financial operation. This is HIGH RISK for fire-and-forget.
- L121: `void pickStandaloneQuestion(...)` — game state. Moderate risk.
- L160: `void refreshRivals()` — UI refresh. Low risk.

`src/share.ts`:
- L116, L131, L137, L145, L163: `void share(...)` — Web Share API calls. Low risk, acceptable.

`src/tokens.ts`:
- L28: `void _rpc('notify_followers_online', ...)` — notification side effect. Low risk.

`src/webrtc.signaling.ts`:
- L38: `void handleSignalingMessage(...)` — WebRTC signaling path. HIGH RISK.
- L48: `void createOffer()` — WebRTC offer creation. HIGH RISK.

**For each HIGH RISK void call:**
Add a `.catch()` that logs the error:
```typescript
// BEFORE:
void placePrediction(debateId, pick, amount);

// AFTER:
void placePrediction(debateId, pick, amount).catch(err =>
  console.error('[async.wiring] placePrediction fire-and-forget failed:', err)
);
```

**For each LOW RISK void call:**
Add a comment explaining why fire-and-forget is intentional:
```typescript
// fire-and-forget: share API failure should not block UI
void share({ title: '...', text, url });
```

---

## VERIFICATION

```bash
npm run typecheck
```

Must pass with 0 errors. If new errors appear after fixing the `any` casts,
they are REAL type errors that the `any` was hiding — report them, do NOT
revert to `any` to silence them.

---

## COMMIT

```bash
git add src/pages/home.feed.ts src/pages/home.depth.ts \
        src/async.wiring.ts src/share.ts src/tokens.ts \
        src/webrtc.signaling.ts
git commit -m "Batch 10: fix any casts in home.feed.ts + home.depth.ts, document void async patterns"
```

---

## WHEN DONE — report

- What interface/type you used to replace each `any` cast
- `npm run typecheck` output (must show 0 errors)
- For each HIGH RISK void call: did you add `.catch()` or determine it was safe as-is? Why?
- Any `any` cast that could not be replaced without touching logic — describe the blocker

Stop. Do not start Batch 11.
