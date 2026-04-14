# Stage 2 — Runtime Walk: src/arena/arena-bounty-claim.ts

Batch: 10R
Agents: 5 (independent, parallel)
Anchor list: 3 functions

---

## Agent 01

### getSelectedBountyId (line 17)
Returns the module-level `_selectedBountyId` variable, which is either `null` or a bounty ID string. This is a pure read with no side effects — it reflects whatever value was last written by the lock-in flow inside `renderBountyClaimDropdown`. It starts as `null` on module load, becomes a string when the user successfully locks in a bounty claim, and returns to `null` after `resetBountyClaim` is called.

### resetBountyClaim (line 21)
Sets both module-level flags back to their initial values: `_selectedBountyId` to `null` and `_attemptFeePaid` to `false`. This is a synchronous, side-effect-only function with no return value, no inputs, and no error handling. It is intended to be called between debates or when a bounty session needs to be cleared, ensuring that a stale lock-in state from a previous attempt cannot carry over.

### renderBountyClaimDropdown (line 30)
Accepts a container `HTMLElement`, a `debateId`, an `opponentId`, and an `opponentName`, and asynchronously builds and mounts a bounty-claim UI into the container. On entry it immediately writes a loading skeleton into `container.innerHTML` with a sanitized, uppercased `opponentName` (via `escapeHTML`), then queries `#bounty-claim-inner` as the mutation target for all subsequent renders. It calls `getOpponentBounties(opponentId)` and on failure replaces the inner content with an error message and returns early; if the call returns an empty array it renders a "no open bounties" notice and returns early. When bounties exist, it renders a `<select>` dropdown where each `<option>` shows the bounty amount, days remaining (computed from `expires_at` vs. `Date.now()`, floored at zero), and the 5% attempt fee, followed by a preview div, a disabled lock-in button, an error div, and a hidden locked-state panel. A `change` listener on the select either clears the preview and re-disables the button when the empty placeholder is chosen, or populates the preview with fee and potential winnings (`amount * 0.95`, rounded to two decimal places) and styles the button active (gold background). A `click` listener on the lock button guards against double-submission via `_attemptFeePaid` and a blank selection, then calls `selectBountyClaim(bountyId, debateId)`; on success it sets `_selectedBountyId` and `_attemptFeePaid`, hides the select/preview/button, and reveals the locked-state panel with the fee and net-winnings detail; on failure it re-enables the button, restores its label, and displays the error message from `result.error` (falling back to a generic string).

---

## Agent 02

### getSelectedBountyId (line 17)
Returns the module-level `_selectedBountyId` variable, which holds either `null` or a bounty ID string. This is a pure read — no side effects, no async behavior, no branching. It reflects the last value written by the `lockBtn` click handler inside `renderBountyClaimDropdown` upon a successful claim, or `null` if no claim has been locked in or if `resetBountyClaim` has been called since.

### resetBountyClaim (line 21)
Sets both module-level state variables back to their initial values: `_selectedBountyId` to `null` and `_attemptFeePaid` to `false`. Synchronous, no return value, no side effects beyond clearing those two variables. Intended to be called between debate sessions or whenever the claim UI needs to be reset to a clean state, since both flags persist at module scope across renders.

### renderBountyClaimDropdown (line 30)
Accepts a container `HTMLElement`, a `debateId`, an `opponentId`, and an `opponentName`, and builds an interactive bounty-claim UI inside that container. On entry it sets `container.innerHTML` to a loading skeleton that XSS-safely renders `opponentName.toUpperCase()` via `escapeHTML`, then queries for the `#bounty-claim-inner` sub-element. It calls `getOpponentBounties(opponentId)` asynchronously; if that throws, it renders an error message inside `inner` and returns early. If the resolved array is empty it renders a "no open bounties" message and returns early. When bounties exist, it maps each into an `<option>` element encoding `bounty_id`, `attempt_fee`, and `amount` as attributes, computing days-remaining from `expires_at` relative to `Date.now()`, and injects the full select/preview/button/error/locked-confirmation markup into `inner`. It then attaches a `change` listener on the select: selecting a blank option clears the preview and disables the lock button; selecting a valid bounty displays the fee-and-payout preview text and enables the button. The `lockBtn` click handler guards against re-entry via `_attemptFeePaid` and a blank selection, disables the button with a spinner label, then calls `selectBountyClaim(bountyId, debateId)`; on success it sets `_selectedBountyId` and `_attemptFeePaid`, hides the select/preview/button, and reveals the `#bounty-claim-locked` confirmation panel with fee and net-payout detail; on failure it re-enables the button, restores its label, and displays the error string from `result.error` in `#bounty-claim-error`.

---

## Agent 03

### getSelectedBountyId (line 17)
Returns the module-level `_selectedBountyId` variable, which is either `null` or a string UUID representing the bounty the user has locked in for the current claim attempt. This is a pure read with no side effects, no branching, and no async behavior. It serves as the external accessor for state that is set inside `renderBountyClaimDropdown`'s click handler and cleared by `resetBountyClaim`.

### resetBountyClaim (line 21)
Sets both module-level state variables back to their initial values: `_selectedBountyId` to `null` and `_attemptFeePaid` to `false`. No inputs, no return value, no async behavior, no calls to other functions. Intended to be called between matches or when the claim flow is abandoned, ensuring stale bounty selection and fee state do not carry over into a new render cycle.

### renderBountyClaimDropdown (line 30)
Accepts a container `HTMLElement`, a `debateId` string, an `opponentId` UUID, and an `opponentName` string, and returns a `Promise<void>`. On entry it immediately sets `container.innerHTML` to a loading skeleton that includes an `escapeHTML`-sanitized version of `opponentName`, then queries for the `#bounty-claim-inner` child element it will mutate throughout. It calls `getOpponentBounties(opponentId)` and if that rejects, replaces `inner.innerHTML` with an error message and returns early. If the resolved array is empty, it replaces `inner.innerHTML` with a "no bounties" message and returns early. Otherwise it maps over the bounty array to build `<option>` elements, computing `daysLeft` for each by subtracting `Date.now()` from `b.expires_at` in milliseconds, flooring negative values to zero. It then renders a full dropdown UI into `inner.innerHTML`. A `change` listener on the select updates the preview text and enables or disables the lock button based on selection. A `click` listener on the lock button guards against double-execution via `_attemptFeePaid`: if already paid it returns immediately; otherwise it calls `selectBountyClaim` with the selected bounty ID and `debateId`, and on success sets `_selectedBountyId` to the chosen ID, sets `_attemptFeePaid` to `true`, and transitions the UI to a locked confirmation state; on failure it displays the error message in the error zone and restores the button to its interactive state.

---

## Agent 04

### getSelectedBountyId (line 17)
Returns the module-level `_selectedBountyId` variable, which is either `null` or a bounty UUID string. This is a pure read with no side effects, no branching, and no async behavior. It reflects the most recent successful bounty lock-in, or `null` if no bounty has been claimed or the state has been reset.

### resetBountyClaim (line 21)
Sets both module-level state variables back to their initial values: `_selectedBountyId` to `null` and `_attemptFeePaid` to `false`. This is a synchronous void function with no inputs, no return value, no error handling, and no calls to external functions. It is intended to be called when cleaning up between matches or navigating away, ensuring a stale bounty selection cannot persist across sessions.

### renderBountyClaimDropdown (line 30)
Accepts a container `HTMLElement`, a `debateId` string, an `opponentId` string, and an `opponentName` string, and returns a `Promise<void>`. On entry it immediately replaces `container.innerHTML` with a loading skeleton that displays the opponent's name (XSS-safe via `escapeHTML`) and a "Checking bounties…" placeholder inside `#bounty-claim-inner`. It then calls `getOpponentBounties(opponentId)` — if that throws, it renders a failure message into `inner` and returns early; if it resolves to an empty array, it renders a "No open bounties" message and returns early. When bounties exist, it maps each `OpponentBounty` to an `<option>` element whose `value` is the bounty ID and whose `data-fee`/`data-amount` attributes carry numeric token values; days-remaining is computed as `Math.ceil((expires_at - now) / 86_400_000)` clamped to zero. The full UI — a `<select>`, a preview `<div>`, a lock button (initially disabled), an error `<div>`, and a locked-confirmation `<div>` — is then written into `inner`. A `change` listener on the select reads `data-fee` and `data-amount` from the chosen option: if the value is empty it clears the preview and re-disables the button; otherwise it populates the preview with the fee and net-win amount (`amt * 0.95` rounded to two decimals) and styles the button as active. A `click` listener on the lock button guards against re-entry via `_attemptFeePaid` and against an empty selection, then calls `selectBountyClaim(bountyId, debateId)` after disabling the button and showing a spinner; on success it sets `_selectedBountyId` to the chosen bounty ID, sets `_attemptFeePaid` to `true`, hides the select/preview/button, and reveals the locked-confirmation panel with fee and net-win detail text; on failure it re-enables the button, restores its label, and displays `result.error` (or a fallback string) in the error element.

---

## Agent 05

### getSelectedBountyId (line 17)
Returns the module-level `_selectedBountyId` variable, which is either `null` or a string UUID representing the bounty the user has locked in for the current debate session. Takes no inputs and produces no side effects. This is a pure read of shared module state.

### resetBountyClaim (line 21)
Resets both module-level state variables to their initial values: sets `_selectedBountyId` back to `null` and `_attemptFeePaid` back to `false`. Takes no inputs, returns `void`, and produces no side effects beyond mutating those two variables. Intended to be called when a debate session ends or the bounty claim UI is torn down, so stale state does not carry over into the next session.

### renderBountyClaimDropdown (line 30)
Accepts a container `HTMLElement`, a `debateId` string, an `opponentId` string, and an `opponentName` string, and returns a `Promise<void>`. On entry it immediately writes a loading state into `container.innerHTML`, escaping and uppercasing `opponentName` via `escapeHTML`. It then queries `#bounty-claim-inner` from that freshly rendered HTML and calls `getOpponentBounties(opponentId)`; if that async call throws, it writes an error message into `inner` and returns early. If the resolved array is empty it writes a "no open bounties" message and returns early. For each bounty it computes days remaining (clamped to zero) from `b.expires_at` relative to `Date.now()` and builds an `<option>` element carrying `data-fee` and `data-amount` attributes. It then renders the full dropdown UI into `inner` and wires two event listeners: a `change` listener on `#bounty-claim-select` that either resets the preview and disables the lock button (no selection) or populates a fee-and-win-amount preview and enables the button (valid selection, win amount calculated as 95% of the bounty); and an async `click` listener on `#bounty-claim-lock-btn` that guards against double-firing via `_attemptFeePaid`, disables the button, calls `selectBountyClaim(bountyId, debateId)`, and on success sets `_selectedBountyId` and `_attemptFeePaid = true` then collapses the dropdown to a locked confirmation UI, or on failure restores the button and displays the error message in `#bounty-claim-error`.
