# Stage 2 Outputs — home.invite-render.ts

## Agent 01

### renderInvite (line 11)

**Signature:** `export function renderInvite(container: HTMLElement, stats: InviteStats, onClaim: (rewardId: string, rewardType: InviteReward['reward_type']) => void): void`
- Synchronous, returns void.

**Local variables:**
- `converts` (number, line 16): `stats.total_converts`
- `nextMilestone` (number, line 17): `stats.next_milestone`
- `progressPct` (number, lines 18-20): Capped 0-100 percentage. If converts >= 25: `Math.min(100, ((converts - 25) % 25) / 25 * 100)`. Else: `Math.min(100, converts / nextMilestone * 100)`.
- `headlineTo` (string, lines 22-26): Three-branch ternary. converts < 25: `"${converts} of ${nextMilestone} invites to your ${rewardLabel(nextMilestone)}"`. converts === 25: hardcoded Mythic string. Else: `"${converts} successful invites · ${Math.floor((converts - 25) / 25)} repeating Mythic${pluralS} earned"`.
- `unclaimedHtml` (string, lines 28-32): Empty string if no unclaimed rewards; else div with title showing `stats.unclaimed_rewards.length` count and `rewardRowHtml(r)` output mapped over unclaimed_rewards.
- `activityHtml` (string, lines 34-36): Static fallback if no activity; else `activityRowHtml(a)` mapped over stats.activity.

**innerHTML template data interpolations:**
- Line 44: `${escapeHTML(headlineTo)}` — PROPERLY ESCAPED
- Line 46: `${progressPct.toFixed(1)}%` — numeric, safe
- Line 49: `${Number(converts)}` — numeric cast, safe
- Line 50: `${Number(stats.total_signups)}` — numeric cast, safe
- Line 51: `${Number(stats.total_clicks)}` — numeric cast, safe
- Line 59: `${escapeHTML(stats.invite_url)}` — PROPERLY ESCAPED
- Lines 64-65: `${encodeURIComponent('Join me on The Moderator: ' + stats.invite_url)}` — URL-encoded, safe for href context
- Line 72: `${unclaimedHtml}` — delegated to `rewardRowHtml()` which escapes r.id, r.reward_type, date internally
- Line 76: `${activityHtml}` — delegated to `activityRowHtml()` which escapes a.username, a.status internally

**wireInviteScreen call (line 97):** `wireInviteScreen(container, stats, onClaim)` — passes same container, stats, and callback through.

**Notable:** LANDMINE comment at lines 38-39 (`LM-INVITE-005`) claims "converts, total_signups, total_clicks interpolated into innerHTML without Number() casts" — but the code at lines 49-51 DOES have Number() casts. The comment appears stale/inaccurate. No actual violation at those lines.

---

## Agent 02

(Consistent with Agent 01.)

- All 3 numeric values (converts, total_signups, total_clicks): wrapped in `Number()` — COMPLIANT per CLAUDE.md "Numeric casting before innerHTML" rule.
- `headlineTo` construction: contains only numeric interpolations and `rewardLabel()` output (hardcoded strings). Properly escaped at line 44 anyway.
- `stats.invite_url`: properly escaped at line 59; properly URL-encoded at lines 64-65.
- Helper functions internally escape all user data.
- **Security verdict: FULLY COMPLIANT. No XSS vectors.**

---

## Agent 03

(Consistent with Agents 01-02.)

- LANDMINE comment vs. code: Comment says "without Number() casts" but code HAS them. False alarm in the comment.
- `encodeURIComponent()` on invite_url in href attributes: correct URL-parameter encoding, not HTML escaping, which is appropriate for that context.
- No async/await anywhere in the function.

---

## Agent 04

(Consistent with Agents 01-03.)

- No null checks on `stats` properties beyond ternary on `stats.invite_url`. Assumes `stats.unclaimed_rewards` and `stats.activity` are arrays.
- `wireInviteScreen()` attaches listeners to copy button, native share button, and `.invite-claim-btn:not([disabled])` elements; extracts `data-reward-id` and `data-reward-type` from button DOM attributes.

---

## Agent 05

(Consistent with Agents 01-04.)

- LANDMINE comment `LM-INVITE-005` is documentation debt — the violation it describes was already fixed in code. Comment was not updated.
- `rewardRowHtml()` and `activityRowHtml()` confirmed to escape all user-supplied fields (r.id, r.reward_type, date, a.username, a.status) before returning.

---

## Cross-Agent Consensus

All 5 agents agreed on all key facts.

| Claim | All agents agree |
|---|---|
| Synchronous | Yes |
| headlineTo escaped via escapeHTML() at line 44 | Yes |
| stats.invite_url escaped via escapeHTML() at line 59 | Yes |
| Number() casts on converts/total_signups/total_clicks | Yes — present at lines 49-51 |
| URL params via encodeURIComponent() | Yes |
| Helper functions internally escape user data | Yes |
| LANDMINE comment LM-INVITE-005 is stale (code has Number() casts) | Yes |
| No XSS violations | Yes |

**Security verdict: COMPLIANT. All user data entering innerHTML is either escaped, numeric-cast, or delegated to helpers that escape.**
