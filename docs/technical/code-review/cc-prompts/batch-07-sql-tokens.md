# Code Review Fix — Batch 07: SQL search_path — tokens.sql

**Layer:** 1A (SQL foundation)
**Dependency:** Batch 06 must be committed before this runs.

---


## SETUP

The repo is already cloned at `/home/claude/colosseum`. Work from there.
Do NOT attempt to push to GitHub — you do not have a valid token.


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

## DELIVERY

Do NOT commit or push. Instead:
1. Copy every patched file to `/mnt/user-data/outputs/` preserving the filename.
2. Use `present_files` to hand them to me.
3. I will upload them to GitHub manually.


---

## WHEN DONE — report

- Count of functions updated, verification output.

Stop. Do not start Batch 08.
