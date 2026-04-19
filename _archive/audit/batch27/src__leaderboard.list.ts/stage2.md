# Stage 2 Outputs — leaderboard.list.ts

## Agent 01

### renderShimmer
This synchronous function takes no parameters. It initializes an empty string `rows`. It loops 6 times (i = 0..5), on each iteration appending a template literal HTML block to `rows`. Each block is a flex div row containing: a shimmer rank placeholder (28×20px), a shimmer avatar circle (36×36px), a flex column with two shimmer bars (widths varying by `i`: `55+i*5`% and `35+i*3`%`), and a shimmer stat placeholder (44×20px). All widths use CSS variable `var(--mod-border-subtle)` for borders. Returns the `rows` string after the loop.

### renderList
This synchronous function takes no parameters. It reads `liveData` and `isLoading` from module-level state. If `liveData === null && !isLoading`, it returns an error div string ("Couldn't load rankings..."). It calls `getData()` to get the data array. It creates a shallow copy of that array via `[...data]` and sorts it in-place: `elo` tab sorts descending by `b.elo - a.elo`, `wins` by `b.wins - a.wins`, `streak` by `b.streak - a.streak`, default returns 0. After sorting, it calls `sorted.forEach((item, i) => { item.rank = i + 1; })` — this mutates the rank field on each object (LANDMINE comment in source acknowledges this: objects inside are shared refs, not deep copies). It maps sorted entries to HTML strings. Each entry computes: `stat` (elo/wins/streak per `currentTab`), `statLabel` string, `medalColors` (hardcoded hex for silver/bronze, CSS var for gold), `rankColor` (from medalColors or fallback hex `#6a7a90`), `tierBorderMap` (mix of CSS vars and one hardcoded hex for 'contender'), `tierBorder`. It calls `escHtml(p.username ?? '')` for `safeUsername` and uses `escHtml` on `p.user` (username display) and `p.user[0]` (avatar initial). It calls `vgBadge(p.verified_gladiator)` and `bountyDot(p.id)` inline in the HTML template. Row background is conditionally gold-tinted for top 3. Stat value and stat label use `Number(stat) || 0` cast. Win/loss/level display also uses `Number()` casts. Appends a "LOAD MORE" button if `hasMore` is true. Returns the joined HTML string.

## Agent 02

### renderShimmer
No parameters. Builds a 6-row shimmer string by looping. Each row has flex layout with shimmer rank (28×20), shimmer avatar (36×36), two shimmer text bars with widths varying by loop index, and shimmer stat box. Returns concatenated HTML string.

### renderList
No parameters. Reads `liveData` and `isLoading` — returns error div string if null + not loading. Calls `getData()`, shallow-copies with spread, sorts by `currentTab` (elo/wins/streak descending). Mutates each sorted item's `.rank` field via forEach (acknowledged by LANDMINE comment — shared object reference mutation). Maps each entry to HTML row with: medal emoji for top 3, rank number otherwise; avatar initial (p.user[0]) and full display name (p.user) both escaped via `escHtml`; tier border from `tierBorderMap` with one hardcoded hex (`#2a5aab` for contender); `vgBadge` and `bountyDot` calls injected inline; stat display uses `Number(stat) || 0`. Level/W/L row uses `Number()` casts. Conditionally appends LOAD MORE button if `hasMore`. Returns string.

## Agent 03

### renderShimmer
Iterates 0-5, builds shimmer row HTML per iteration with width values interpolating loop index `i`. Returns joined string.

### renderList
Reads `liveData` and `isLoading`. Returns error message if `liveData === null && !isLoading`. Calls `getData()`, creates `[...data]` shallow copy, sorts by currentTab. Mutates `.rank` on each item to `i + 1` via forEach — source comment (LANDMINE LM-LB-001) explicitly notes this mutation happens on shared object references. Maps sorted to HTML: computes stat/statLabel, medal colors (hardcoded hex for silver/bronze — LANDMINE LM-LB-003 comment), rank color with fallback hex. Tier border map mixes CSS vars and one hardcoded hex. Escapes username and initial via `escHtml`. Calls `vgBadge` and `bountyDot` inline. Numeric fields use `Number()`. Appends LOAD MORE if `hasMore`. Returns string.

## Agent 04

### renderShimmer
Pure function, no side effects. Builds 6 shimmer row HTML strings with index-varied widths. Returns combined string.

### renderList
Reads `liveData`, `isLoading`, `currentTab`, `hasMore` from module state. Early return error string if `liveData === null && !isLoading`. Calls `getData()`. Shallow copies array (`[...data]`). Sorts copy by tab. Mutates each item's `.rank` = `i + 1` (source has LANDMINE comment). For each row: stat value (elo/wins/streak), stat label, medal color object with hardcoded hex `#a8a8a8` (silver) and `#b87333` (bronze) alongside CSS var for gold. Rank color fallback `#6a7a90` also hardcoded. Tier border map: contender uses hardcoded `#2a5aab`. Username and avatar initial escaped. `vgBadge` and `bountyDot` called inline (unescaped return values trusted). Stat and W/L/level values use `Number()`. Optional LOAD MORE button appended. Returns HTML string.

## Agent 05

### renderShimmer
Loops 6 times building flex-row shimmer HTML. Width values vary with `i`. Returns accumulated string. No state reads.

### renderList
Checks `liveData === null && !isLoading` — returns error string if true. Calls `getData()`, spreads into `sorted` (shallow copy of array, objects are still shared references). Sorts `sorted` in-place by currentTab. Calls `sorted.forEach` assigning `item.rank = i + 1` — mutates the object references from `getData()` / `liveData` / PLACEHOLDER_DATA. Maps to HTML string per entry: stat, statLabel, medalColors (hardcoded hex #a8a8a8 silver, #b87333 bronze, CSS var gold), rankColor fallback #6a7a90 (hardcoded), tierBorderMap (hardcoded #2a5aab for contender, rest CSS vars). `safeUsername = escHtml(p.username ?? '')` used in `data-username` attribute. `escHtml(p.user[0])` for avatar initial, `escHtml(p.user)` for display name. `vgBadge(p.verified_gladiator)` and `bountyDot(p.id)` injected raw into innerHTML. Win/loss/level with `Number()`. Stat with `Number(stat) || 0`. LOAD MORE button appended if `hasMore`. Returns string.
