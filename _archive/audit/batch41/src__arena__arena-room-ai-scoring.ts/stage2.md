# Stage 2 Outputs — arena-room-ai-scoring.ts

## Agent 01

### requestAIScoring

This async function accepts a topic string and an array of DebateMessage objects and returns a promise that resolves to either an AIScoreResult object or null. It reads the SUPABASE_URL from module-level state (imported from config.ts). The function transforms the messages array into a format with role and content fields. It reads the user's JWT by calling getUserJwt(), which is async and awaited. The function constructs an edge function URL by appending '/functions/v1/ai-sparring' to the Supabase URL. It then makes an async HTTP POST fetch call to this edge function URL, passing an Authorization header with the JWT, a mode of 'score', the topic, and the transformed messageHistory in the body. The function awaits this fetch call. If the response status is not ok, it throws an error. It then awaits res.json() to parse the response and casts it to an object with an optional scores property. If data.scores exists, the function returns it; otherwise it throws an error. In the catch block, it logs a warning to console and returns null, representing a fallback when scoring fails.

### sumSideScore

This synchronous function accepts a SideScores object as a parameter and returns a number. It reads four score properties from the input object: side.logic.score, side.evidence.score, side.delivery.score, and side.rebuttal.score. It returns the sum of these four numeric values.

### renderAIScorecard

This synchronous function accepts four parameters: myName and oppName as strings, myRole as a DebateRole, and scores as an AIScoreResult. It returns a string of HTML. The function reads the scores object and selects the appropriate side based on myRole: if myRole is 'a', mySide is set to scores.side_a and oppSide to scores.side_b; otherwise the assignment is reversed. It calls sumSideScore on mySide and oppSide to obtain myTotal and oppTotal. The function defines an inner function renderBar that accepts a label string and two CriterionScore objects. renderBar multiplies each criterion's score by 10 to derive a percentage, calls escapeHTML on each score's reason string, and returns an HTML string containing a criterion container with a header, label, numeric scores, two bar divs with inline width styles, and the escaped reason text. The outer function then constructs and returns a large HTML string representing the entire scorecard. This string contains a header section that displays both players' names (escaped via escapeHTML) and their total scores, applies a 'winner' class to the higher-scoring side and 'loser' to the lower-scoring side, and includes a comparison label. The function calls renderBar four times, once each for logic, evidence, delivery, and rebuttal criteria, passing the corresponding CriterionScore objects from mySide and oppSide. Finally, the function includes the verdict string from scores.verdict (escaped via escapeHTML) in the output HTML.

## Agent 02

### requestAIScoring

This async function reads the `topic` parameter and the `messages` array parameter, and reads module-level state via the imported `SUPABASE_URL` constant from config. It also calls `getUserJwt()` to retrieve authentication credentials. The function transforms the input `messages` array by mapping each element to an object with `role` and `content` properties derived from `role` and `text` fields. It constructs an Edge Function URL by appending `/functions/v1/ai-sparring` to `SUPABASE_URL` after removing a trailing slash. It then calls `fetch()` with a POST request to this URL, passing headers including the Bearer token and a JSON body containing the mode `'score'`, the topic, and the transformed message history. The function awaits the fetch response and checks its `ok` status; if not ok, it throws an error with the status code. On success, it awaits `res.json()` and extracts the `scores` property from the parsed response, returning it if present. If the response lacks a `scores` property, it throws an error. If any error occurs anywhere in the try block—whether from missing `SUPABASE_URL`, missing JWT, failed fetch, or missing scores—the catch block logs a warning to the console and returns `null`.

### sumSideScore

This function reads the `side` parameter, which is a `SideScores` object, and accesses four properties: `side.logic.score`, `side.evidence.score`, `side.delivery.score`, and `side.rebuttal.score`. It returns the sum of these four numeric values and writes nothing.

### renderAIScorecard

This function reads four parameters: `myName`, `oppName`, `myRole` (either `'a'` or `'b'`), and `scores`, an `AIScoreResult` object. Based on the `myRole` value, it assigns `mySide` to either `scores.side_a` or `scores.side_b`, and assigns `oppSide` to the opposite side. It calls `sumSideScore()` twice—once on `mySide` to compute `myTotal` and once on `oppSide` to compute `oppTotal`. It defines a nested function `renderBar()` that takes a label string and two `CriterionScore` objects, and returns an HTML string containing a criterion comparison UI; within `renderBar()`, it calls `escapeHTML()` on the `reason` property of the first score object. The main function then builds and returns a large HTML string representing a complete scorecard. This string includes the player names and total scores (both passed through `escapeHTML()`), CSS classes that conditionally set `'winner'` or `'loser'` based on comparing totals, and four calls to `renderBar()` for the logic, evidence, delivery, and rebuttal criteria (with custom emoji prefixes in the labels). The verdict from `scores.verdict` is included in the HTML after being passed through `escapeHTML()`. The function performs no writes to external state or module-level variables; it is synchronous and returns a pure HTML string.

## Agent 03

### requestAIScoring

This async function reads the `topic` parameter, the `messages` parameter (an array of DebateMessage objects), and the module-level `SUPABASE_URL` constant. It transforms `messages` into a `messageHistory` array by mapping each message to an object containing its `role` and `text` properties. Within a try block, it reads `SUPABASE_URL` and throws if it is falsy, constructs an edge function URL by removing trailing slashes and appending `/functions/v1/ai-sparring`, calls `getUserJwt()` asynchronously to obtain a JWT token and throws if it returns a falsy value, and then calls `fetch()` with a POST request to the constructed URL, passing the JWT in an Authorization header and a JSON body containing `mode: 'score'`, `topic`, and `messageHistory`. It awaits the fetch response, checks if `res.ok` is truthy and throws with a status code if not, awaits `res.json()` and casts the result to a type with an optional `scores` property, returns the `scores` value if present, and throws if `scores` is falsy. If any error is caught, it logs a warning message to the console and returns `null`.

### sumSideScore

This synchronous function reads the `side` parameter (a SideScores object) and returns the sum of four numeric properties: `side.logic.score`, `side.evidence.score`, `side.delivery.score`, and `side.rebuttal.score`.

### renderAIScorecard

This synchronous function reads the `myName`, `oppName`, `myRole`, and `scores` parameters. It selects which side object from `scores` corresponds to the player and which corresponds to the opponent by checking if `myRole` equals `'a'`. It calls `sumSideScore()` twice—once on the player's side and once on the opponent's side—to compute `myTotal` and `oppTotal` totals. It defines a nested function `renderBar()` that accepts a criterion label and two CriterionScore objects, multiplies each score by 10 to compute percentages, calls `escapeHTML()` on the reason text, and returns an HTML string containing a criterion header with scores, two width-styled divs representing visual bars, and the escaped reason text. The outer function then constructs and returns a single HTML string containing a scorecard div with a header showing both players' names (escaped via `escapeHTML()`) and totals with a CSS class of `'winner'` applied conditionally based on score comparison, followed by four calls to `renderBar()` for logic, evidence, delivery, and rebuttal criteria, and a verdict section with the escaped verdict text from `scores.verdict`.

## Agent 04

### requestAIScoring

This async function takes a debate topic string and an array of DebateMessage objects and returns either an AIScoreResult object or null. It first transforms the input messages into a new array, extracting each message's role and text properties to form a messageHistory. Inside a try block, it reads the SUPABASE_URL from module-level config and throws if not present. It constructs an edgeUrl by removing trailing slashes from SUPABASE_URL and appending '/functions/v1/ai-sparring'. It calls getUserJwt() and awaits the result; if the JWT is falsy, it throws. It then calls fetch() to make a POST request to edgeUrl with headers containing Content-Type and Authorization (Bearer token with the JWT), and a body containing the stringified JSON object with mode 'score', the topic, and messageHistory. It awaits the fetch response. If the response is not okay, it throws an error including the status code. It awaits res.json() and casts to an object with optional scores property. If data.scores exists, the function returns it and exits early. If not, it throws an error. If any error is caught in the catch block, the function logs a warning to console.warn and returns null.

### sumSideScore

This synchronous function takes a SideScores object and returns a number. It reads four properties from the input object (side.logic.score, side.evidence.score, side.delivery.score, and side.rebuttal.score) and returns their sum.

### renderAIScorecard

This synchronous function takes four parameters—myName and oppName as strings, myRole as a DebateRole, and scores as an AIScoreResult—and returns a string. It reads from the scores object to extract mySide and oppSide based on whether myRole is 'a' (conditionally selecting side_a or side_b from scores). It calls sumSideScore on mySide and oppSide to compute myTotal and oppTotal. It defines a nested function renderBar that takes a label string and two CriterionScore objects (mine and theirs), multiplies each score by 10 to compute percentages, calls escapeHTML on mine.reason, and returns a multi-line string containing a div with class "ai-score-criterion" with nested elements for a header, bars, and reason. The outer function then constructs and returns a large multi-line string containing a div with class "ai-scorecard" that includes a header section with both sides' names and totals (with 'winner' or 'loser' classes assigned based on score comparison), a breakdown section that calls renderBar four times for logic, evidence, delivery, and rebuttal criteria (passing each side's corresponding criterion object), and a verdict section. The myName and oppName parameters are escaped with escapeHTML before insertion into the HTML string, as is the scores.verdict property.

## Agent 05

### requestAIScoring

This async function reads the debate topic as a string and the message array as `DebateMessage[]`, and imports `SUPABASE_URL` from config and `getUserJwt` from a sibling module. Inside a try block, it reads `SUPABASE_URL` from module-level state and throws if falsy. It constructs an Edge Function URL by replacing trailing slashes and appending `/functions/v1/ai-sparring`. It awaits `getUserJwt()` to get a JWT and throws if the result is falsy. It constructs a message history array by mapping over the messages parameter, extracting the role and text from each element. It then awaits a fetch POST request to the Edge Function with JSON headers, Bearer token authorization, and a body containing the mode as 'score', the topic parameter, and the message history. If the response status is not OK, it throws. It awaits the response as JSON typed as an object with an optional scores property. If the scores property exists, the function returns it immediately and the try block exits. If it does not exist, the function throws a "No scores in response" error. If any error occurs in the try block, the catch block logs a warning to the console and returns null.

### sumSideScore

This synchronous function takes a `SideScores` parameter and returns a number. It reads four nested score properties from the parameter: `side.logic.score`, `side.evidence.score`, `side.delivery.score`, and `side.rebuttal.score`. It adds all four values and returns the result without any intermediate assignments or side effects.

### renderAIScorecard

This synchronous function takes four parameters: `myName` and `oppName` as strings, `myRole` as a `DebateRole`, and `scores` as an `AIScoreResult`. It reads the scores parameter and the myRole parameter. It calls `sumSideScore` once on `mySide` and once on `oppSide` and stores the results in `myTotal` and `oppTotal`. It defines an inner function `renderBar` that takes three parameters: a label string, mine as a `CriterionScore`, and theirs as a `CriterionScore`. Inside `renderBar`, it multiplies mine.score and theirs.score by 10, calls `escapeHTML` on mine.reason, and returns a template string that contains an HTML div with class names, styles with percentage widths, and escaped HTML content. The outer function returns a template string containing an HTML div structure. Inside this template string, it calls `escapeHTML` on myName and oppName, uses a ternary conditional to apply the class 'winner' or 'loser' to myTotal's div if myTotal is greater than or equal to oppTotal, uses a ternary conditional to apply the class 'winner' or 'loser' to oppTotal's div if oppTotal is greater than or equal to myTotal, calls `renderBar` four times with the literals 'LOGIC', 'EVIDENCE', 'DELIVERY', and 'REBUTTAL' paired with corresponding score properties from mySide and oppSide, and calls `escapeHTML` on `scores.verdict`. The function returns this template string without assigning it to a variable.
