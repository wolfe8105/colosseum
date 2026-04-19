# Stage 2 Outputs — arena-lobby.cards.ts

## Agent 01

### renderArenaFeedCard

This function is synchronous and takes an `ArenaFeedItem` object and a `_type` parameter (unused), returning a string containing HTML. It reads properties from the input object: `source`, `status`, `ruleset`, `total_rounds`, `vote_count_a`, `vote_count_b`, `id`, `topic`, `debater_a_name`, `debater_b_name`, `score_a`, and `score_b`. The function branches on three conditions: whether the source equals `'auto_debate'` (stored in `isAuto`), whether the status equals `'live'` (stored in `isLive`), and whether `ruleset` equals `'unplugged'`. It constructs four badge strings conditionally: the main badge depends on `isLive` and `isAuto` and takes one of three values; a ruleset badge appears only if `ruleset === 'unplugged'`; a rounds badge appears only if `total_rounds` exists and is not 4; the `action` text is either `'SPECTATE'` or `'VIEW'` depending on `isLive`. The card class is either `'card-live'`, `'card-ai'`, or empty based on `isLive` and `isAuto`. The `cardAttr` branches on `isLive`: if live, it sets `data-debate-id` with the encoded id; if not live, it sets `data-link` with a path that branches on `isAuto` to either `/verdict?id=` or `/debate/` followed by the encoded id. The function calls `escapeHTML` three times—on `d.topic` (with fallback `'Untitled Debate'`), `d.debater_a_name` (with fallback `'Side A'`), and `d.debater_b_name` (with fallback `'Side B'`). It calls `Number()` twice to convert `d.score_a` and `d.score_b` if both are not null. A vote count sum is computed; the plural form of `'vote'` depends on whether this sum equals 1. The function returns a single HTML string containing a div with nested elements representing the arena card.

### renderAutoDebateCard

This function is synchronous and takes an `AutoDebateItem` object, returning a string containing HTML. It reads properties from the input: `id`, `topic`, `side_a_label`, `side_b_label`, `score_a`, and `score_b`. It calls `escapeHTML` three times—on `d.topic`, `d.side_a_label`, and `d.side_b_label`. It calls `Number()` twice on `d.score_a` and `d.score_b`. The function constructs a static HTML structure with no branches or conditions; all CSS classes are fixed, and the `data-link` attribute is hardcoded as `'moderator-auto-debate.html?id='` followed by the encoded id. The action button text is always `'VIEW'`. The function returns a single HTML string containing a div with nested elements representing the AI debate card.

### renderPlaceholderCards

This function is synchronous and takes a `type` parameter (string), returning a string containing HTML. It branches immediately on whether `type === 'live'`. If true, it returns an empty state message with a stadium emoji and text. If false, it continues to define a local array `placeholders` containing three hardcoded objects, each with `topic`, `a`, `b`, `sa`, and `sb` properties. The function maps over this array, executing a template literal for each placeholder object and calling `Number()` twice on each object's `sa` and `sb` properties. The resulting array of strings is joined with an empty string, producing a single HTML string. The returned string either contains the empty state HTML or contains three arena card divs with verdict badges and hardcoded topics and debate sides with their vote counts.

## Agent 02

### renderArenaFeedCard

Reads an `ArenaFeedItem` object (`d`) and a type parameter. Reads module-level function `escapeHTML` from `../config.ts`. Constructs a series of badge and metadata strings by evaluating properties of `d`: checks if `d.source === 'auto_debate'`, checks if `d.status === 'live'`, checks if `d.ruleset === 'unplugged'`, checks if `d.total_rounds` exists and is not 4, sums `d.vote_count_a` and `d.vote_count_b` (defaulting each to 0 if undefined). Conditionally constructs badge HTML based on `isLive` and `isAuto`. Builds action button text ('SPECTATE' or 'VIEW') based on `isLive`. Assigns card CSS class based on `isLive` and `isAuto`. Constructs a data attribute (`data-debate-id` or `data-link`) by calling `encodeURIComponent` on `d.id` and optionally prepending a path based on `isAuto`. Calls `escapeHTML` on `d.topic`, `d.debater_a_name`, and `d.debater_b_name` with fallback defaults. Conditionally includes score HTML if `d.score_a` and `d.score_b` are not null. Returns a single HTML string representing a complete arena card div. Not async.

### renderAutoDebateCard

Reads an `AutoDebateItem` object (`d`). Calls `encodeURIComponent` on `d.id`. Calls `escapeHTML` on `d.topic`, `d.side_a_label`, and `d.side_b_label`. Accesses `d.score_a` and `d.score_b` and coerces them to numbers. Writes no external state. Returns a single HTML string representing an arena card div with the class "card-ai", containing a badge labeled "AI DEBATE", the topic, side labels, scores, and a "VIEW" button. Not async.

### renderPlaceholderCards

Reads a type parameter. Branches on `type === 'live'`: if true, returns early with an empty state message div containing a stadium emoji and text "No live debates yet — be the first to enter the arena". If type is not 'live', declares a local `placeholders` array of three objects with hardcoded debate topics and side names. Maps over `placeholders` to produce an array of HTML strings. Calls `escapeHTML` on none of the placeholder strings (topic and side names are not escaped). Returns the joined result of the map. Not async.

## Agent 03

### renderArenaFeedCard

Reads the ArenaFeedItem object `d`. Extracts boolean flags from `d.source` and `d.status` properties and constructs four badge strings based on these flags and the `d.ruleset` and `d.total_rounds` properties. Reads `d.vote_count_a` and `d.vote_count_b` to compute a sum. Computes the action text and card CSS class based on the isLive and isAuto flags. Constructs the `cardAttr` string by branching on isLive to set either a `data-debate-id` attribute with `d.id` URL-encoded or a `data-link` attribute where the URL depends on the isAuto flag. Calls `escapeHTML` three times on `d.topic`, `d.debater_a_name`, and `d.debater_b_name` each with fallback defaults. Checks whether `d.score_a` and `d.score_b` are not null and conditionally includes a score span. Returns an HTML string as a single arena-card div. Synchronous, no error paths.

### renderAutoDebateCard

Reads the AutoDebateItem object `d`. Extracts the `d.id` property and URL-encodes it. Calls `escapeHTML` three times on `d.topic`, `d.side_a_label`, and `d.side_b_label`. Reads `d.score_a` and `d.score_b` and casts them to numbers. Constructs a data-link with path `moderator-auto-debate.html?id=...`. Returns an HTML string as a single arena-card div with card-ai class. Synchronous, no branches, loops, or error paths.

### renderPlaceholderCards

Reads the `type` string parameter. Branches on whether `type === 'live'`. If true, returns immediately with a single div containing an empty-icon span. If false, initializes a local `placeholders` array with three hardcoded objects. Maps over the placeholders array and constructs an HTML string for each. Casts `p.sa` and `p.sb` to numbers. Joins the array with an empty string. Returns the joined HTML string. Synchronous, one branch with an early return.

## Agent 04

### renderArenaFeedCard

This function reads from the `d` parameter (an `ArenaFeedItem`) and the `_type` parameter (unused). It computes several conditional badges and derived values: determines whether the item is from 'auto_debate' source and has 'live' status; constructs `rulesetBadge` if the ruleset is 'unplugged'; constructs `roundsBadge` if `total_rounds` exists and is not 4; selects a badge string based on the `isLive` and `isAuto` flags; calculates total votes by adding `vote_count_a` and `vote_count_b` (treating missing values as 0); sets action text to 'SPECTATE' if live, otherwise 'VIEW'; sets card class to 'card-live' if live, 'card-ai' if auto, otherwise empty. Calls `encodeURIComponent` on the id to construct `cardAttr`—if live it produces `data-debate-id`, otherwise `data-link` branching on auto. Calls `escapeHTML` three times (topic with fallback, debater_a_name with fallback, debater_b_name with fallback). Conditionally includes a score span only if `score_a` is not null, converting both scores to numbers. Synchronous, returns a single HTML string.

### renderAutoDebateCard

Reads from `d` (an `AutoDebateItem`). Calls `encodeURIComponent` on the id and concatenates with 'moderator-auto-debate.html?id=' to form `data-link`. Calls `escapeHTML` three times on `d.topic`, `d.side_a_label`, and `d.side_b_label`. Converts `score_a` and `score_b` to numbers. No branching, no loops, no error handling. Returns a single HTML string.

### renderPlaceholderCards

Reads the `type` parameter. Returns early with a hardcoded empty state message if `type === 'live'`. If not 'live', creates a local `placeholders` array with three hardcoded objects. Calls `map` on the array, creates HTML for each placeholder calling `Number()` on sa and sb. Joins with `join('')`. Returns a string. Synchronous, one branching path.

## Agent 05

### renderArenaFeedCard

Receives an `ArenaFeedItem` object (`d`) and a type string (`_type`, unused). Reads source, status, ruleset, total_rounds, vote_count_a, vote_count_b, id, topic, debater_a_name, debater_b_name, score_a, and score_b from the input. Computes derived values including `isAuto`, `isLive`, `rulesetBadge`, `roundsBadge`, a three-way `badge`, `votes`, `action`, and `cardClass`. Constructs `cardAttr` using a ternary branching on `isLive`. Calls `escapeHTML()` four times, passing `d.topic`, `d.debater_a_name`, and `d.debater_b_name` twice each. Returns a string containing a single HTML div; score span is conditionally included only if `score_a` is not null. Not async, no error handling.

### renderAutoDebateCard

Receives an `AutoDebateItem` object. Reads id, topic, side_a_label, side_b_label, score_a, and score_b. Calls `escapeHTML()` three times on `d.topic`, `d.side_a_label`, and `d.side_b_label`. Constructs and returns a string containing a single HTML div with hardcoded class `card-ai`, `data-link` attribute with `encodeURIComponent(d.id)`. No branching, early returns, loops, or error handling. Not async.

### renderPlaceholderCards

Receives a type string. Returns early if `type === 'live'` with a hardcoded empty state div. Otherwise creates a local `placeholders` array with three hardcoded objects. Calls `map()` and `join()` to produce the final HTML string. Calls `Number()` on sa and sb for each placeholder. Not async, no error handling.
