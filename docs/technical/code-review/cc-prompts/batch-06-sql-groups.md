# Code Review Fix — Batch 06: SQL search_path — groups.sql

**Layer:** 1A (SQL foundation)
**Dependency:** Batch 05 must be committed before this runs.

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
2. Confirm Batch 05 committed: `git log --oneline -3`.
3. This batch touches `supabase/functions/groups.sql` ONLY.

---

## CONTEXT

`groups.sql` contains 16 SECURITY DEFINER functions: group creation, membership
management, group vs group challenges, auditions, banner uploads.

---

## THE FIX PATTERN

```sql
SECURITY DEFINER
SET search_path = public, pg_catalog  -- ADD THIS LINE
AS $$
```

---

## EXECUTION

1. Read `supabase/functions/groups.sql` (verify line count first).
2. Add `SET search_path = public, pg_catalog` to every SECURITY DEFINER function.
3. Do NOT change logic, parameters, or return types.

---

## VERIFICATION

```bash
python3 -c "
import re
content = open('supabase/functions/groups.sql').read()
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

Stop. Do not start Batch 07.
