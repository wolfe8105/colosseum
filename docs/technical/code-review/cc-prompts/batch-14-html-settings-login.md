# Code Review Fix — Batch 14: HTML — moderator-settings.html + moderator-login.html OG tags

**Layer:** 2B (HTML delivery)
**Dependency:** Batch 13 must be committed before this runs.

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
2. Confirm Batch 13 committed: `git log --oneline -3`.
3. This batch touches `moderator-settings.html` and `moderator-login.html` ONLY.
4. Do NOT touch any `<script>` tags or their content in either file.

---

## FIX 1: moderator-settings.html — add OG tags

**Read `moderator-settings.html` first (verify line count).**

After `<meta charset>` and `<meta name="viewport">`, add:

```html
<!-- Open Graph / Social sharing -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://themoderator.app/moderator-settings.html" />
<meta property="og:title" content="Settings — The Moderator" />
<meta property="og:description" content="Manage your profile, notifications, privacy, and debate preferences on The Moderator." />
<meta property="og:image" content="https://themoderator.app/og-card-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="The Moderator" />

<!-- Twitter/X card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://themoderator.app/moderator-settings.html" />
<meta name="twitter:title" content="Settings — The Moderator" />
<meta name="twitter:description" content="Manage your profile, notifications, privacy, and debate preferences on The Moderator." />
<meta name="twitter:image" content="https://themoderator.app/og-card-default.png" />
```

---

## FIX 2: moderator-login.html — add OG tags

**Read `moderator-login.html` first (verify line count).**

After `<meta charset>` and `<meta name="viewport">`, add:

```html
<!-- Open Graph / Social sharing -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://themoderator.app/moderator-login.html" />
<meta property="og:title" content="Join The Moderator — Live Audio Debate Platform" />
<meta property="og:description" content="Sign in to post hot takes, challenge rivals, and debate live. Four modes: Live Audio, Voice Memo, Text Battle, AI Sparring." />
<meta property="og:image" content="https://themoderator.app/og-card-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="The Moderator" />

<!-- Twitter/X card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://themoderator.app/moderator-login.html" />
<meta name="twitter:title" content="Join The Moderator — Live Audio Debate Platform" />
<meta name="twitter:description" content="Sign in to post hot takes, challenge rivals, and debate live. Four modes: Live Audio, Voice Memo, Text Battle, AI Sparring." />
<meta name="twitter:image" content="https://themoderator.app/og-card-default.png" />
```

---

## VERIFICATION

```bash
grep -c 'og:title\|og:description\|og:image\|twitter:card' moderator-settings.html moderator-login.html
# Expected: 8 or more for each file
```

---

## COMMIT

```bash
git add moderator-settings.html moderator-login.html
git commit -m "Batch 14: add OG and Twitter card meta tags to settings and login pages"
```

---

## WHEN DONE — report

- Line counts before and after for each file
- grep verification output for each file

Stop. Do not start Batch 15.
