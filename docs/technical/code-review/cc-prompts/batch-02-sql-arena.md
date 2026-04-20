# Code Review Fix — Batch 02: SQL search_path — arena.sql

**Layer:** 1A (SQL foundation — requires Batch 01 complete first)
**Guide reference:** Colosseum-SQL-Review-Checklist.docx, Section 1
**Dependency:** Batch 01 must be committed before this runs.

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
2. Confirm Batch 01 is committed: `git log --oneline -3` should show the Batch 01 commit.
3. This batch touches `supabase/functions/arena.sql` ONLY.
   It does NOT touch any other file.

---

## CONTEXT

Every `SECURITY DEFINER` function without `SET search_path = public, pg_catalog`
is vulnerable to schema injection: an attacker who can create a schema can shadow
any function or type referenced by the SECURITY DEFINER function, redirecting its
execution to attacker-controlled code.

`arena.sql` contains 55 SECURITY DEFINER functions — the largest single file.
None currently have `SET search_path`.

---

## THE FIX PATTERN

For every function in `arena.sql` that contains `SECURITY DEFINER`, add
`SET search_path = public, pg_catalog` immediately after the `SECURITY DEFINER`
line and before the `AS $$` or `LANGUAGE` line.

**Before:**
```sql
CREATE OR REPLACE FUNCTION public.some_function(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
```

**After:**
```sql
CREATE OR REPLACE FUNCTION public.some_function(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
```

The placement must be: after `SECURITY DEFINER`, before `AS $$`.

---

## EXECUTION

1. Read `supabase/functions/arena.sql` (verify line count first).
2. Find every function with `SECURITY DEFINER`.
3. Add `SET search_path = public, pg_catalog` to each one.
4. Do NOT change any function logic, parameters, or return types.
5. Do NOT reformat or reorder any other code.

---

## VERIFICATION

After editing, run this check to confirm zero remaining SECURITY DEFINER
functions without search_path in arena.sql:

```bash
python3 -c "
import re
content = open('supabase/functions/arena.sql').read()
blocks = re.split(r'CREATE OR REPLACE FUNCTION', content)
missing = []
for i, block in enumerate(blocks[1:], 1):
    if 'SECURITY DEFINER' in block and 'search_path' not in block.split('AS \$\$')[0]:
        name = re.search(r'public\.(\w+)', block)
        missing.append(name.group(1) if name else f'block_{i}')
print(f'Functions missing search_path: {len(missing)}')
if missing: print('\n'.join(missing[:10]))
"
```

Expected output: `Functions missing search_path: 0`

---

## DELIVERY

Do NOT commit or push. Instead:
1. Copy every patched file to `/mnt/user-data/outputs/` preserving the filename.
2. Use `present_files` to hand them to me.
3. I will upload them to GitHub manually.


---

## WHEN DONE — report

- Total number of functions updated in arena.sql
- Output of the verification python3 command (must show 0)
- Any function where the pattern was unclear or required judgment

Stop after this batch. Do not start Batch 03.
