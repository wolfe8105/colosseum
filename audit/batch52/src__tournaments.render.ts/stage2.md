# Stage 2 Outputs — tournaments.render.ts

## Agent 01

### _timeUntil

This function takes an ISO 8601 date string in the `iso` parameter and returns a string representation of the time remaining until that date. It calculates the difference in milliseconds between the parsed date and the current time via `Date.now()`. If the difference is zero or negative, it returns the literal string `'now'`. Otherwise, it converts the millisecond difference into hours and minutes using `Math.floor()` division and modulo operations. If hours is greater than zero, it returns a string formatted as `in ${h}h ${m}m`; if hours is zero, it returns `in ${m}m`. The function is synchronous and does not write to state or the DOM.

### renderTournamentBanner

This function accepts a `TournamentMatch` object as the `match` parameter and returns an HTML string. It reads several fields from the match object: `round`, `prize_pool`, and `tournament_title`. It maps the numeric `round` value (1, 2, 3, or other) to a human-readable round label using nested ternary operators that produce either `'Round 1'`, `'Quarterfinal'`, `'Semifinal'`, or `'Grand Final'`. It calculates a displayed prize by multiplying `prize_pool` by 0.9 and then by 0.7, rounding the result with `Math.round()`. The function calls `escapeHTML()` twice, once on `match.tournament_title` and once on the computed `round` label string. It constructs and returns a single HTML string containing a `div` with class `tournament-room-banner`, nested divs for left and right sections, and span elements with escaped tournament title, badge text, round label, and formatted prize with `toLocaleString()`. The function is synchronous and does not branch on data conditions.

### renderTournamentCard

This function accepts a `Tournament` object as the `t` parameter and returns an HTML string representing a tournament card. It reads the fields `player_count`, `max_players`, `starts_at`, `status`, `is_entered`, `title`, `category`, `entry_fee`, `prize_pool`, and `id` from the tournament object. It calculates `pct` as a rounded percentage by dividing `player_count` by `max_players` and multiplying by 100. It calls `_timeUntil()` with `t.starts_at` to obtain the `startsIn` string. It computes `statusLabel` via a ternary: if `status` is `'registration'`, the label is `Starts ${startsIn}`, otherwise it is `status.toUpperCase()`. The function calls `escapeHTML()` four times on `statusLabel`, `t.title`, `t.category`, and `t.id`. It calls `Number()` on `t.entry_fee` and `t.prize_pool` before invoking `toLocaleString()` on each. The returned HTML contains a div with conditional class `tournament-card--entered` if `is_entered` is true, multiple child divs and spans displaying the card content, a progress bar div with inline style `width:${pct}%`, and a conditional button or label based on two conditions: if `status` is `'registration'` and `is_entered` is false, a button with data attributes `data-tournament-id` and `data-entry-fee` is rendered; otherwise, if `is_entered` is true, a div with class `tc-entered-label` is rendered; if neither condition holds, an empty string is returned. The function is synchronous.

## Agent 02

### _timeUntil

Accepts an ISO date string in the `iso` parameter. Converts it to milliseconds using `new Date(iso).getTime()`, then subtracts `Date.now()` to compute the time difference. If the difference is zero or negative, returns the string `'now'`. Otherwise, calculates hours by dividing by 3,600,000 and minutes by the remainder modulo 3,600,000 divided by 60,000, both using `Math.floor()`. If hours is greater than zero, returns a template string `in ${h}h ${m}m`; otherwise returns `in ${m}m`. The function is synchronous and returns a string.

### renderTournamentBanner

Accepts a `TournamentMatch` object as the `match` parameter. Reads `match.round`, `match.prize_pool`, and `match.tournament_title` from the input. Uses a chain of ternary operators to map the round number (1, 2, 3, or other) to a label string: round 1 becomes `'Round 1'`, round 2 becomes `'Quarterfinal'`, round 3 becomes `'Semifinal'`, and any other value becomes `'Grand Final'`. Multiplies the prize pool by 0.9 and then 0.7, rounds the result, and formats it using `toLocaleString()`. Calls `escapeHTML()` twice: once on `match.tournament_title` and once on the round label string. Constructs and returns an HTML string containing a div with class `tournament-room-banner` that includes the escaped tournament title, escaped round label, and formatted prize token count. The function is synchronous and returns a string.

### renderTournamentCard

Accepts a `Tournament` object as the `t` parameter. Reads `t.player_count`, `t.max_players`, `t.starts_at`, `t.status`, `t.is_entered`, `t.title`, `t.category`, `t.entry_fee`, `t.prize_pool`, and `t.id` from the input. Calculates a percentage by dividing `t.player_count` by `t.max_players`, multiplying by 100, and rounding. Calls `_timeUntil(t.starts_at)` and stores the result in `startsIn`. Branches on `t.status`: if it equals `'registration'`, sets `statusLabel` to `Starts ${startsIn}`; otherwise sets it to `t.status.toUpperCase()`. Constructs an HTML string containing a tournament card div; the div receives the `tournament-card` class and conditionally adds `tournament-card--entered` if `t.is_entered` is truthy. Calls `escapeHTML()` four times on `statusLabel`, `t.title`, `t.category`, and `t.id`. Converts `t.entry_fee` and `t.prize_pool` to numbers and formats them with `toLocaleString()`. Includes a progress bar with width set to the calculated percentage. Branches further on `t.status` and `t.is_entered`: if status is `'registration'` and `is_entered` is falsy, inserts a button with class `tc-join-btn` that includes the entry fee and two data attributes; otherwise if `is_entered` is truthy, inserts a div with class `tc-entered-label` containing a checkmark; otherwise inserts an empty string. Returns the complete HTML string. The function is synchronous and returns a string.

## Agent 03

### _timeUntil

Accepts an `iso` string parameter and returns a string. Calls `new Date(iso).getTime()` to convert the ISO string to milliseconds, then subtracts `Date.now()` to calculate the difference. If `diff` is less than or equal to 0, returns the literal string 'now'. Otherwise, computes hours by dividing `diff` by 3,600,000 and minutes by dividing the remainder by 60,000 using `Math.floor()` on both. If hours are greater than 0, returns a template string `in ${h}h ${m}m`; otherwise returns `in ${m}m`. The function is synchronous and does not modify external state.

### renderTournamentBanner

Accepts a `match` parameter of type `TournamentMatch` and returns a string. Evaluates `match.round` against literal values (1, 2, 3) to assign one of four round name strings to the `round` variable: 'Round 1', 'Quarterfinal', 'Semifinal', or 'Grand Final'. Computes `prize` by multiplying `match.prize_pool` by 0.9 and 0.7, then rounds the result. Calls `escapeHTML(match.tournament_title)` and `escapeHTML(round)` to sanitize values. Calls `prize.toLocaleString()` to format the integer. Returns a single template string literal containing HTML markup with class names and computed values interpolated throughout. The function is synchronous and does not modify external state or the DOM directly.

### renderTournamentCard

Accepts a `t` parameter of type `Tournament` and returns a string. Computes `pct` by dividing `t.player_count` by `t.max_players`, multiplying by 100, then rounding. Calls `_timeUntil(t.starts_at)` to generate a time-until string and stores it in `startsIn`. Evaluates `t.status` to determine `statusLabel`: if status is the string 'registration', concatenates 'Starts ' with `startsIn`; otherwise calls `t.status.toUpperCase()`. Evaluates two conditional branches: if status is 'registration' and `t.is_entered` is falsy, renders a button element with `data-tournament-id` and `data-entry-fee` attributes; else if `t.is_entered` is truthy, renders a div with class 'tc-entered-label'; else renders an empty string. Throughout the template, calls `escapeHTML()` on `t.title`, `t.category`, `statusLabel`, and `t.id`; calls `Number(t.entry_fee).toLocaleString()` and `Number(t.prize_pool).toLocaleString()` to format currency values. Returns a single template string literal. The function is synchronous and does not modify external state or the DOM directly.

## Agent 04

### _timeUntil

This function accepts an `iso` parameter (a date string) and returns a formatted time delta string. It calculates the difference between the ISO date converted to milliseconds and the current timestamp via `Date.now()`. If the difference is zero or negative, it returns the literal string `'now'`. Otherwise, it computes hours and remaining minutes. If hours are greater than zero, it returns a string in the format `in ${h}h ${m}m`; otherwise it returns `in ${m}m`. The function is synchronous and does not modify any external state.

### renderTournamentBanner

This function accepts a `match` parameter of type `TournamentMatch` and returns an HTML string. It reads the `round`, `prize_pool`, and `tournament_title` fields from the match object. It computes a `round` label by branching on the numeric round value: round 1 maps to `'Round 1'`, round 2 to `'Quarterfinal'`, round 3 to `'Semifinal'`, and all others to `'Grand Final'`. It calculates a `prize` value by multiplying `prize_pool` by 0.9 and 0.7, then rounding to an integer. It calls `escapeHTML` on `match.tournament_title` and the computed `round` label. It calls `.toLocaleString()` on the `prize` value. The function returns an HTML string with a `tournament-room-banner` div structure containing the escaped title and round information, along with a formatted prize display. The function is synchronous and does not modify state beyond the return value.

### renderTournamentCard

This function accepts a `t` parameter of type `Tournament` and returns an HTML string. It reads `player_count`, `max_players`, `starts_at`, `status`, `is_entered`, `title`, `category`, `entry_fee`, `prize_pool`, and `id` fields from the tournament object. It calculates a `pct` percentage. It calls `_timeUntil(t.starts_at)` to compute the `startsIn` string. It sets `statusLabel` by branching: if status is `'registration'`, the label is `Starts ${startsIn}`; otherwise it is `status.toUpperCase()`. The function calls `escapeHTML` on `statusLabel`, `title`, and `category`. It calls `Number()` and `.toLocaleString()` on entry fee and prize pool values. It constructs an HTML string with a `tournament-card` div and conditionally applies the `tournament-card--entered` class if `is_entered` is truthy. A fill bar width is set to `${pct}%`. The function branches on tournament status and entry state to conditionally render either a join button (with data attributes and escaped `id` value), an entered label, or an empty string. The function is synchronous.

## Agent 05

### _timeUntil

When called with an ISO date string in the `iso` parameter, this function parses it to a Date object and computes the difference in milliseconds from the current time. If the difference is zero or negative, it returns the string literal "now". Otherwise it calculates hours as `Math.floor(diff / 3_600_000)` and minutes as `Math.floor((diff % 3_600_000) / 60_000)`. If hours are greater than zero, it returns a string formatted as `in ${h}h ${m}m`. If hours are zero or less, it returns `in ${m}m`. The function does not call any other functions and has no external side effects. It is synchronous and returns a string.

### renderTournamentBanner

When called with a `TournamentMatch` object, this function reads the `round`, `prize_pool`, and `tournament_title` fields from the match parameter. It calls `escapeHTML()` on the `tournament_title` field and on a computed round label. The round label is determined by a chain of ternary operators: if `match.round === 1` it becomes "Round 1", if `match.round === 2` it becomes "Quarterfinal", if `match.round === 3` it becomes "Semifinal", otherwise "Grand Final". The prize value is computed as `Math.round(match.prize_pool * 0.9 * 0.7)`, then formatted with `toLocaleString()`. The function returns a single template string containing a multi-line HTML structure with class names `tournament-room-banner`, `trb-left`, `trb-right`, `trb-badge`, `trb-title`, `trb-round`, and `trb-prize`. The string includes an emoji (🥇) and the formatted prize and round label interpolated into the markup. The function is synchronous and does not write to state or the DOM.

### renderTournamentCard

When called with a `Tournament` object, this function reads the `player_count`, `max_players`, `starts_at`, `status`, `is_entered`, `title`, `category`, `entry_fee`, `prize_pool`, and `id` fields. It calls `_timeUntil()` with the `starts_at` field to produce the `startsIn` string. It then computes `pct` as `Math.round((t.player_count / t.max_players) * 100)`. A `statusLabel` is derived from a ternary: if `t.status === 'registration'` then `Starts ${startsIn}`, otherwise `t.status.toUpperCase()`. The function calls `escapeHTML()` on the `statusLabel`, `title`, `category`, `id`, and once more on `entry_fee` when constructing the join button. It returns a template string containing a div with class `tournament-card` and conditionally the class `tournament-card--entered` if `is_entered` is truthy. The function branches on the condition `t.status === 'registration' && !t.is_entered` to conditionally render a button with attributes `data-tournament-id` and `data-entry-fee`, or branches on `t.is_entered` to render a div with class `tc-entered-label`, or renders an empty string. Numeric values are formatted with `toLocaleString()`. The function is synchronous.
