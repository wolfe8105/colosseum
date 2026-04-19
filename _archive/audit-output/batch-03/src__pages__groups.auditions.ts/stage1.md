# Stage 1 — Primitive Inventory: groups.auditions.ts

All 11 agents agree on exactly 17 named bindings. Consensus inventory:

---

- `safeRpc` — import, line 10, from `../auth.ts` — wraps Supabase RPC calls with 401 retry logic.
- `escapeHTML` — import, line 11, from `../config.ts` — sanitizes user-supplied strings before insertion into HTML.
- `showToast` — import, line 11, from `../config.ts` — displays a transient toast notification to the user.
- `currentGroupId` — import, line 12, from `./groups.state.ts` — holds the ID of the currently active group.
- `callerRole` — import, line 12, from `./groups.state.ts` — holds the current user's role string within the active group.
- `GroupDetail` — import (type), line 13, from `./groups.types.ts` — TypeScript type describing the shape of a group detail object.
- `PendingAudition` — interface, line 16 — describes the shape of a single pending audition record with 12 fields: `id`, `candidate_user_id`, `candidate_username` (optional), `candidate_display_name` (optional), `rule`, `status`, `topic` (optional), `category` (optional), `ruleset` (optional), `total_rounds` (optional), `debate_id` (optional), `created_at`.
- `currentAuditionGroupId` — let, line 32 — module-level variable holding the group ID for the audition modal currently open, initialized to null.
- `currentAuditionConfig` — let, line 33 — module-level variable holding the audition configuration object (arbitrary key-value record) for the currently open group, initialized to an empty object.
- `RULE_LABELS` — const, line 36 — lookup map from 5 audition rule keys (`allowed_by_leader`, `debate_leader_any`, `debate_member_any`, `debate_leader_win`, `debate_member_win`) to their human-readable label strings.
- `openAuditionModal` — function (export), line 47 — opens the audition request modal for a candidate, populating it from a `GroupDetail` object.
- `closeAuditionModal` — function (export), line 75 — closes the audition modal by removing its `open` CSS class.
- `submitAuditionRequest` — function (export, async), line 79 — reads audition form field values and calls the `request_audition` RPC; closes the modal and shows a toast on success, displays an inline error on failure.
- `loadPendingAuditions` — function (export, async), line 109 — fetches pending auditions for a given group via the `get_pending_auditions` RPC and renders them into the `#detail-auditions` container.
- `handleAuditionAction` — function (export, async), line 128 — dispatches one of four audition actions (`accept`, `approve`, `deny`, `withdraw`) to the corresponding RPC, shows a toast, and refreshes the auditions list; on `accept` with a returned `debate_id` it navigates to the arena lobby.
- `_populateAuditionFields` — function (private), line 171 — reads `currentAuditionConfig` and sets the value and disabled state of the topic, category, ruleset, and rounds form fields in the audition modal.
- `_renderAuditionsList` — function (private), line 227 — accepts an array of `PendingAudition` objects and the caller's role string, and returns an HTML string of audition rows with role-appropriate action buttons.

---

## Agent variance notes

- Line numbers: Agents that received abbreviated source variants reported slightly different line numbers for some bindings (e.g., Agent 01 reported line 9 for `safeRpc`, Agent 03 reported line 1). True line numbers from the actual source are used above.
- Interface field count: Agent 08 stated 13 fields; Agent 02 stated 11 fields. Actual count from source: 12 fields.
- All 17 bindings identified by all 11 agents — no additions, no omissions across any agent.
