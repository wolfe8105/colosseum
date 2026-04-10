# PUNCH LIST ADDITIONS — S258

Six rows to append to the punch list. PL numbers left as `PL-XXX` — assign at commit time to match current numbering.

Ordered by severity.

---

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

**END OF ADDITIONS.**
