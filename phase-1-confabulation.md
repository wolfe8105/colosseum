# Phase 1 — Confabulation Report

**Audit reference tag:** `pre-10-prompts-audit` → commit `5a23e9d`
**Audit date:** 2026-04-16
**Auditor:** Claude Sonnet 4.6 (fresh session, no prior phase context)
**Scope:** All npm dependencies declared in `package.json`, all TypeScript/JS source files, all HTML pages, all serverless API handlers in `api/`

---

## Methodology

All checks were run directly. No results were inferred or assumed. Where a check could not be executed, it is documented as such.

---

## Section 1 — Unresolvable Packages

**Command run:** `npm install --dry-run --no-save`
**Output:** `added 38 packages, removed 69 packages, and changed 1 package in 346ms`

All 7 declared packages resolved without error:

| Package | Declared version | Resolved version |
|---|---|---|
| `@supabase/supabase-js` | `^2.98.0` | `2.101.1` |
| `dependency-cruiser` | `^17.3.10` | `17.3.10` |
| `dotenv` | `^16.4.0` | `17.4.2` |
| `jsdom` | `^29.0.1` | `29.0.2` |
| `typescript` | `^5.7.0` | `6.0.3` |
| `vite` | `^6.2.0` | `8.0.8` |
| `vitest` | `^3.0.0` | `4.1.4` |

**Finding:** No unresolvable packages. However, three packages resolved to major versions ahead of what is declared. `typescript ^5.7.0` resolved to `6.0.3` (major bump). `vite ^6.2.0` resolved to `8.0.8` (two major bumps). `vitest ^3.0.0` resolved to `4.1.4` (one major bump). npm's semver allows `^` to cross major versions only from `0.x` — these resolutions are anomalous. This suggests the lockfile was generated with permissive resolution or the registry data is unusual. Severity: LOW (no broken installs, but major-version drift creates API compatibility risk).

**NOTE:** Weekly download counts could not be retrieved. `curl` to `api.npmjs.org` failed in this environment. Download count verification (criterion 2b of the prompt) was not completed.

---

## Section 2 — Suspicious Packages

**Command run:** `npm view <package> time.created` for each of the 7 declared packages.

All 7 packages predate the 90-day window:

| Package | Created |
|---|---|
| `@supabase/supabase-js` | 2020-01-17 |
| `dependency-cruiser` | 2016-11-20 |
| `dotenv` | 2013-07-05 |
| `jsdom` | 2011-11-21 |
| `typescript` | 2012-10-01 |
| `vite` | 2020-04-21 |
| `vitest` | 2021-12-03 |

**Criterion 2c (conflation names):** None of the 7 package names match the pattern of combining two real package names.

**Criterion 2d (hyphenated variant of popular underscore-named package):** None found.

**npm audit finding:** `npm audit` returned 1 high-severity vulnerability in `vite`:
- `GHSA-4w7w-66w2-5vf9`: Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling
- `GHSA-p9ff-h696-f583`: Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket
- Command output: `1 high severity vulnerability — fix available via npm audit fix`
- These vulnerabilities affect the Vite dev server. They do not affect the production bundle. Severity in context: MEDIUM (dev-only, but any developer running `vite` dev server is exposed).

**Download count status:** UNVERIFIED — could not reach `api.npmjs.org` from this environment.

---

## Section 3 — Undefined Symbols (grouped by file)

**Command run:** `npx tsc --noEmit`
**Output:** (empty — exit 0)

**CRITICAL FINDING: The `tsc --noEmit` check is a no-op for the main codebase.**

`tsconfig.json` `include` array contains only:
```json
"include": [
  "*.ts",
  "*.d.ts",
  "lib/**/*.ts"
]
```

This covers TypeScript files at the repo root and the `lib/` directory. It does NOT include:
- `src/**/*.ts` (329 source modules)
- `src/arena/**/*.ts` (107 arena sub-modules)
- `src/pages/**/*.ts` (88 page sub-modules)
- `api/**/*.js` (9 serverless handlers)

**Consequence:** Gate 1 of the 3-Gate Verification ("npm run typecheck") documented in `CLAUDE.md` passes with zero errors regardless of the state of the actual codebase. The type checker is not checking any of the source files that constitute the application. Every Phase 1 finding from this point forward about type safety is operating without TypeScript validation as a backstop.

**Undefined symbols that could not be caught by tsc:**
All source files in `src/` are outside the TypeScript compiler's include scope. Undefined symbol errors in the main codebase would not surface in `tsc --noEmit`. This is a structural verification gap, not a confabulation finding — but it is the reason confabulated symbols can survive in this codebase undetected.

---

## Section 4 — Invalid API Calls

### 4a. `supabase.auth.getSession()` — Used in 4 files (RULE VIOLATION)

**Command run:** `grep -rn "auth\.getSession\(\)" src/`

**Output:**
```
src/arena/arena-deepgram.token.ts:15:    const { data } = await supabase.auth.getSession();
src/arena/arena-feed-realtime.ts:42:  const { data: sessionData } = await (client as any).auth.getSession();
src/arena/arena-room-ai-response.ts:62:    const { data } = await client.auth.getSession();
src/webrtc.ice.ts:16:    const { data } = await supabase.auth.getSession();
```

`CLAUDE.md` states: "**`onAuthStateChange INITIAL_SESSION`** is the sole init path. Never use `getSession()` directly."

`getSession()` is a real method in `@supabase/supabase-js` (API signature is valid — this is not a confabulation). The violation is architectural: the method exists but its use violates the project's security invariant. It is documented here because one instance uses `(client as any)` which bypasses TypeScript typing — a pattern that obscures whether the caller knows this is an unsupported path.

**Classification:** API usage violating project constraints. Not a hallucinated method, but the `as any` cast in `arena-feed-realtime.ts:42` is a confabulation-masking pattern — it silences type errors and may conceal an incorrect call signature.

### 4b. Claude model ID `claude-sonnet-4-20250514` — potentially deprecated

**Location:** `api/go-respond.js:17`
**Command run:** `grep -n "MODEL\|claude-sonnet" api/go-respond.js`
**Output:** `const MODEL = 'claude-sonnet-4-20250514';`

The Anthropic API currently uses a new model ID naming convention (`claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`). The ID `claude-sonnet-4-20250514` follows the old date-based convention. This model was the initial release of Claude Sonnet 4 in May 2025 and is now superseded.

**Status:** Cannot verify via runtime test whether the Anthropic API still accepts this model ID. If Anthropic has retired it, this API call returns a `404 model_not_found` error at runtime. **This is an API drift finding** — the symbol was real when written, but model IDs can be retired. The `api/go-respond.js` file is a production serverless function; if the model is retired, the AI debate feature silently breaks.

**Classification:** Confabulation risk — API signature drift. Severity: HIGH if model is retired; MEDIUM if still alias-routed.

### 4c. `/src/app-config.ts` — referenced in vite.config.ts, does not exist

**Command run:**
```
grep "app-config" vite.config.ts
ls src/app-config* → NOT FOUND
grep -rn "app-config" src/ → no results
```

`vite.config.ts` line 37 lists `'/src/app-config.ts'` as a shared chunk candidate:
```js
const shared = ['/src/auth.ts', '/src/config.ts', '/src/tokens.ts', '/src/analytics.ts', '/src/nudge.ts', '/src/navigation.ts', '/src/app-config.ts'];
```

The file does not exist. No source file imports from it. The `manualChunks` function only triggers when a module is actually imported, so this ghost reference does not cause a build failure. However, it indicates a deleted or planned-but-never-created module that was not cleaned up from the build config.

**Classification:** Ghost reference / invented symbol in config. Severity: LOW (no runtime impact, but indicates stale config).

---

## Section 5 — Invalid CLI/Config References

**Command run:** `find . -name "Dockerfile" -o -name "*.sh"` → no results (no shell scripts, no Dockerfiles in the repo root or src/).

**Environment variable references found:**
`grep -rn "process\.env\." api/` and `grep -rn "import\.meta\.env\." src/config.ts`

| Variable | Location | Status |
|---|---|---|
| `SUPABASE_URL` | `api/profile.js:23`, `api/challenge.js:23`, `api/invite.js:13` | Standard Supabase env var — valid |
| `SUPABASE_ANON_KEY` | `api/profile.js:24`, `api/challenge.js:24` | Standard Supabase env var — valid |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/invite.js:14` | Standard Supabase env var — valid |
| `BASE_URL` | `api/profile.html.js:11`, `api/profile.js:25` | Standard env var — valid |
| `ANTHROPIC_API_KEY` | `api/go-respond.js:83` | Standard Anthropic env var — valid |
| `VITE_SUPABASE_URL` | `src/config.ts:56` | Standard Vite env var — valid |
| `VITE_SUPABASE_ANON_KEY` | `src/config.ts:57` | Standard Vite env var — valid |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `src/config.ts:59` | Standard Vite env var — valid |

All environment variable names are standard and match their respective services' documented naming conventions. No invented config keys found.

**`anthropic-version` header:** `api/go-respond.js` sends `'anthropic-version': '2023-06-01'`. This is the documented Anthropic Messages API version header and is still current as of the audit date. Valid.

---

## Section 6 — Ecosystem Confusion Candidates

**Command run:** `grep -rn "from '@\|from \"@\|from 'https\|from \"https" src/`

All external imports in `src/` are from `@supabase/supabase-js` only. No other npm packages are imported in the frontend TypeScript source.

**Python-to-npm confusion check:** The 7 declared package names were compared against known Python package names. None of the declared packages (`@supabase/supabase-js`, `dependency-cruiser`, `dotenv`, `jsdom`, `typescript`, `vite`, `vitest`) are Python package names.

**Reverse check (npm packages used as Python imports):** Not applicable — the codebase is TypeScript-only with no Python files.

**CDN scripts:** Two HTML pages load Supabase from CDN:
- `moderator-challenge.html:29`: `cdn.jsdelivr.net/npm/@supabase/supabase-js@2.101.1`
- `moderator-source-report.html:443`: `cdn.jsdelivr.net/npm/@supabase/supabase-js@2.101.1`

Both include `integrity="sha384-twhroNxtNM6hcaxZmvhUjI6o++BofLKrqnQUwkHK9NiXpq/WqaBWISkN0uvB6Bc7"` SRI hash. The package name and hash are real. No ecosystem confusion.

**No ecosystem confusion found.**

---

## Additional Findings Not In Original Prompt Scope

These findings emerged from executing the mandated checks and are included because they bear directly on confabulation risk.

### A. Supabase version documented incorrectly in CLAUDE.md

**Command run:** `grep "supabase" package-lock.json | head -20`

`package.json` declares `"@supabase/supabase-js": "^2.98.0"`.
`package-lock.json` resolves to `2.101.1`.
`moderator-challenge.html` and `moderator-source-report.html` load `@2.101.1` from CDN.

`CLAUDE.md` states: `"SRI hashes pin supabase-js to @2.98.0 — must regenerate hashes when upgrading."`

This is a stale claim. The installed version, the lockfile version, and the CDN version all agree at `2.101.1`. The CLAUDE.md documentation is wrong. Any Claude instance reading CLAUDE.md would generate code referencing `@2.98.0` when the live version is `@2.101.1`, producing a confabulation in downstream work.

**Classification:** Stale documentation producing confabulation risk. Severity: MEDIUM.

### B. `moderator-challenge.html` excluded from Vite build

**Command run:** Compared `vite.config.ts` `htmlEntries` against `ls *.html`

`moderator-challenge.html` exists at the repo root but is NOT in Vite's `htmlEntries`. It is a standalone page that self-loads Supabase from CDN. This is intentional (the challenge page is its own standalone flow), but it means:
1. `moderator-challenge.html` does not go through Vite bundling or optimization
2. It uses inline `<script>` (not `<script type="module">`) with CDN Supabase — no tree-shaking, no TypeScript checks, no `escapeHTML()` enforced by the build pipeline

This is not a confabulation finding but is a verification gap relevant to Phase 5 and Phase 7.

---

## Summary Table

| Check | Command Run | Result |
|---|---|---|
| npm dry-run install | `npm install --dry-run --no-save` | PASS — all packages resolve |
| Package age (>90 days) | `npm view <pkg> time.created` | PASS — all packages well-established |
| Package download count | `curl api.npmjs.org/downloads/...` | **COULD NOT RUN** — network unavailable |
| npm audit (CVE scan) | `npm audit` | **1 HIGH** — Vite dev server vulnerabilities |
| TypeScript undefined symbols | `npx tsc --noEmit` | PASS (but **tsconfig excludes src/** — check is invalid) |
| External imports | `grep -rn "from '@..."` | All from `@supabase/supabase-js` only — valid |
| `auth.getSession()` usage | `grep -rn "auth.getSession()"` | **4 violations** of project auth invariant |
| Claude model ID | `grep "MODEL" api/go-respond.js` | **`claude-sonnet-4-20250514`** — potentially deprecated |
| app-config.ts | `ls src/app-config*` | **Ghost reference** in vite.config — file absent |
| CLI flags in scripts | `find . -name "*.sh" -o -name "Dockerfile"` | No shell scripts or Dockerfiles |
| Env var names | `grep process.env / import.meta.env` | All standard, none confabulated |
| Ecosystem confusion | Cross-ref npm/Python names | None found |
| CLAUDE.md version claim | Lockfile vs CLAUDE.md | **Stale: CLAUDE.md says @2.98.0, actual is @2.101.1** |

---

## Severity Summary

| Finding | Severity | Category |
|---|---|---|
| `tsconfig.json` excludes `src/` — Gate 1 check is invalid | HIGH | Verification gap enabling confabulation to survive |
| `claude-sonnet-4-20250514` model ID may be deprecated | HIGH (if retired) / MEDIUM | API signature drift |
| 1 high-severity Vite CVE (GHSA-4w7w-66w2-5vf9, GHSA-p9ff-h696-f583) | MEDIUM | Dependency vulnerability (dev server only) |
| CLAUDE.md claims `@supabase/supabase-js@2.98.0` pinned — actual is `2.101.1` | MEDIUM | Stale documentation → confabulation risk for future Claude instances |
| `auth.getSession()` called in 4 files (one with `as any` cast) | MEDIUM | API invariant violation; `as any` masks potential confabulation |
| `/src/app-config.ts` ghost reference in `vite.config.ts` | LOW | Stale config reference |
| Major-version drift on typescript (5→6), vite (6→8), vitest (3→4) | LOW | Semver anomaly |
| Download count verification | NOT COMPLETED | Network unavailable |

---

*Phase 1 complete. Do not proceed to Phase 2 without user review.*
