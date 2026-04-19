# Stage 3 Outputs — groups.utils.ts

## Agent 01

### clientRoleRank — PASS
Source matches exactly. Switch covers 'leader'→1, 'co_leader'→2, 'elder'→3, 'member'→4, default→99. Accepts `string | null`. No side effects.

### assignableRoles — PASS
Source matches exactly. 'leader' returns `['leader','co_leader','elder','member']`, 'co_leader' returns `['elder','member']`, default returns `[]`. No state reads, no side effects.

### roleLabel — PASS
Source matches exactly. All four cases correct, default returns raw `role` unchanged.

### renderEmpty — PASS
`escapeHTML` called on `icon` and `title` unconditionally (lines 57–58). `sub` is conditionally included: truthy → wrapped in `escapeHTML` inside `.empty-sub` div; falsy → div omitted (line 59). Returns HTML string, writes nothing to DOM.

### renderGroupList — PASS
All structural behaviors in Stage 2 accurate. `catLabel` from `CATEGORY_LABELS` is static developer-controlled data — safe to insert unescaped. Fallback path uses `esc(g.category || 'General')`. All user-sourced string fields (`g.id`, `g.avatar_emoji`, `g.name`, `g.description`, `g.role`, `g.category`) pass through `esc`. Numeric fields use `Number.parseInt(String(...), 10)` with correct fallbacks. `el.innerHTML` replacement on each render destroys old nodes and their listeners, so no accumulation.

### Findings
- INFO | `catLabel` from `CATEGORY_LABELS` inserted into innerHTML without `escapeHTML` — safe, static developer-defined constant (line 88)
- INFO | `esc(g.role)` used as CSS class name; `escapeHTML` does not escape spaces; negligible risk given server-enforced DB enum (line 80)

---

## Agent 02

### clientRoleRank — PASS
### assignableRoles — PASS
### roleLabel — PASS
### renderEmpty — PASS
### renderGroupList — PASS

Listener management: confirmed non-issue. `el.innerHTML =` at line 77/99 replaces entire DOM subtree, destroying all previously attached listeners. `querySelectorAll` + `forEach` at lines 101–105 attaches fresh listeners only to newly created nodes. No accumulation.

`catLabel` lookup: `CATEGORY_LABELS` is a static developer-defined constant with hardcoded strings. Fallback branch uses `esc(g.category || 'General')`. Safe.

### Findings
- LOW | `data-group-id` is set to `esc(g.id)` but browsers decode HTML entities from attributes on read, so `dataset.groupId` returns the original value. For UUIDs this is harmless (no HTML-special characters). Pattern is semantically over-escaped — attributes should store raw values with escaping applied only at render time; if `g.id` were a non-UUID string the caller would receive a double-decoded ID. | Lines 82, 103

---

## Agent 03

### clientRoleRank — PASS
### assignableRoles — PASS
### roleLabel — PASS (INFO note)
Return value is not interpolated into `innerHTML` in this file. Caller concern only.

### renderEmpty — PASS
All three parameters (`icon`, `title`, `sub`) passed through `escapeHTML` before interpolation (lines 57–59). Sub conditional correct.

### renderGroupList — PASS

`CATEGORY_LABELS` verified: module-level `const` with entirely hardcoded string literals — never populated from user input. Inserting lookup result directly into innerHTML is safe. Fallback `esc(g.category || 'General')` properly escapes user-supplied value.

Class injection via `esc(g.role)` (line 80): `escapeHTML` prevents attribute breakout (`"` → `&quot;`). Value like `foo" onclick="evil` is neutralized. Safe.

Numeric fallbacks (lines 89, 94, 95): `|| 0`, `|| (i+1)`, `|| 1000` correct. `Number.parseInt(String(...), 10)` safely coerces any type.

### Findings
No findings.

---

## Agent 04

### clientRoleRank — PASS
### assignableRoles — PASS
### roleLabel — PASS with note
Default branch returns raw `role` argument unescaped. Not used in `innerHTML` in this file. Latent caller risk.

### renderEmpty — PASS
### renderGroupList — PASS

**Question A — XSS completeness:**

| Expression | escapeHTML | Safe |
|---|---|---|
| `data-group-id="${esc(g.id)}"` | Yes | Safe |
| emoji div: `esc(g.avatar_emoji \|\| '⚔️')` | Yes | Safe |
| `g.name` → `esc(g.name)` | Yes | Safe |
| `g.description` → `esc(g.description)` | Yes | Safe |
| `catLabel` | No (static constant) | Safe |
| `member_count` — numeric cast | N/A | Safe |
| `roleHtml` class: `esc(g.role)` | Yes | Safe |
| `roleHtml` text: `esc(g.role.toUpperCase())` | Yes | Safe |
| `rank` — numeric cast | N/A | Safe |
| `elo_rating` — numeric cast | N/A | Safe |

**Question B:** `CATEGORY_LABELS` is programmer-controlled static `Record<string, string>`. Fallback uses `esc(g.category || 'General')`. Safe.

**Question C:** Lines 57–59: `escapeHTML(icon)`, `escapeHTML(title)`, `escapeHTML(sub)` (conditional). All applied.

**Question D:** `roleLabel()` default returns raw `role` unescaped. No unsafe usage in this file.

**Question E:** `el.innerHTML =` replaces entire subtree, listeners on old child nodes are garbage-collected. No accumulation.

### Findings
- LOW | `roleLabel()` default branch returns raw unescaped `role` string. Callers that insert the return value into `innerHTML` without wrapping in `escapeHTML()` introduce an XSS vector. Today's callers are safe, but the function offers no protection for future callers. | Line 50

---

## Agent 05

### clientRoleRank — PASS
### assignableRoles — PASS
### roleLabel — PASS (with note)
### renderEmpty — PASS
### renderGroupList — PASS (with note)

**Claim verifications:**

1. `clientRoleRank` default covers null — VERIFIED. `null` does not match any case string (strict equality), falls to `default: return 99`.
2. `assignableRoles` 'elder'/'member' get `[]` — VERIFIED. Both fall to default.
3. `roleLabel` default returns raw input — VERIFIED with note. Parameter is `string` (not `string | null`). Null/undefined at runtime returns as-is. All three call sites in the codebase are safe (two use `.textContent`, one passes only hardcoded `assignableRoles()` literals).
4. `renderEmpty` sub='' omits div — VERIFIED. Line 59: `${sub ? ... : ''}` — empty string is falsy, div omitted. Correct.
5. `esc(null)` for null/undefined fields — VERIFIED. `escapeHTML` returns `''` for null/undefined. No crash, no "null" text rendered.
6. `g.id` escaped before attribute — VERIFIED. Line 82: `esc(g.id)` — `"` escaped to `&quot;`, preventing attribute breakout.
7. `dataset.groupId` read safety — VERIFIED. Decoded attribute value passed to `onGroupClick` only as a group ID, not re-injected into HTML.
8. `CATEGORY_LABELS` values static — VERIFIED. Six hardcoded string literals in `groups.state.ts`. Safe to insert unescaped.
9. CSS class injection via `esc(g.role)` — CONCERN (INFO). `escapeHTML` does not escape spaces. Attribute breakout prevented (`"`, `'`, `<`, `>` all escaped). CSS class token would be inert. Practical risk negligible given server-enforced DB enum.

### Findings
- LOW | `roleLabel` returns raw unescaped value from default branch; parameter type is `string` (not nullable). If a caller passes a user-controlled string not matching a known role and inserts the result into `innerHTML`, unescaped content is injected. All current callers safe; latent risk for future callers. Recommend changing default to `esc(role)` or adding caller documentation. | Line 51
- INFO | CSS class injection via space character in `g.role` not blocked by `escapeHTML` (spaces not in OWASP 5-char map). `g.role` is server-enforced DB enum; no real attack path. | Line 80

---

## Synthesis

**All 5 agents agree: all functions PASS.**

### Confirmed findings (deduplicated):

**LOW | roleLabel default branch returns raw unescaped input | line 50–51**
The `default` branch returns the `role` argument unchanged without `escapeHTML`. The function's return type is `string` and callers that insert the result into `innerHTML` with a user-controlled role value would introduce XSS. All current callers in the codebase are safe (hardcoded role literals or `.textContent` usage). Latent risk for future callers.

**LOW | data-group-id attribute set with esc(g.id) causing semantic over-escaping | lines 82, 103**
`g.id` is a UUID and contains no HTML-special characters, so this is harmless in practice. The pattern is semantically inconsistent — attribute escaping is correct, but `dataset.groupId` returns the browser-decoded value, so the caller of `onGroupClick` sees the original UUID (correct behavior). No actionable bug for UUID IDs; noted for pattern awareness.

**INFO | catLabel from CATEGORY_LABELS inserted into innerHTML without escapeHTML | line 88**
Safe by construction — `CATEGORY_LABELS` is a static developer-defined constant, never user-sourced.

**INFO | esc(g.role) used as CSS class name; escapeHTML does not escape spaces | line 80**
Attribute breakout is prevented. CSS class injection via space characters is theoretical. Server DB enum constrains `g.role` to known values. No real attack path.
