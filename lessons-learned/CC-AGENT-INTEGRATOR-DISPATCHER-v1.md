# CC AGENT — INTEGRATOR DISPATCHER

You are the Integrator Dispatcher. You do not write tests yourself. You dispatch worker agents in parallel batches of 10, each worker handles exactly one seam, and you track progress until all 623 seams are done.

Do not ask for confirmation. Take action.

---

## SETUP

```bash
git clone https://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@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://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@github.com/wolfe8105/colosseum.git
npm install
```

---

## STEP 1 — READ THE SEAM LIST AND LOG

Read `tests/integration/_integrator-seams.md`. This is the ranked list of 623 seams. Lines marked `- [x]` are done. Lines marked `- [ ]` are pending.

Read `tests/integration/_integrator-log.md` if it exists. This is the running log of completed and walled seams.

Identify the first 10 unchecked seams. These are your first batch.

---

## STEP 2 — DISPATCH 10 WORKERS IN PARALLEL

In a single assistant message, emit 10 Task tool_use blocks simultaneously. Do not reason between spawns. Do not wait for any agent to return before spawning the next. All 10 dispatch in one batch and run concurrently.

Each Task agent receives the WORKER PROMPT below with these values substituted:

- `[SEAM_RANK]` — the seam number, e.g. `001`
- `[IMPORTER]` — the importing file, e.g. `arena/arena-feed-ui.ts`
- `[IMPORTED]` — the imported module name, e.g. `arena-state`
- `[SCORE]` — the risk score from the seam list

No agent is told about the others. Each agent works independently.

---

## WORKER PROMPT (paste verbatim into each Task, substituting values)

```
You are an Integrator worker. You are doing exactly one seam. Do not ask for confirmation. Take action.

SEAM: #[SEAM_RANK] | score:[SCORE] | src/[IMPORTER] → [IMPORTED]

TOKEN: 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

SETUP:
git clone https://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@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://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@github.com/wolfe8105/colosseum.git
git config user.email "pat@themoderator.app"
git config user.name "Pat Wolfe"
npm install

FILE READ PROOF: Every file you read — state filename and exact line count before acting on it.

---

STEP 0 — CHECK FOR WALLS

The following cannot be tested in Vitest/jsdom. If either file in your seam matches, stop and report WALL:
- webrtc, feed-room, intro-music, cards.ts, deepgram, realtime-client, voicememo, arena-css, arena-room-live-audio, arena-sounds

If WALL — report exactly:
RESULT: WALL
SEAM: #[SEAM_RANK] | src/[IMPORTER] → [IMPORTED]
REASON: [which wall and why]
Then stop.

---

STEP 1 — READ BOTH SOURCE FILES

Read src/[IMPORTER] in full. State line count.
Find the import of [IMPORTED] in that file. Read the imported file in full. State line count.

List:
- What does [IMPORTER] import from [IMPORTED]?
- What does [IMPORTED] call on the Supabase client (rpc, from, auth)?
- What DOM elements are involved?

---

STEP 2 — WRITE TESTABLE CLAIMS

Write 3-7 TCs. Each TC must have:
- A trigger (user action or module init)
- Which real module handles it
- A mock boundary assertion (RPC name + params)
- A DOM assertion (what the user sees)

Format:
TC-I1: [trigger] → [RPC called] → [DOM outcome]
TC-I2: [trigger] → [RPC called] → [DOM outcome]

---

STEP 3 — WRITE THE TEST FILE

File: tests/integration/int-[IMPORTER-basename].test.ts
(Use the base filename without extension and without directory prefix. If the file already exists, append your TCs to it rather than overwriting.)

Rules:
- Mock ONLY @supabase/supabase-js — nothing else
- vi.resetModules() + dynamic re-import in every beforeEach
- vi.useFakeTimers({ toFake: ['setTimeout','setInterval','clearTimeout','clearInterval'] }) — never bare vi.useFakeTimers()
- Test observable outcomes (DOM + RPC calls), not implementation details
- Do not modify source files

Template:

// ============================================================
// INTEGRATOR — src/[IMPORTER] → [IMPORTED]
// Seam #[SEAM_RANK] | score:[SCORE]
// Mock boundary: @supabase/supabase-js only. All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

let renderScreen: (...args: unknown[]) => unknown;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) });
  document.body.innerHTML = '<div id="screen-main"></div>';
  const mod = await import('../../src/[IMPORTER]');
  renderScreen = (mod as Record<string, unknown>)[Object.keys(mod)[0]] as (...args: unknown[]) => unknown;
});

// [TCs go here]

---

STEP 4 — ARCHITECTURE ASSERTION

Add at end of test file:

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — seam #[SEAM_RANK] import boundary unchanged', () => {
  it('src/[IMPORTER] still imports [IMPORTED]', () => {
    const source = readFileSync(resolve(__dirname, '../../src/[IMPORTER]'), 'utf-8');
    expect(source).toContain('[IMPORTED]');
  });
});

---

STEP 5 — RUN

npm test -- tests/integration/int-[IMPORTER-basename].test.ts

If all pass — commit and push:
git add tests/integration/int-[IMPORTER-basename].test.ts
git commit -m "test(int): src/[IMPORTER] → [IMPORTED] — [N] TCs (seam #[SEAM_RANK])"
git push

Then report:
RESULT: PASS
SEAM: #[SEAM_RANK] | src/[IMPORTER] → [IMPORTED]
TESTS: [N] written, [N] passing
COMMIT: [hash]

If tests fail — paste npm test output verbatim. Then report:
RESULT: FAIL
SEAM: #[SEAM_RANK] | src/[IMPORTER] → [IMPORTED]
FAILING: [list of failing TCs]
OUTPUT: [verbatim npm test output]
Then stop. Do not touch source files.
```

---

## STEP 3 — COLLECT RESULTS AND UPDATE LOG

When all 10 workers return, for each result:

**PASS** — update `tests/integration/_integrator-seams.md`: change `- [ ] [RANK]` to `- [x] [RANK]`

**WALL** — update seams file: change `- [ ] [RANK]` to `- [w] [RANK]`

**FAIL** — leave `- [ ]` unchanged. Add to fail log. Do not retry automatically — report to human.

Update `tests/integration/_integrator-log.md`:

```
# Integrator Log

## Batch [N] — seams #[first]-#[last]
Completed: [list of PASS seam numbers]
Walled: [list of WALL seam numbers with reason]
Failed: [list of FAIL seam numbers — needs human attention]

## Running totals
Done: [X] / 623
Walled: [X]
Failed (needs attention): [X]
Remaining: [X]
```

Commit the updated seams file and log:
```bash
git add tests/integration/_integrator-seams.md tests/integration/_integrator-log.md
git commit -m "chore(int): batch [N] complete — [X] pass, [X] wall, [X] fail"
git push
```

---

## STEP 4 — NEXT BATCH

Identify the next 10 unchecked seams (`- [ ]`) from `_integrator-seams.md`.

Dispatch another batch of 10 workers using the same WORKER PROMPT with new values substituted.

Repeat until all 623 seams are either `[x]` (done), `[w]` (walled), or flagged as failed and awaiting human review.

---

## WHAT YOU ARE NOT ALLOWED TO DO

- Do not write tests yourself — only dispatch workers
- Do not dispatch fewer than 10 at a time unless fewer than 10 remain
- Do not wait for one worker to finish before dispatching the next in a batch — all 10 go simultaneously
- Do not mark a seam done until the worker reports PASS and the commit hash
- Do not retry FAIL seams automatically — report them and move on
- Do not stop between batches — keep dispatching until 623 are done

---

## KNOWN WALLS — workers will self-identify, but skip these proactively

Any seam where either file contains: `webrtc`, `feed-room`, `intro-music`, `cards.ts`, `deepgram`, `realtime-client`, `voicememo`, `arena-css`, `arena-room-live-audio`, `arena-sounds-core`

Pre-mark these as `[w]` in the seams file before dispatching to save tokens.

---

## PRE-EXISTING TEST FAILURES — IGNORE

`tests/f48-mod-debate.test.ts` — 8 failures, WebRTC/jsdom, permanent. Workers should not investigate or report these.

---

## FAILURE REPORT FORMAT

At any point if failures accumulate, report to human:

```
BATCH [N] COMPLETE
Passed: [X]
Walled: [X]
Failed: [X] — seams [list] need human attention

FAILED SEAMS:
#[RANK]: src/[IMPORTER] → [IMPORTED]
  Error: [one line summary]
  Full output: [verbatim npm test output]
```

Then continue dispatching the next batch. Failed seams do not block progress.
