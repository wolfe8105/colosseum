# Code Review Fix — Batch 08: SQL search_path — predictions, hot-takes, admin, notifications

**Layer:** 1A (SQL foundation — completes all search_path fixes)
**Dependency:** Batch 07 must be committed before this runs.

---


## SETUP

```bash
git clone https://GITHUB_TOKEN@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://GITHUB_TOKEN@github.com/wolfe8105/colosseum.git
```

---
## MANDATORY FILE READ VERIFICATION

  Step 1: `wc -l <filename>`. Step 2: read file. Step 3: confirm line count.
  If count wrong: stop, re-read.

---

## BEFORE STARTING

1. Read `docs/technical/AUDIT-FINDINGS.md`.
2. Confirm Batch 07 committed: `git log --oneline -3`.
3. This batch touches these four files ONLY:
   - `supabase/functions/predictions.sql`  (9 SECURITY DEFINER functions)
   - `supabase/functions/hot-takes.sql`   (10 SECURITY DEFINER functions)
   - `supabase/functions/admin.sql`        (6 SECURITY DEFINER functions)
   - `supabase/functions/notifications.sql` (4 SECURITY DEFINER functions)

---

## THE FIX PATTERN

Same as all prior SQL batches:

```sql
SECURITY DEFINER
SET search_path = public, pg_catalog  -- ADD THIS LINE
AS $$
```

---

## EXECUTION

Process each file in order. For each:
1. Read the file (verify line count first).
2. Add `SET search_path = public, pg_catalog` to every SECURITY DEFINER function.
3. Do NOT change logic, parameters, or return types.

---

## VERIFICATION

Run this once after editing all four files:

```bash
for f in predictions hot-takes admin notifications; do
  python3 -c "
import re, sys
content = open('supabase/functions/${f}.sql').read()
blocks = re.split(r'CREATE OR REPLACE FUNCTION', content)
missing = [re.search(r'public\.(\w+)', b).group(1) if re.search(r'public\.(\w+)', b) else f'block_{i}'
           for i, b in enumerate(blocks[1:], 1)
           if 'SECURITY DEFINER' in b and 'search_path' not in b.split('AS \$\$')[0]]
print(f'${f}.sql — missing: {len(missing)}')
if missing: print(chr(10).join(missing[:5]))
"
done
```

Expected: all four files show `missing: 0`

Then run the cross-codebase final check:

```bash
python3 -c "
import re, glob
total_missing = 0
for path in glob.glob('supabase/functions/*.sql'):
    content = open(path).read()
    blocks = re.split(r'CREATE OR REPLACE FUNCTION', content)
    for b in blocks[1:]:
        if 'SECURITY DEFINER' in b and 'search_path' not in b.split('AS \$\$')[0]:
            total_missing += 1
print(f'TOTAL functions missing search_path across all files: {total_missing}')
"
```

Expected: `TOTAL functions missing search_path across all files: 0`

This is the completion check for the entire SQL Layer 1A search_path work.

---

## COMMIT

```bash
git add supabase/functions/predictions.sql supabase/functions/hot-takes.sql \
        supabase/functions/admin.sql supabase/functions/notifications.sql
git commit -m "Batch 08: add SET search_path to all SECURITY DEFINER functions in predictions, hot-takes, admin, notifications — completes search_path Layer 1A"
```

---

## WHEN DONE — report

- Count of functions updated per file
- Output of the cross-codebase final check (must show 0)
- Confirmation that all 8 SQL batches (02–08) are now committed

Stop. Do not start Batch 09.
