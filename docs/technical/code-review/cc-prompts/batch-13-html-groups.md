# Code Review Fix — Batch 13: HTML — moderator-groups.html OG tags

**Layer:** 2B (HTML delivery)
**Dependency:** Batch 12 must be committed before this runs.

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
2. Confirm Batch 12 committed: `git log --oneline -3`.
3. This batch touches `moderator-groups.html` ONLY.
   At 43kb it must be its own batch.

---

## CONTEXT

The groups page (`/moderator-groups.html`) is a high-traffic social surface —
users share group links to recruit members. Without OG tags, shared links
show blank previews.

---

## FIX: Add OG meta tags to moderator-groups.html

**Read `moderator-groups.html` first (verify line count).**

Find the `<head>` section. After `<meta charset>` and `<meta name="viewport">`,
add:

```html
<!-- Open Graph / Social sharing -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://themoderator.app/moderator-groups.html" />
<meta property="og:title" content="Groups — The Moderator" />
<meta property="og:description" content="Join debate groups, compete in group vs group challenges, and climb the leaderboard together." />
<meta property="og:image" content="https://themoderator.app/og-card-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="The Moderator" />

<!-- Twitter/X card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://themoderator.app/moderator-groups.html" />
<meta name="twitter:title" content="Groups — The Moderator" />
<meta name="twitter:description" content="Join debate groups, compete in group vs group challenges, and climb the leaderboard together." />
<meta name="twitter:image" content="https://themoderator.app/og-card-default.png" />
```

**Do NOT touch any `<script>` tags or their content.**

---

## VERIFICATION

```bash
grep -c 'og:title\|og:description\|og:image\|twitter:card' moderator-groups.html
# Expected: 8 or more
```

---

## COMMIT

```bash
git add moderator-groups.html
git commit -m "Batch 13: add OG and Twitter card meta tags to moderator-groups.html"
```

---

## WHEN DONE — report

- Line count before and after
- grep verification output

Stop. Do not start Batch 14.
