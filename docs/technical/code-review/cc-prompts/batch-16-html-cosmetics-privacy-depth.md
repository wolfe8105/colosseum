# Code Review Fix — Batch 16: HTML — cosmetics, privacy, profile-depth OG tags

**Layer:** 2B (HTML delivery)
**Dependency:** Batch 15 must be committed before this runs.

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
2. Confirm Batch 15 committed: `git log --oneline -3`.
3. This batch touches three files:
   - `moderator-cosmetics.html`
   - `moderator-privacy.html`
   - `moderator-profile-depth.html`
4. Do NOT touch any `<script>` tags or their content.

---

## FIX 1: moderator-cosmetics.html — add OG tags

**Read `moderator-cosmetics.html` first (verify line count).**

After `<meta charset>` and `<meta name="viewport">`, add:

```html
<!-- Open Graph / Social sharing -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://themoderator.app/moderator-cosmetics.html" />
<meta property="og:title" content="Cosmetics — The Moderator" />
<meta property="og:description" content="Customize your debater profile with badges, icons, and unlockable cosmetics earned through debate performance." />
<meta property="og:image" content="https://themoderator.app/og-card-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="The Moderator" />

<!-- Twitter/X card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://themoderator.app/moderator-cosmetics.html" />
<meta name="twitter:title" content="Cosmetics — The Moderator" />
<meta name="twitter:description" content="Customize your debater profile with badges, icons, and unlockable cosmetics earned through debate performance." />
<meta name="twitter:image" content="https://themoderator.app/og-card-default.png" />
```

---

## FIX 2: moderator-privacy.html — add OG tags

**Read `moderator-privacy.html` first (verify line count).**

After `<meta charset>` and `<meta name="viewport">`, add:

```html
<!-- Open Graph / Social sharing -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://themoderator.app/moderator-privacy.html" />
<meta property="og:title" content="Privacy Policy — The Moderator" />
<meta property="og:description" content="Privacy policy for The Moderator live audio debate platform." />
<meta property="og:image" content="https://themoderator.app/og-card-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="The Moderator" />

<!-- Twitter/X card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://themoderator.app/moderator-privacy.html" />
<meta name="twitter:title" content="Privacy Policy — The Moderator" />
<meta name="twitter:description" content="Privacy policy for The Moderator live audio debate platform." />
<meta name="twitter:image" content="https://themoderator.app/og-card-default.png" />
```

---

## FIX 3: moderator-profile-depth.html — add OG tags

**Read `moderator-profile-depth.html` first (verify line count).**

After `<meta charset>` and `<meta name="viewport">`, add:

```html
<!-- Open Graph / Social sharing -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://themoderator.app/moderator-profile-depth.html" />
<meta property="og:title" content="Profile Depth — The Moderator" />
<meta property="og:description" content="Explore your debate history, stats, followers, and rivals on The Moderator." />
<meta property="og:image" content="https://themoderator.app/og-card-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="The Moderator" />

<!-- Twitter/X card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://themoderator.app/moderator-profile-depth.html" />
<meta name="twitter:title" content="Profile Depth — The Moderator" />
<meta name="twitter:description" content="Explore your debate history, stats, followers, and rivals on The Moderator." />
<meta name="twitter:image" content="https://themoderator.app/og-card-default.png" />
```

---

## VERIFICATION

```bash
grep -c 'og:title\|og:description\|og:image\|twitter:card' \
  moderator-cosmetics.html moderator-privacy.html moderator-profile-depth.html
```

---

## COMMIT

```bash
git add moderator-cosmetics.html moderator-privacy.html moderator-profile-depth.html
git commit -m "Batch 16: add OG and Twitter card meta tags to cosmetics, privacy, profile-depth pages"
```

---

## WHEN DONE — report

- Line counts before and after for each file
- grep verification output

Stop. Do not start Batch 17.
