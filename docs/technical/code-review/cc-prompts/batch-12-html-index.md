# Code Review Fix — Batch 12: HTML — index.html OG tags

**Layer:** 2B (HTML delivery — requires Batch 01 JSON and Batch 10 TypeScript
complete first, because TS fixes may touch files whose inline scripts are
hashed in vercel.json CSP)
**Guide reference:** Colosseum-HTML-Review-Checklist.docx, Section 5

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

Every file you read must follow this exact sequence. No exceptions.

  Step 1: run `wc -l <filename>` and note the total.
  Step 2: read the file.
  Step 3: confirm "Read [N] lines of [total] total."

If N ≠ total: stop, re-read. Do not proceed on a partial read.

---

## BEFORE STARTING

1. Read `docs/technical/AUDIT-FINDINGS.md`.
2. Confirm Batch 10 (TypeScript) is committed: `git log --oneline -5`.
3. This batch touches `index.html` ONLY.
   `index.html` is 62kb — it is the largest HTML file and must be its own batch.

---

## CONTEXT

OG (Open Graph) meta tags control how links appear when shared on Bluesky,
Discord, Twitter/X, and messaging apps. Without them, shared links show
a blank preview. For a debate platform where viral sharing is a growth driver,
this is a material gap.

`index.html` is the main entry point — it is the page that lands when someone
shares `https://themoderator.app`. It currently has no OG tags.

---

## FIX: Add OG meta tags to index.html

**Read `index.html` first (verify line count).**

Find the `<head>` section. After the existing `<meta charset>` and
`<meta name="viewport">` tags, add:

```html
<!-- Open Graph / Social sharing -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://themoderator.app/" />
<meta property="og:title" content="The Moderator — Live Audio Debate Platform" />
<meta property="og:description" content="Post hot takes, challenge rivals, and debate live. Four modes: Live Audio, Voice Memo, Text Battle, AI Sparring." />
<meta property="og:image" content="https://themoderator.app/og-card-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="The Moderator" />

<!-- Twitter/X card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://themoderator.app/" />
<meta name="twitter:title" content="The Moderator — Live Audio Debate Platform" />
<meta name="twitter:description" content="Post hot takes, challenge rivals, and debate live. Four modes: Live Audio, Voice Memo, Text Battle, AI Sparring." />
<meta name="twitter:image" content="https://themoderator.app/og-card-default.png" />
```

**Placement rules:**
- Must be inside `<head>` before the closing `</head>` tag
- Must be after `<meta charset>` and `<meta name="viewport">`
- Must be before any `<script>` tags

**Do NOT change:**
- Any existing `<meta>` tags
- Any `<script>` tags or their content (changing inline scripts invalidates CSP hashes)
- Any `<link>` tags
- Any structural HTML outside the new OG block

---

## VERIFICATION

After editing:

```bash
# Confirm OG tags are present:
grep -c 'og:title\|og:description\|og:image\|twitter:card' index.html
# Expected: 8 or more (one per tag added)

# Confirm no inline scripts were touched (line count delta should be ~16):
wc -l index.html
# Original was 689 lines — should now be ~705 lines
```

---

## COMMIT

```bash
git add index.html
git commit -m "Batch 12: add OG and Twitter card meta tags to index.html"
```

---

## WHEN DONE — report

- Exact line where OG block was inserted
- Line count before and after
- grep verification output

Stop. Do not start Batch 13.
