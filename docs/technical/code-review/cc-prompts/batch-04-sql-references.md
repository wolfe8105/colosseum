# Code Review Fix — Batch 04: SQL search_path — references.sql

**Layer:** 1A (SQL foundation)
**Guide reference:** Colosseum-SQL-Review-Checklist.docx, Section 1
**Dependency:** Batch 03 must be committed before this runs.

---


## SETUP

```bash
git clone https://GITHUB_TOKEN@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://GITHUB_TOKEN@github.com/wolfe8105/colosseum.git
```

---
## MANDATORY FILE READ VERIFICATION

  Step 1: run `wc -l <filename>` and note the total.
  Step 2: read the file.
  Step 3: confirm "Read [N] lines of [total] total."

If N ≠ total: stop, re-read.

---

## BEFORE STARTING

1. Read `docs/technical/AUDIT-FINDINGS.md`.
2. Confirm Batch 03 committed: `git log --oneline -3`.
3. This batch touches `supabase/functions/references.sql` ONLY.

---

## CONTEXT

`references.sql` contains 18 SECURITY DEFINER functions handling the
reference arsenal system: forge_reference, loadout management, ruling submissions.

---

## THE FIX PATTERN

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

1. Read `supabase/functions/references.sql` (verify line count first).
2. Add `SET search_path = public, pg_catalog` to every SECURITY DEFINER function.
3. Do NOT change logic, parameters, or return types.

---

## VERIFICATION

```bash
python3 -c "
import re
content = open('supabase/functions/references.sql').read()
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
git add supabase/functions/references.sql
git commit -m "Batch 04: add SET search_path to all SECURITY DEFINER functions in references.sql"
```

---

## WHEN DONE — report

- Count of functions updated
- Verification output (must show 0)

Stop after this batch. Do not start Batch 05.
