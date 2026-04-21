# Stage 1 Outputs — src/async.state.ts

5 independent agents. All outputs agree.

## Agent 01

Private module-level bindings:
1. `_hotTakes` (line 28) — let — private backing array for hot takes state
2. `_predictions` (line 29) — let — private backing array for predictions state
3. `_standaloneQuestions` (line 30) — let — private backing array for standalone questions state
4. `_currentFilter` (line 31) — let — private backing variable for active category filter
5. `_pendingChallengeId` (line 32) — let — private backing variable for pending challenge ID
6. `_reactingIds` (line 33) — const Set<string> — in-flight react toggle IDs
7. `_postingInFlight` (line 34) — let boolean — post submission in-flight flag
8. `_challengeInFlight` (line 35) — let boolean — challenge submission in-flight flag
9. `_predictingInFlight` (line 36) — const Set<string> — in-flight prediction IDs per-item guard
10. `_wiredContainers` (line 37) — const WeakSet<HTMLElement> — tracks event-wired containers

Exported bindings:
11. `state` (line 43) — const — singleton accessor object over all private state
12. `PLACEHOLDER_TAKES` (line 76) — const — static seed hot takes keyed by category
13. `PLACEHOLDER_PREDICTIONS` (line 157) — const — static seed predictions array

## Agent 02

Private module-level bindings:
1. `_hotTakes` (line 28) — let variable — private — mutable array of HotTake; backing var for state.hotTakes
2. `_predictions` (line 29) — let variable — private — mutable array of Prediction; backing var for state.predictions
3. `_standaloneQuestions` (line 30) — let variable — private — mutable array of StandaloneQuestion
4. `_currentFilter` (line 31) — let variable — private — active category filter, default 'all'
5. `_pendingChallengeId` (line 32) — let variable — private — string | null; queued challenge ID
6. `_reactingIds` (line 33) — const Set<string> — private — in-flight react toggle IDs
7. `_postingInFlight` (line 34) — let boolean — private — post submission in-flight guard
8. `_challengeInFlight` (line 35) — let boolean — private — challenge submission in-flight guard
9. `_predictingInFlight` (line 36) — const Set<string> — private — per-item prediction in-flight guard
10. `_wiredContainers` (line 37) — const WeakSet<HTMLElement> — private — tracks listener-attached containers

Exported bindings:
11. `state` (line 43) — const object (accessor facade) — exported singleton over all backing vars
    - get/set hotTakes (lines 44-45)
    - get/set predictions (lines 47-48)
    - get/set standaloneQuestions (lines 50-51)
    - get/set currentFilter (lines 53-54)
    - get/set pendingChallengeId (lines 56-57)
    - get reactingIds (line 59) — getter-only
    - get/set postingInFlight (lines 61-62)
    - get/set challengeInFlight (lines 64-65)
    - get predictingInFlight (line 67) — getter-only
    - get wiredContainers (line 69) — getter-only
12. `PLACEHOLDER_TAKES` (line 76) — const Record<string, HotTake[]> — static seed data by section
13. `PLACEHOLDER_PREDICTIONS` (line 157) — const Prediction[] — 3 static seed predictions
14. (side effect, line 200) — forEach — populates per-section arrays from PLACEHOLDER_TAKES.all

## Agent 03

(Agrees with Agents 01 and 02 — same 13 named bindings + 1 side effect)

## Agent 04

(Agrees — 10 private backing variables, 3 exported const bindings, 1 module-level side effect)

## Agent 05

(Agrees — identical inventory)

**Getter-only properties on `state` (no setters — backing collections mutated in place):**
- `state.reactingIds` (line 59) — _reactingIds Set
- `state.predictingInFlight` (line 67) — _predictingInFlight Set
- `state.wiredContainers` (line 69) — _wiredContainers WeakSet
