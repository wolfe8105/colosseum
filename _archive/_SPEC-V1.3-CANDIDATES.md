# _SPEC v1.3 CANDIDATES

Queued edits for the next `_SPEC.md` revision. Current spec version: v1.2. These are proposals, not yet adopted. When a v1.3 edit session runs, it reads this file as input.

---

## C-1 — Compound operators in forbidden-character rule

**Current state (v1.2):** The forbidden-character rule enumerates single characters (`<`, `>`, `=`, `!`, etc.) and the self-check scans character-by-character.

**Proposed addition:** Add explicit bullet under the forbidden-character rule:

> Compound operators are also forbidden and must be substituted:
> - `>=` → `at or over`
> - `<=` → `at or under`
> - `!==` / `!=` → `is not`
> - `===` / `==` → `is`
>
> The self-check must scan for these as two-character sequences, not only for the single characters `<`, `>`, `=`, `!`.

**Rationale:** The S258 `>=` escape in F-35 diagram 2 slipped through because the visual-scan self-check pattern-matched on single characters. Naming compound operators explicitly closes the gap. This is a tightening, not a rule change.

**Priority:** High. Directly addresses a measured escape.

---

## C-2 — System-triggered features exempt from button-note count check

**Current state (v1.2):** The button-note rule requires the button-note count in a diagram to equal the interactive-UI participant count.

**Proposed addition:**

> When a diagram has zero interactive UI participants (e.g., cron jobs, background workers, system-initiated flows), the count check trivially passes and the button-note rule does not apply. Such diagrams should still be annotated with a header comment identifying the trigger, using the format `system_action: <trigger-type>` where trigger-type is one of `cron`, `webhook`, `queue`, `db_trigger`, or `other`.

**Rationale:** F-35's three diagrams all had 0 interactive UI participants (newsletter cron, nudge engine, toast wrapper). The 0=0 count check passed trivially, but the rule was designed for user-facing features and the trivial pass is semantically meaningless. Explicit exemption plus a header annotation requirement preserves the rule's intent without awkwardly forcing it on system flows.

**Priority:** Medium. Affects a small number of maps but the affected ones currently have no guidance.

---

## C-3 — `system_action` as a first-class action type

**Current state (v1.2):** The spec frames all action sections under "User actions." Flows initiated by cron, webhook, queue consumer, or database trigger have no defined slot.

**Proposed addition:** Add a parallel section to the spec titled "System actions":

> **System actions.** For flows initiated by cron, webhook, queue consumer, database trigger, or other non-user mechanism. Format identical to user actions except the `initiator` field names the system component instead of a user role.
>
> Example:
> ```
> initiator: newsletter_cron_daily
> trigger: cron schedule at 09:00 UTC daily
> ```
>
> System actions are subject to the same diagram, files_touched, and self-check rules as user actions, with the exemption noted in C-2 applying when no interactive UI participants are present.

**Rationale:** CC documented F-35's newsletter flow as a system action in prose because the spec had no slot for it. Formalizing the type eliminates the need for ad-hoc prose and makes system-triggered features mechanically checkable.

**Priority:** Medium. Pairs with C-2 — both should land in v1.3 together or neither.

---

## C-4 — Multi-feature single-file convention

**Current state (v1.2):** A feature map's `files_touched` entry lists a file path with no line-range hint. When a single file hosts multiple mapped features, there's no way to tell which lines belong to which feature.

**Proposed addition:**

> When a single source file contains logic for multiple mapped features (e.g., `groups.ts` contains F-14, F-15, and others), each feature map's `files_touched` entry for that file should include an advisory line-range hint in the format:
>
> ```
> src/lib/groups.ts:120-245 (F-14 role hierarchy)
> ```
>
> Line ranges are advisory and need not be re-synced on every edit. They exist to orient future maintainers, not to serve as ground truth.

**Rationale:** `groups.ts` is 1128 lines and hosts at least F-14 and F-15. Future maintainers opening that file from either map need orientation. The "advisory, not ground truth" framing prevents the convention from becoming a maintenance burden.

**Priority:** Low. Quality-of-life improvement, not blocking anything.

---

## Adoption notes

- C-1 is the highest priority and should land in v1.3 regardless of whether C-2/C-3/C-4 are batched with it.
- C-2 and C-3 are coupled. Land them together or leave both for v1.4.
- C-4 is independent and can land in any future version.
- No candidate in this file changes existing map output. All v1.3 edits are additive; existing v1.2-compliant maps remain v1.3-compliant without modification.

**END OF CANDIDATES FILE.**
