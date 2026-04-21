# Stage 2 Outputs — reference-arsenal.render.ts

## Agent 01

### rarityCardStyle
Takes `rarity: Rarity`. If rarity is `'mythic'`, returns a CSS string with `border:1.5px solid` using `RARITY_COLORS.mythic` and a red tint background. Otherwise returns a CSS string with `border-left:3px solid` using `RARITY_COLORS[rarity]` and subtle borders on the other three sides. Returns a string in all paths. No external state read or written. No async.

### renderSocketDots
Takes `ref: ArsenalReference`. Reads `RARITY_SOCKET_COUNT[ref.rarity] ?? 1` to get `total`. Reads `ref.sockets` (defaults to empty array) and builds a Map from `socket_index` to `effect_id`. Iterates `total` times: for each index, looks up the effect_id in the map. If found, produces a filled dot span with `title="${escapeHTML(eid)}"`. If not found, produces an empty dot span. Concatenates all spans into `dots` string. Returns `<div class="ref-socket-dots">${dots}</div>`. Reads `ref.rarity` and `ref.sockets`. No external state written. No async.

### renderReferenceCard
Takes `ref: ArsenalReference`, `showSecondBtn: boolean`, `showEditBtn: boolean = false`. Reads `escapeHTML` (aliased to `esc`), `SOURCE_TYPES[ref.source_type]`, `compositeScore(ref)`, and `CHALLENGE_STATUS_LABELS[ref.challenge_status]` (with `|| ''` fallback). Builds and returns a template literal HTML string for a reference card. The card includes: `data-ref-id` attribute (escaped `ref.id`); rarity CSS via `rarityCardStyle(ref.rarity)`; type label (escaped `srcInfo.label`); rarity text (not escaped — `ref.rarity.toUpperCase()`, but rarity is a controlled Rarity enum string); graduated star if `ref.graduated`; escaped claim text; escaped source title, author, date, locator; optional forger username (escaped); power display; stats row with `Number(ref.seconds)`, `Number(ref.strikes)`, `Number(score)` (cast before innerHTML); socket dots if `ref.sockets != null` via `renderSocketDots(ref)`; optional status label; optional source URL link via `sanitizeUrl(ref.source_url ?? '')`; optional Second button; optional Edit and Delete buttons. Returns the HTML string. No external state read or written beyond its parameters and imported helpers. No async.

### renderArsenal
Async. Takes `container: HTMLElement`. Calls `getCurrentUser()`. If no user, sets `container.innerHTML` to sign-in prompt and returns empty array. Sets `container.innerHTML` to loading placeholder. Awaits `safeRpc<ArsenalReference[]>('get_my_arsenal', {})`. Destructures `data` and `error`. Casts data to `ArsenalReference[]` or empty array. If error or refs is empty, sets `container.innerHTML` to empty-state div with optional "Could not load" message and a forge button, returns empty array. Sorts `refs` in-place by `current_power` descending, then by `created_at` descending (using `Date.parse`). Builds `html` string: header with arsenal title and forge button, then a grid div, then calls `renderReferenceCard(ref, false, true)` for each ref, closes grid. Sets `container.innerHTML = html`. Returns `refs`.

## Agent 02

### rarityCardStyle
Takes a `Rarity` value. If `'mythic'`, returns a CSS border string with `RARITY_COLORS.mythic` and `rgba(239,68,68,0.06)` background — the 0.06 background alpha is hardcoded, and the rgba value uses hardcoded numbers. Otherwise returns a CSS string using `RARITY_COLORS[rarity]` for border-left and subtle borders for the other three sides. No side effects. Returns string.

### renderSocketDots
Takes `ref: ArsenalReference`. Computes `total = RARITY_SOCKET_COUNT[ref.rarity] ?? 1`. Builds a `Map<number, string>` from `ref.sockets` (empty array fallback). Iterates 0..total-1; for each index, appends a span: filled with `escapeHTML(eid)` as title attribute if the socket has an effect, empty otherwise. Returns the dots wrapped in `<div class="ref-socket-dots">`. No external writes.

### renderReferenceCard
Takes `ref`, `showSecondBtn`, optional `showEditBtn`. Assembles a reference card HTML string. `ref.id`, `ref.claim_text`, `ref.source_title`, `ref.source_author`, `ref.source_date`, `ref.locator`, `ref.owner_username` are all passed through `escapeHTML`. `ref.source_url` is passed through `sanitizeUrl`. Stats fields (`ref.seconds`, `ref.strikes`, composite score) are wrapped with `Number()`. The rarity name is accessed via `ref.rarity.toUpperCase()` — not escaped, but rarity is a controlled TypeScript enum. The status label from `CHALLENGE_STATUS_LABELS` is used directly without escaping — it's a static map, low risk. `srcInfo.label` is escaped. Returns the HTML string. No external state. Not async.

### renderArsenal
Async. Checks for current user. Sets loading state. Awaits `safeRpc('get_my_arsenal', {})`. On error or empty result, shows empty-state HTML. Otherwise sorts refs by power then date, builds a grid HTML string using `renderReferenceCard` for each ref, and sets `container.innerHTML`. Returns the refs array.

## Agent 03

### rarityCardStyle
Pure function. Returns different CSS border strings depending on whether `rarity === 'mythic'`. Mythic branch returns border with rgba background. Non-mythic returns border-left only with other subtle borders. No state reads/writes beyond the parameter and `RARITY_COLORS` constant. No async.

### renderSocketDots
Pure function. Reads `ref.rarity` to get socket count, reads `ref.sockets` to build a map of filled sockets. Produces HTML string of dot spans, using `escapeHTML` on effect IDs. Returns the dot container HTML string.

### renderReferenceCard
Pure function (no async, no external state writes). Reads from `ref` fields, `SOURCE_TYPES`, `RARITY_COLORS`, `CHALLENGE_STATUS_LABELS`. Applies `escapeHTML` to user-derived fields: `ref.id`, `ref.claim_text`, `ref.source_title`, `ref.source_author`, `ref.source_date`, `ref.locator`, `ref.owner_username` (when present). Applies `sanitizeUrl` to `ref.source_url`. Applies `Number()` to `ref.seconds`, `ref.strikes`, `score`. Calls `rarityCardStyle` and `renderSocketDots` as helpers. Returns full HTML string for one reference card.

### renderArsenal
Async. Reads current user; returns `[]` if absent after setting auth prompt in container. Sets loading placeholder. Awaits `get_my_arsenal` RPC. On error or empty data, sets empty-state HTML with forge button, returns `[]`. On success, sorts refs by `current_power` desc then `created_at` desc. Builds HTML grid string calling `renderReferenceCard(ref, false, true)` per item. Writes result to `container.innerHTML`. Returns the refs array.

## Agent 04

### rarityCardStyle
Takes `rarity`. Branches on `rarity === 'mythic'`. Returns either the mythic border style (including hardcoded rgba background) or a standard left-border style using `RARITY_COLORS[rarity]`. Pure, synchronous.

### renderSocketDots
Reads `ref.rarity` and `ref.sockets`. Creates a Map. Loops from 0 to total. For each position, emits a span with either a filled dot (title = escaped effect_id) or empty dot. Returns the wrapping div HTML. Pure, synchronous.

### renderReferenceCard
Synchronous. Constructs an HTML string for a reference card. Uses `esc` (alias for `escapeHTML`) on all user-supplied string fields. Uses `sanitizeUrl` on `source_url`. Uses `Number()` on numeric display fields. Conditionally includes socket dots, status label, source URL link, Second button, Edit button, Delete button based on parameters and ref fields. Returns the string without mutating any external state.

### renderArsenal
Async. Gets current user; bails early with error message if not authed. Sets loading state. Fetches arsenal via `safeRpc`. On error or empty, shows empty-state, returns []. Otherwise: sorts refs array in-place using sort comparator (power desc, date desc). Builds HTML string. Assigns to `container.innerHTML`. Returns refs array.

## Agent 05

### rarityCardStyle
Pure function. Two return paths: mythic returns specific border + background string; others return left-border-only string. Both use `RARITY_COLORS` from the imported constants. No side effects.

### renderSocketDots
Pure function. Reads rarity to determine socket count. Reads `ref.sockets ?? []` to populate a Map. Iterates socket count positions. Produces HTML spans — filled spans include `escapeHTML(eid)` in title attribute, empty spans have no dynamic content. Returns wrapped div string.

### renderReferenceCard
Pure synchronous function. Assembles HTML string for a reference card. All user-controlled fields (claim_text, source_title, source_author, source_date, locator, owner_username, ref.id) are passed through `escapeHTML`. source_url is passed through `sanitizeUrl`. Numeric display fields (seconds, strikes, composite score) are passed through `Number()`. Status label from CHALLENGE_STATUS_LABELS and source type label from SOURCE_TYPES are constants (not user-controlled), escaped anyway. Returns HTML string.

### renderArsenal
Async. Reads current user. Returns [] with auth message if no user. Shows loading state in container. Awaits `get_my_arsenal`. Returns [] with error/empty state on failure. Sorts refs array in place (current_power desc, created_at desc). Builds grid HTML by iterating over refs and calling `renderReferenceCard`. Writes to `container.innerHTML`. Returns refs.
