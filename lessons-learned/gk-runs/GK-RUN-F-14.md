# GATEKEEPER RUN — F-14 ELO and Tier System

git clone https://[TOKEN]@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://[TOKEN]@github.com/wolfe8105/colosseum.git

Feature: F-14 — ELO and Tier System
Source file: src/tiers.ts
Spec: First check docs/product/ for a dedicated spec file for F-14. If none, use docs/THE-MODERATOR-PUNCH-LIST.md row F-14.

You are Agent 2. Read the spec, write tests proving the code does what the spec says. Never test based on the code. The spec is the only source of truth.

Do not ask for confirmation. Take action.

FILE READ PROOF: For every file you read, state filename and exact line count before acting on it. Format: READ: src/tiers.ts — N lines

STEP 0 — DEPENDENCY MAP
Read _archive/prototypes/colosseum-critical-path-v3.txt. If missing, query codebase directly.
Report:
MAP QUERY — src/tiers.ts
Existing tests that cover this file: [list or none]
Downstream files that import this file: [list or none]
Regression surface = existing tests listed above. They must still pass.

KNOWN WALLS — STOP if source file is: src/webrtc.*.ts, src/arena/arena-feed-room.ts, src/webrtc.monitor.ts, src/arena/arena-room-live-audio.ts, src/arena/arena-intro-music.ts, src/intro-music.ts, src/cards.ts

PRE-EXISTING FAILURES — IGNORE: tests/f48-mod-debate.test.ts (8 failures, WebRTC/jsdom, permanent)

SPEC ENFORCEMENT PLACEHOLDER: [Future session. Proceed with spec as given.]

STEP 1 — READ THE SPEC
Extract every testable claim. Write all TCs before writing any test. Do not invent. Do not skip.

STEP 2 — READ THE SOURCE FILE
List every import. Classify every exported function:
- Pure calculation: no mocks
- RPC wrapper (safeRpc/.rpc): mock RPC, verify name + params
- DOM event wiring: mock DOM, simulate events
- Multi-step orchestration: mock each dependency
- HTML string builder: snapshot
- Behavioral/side effect: spy on browser API

STEP 3 — WRITE THE TESTS
Follow tests/f47-moderator-scoring.test.ts exactly.
vi.hoisted for all mocks in vi.mock factories.
Mock all imports before importing file under test.
beforeEach resets all mocks.
Import functions under test AFTER mocks.
One describe per TC.
Do NOT use vi.spyOn for import contracts.
Do NOT create secondary imports of mocked modules.

STEP 4 — ARCHITECTURE TEST (required, end of every test file)
Assert every import in src/tiers.ts is on the allowed list from Step 2.

STEP 5 — RUN AND REPORT
npm test -- tests/gk-tiers.test.ts
Also run regression surface tests.

If PASS:
git add tests/gk-tiers.test.ts
git commit -m "test(gk): F-14 ELO tiers — gk tests"
git push

If FAIL: paste full npm test output verbatim. Do not touch source. Stop.

NOT ALLOWED:
- Modify source file
- Disable or delete failing tests
- Write tests based on code, not spec
- Infer spec intent
- Summarize npm test output
- Fix source code
- Skip architecture test
- Ignore regression surface failures
- Stop unless genuinely walled
