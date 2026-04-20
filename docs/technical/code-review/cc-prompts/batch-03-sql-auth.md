# Code Review Fix — Batch 03: SQL search_path — auth.sql

**Layer:** 1A (SQL foundation)
**Guide reference:** Colosseum-SQL-Review-Checklist.docx, Section 1
**Dependency:** Batch 02 must be committed before this runs.

---


## SETUP

Read the GitHub token from the repo README:
```bash
TOKEN=$(grep "GITHUB_TOKEN=" docs/technical/code-review/README.md | cut -d'=' -f2)
```

Then clone and configure:
```bash
git clone https://${TOKEN}@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://${TOKEN}@github.com/wolfe8105/colosseum.git
```

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
2. Confirm Batch 02 is committed: `git log --oneline -3`.
3. This batch touches `supabase/functions/auth.sql` ONLY.

---

## CONTEXT

`auth.sql` contains 34 SECURITY DEFINER functions — the auth layer.
These are the highest-sensitivity functions in the codebase: they handle
session management, profile access, and authentication state. Schema injection
here could compromise every user's session.

---

## THE FIX PATTERN

Same as Batch 02. For every function with `SECURITY DEFINER`, add
`SET search_path = public, pg_catalog` after `SECURITY DEFINER` and before `AS $$`.

```sql
-- BEFORE:
SECURITY DEFINER
AS $$

-- AFTER:
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
```

---

## EXECUTION

1. Read `supabase/functions/auth.sql` (verify line count first).
2. Find every function with `SECURITY DEFINER`.
3. Add `SET search_path = public, pg_catalog` to each one.
4. Do NOT change any function logic, parameters, or return types.

---

## VERIFICATION

```bash
python3 -c "
import re
content = open('supabase/functions/auth.sql').read()
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

Expected: `Functions missing search_path: 0`

---

## COMMIT

```bash
git add supabase/functions/auth.sql
git commit -m "Batch 03: add SET search_path to all SECURITY DEFINER functions in auth.sql"
```

---

## WHEN DONE — report

- Total number of functions updated in auth.sql
- Verification output (must show 0)
- Any function where placement was unclear

Stop after this batch. Do not start Batch 04.
