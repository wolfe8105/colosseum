# PUNCH LIST ADDITIONS — S258 + S259 DECISIONS

Eight rows to append to the punch list. PL numbers left as `PL-XXX` — assign at commit time. Six rows are from S258 interaction mapping; two rows are dead-code findings from the S259 decision investigation (`_S259-DECISIONS-D1-D2-D3.md`).

Ordered by severity within source.

---

## FROM S258 INTERACTION MAPPING

**PL-XXX | F-35 newsletter has no unsubscribe mechanism**
SEVERITY: legal/compliance (highest)
Newsletter send path has no unsubscribe link, no preference toggle, no suppression list check. CAN-SPAM requires a functioning unsubscribe in every commercial email; GDPR requires withdrawable consent. Blocker for any non-transactional send at scale.
Fix requires: (a) per-user `newsletter_opt_in` column or preference row, (b) unsubscribe link with signed token in email template, (c) unsubscribe landing handler, (d) send-time filter.
Source: S258 F-35 mapping.

---

**PL-XXX | F-35 `v_topic_sentiment` fetched without error handling**
SEVERITY: high
Single view fetch with no try/catch wraps the entire newsletter run. If the view is missing, returns malformed data, or the query throws, the whole cron job dies and zero users get the newsletter that cycle.
Fix: wrap in try/catch, fall back to a degraded template or skip-and-log.
Source: S258 F-35 mapping.

---

**PL-XXX | F-35 100-user cap with no prioritization**
SEVERITY: high
Newsletter sends to the first 100 users returned by `listUsers()` pagination. Early signups get every newsletter; new users never get one. No ordering, no rotation, no fairness.
Fix options: (a) rotate through the user base across cron runs, (b) prioritize by last-sent timestamp, (c) raise or remove the cap.
Source: S258 F-35 mapping.

---

**PL-XXX | F-15 `unban_group_member` RPC has no client UI**
SEVERITY: medium, product decision
Server-side RPC exists and works; no UI surface invokes it. Banned users can currently only be unbanned via direct SQL.
Decision required: (a) ship an unban UI in the moderator ban list, or (b) document as intentional permanent ban and remove the RPC to match. Current state is the worst of both — the capability exists but is inaccessible.
Source: S258 F-15 mapping.

---

**PL-XXX | F-15 header member count stale after kick/ban**
SEVERITY: medium
After a successful kick or ban, the group header's member count does not decrement until the group is fully re-opened. Visible state inconsistency. Likely a missing refetch or a count derived from stale cached data rather than the member list that did update.
Source: S258 F-15 mapping.

---

**PL-XXX | F-14 leader LEAVE button is client-side gated only**
SEVERITY: medium, pattern instance
The leader LEAVE path relies on client-side UI to prevent leaders from calling `leave_group`; the RPC itself has no server-side guard. Third confirmed instance of the "client-side gate, no server check" pattern after F-46 DECLINE and F-48 debater LEAVE. Pattern is now strongly confirmed across three unrelated features — candidate for a dedicated grep sweep of all RPCs in `groups.ts` and adjacent files to find further instances.
Source: S258 F-14 mapping.

---

## FROM S259 DECISION INVESTIGATION

**PL-XXX | Dead code: `src/settings.ts`**
SEVERITY: low, cleanup
File is unreferenced by any HTML, TS import, or build config. The live settings module is `src/pages/settings.ts` (loaded by `moderator-settings.html:600`). `src/settings.ts` is an older copy that was never removed.
Fix: delete `src/settings.ts`. Verify no new references appear in an `rg "src/settings" -g '!src/pages/settings*'` scan before deleting.
Source: S259 decision investigation (D1).

---

**PL-XXX | Dead code: three staging HTML files under `src/pages/`**
SEVERITY: low, cleanup
Three HTML files are unreferenced by any TS/JS import, unlinked by any other HTML, and absent from the Vite build input:
- `src/pages/moderator-settings.html`
- `src/pages/moderator-terms.html`
- `src/pages/src-pages-moderator-terms.html`
These are staging or build artifacts that duplicate root-level HTML files. Safe to delete.
Fix: delete all three files. Optionally add `src/pages/*.html` to a repo `.auditignore` or equivalent so future audits skip this path by default.
Source: S259 decision investigation (D2).

---

**END OF ADDITIONS.**
