# Code Review Fix — Batch 15: HTML — moderator-terms.html + moderator-plinko.html OG tags

**Layer:** 2B (HTML delivery)
**Dependency:** Batch 14 must be committed before this runs.

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
2. Confirm Batch 14 committed: `git log --oneline -3`.
3. This batch touches `moderator-terms.html` and `moderator-plinko.html` ONLY.
4. Do NOT touch any `<script>` tags or their content.

---

## FIX 1: moderator-terms.html — add OG tags

**Read `moderator-terms.html` first (verify line count).**

After `<meta charset>` and `<meta name="viewport">`, add:

```html
<!-- Open Graph / Social sharing -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://themoderator.app/moderator-terms.html" />
<meta property="og:title" content="Terms of Service — The Moderator" />
<meta property="og:description" content="Terms of service for The Moderator live audio debate platform." />
<meta property="og:image" content="https://themoderator.app/og-card-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="The Moderator" />

<!-- Twitter/X card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://themoderator.app/moderator-terms.html" />
<meta name="twitter:title" content="Terms of Service — The Moderator" />
<meta name="twitter:description" content="Terms of service for The Moderator live audio debate platform." />
<meta name="twitter:image" content="https://themoderator.app/og-card-default.png" />
```

---

## FIX 2: moderator-plinko.html — add OG tags

**Read `moderator-plinko.html` first (verify line count).**

After `<meta charset>` and `<meta name="viewport">`, add:

```html
<!-- Open Graph / Social sharing -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://themoderator.app/moderator-plinko.html" />
<meta property="og:title" content="Join The Moderator — Sign Up" />
<meta property="og:description" content="Create your account on The Moderator and start debating. Choose your username, pick your stance, and enter the arena." />
<meta property="og:image" content="https://themoderator.app/og-card-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="The Moderator" />

<!-- Twitter/X card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://themoderator.app/moderator-plinko.html" />
<meta name="twitter:title" content="Join The Moderator — Sign Up" />
<meta name="twitter:description" content="Create your account on The Moderator and start debating. Choose your username, pick your stance, and enter the arena." />
<meta name="twitter:image" content="https://themoderator.app/og-card-default.png" />
```

---

## VERIFICATION

```bash
grep -c 'og:title\|og:description\|og:image\|twitter:card' moderator-terms.html moderator-plinko.html
```

---

## COMMIT

```bash
git add moderator-terms.html moderator-plinko.html
git commit -m "Batch 15: add OG and Twitter card meta tags to terms and plinko pages"
```

---

## WHEN DONE — report

- Line counts before and after for each file
- grep verification output

Stop. Do not start Batch 16.
