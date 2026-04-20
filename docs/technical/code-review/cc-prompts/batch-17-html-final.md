# Code Review Fix — Batch 17: HTML — Anon Key Comments + CSP Hash Audit

**Layer:** 2B (HTML — final batch, completes the entire review cycle)
**Guide reference:** Colosseum-HTML-Review-Checklist.docx, Sections 2 and 4
**Dependency:** Batch 16 must be committed. ALL previous batches (01–16) should
be committed before this runs — Batch 17 is the completion and verification batch.

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

1. Read `docs/technical/AUDIT-FINDINGS.md`.
2. Read `docs/technical/code-review/README.md`.
3. Confirm all prior batches (01–16) are committed: `git log --oneline -20`.
4. This batch touches:
   - `moderator-challenge.html` (anon key rotation comment)
   - `moderator-source-report.html` (anon key rotation comment)
   - `vercel.json` (CSP hash audit — read-only unless hashes need updating)

---

## FIX 1: moderator-challenge.html — add rotation dependency comment

**Read `moderator-challenge.html` first (verify line count).**

At line 255, there is a hardcoded Supabase anon key:
```javascript
var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

The anon key is a public key by design (Supabase architecture) — but if it
is ever rotated, this file will be missed if the rotation only updates `src/config.ts`.

Add a comment immediately before the ANON_KEY line:

```javascript
// ROTATION NOTE: This anon key must match src/config.ts SUPABASE_ANON_KEY.
// If SUPABASE_ANON_KEY is rotated in config.ts, update this file AND
// moderator-source-report.html at the same time.
// Current value verified against config.ts: [today's date]
var ANON_KEY = 'eyJ...';
```

Replace `[today's date]` with the current date in YYYY-MM-DD format.

---

## FIX 2: moderator-source-report.html — same rotation comment

**Read `moderator-source-report.html` first (verify line count).**

At line 454, same pattern. Add the same comment before the ANON_KEY line:

```javascript
// ROTATION NOTE: This anon key must match src/config.ts SUPABASE_ANON_KEY.
// If SUPABASE_ANON_KEY is rotated in config.ts, update this file AND
// moderator-challenge.html at the same time.
// Current value verified against config.ts: [today's date]
var ANON_KEY = 'eyJ...';
```

---

## AUDIT 3: CSP hash verification

**Read `vercel.json` first (verify line count).**

The vercel.json CSP `script-src` contains SHA-256 hashes for inline scripts.
Your job is to verify that every active inline `<script>` block in all 15 HTML
files is either:
(a) covered by a hash in the CSP, OR
(b) a `type="module"` script that loads an external bundle (no hash needed), OR
(c) documented as intentionally uncovered with an explanation

**Step 1: Extract the current CSP hashes:**
```bash
cat vercel.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
for rule in d.get('headers', []):
    for h in rule.get('headers', []):
        if h['key'] == 'Content-Security-Policy':
            csp = h['value']
            import re
            hashes = re.findall(r\"'sha256-[^']+'\", csp)
            print('Current CSP hashes:')
            for ha in hashes:
                print(' ', ha)
"
```

**Step 2: Find all inline script blocks across all HTML files:**
```bash
grep -rn '<script>' *.html | grep -v 'type="module"\|src=\|<script ' | head -30
```

**Step 3: For each inline script block found, verify its hash is in the CSP.**

To generate the hash for any inline script content:
```bash
# Copy the exact text between <script> and </script> into a file, then:
echo -n 'EXACT_SCRIPT_CONTENT' | openssl dgst -sha256 -binary | openssl base64
```

**If you find an inline script whose hash is NOT in vercel.json CSP:**
- Report it with: file name, line number, first 50 characters of the script
- Do NOT add the hash automatically — report it for human review
- The CSP update requires understanding whether the script is intentional

---

## FINAL VERIFICATION — completion check for all batches

Run these to confirm the overall state after all 17 batches:

```bash
# 1. Vite CVE fixed:
npm audit --audit-level=high 2>&1 | tail -3

# 2. TypeScript clean:
npm run typecheck 2>&1 | tail -5

# 3. No require() in JS files:
grep -rn 'require(' api/*.js moderator-go-app.js public/sw.js 2>/dev/null | wc -l

# 4. No hardcoded SUPABASE_URL fallbacks:
grep -rn 'process\.env.*||.*supabase\.co' api/*.js | wc -l

# 5. OG tags present on all 9 pages that were missing them:
for f in index.html moderator-cosmetics.html moderator-groups.html moderator-login.html \
          moderator-plinko.html moderator-privacy.html moderator-profile-depth.html \
          moderator-settings.html moderator-terms.html; do
  count=$(grep -c 'og:title' "$f" 2>/dev/null || echo 0)
  echo "$f: og:title count=$count"
done

# 6. search_path complete (should show 0):
python3 -c "
import re, glob
total = 0
for path in glob.glob('supabase/functions/*.sql'):
    content = open(path).read()
    blocks = re.split(r'CREATE OR REPLACE FUNCTION', content)
    for b in blocks[1:]:
        if 'SECURITY DEFINER' in b and 'search_path' not in b.split('AS \$\$')[0]:
            total += 1
print(f'FINAL: functions missing search_path = {total}')
"
```

All six checks must pass before this batch is considered complete.

---

## DELIVERY

Do NOT commit or push. Instead:
1. Copy every patched file to `/mnt/user-data/outputs/` preserving the filename.
2. Use `present_files` to hand them to me.
3. I will upload them to GitHub manually.


---

## WHEN DONE — final report

- Output of all six final verification checks
- CSP audit results: any inline scripts without a covering hash
- Any item across all 17 batches that remains incomplete and why
- Total commit count for the review cycle: `git log --oneline | grep "Batch " | wc -l`

**This is the final batch. The code review cycle is complete.**
