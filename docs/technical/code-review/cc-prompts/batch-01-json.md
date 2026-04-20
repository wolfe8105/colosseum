# Code Review Fix — Batch 01: JSON / Build Tools

**Layer:** 0 (foundation — do this before all other batches)
**Guide reference:** Colosseum-JSON-Review-Checklist.docx, Sections 1, 2, 5, 8, 9

---


## SETUP

The repo is already cloned at `/home/claude/colosseum`. Work from there.
Do NOT attempt to push to GitHub — you do not have a valid token.


---
## MANDATORY FILE READ VERIFICATION

Every file you read must follow this exact sequence. No exceptions.

  Step 1: run `wc -l <filename>` and note the total.
  Step 2: read the file.
  Step 3: confirm "Read [N] lines of [total] total."

If N ≠ total: stop, re-read. Do not proceed on a partial read.

---

## BEFORE STARTING

1. Read `docs/technical/AUDIT-FINDINGS.md` — do not re-apply any fix already marked FIXED.
2. Read `docs/technical/code-review/README.md` — understand the layer order.
3. This batch touches `package.json`, `tsconfig.src.json`, and `.gitignore` only.
   It does NOT touch any `.ts`, `.js`, `.html`, or `.sql` files.

---

## FIXES — execute in this order

### FIX 1: Patch vite CVE (HIGH severity)

`npm audit` currently reports 1 HIGH severity vulnerability in vite@6.4.1.
Two CVEs active: GHSA-4w7w-66w2-5vf9 and GHSA-p9ff-h696-f583.

```bash
npm audit fix
```

After running, verify:
```bash
npm audit
```
Expected output: `found 0 vulnerabilities` or `0 high, 0 critical`.
If any high/critical remain, stop and report — do not continue.

### FIX 2: Move @supabase/supabase-js to dependencies

Currently `@supabase/supabase-js` is in `devDependencies`. It is used at
runtime in the `api/` edge functions and should be in `dependencies`.

In `package.json`:
- Remove `"@supabase/supabase-js": "^2.98.0"` from `devDependencies`
- Add `"@supabase/supabase-js": "^2.98.0"` to `dependencies`

After editing, run:
```bash
npm install
npm audit
```
Confirm `npm audit` still shows 0 high/critical.

### FIX 3: Add isolatedModules to tsconfig.src.json

Vite's esbuild transpiles each file in isolation without type information.
Without `isolatedModules: true`, TypeScript will not warn when code uses
features that break isolated transpilation (const enum, implicit type-only imports).

In `tsconfig.src.json`, add to `compilerOptions`:
```json
"isolatedModules": true
```

After editing, run:
```bash
npm run typecheck
```
Expected: passes with 0 errors. If new errors surface, report them — they
are real issues exposed by the new setting, not caused by it.

### FIX 4: Add mcp.json pattern to .gitignore

GitGuardian found 24,008 secrets in MCP config files on public GitHub in 2025.
AI coding tools (Claude Code, Cursor) can generate mcp.json files with
hardcoded API keys. These must never be committed.

In `.gitignore`, add after the `.claude/` line:
```
mcp.json
*.mcp.json
```

---

## VERIFICATION

After all four fixes, run:
```bash
npm audit                  # must show 0 high/critical
npm run typecheck          # must pass clean
git diff --stat            # should show: package.json, tsconfig.src.json, .gitignore
```

---

## DELIVERY

Do NOT commit or push. Instead:
1. Copy every patched file to `/mnt/user-data/outputs/` preserving the filename.
2. Use `present_files` to hand them to me.
3. I will upload them to GitHub manually.


---

## WHEN DONE — report

- Which fixes completed successfully
- `npm audit` output (the exact vulnerability count line)
- `npm run typecheck` output (pass/fail + any new errors)
- Any item that could not be completed and why

Stop after this batch. Do not start Batch 02.
