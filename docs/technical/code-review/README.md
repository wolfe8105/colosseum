# Code Review Guides — colosseum / themoderator.app

Seven Word documents covering every active file type in the repo.
All findings are based on actual file reads — every verdict maps to a specific file and line number.

## How to use these
added this to prove i can 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
**Start here:** `Colosseum-Master-Review-Guide.docx`
This is the sequenced execution plan. It tells you which order to work the individual guides and which items can be parallelized. Do not skip to an individual guide without reading the master first — the fixes have a dependency order that matters.

## The documents

| Document | Scope | Key finding |
|---|---|---|
| **Colosseum-Master-Review-Guide.docx** | All five file types, sequenced | Start here |
| **Colosseum-JSON-Review-Checklist.docx** | 6 JSON files | Vite HIGH CVE — fix available |
| **Colosseum-SQL-Review-Checklist.docx** | 39 SQL files | 186 SECURITY DEFINER missing search_path |
| **Colosseum-TS-Review-Checklist.docx** | 336 TypeScript files | 2 FIX any casts, void async calls mapped |
| **Colosseum-JS-Review-Checklist.docx** | 11 JavaScript files | JWT structure-only verification in go-respond.js |
| **Colosseum-HTML-Review-Checklist.docx** | 15 HTML files | All security headers live in vercel.json only |
| **TypeScript-File-Quality-HowTo-Guide.docx** | TypeScript patterns | How-to reference for TS quality patterns |

## The fix order

```
Layer 0 — JSON   (do first — unblocks everything)
    └─ npm audit fix (vite CVE)
    └─ confirm npm ci in Vercel

Layer 1 — SQL + TypeScript  (run in parallel)
    ├─ SQL: 186 SECURITY DEFINER + search_path
    ├─ SQL: USING(true) audit
    └─ TS: home.feed.ts + home.depth.ts any casts

Layer 2 — JS + HTML  (run in parallel, after Layer 1)
    ├─ JS: JWT verify in go-respond.js
    ├─ JS: remove SUPABASE_URL hardcoded fallbacks
    └─ HTML: CSP hash audit (after TS fixes land)
```

Generated: April 2026
