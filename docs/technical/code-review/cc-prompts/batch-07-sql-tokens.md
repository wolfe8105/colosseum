# Code Review Fix — Batch 07: SQL search_path — tokens.sql

**Layer:** 1A (SQL foundation)
**Dependency:** Batch 06 must be committed before this runs.

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

  Step 1: `wc -l <filename>`. Step 2: read file. Step 3: confirm line count.
  If count wrong: stop, re-read.

---

## BEFORE STARTING

1. Read `docs/technical/AUDIT-FINDINGS.md`.
2. Confirm Batch 06 committed: `git log --oneline -3`.
3. This batch touches `supabase/functions/tokens.sql` ONLY.

---

## CONTEXT

`tokens.sql` contains 11 SECURITY DEFINER functions: token economy operations
(debit_tokens, milestone rewards, streak management). These functions involve
financial state — they are among the highest-value targets for exploitation.

---

## THE FIX PATTERN

```sql
SECURITY DEFINER
SET search_path = public, pg_catalog  -- ADD THIS LINE
AS $$
```

---

## EXECUTION

1. Read `supabase/functions/tokens.sql` (verify line count first).
2. Add `SET search_path = public, pg_catalog` to every SECURITY DEFINER function.
3. Do NOT change logic, parameters, or return types.
4. tokens.sql uses `FOR UPDATE` row locking — do NOT alter the transaction patterns.

---

## VERIFICATION

```bash
python3 -c "
import re
content = open('supabase/functions/tokens.sql').read()
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
git add supabase/functions/tokens.sql
git commit -m "Batch 07: add SET search_path to all SECURITY DEFINER functions in tokens.sql"
```

---

## WHEN DONE — report

- Count of functions updated, verification output.

Stop. Do not start Batch 08.
