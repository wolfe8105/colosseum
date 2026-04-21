# Stage 1 — Primitive Inventory: arena-feed-wiring.ts

Source: src/arena/arena-feed-wiring.ts (99 lines)
Agents: 5 (independent, parallel)

---

## Agent 1

Top-level named callable bindings:

1. `renderControls` (line 26) — `export function renderControls(debate: CurrentDebate, isModView: boolean): void`

Excluded:
- All import bindings (lines 12–23): `escapeHTML`, `challengesRemaining`, `CurrentDebate` (type), `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES`, `wireDebaterControls`, `wireSpectatorTipButtons`, `wireModControls` — imported, not defined here
- No inline callbacks at module scope
- No module-level side effects
- No interfaces, type aliases, enums, or const value bindings

**Count: 1**

---

## Agent 2

Top-level named callable bindings:

1. `renderControls` (line 26) — exported function, only top-level named function in file

Excluded:
- All `import` statements (lines 12–23): all bindings imported, not defined here
- `wireModControls()`, `wireSpectatorTipButtons(debate)`, `wireDebaterControls(debate)` — call-site invocations inside renderControls body, not definitions
- No module-level arrow functions, const bindings, or side-effect statements

**Count: 1**

---

## Agent 3

Top-level named callable bindings:

1. `renderControls` (line 26) — `export function renderControls(...): void` — sets `controlsEl.innerHTML` to one of 3 HTML template branches, wires controls for each role

Excluded:
- All imports (lines 12–23) — not defined in this file
- Inline template literals — not callable bindings
- Wire function calls inside renderControls body — invocations, not definitions

**Count: 1**

---

## Agent 4

Top-level named callable bindings:

1. `renderControls` (line 26) — sole exported function. Three branches: mod view, spectator view, debater view — each sets innerHTML and wires events.

Excluded:
- All import bindings — defined elsewhere
- No other function declarations or const function bindings at module scope
- No module-level side effects (no addEventListener, no auto-call)

**Count: 1**

---

## Agent 5

Top-level named callable bindings:

1. `renderControls` (line 26) — exported, accepts `debate: CurrentDebate` and `isModView: boolean`. Dispatches to `wireModControls`, `wireSpectatorTipButtons`, or `wireDebaterControls` after setting innerHTML.

Excluded:
- All import bindings (lines 12–23) — imported from other modules
- No interfaces, type aliases, or value-only const bindings
- No module-scope arrow functions or IIFE

**Count: 1**

---

## Summary

All 5 agents unanimous: **1 top-level named callable binding**.

| # | Name | Line | Exported |
|---|------|------|----------|
| 1 | `renderControls` | 26 | Yes |
