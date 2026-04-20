# Code Review Fix — Batch 05: SQL search_path — moderation.sql

**Layer:** 1A (SQL foundation)
**Dependency:** Batch 04 must be committed before this runs.

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
2. Confirm Batch 04 committed: `git log --oneline -3`.
3. This batch touches `supabase/functions/moderation.sql` ONLY.

---

## CONTEXT

`moderation.sql` contains 23 SECURITY DEFINER functions: kick/ban, content
moderation, ruling submissions, spectator management.

---

## THE FIX PATTERN

```sql
SECURITY DEFINER
SET search_path = public, pg_catalog  -- ADD THIS LINE
AS $$
```

---

## EXECUTION

1. Read `supabase/functions/moderation.sql` (verify line count first).
2. Add `SET search_path = public, pg_catalog` to every SECURITY DEFINER function.
3. Do NOT change logic, parameters, or return types.

---

## VERIFICATION

```bash
python3 -c "
import re
content = open('supabase/functions/moderation.sql').read()
blocks = re.split(r'CREATE OR REPLACE FUNCTION', content)
missing = [re.search(r'public\.(\w+)', b).group(1) if re.search(r'public\.(\w+)', b) else f'block_{i}'
           for i, b in enumerate(blocks[1:], 1)
           if 'SECURITY DEFINER' in b and 'search_path' not in b.split('AS \$\$')[0]]
print(f'Functions missing search_path: {len(missing)}')
if missing: print('\n'.join(missing[:10]))
"
```

Expected: `Functions missing search_path: 0`

---

## COMMIT

```bash
git add supabase/functions/moderation.sql
git commit -m "Batch 05: add SET search_path to all SECURITY DEFINER functions in moderation.sql"
```

---

## WHEN DONE — report

- Count of functions updated, verification output (must show 0).

Stop. Do not start Batch 06.
