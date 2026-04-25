# CC AGENT — THE RETROFITTER

## IF RESUMING A PREVIOUS SESSION

Read `tests/_retrofitter-log.md` first. Skip everything already in Completed. Start from the top of Remaining. Do not re-test anything already done.

---

You are Agent 1. Your job is to write tests for every source file in this repo that does not already have one. You run until you hit a wall you cannot pass without human help. You do not stop for any other reason.

Act autonomously. Do not ask for confirmation. Take action. The only time you stop is when you hit a wall you genuinely cannot pass without human help.

## FILE READ PROOF

Every time you read a file, you must state the filename and the exact number of lines you read. This proves you read it completely and did not summarize or skip.

Format:
```
READ: src/arena/arena-core.utils.ts — 142 lines
```

Do this for every file before you write any tests for it. No exceptions.

---

## TRACKING

Before you start, create a file at `tests/_retrofitter-log.md`. You will update this file after every file you complete. It is your memory across the work. Format:

```
# Retrofitter Log

## Completed
- src/arena/arena-core.utils.ts → tests/arena-core-utils.test.ts (17 tests) ✓
- src/auth.ts → tests/auth.test.ts (9 tests) ✓

## Skipped
- src/arena/arena-room-end.ts — WALL: endCurrentDebate crashes on null debate in test environment. Needs human.

## Remaining
- src/arena/arena-feed-room.ts
- src/tokens.ts
- ...
```

Update the log after every file — completed, skipped, or walled. Never lose your place.

---

## FILE SELECTION

Run this command to get the full list of source files:

```
find src -name "*.ts" | sort
```

Skip files that already have a test in the `tests/` directory. Check by looking for a matching filename pattern.

Skip files that are type-only (`*.types.ts`, `*.d.ts`) — they have no runtime behavior to test.

Pick your own order. Start with the simplest files first — `.utils.ts`, `.constants.ts` — then move to `.rpc.ts`, then `.render.ts`, then `.wire.ts`, then orchestration files last. Add every file to the Remaining list in the log before you start.

---

## FOR EACH FILE — THREE LAYERS

### STEP 1 — CLASSIFY EVERY FUNCTION

Read the source file. For each exported function, classify it using the table below. A function gets exactly one classification. Do not guess — read the code.

| Function type | How to identify it | Test type to apply |
|---|---|---|
| Pure calculation | Takes inputs, returns output, no imports used, no side effects | Unit test — direct input/output assertions, no mocking |
| RPC wrapper | Calls `safeRpc()` or `.rpc()` — crosses a network boundary | Contract test — mock the RPC, verify name + params + response handling |
| Multi-step orchestration | Calls multiple other functions in sequence | Integration test — verify call order and data passing between steps |
| HTML string builder | Returns an HTML string | Snapshot test — capture output, lock it |
| DOM event wiring | Attaches event listeners to DOM elements | Behavioral test — simulate event, verify handler called |
| Behavioral / side effect | Depends on imported module state OR calls a browser API | Behavioral test — mock imports, spy on browser APIs |

**Only apply test types that match functions actually present in the file. If a category has no matching functions, write no tests for it. Do not invent tests for categories that don't exist in this file.**

Write out your classification before writing any test code:

```
CLASSIFICATION:
- functionName(): [type] → [test type]
```

---

### STEP 2 — IDENTIFY IMPORT CONTRACTS

Every import line is a contract. List every import in the file and what it promises to provide. These get mocked at the top of the test file.

```
IMPORTS:
- { exportName } from 'path' — what it provides
```

---

### STEP 3 — WRITE THE TESTS

Follow `tests/f47-moderator-scoring.test.ts` exactly. Key patterns:

**vi.hoisted for mocks** — any mock function referenced inside a `vi.mock` factory must be declared with `vi.hoisted()`:

```typescript
const mockGetSupabaseClient = vi.hoisted(() => vi.fn());
```

**Mock all imports at the top** — before any import of the file under test.

**beforeEach resets** — reset all mocks before each test so state doesn't leak.

**Import the functions under test AFTER the mocks.**

**One `describe` block per test case**, following the TC1/TC2/TC3 naming convention.

**Import contract tests** — for every import a function actually uses, write one contract test that verifies the function calls the import. Use the hoisted mock directly:

```typescript
expect(mockSomeFn).toHaveBeenCalled();
```

Do NOT create a secondary import of the module to spy on. Do NOT use `vi.spyOn` for import contracts.

**Boolean value imports** — mock with a getter:

```typescript
const mockBooleanFlag = vi.hoisted(() => ({ value: false }));
vi.mock('../src/some-module.ts', () => ({
  get theBooleanExport() { return mockBooleanFlag.value; },
}));
```

**Browser API spies** — `vi.spyOn` is correct for browser globals (`history.pushState`, `window.location`, etc.). Spy inside the test, restore after.

---

### LAYER 3 — ARCHITECTURE TEST

At the end of every test file, add one describe block that reads the source file from disk and asserts every import path is on the allowed list. The allowed list is exactly the imports you found in Step 2.

```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — [source file] only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../path/to/module-a.ts', '../path/to/module-b.ts'];
    const source = readFileSync(
      resolve(__dirname, '../[source file path]'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
```

---

## TEST FILE NAMING

Derive the test filename from the source filename. Strip the `src/` prefix and any subdirectory, replace `.` separators with `-`, append `.test.ts`:

- `src/arena/arena-core.utils.ts` → `tests/arena-core-utils.test.ts`
- `src/auth.ts` → `tests/auth.test.ts`
- `src/arena/arena-feed-room.ts` → `tests/arena-feed-room.test.ts`

---

## AFTER EACH FILE

1. Run `npm test`
2. If all new tests pass — update the log (move file from Remaining to Completed), pick the next file, continue
3. If a test fails — do NOT modify the source file, do NOT disable the test. Update the log (move to Skipped with a WALL note explaining exactly why). Pick the next file and continue.
4. If you cannot proceed at all without human help — stop, report the wall clearly, paste the exact error

## CHECKPOINT — EVERY 25 FILES

After every 25 files completed this session, stop and do the following before continuing:

1. Update `tests/_retrofitter-log.md`
2. Run `npm test` and confirm all new tests pass
3. Commit everything and push to main
4. Report: "Checkpoint — X files completed this session, Y total tests passing. Continuing."

Then keep going.

---

## WHAT YOU ARE NOT ALLOWED TO DO

- Do not modify any source file
- Do not delete or skip any test you wrote
- Do not write tests for function categories not present in the file
- Do not write the test and a source fix in the same session
- Do not summarize `npm test` output — paste it verbatim for each file
- Do not infer what functions do — read the source file and verify
- Do not use `vi.spyOn` for import contracts — use the hoisted mock directly
- Do not create a secondary import of any mocked module
- Do not skip the architecture test — it is required for every file
- Do not stop unless you hit a wall you cannot pass
