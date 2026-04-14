# Stage 3 Outputs — api/invite.js

## Agent 01

### handler (line 17)
**Verification**: PARTIAL
**Findings**:
- Validation regex `/^[a-z0-9]{5}$/` — confirmed.
- Invalid/missing code → 302 bare plinko redirect — confirmed.
- IP resolution: `x-forwarded-for[0]` trimmed ?? socket?.remoteAddress ?? null — confirmed exactly.
- RPC `await`-ed inside try/catch — confirmed.
- `p_device_id: null` hardcoded — confirmed.
- Final redirect unconditional — confirmed.
- Agent 02 "non-blocking is misleading" claim — confirmed: `await` blocks the redirect until RPC resolves/rejects.
- `encodeURIComponent` redundancy — confirmed: regex constrains code to URL-safe chars.
- No HTTP method guard — confirmed.
- **Minor catch characterization**: Stage 2 agents described catch as "empty"; source shows it contains a comment (`// Non-blocking — click recording failure should not break the invite flow`). No executable statements, so functionally empty, but not literally empty. Minor prose inaccuracy.
**Unverifiable claims**: Whether env vars are set at runtime; whether `record_invite_click` RPC exists with those params; actual latency impact.

---

## Agent 02

### handler (line 17)
**Verification**: PARTIAL
**Findings**:
- All core behavioral claims confirmed: guard, IP resolution, RPC params, empty catch, unconditional redirect.
- `await` claim confirmed: redirect is delayed by RPC round-trip. "Non-blocking" in the comment refers to the failure mode (errors don't break the flow), not to execution ordering — a real nuance missed by Stage 2.
- Agent 05 Vercel-specific IP claim: correct as a platform/security observation. Source takes `[0]` (leftmost), which on Vercel is user-controlled since Vercel appends its own trusted IP to the right. Exploitability is limited to click-record poisoning (not auth/access control). Cannot fully confirm from source alone.
- One gap all Stage 2 agents missed: a HEAD or OPTIONS request to `/i/:code` would also execute the handler body (triggering click recording), depending on Vercel's routing layer. No method guard in this file.
- `encodeURIComponent` confirmed redundant.
**Unverifiable claims**: Vercel platform behavior for `x-forwarded-for`; whether `record_invite_click` performs its own IP sanitization.

---

## Agent 03

### handler (line 17)
**Verification**: PASS
**Findings**:
- Guard condition covering both falsy and regex-mismatch — confirmed.
- IP resolution chain: first segment of `x-forwarded-for`, trimmed; ?? `req.socket?.remoteAddress` ?? null — confirmed.
- `p_device_id: null` hardcoded — confirmed.
- Catch block empty of executable statements — confirmed.
- Final redirect unconditional — confirmed.
- `return` asymmetry between early-exit (uses `return res.redirect(...)`) and final redirect (bare statement) — confirmed.
**Unverifiable claims**: Behavior of `record_invite_click` RPC on the DB side (idempotency, deduplication, schema) — requires SQL inspection.

---

## Agent 04

### handler (line 17)
**Verification**: PASS
**Findings**:
- Guard confirmed. Client created inside try (not module-level) — confirmed. IP extraction exact — confirmed. RPC params and `await` — confirmed. Empty catch (comment only) — confirmed. Unconditional final redirect — confirmed. No `return` on final redirect — confirmed.
- Agent 02's "non-blocking is misleading" claim confirmed: `await` blocks until RPC settles; "non-blocking" refers only to failure not breaking the flow.
- `encodeURIComponent` redundancy confirmed.
**Unverifiable claims**: Runtime behavior of `record_invite_click`; actual latency impact.

---

## Agent 05

### handler (line 17)
**Verification**: PARTIAL
**Findings**:
- All core behavioral claims (guard, IP resolution, p_device_id, catch, unconditional redirect) — confirmed.
- Agent 02's `await` claim (non-blocking comment misleading) — confirmed.
- IP spoofing `x-forwarded-for[0]` observation — **PARTIAL (platform-specific)**: confirmed from source that `[0]` is taken; Vercel-specific detail (real IP is rightmost) is correct platform knowledge but unverifiable from source alone. The pattern of taking `[0]` is a recognized anti-pattern regardless of platform.
**Unverifiable claims**: Vercel's exact proxy header behavior; whether `record_invite_click` has server-side rate limiting.

## needs_review

- **IP spoofing via `x-forwarded-for[0]`**: The handler records the leftmost entry of the header as the client IP. On Vercel, the platform appends the real client IP to the right of any existing `x-forwarded-for` chain, making `[0]` fully attacker-controlled. An attacker can fake their IP for all click-record entries. Fix: use `req.headers['x-real-ip']` or take the rightmost (last) entry.
- **Misleading "non-blocking" comment (line 37)**: The `await` on the RPC call means the redirect is delayed by the full Supabase round-trip on every request. If `record_invite_click` is slow or Supabase times out, user-visible redirect latency increases. The comment describes the failure-tolerance intent, not the execution semantics. Either remove `await` (true fire-and-forget via `void supabase.rpc(...)`) or update the comment.
- **No 404 vs. redirect distinction**: Invalid-format codes and valid-format-but-nonexistent codes both redirect to plinko without `?ref=`. If an expired or never-issued code is clicked, the referral is silently dropped rather than surfaced. The catch swallows RPC errors, so there is no recovery path.
- **Regex scope**: `[a-z0-9]{5}` accepts only lowercase, exactly 5 chars. If invite code generation ever produces uppercase or different lengths, valid invites will silently fall through to bare plinko (losing referral credit). Worth confirming the generation logic matches this constraint.

---

## Cross-Agent Consensus Summary

| Function | A01 | A02 | A03 | A04 | A05 | Overall |
|---|---|---|---|---|---|---|
| handler | PARTIAL | PARTIAL | PASS | PASS | PARTIAL | PARTIAL |

**Totals**: 2 PASS, 3 PARTIAL, 0 FAIL

**Disagreements**:
- Agents 01/02/05 flagged minor nuances (catch comment, IP platform detail) → PARTIAL; Agents 03/04 called all core claims accurate → PASS.
- All agents agree on all core behavioral descriptions. PARTIALs are due to nuances (catch comment wording, IP spoofing as platform-specific), not to incorrect claims.
- Consensus on Agent 02's "non-blocking is misleading" finding: confirmed.
- Agent 05 uniquely surfaced the most detailed needs_review items.
