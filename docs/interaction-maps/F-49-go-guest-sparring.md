# F-49 — `/go` Guest AI Sparring — Interaction Map

> **Status:** SHIPPED (S206, AI provider swapped Groq → Claude in S208)
> **Scope:** Standalone landing page at `themoderator.app/go`. No auth. No DB. Ephemeral.
> **Files:**
> - `moderator-go.html` — three screens (setup / debate / verdict) in one file, hidden via CSS classes
> - `moderator-go-app.js` — all client logic, 351 lines, one shared `state` object
> - `api/go-respond.js` — Vercel serverless function, 195 lines, proxies to Claude API
>
> **Landmine:** punch list describes F-49 as calling Groq with `GROQ_API_KEY`. This is stale. Actual code (S208) calls Claude Sonnet 4 (`claude-sonnet-4-20250514`) with `ANTHROPIC_API_KEY` set in Vercel env. Worth a doc sweep.

---

## User actions in this feature

Three distinct interactions drive the whole flow. Each gets its own diagram below.

1. **Setup → Start debate** — user types topic, picks side, taps Start
2. **Send argument** — main debate loop, repeats per round
3. **Final verdict** — auto-fires after round 3's AI response

---

## 1. Setup → Start Debate

The Start button lives on the setup screen and is **disabled by default**. Two conditions must both be true for it to light up: topic text length ≥ 3 characters AND a side has been picked. Logic lives in `checkReady()` at `moderator-go-app.js:89` — called on every `input` event on the topic field and after every side-picker click.

```mermaid
sequenceDiagram
    actor User
    participant Topic as Topic input<br/>(moderator-go.html)
    participant SideBtns as For/Against buttons
    participant Check as checkReady()<br/>go-app.js:89
    participant Start as Start button
    participant StartHandler as startBtn click handler<br/>go-app.js:95
    participant Setup as #setup element
    participant Debate as #debate element
    participant State as state object<br/>go-app.js:8

    Note over Start: DISABLED until:<br/>topic.length >= 3<br/>AND state.side !== ''
    User->>Topic: type topic
    Topic->>Check: input event
    Check->>Start: disabled = !(len>=3 && side)
    User->>SideBtns: click For or Against
    SideBtns->>State: state.side = 'for'|'against'
    SideBtns->>Check: checkReady()
    Check->>Start: enable if conditions met
    User->>Start: click
    Start->>StartHandler: fires
    StartHandler->>State: reset round=1, history=[], scores=[]
    StartHandler->>Setup: classList.add('hidden')
    StartHandler->>Debate: classList.add('active')
    StartHandler->>User: focus on input textarea
```

**Notes:**
- `state.side` is an empty string at init, which is why the `!state.side` check disables Start.
- Side picker uses `data-selected` attribute for CSS styling, not a class — grep for `data-selected` if you're hunting the gold-fill CSS.
- No server call on Start. Everything is local until the user sends their first argument.

---

## 2. Send Argument (per round)

The core loop. Fires on Send button click OR Enter keypress (without Shift) in the textarea. Sends user text + full message history to the serverless handler, which calls Claude Sonnet 4, parses a `[SCORE:X]` marker out of the response, updates a running score display, and either advances to the next round or triggers the verdict.

```mermaid
sequenceDiagram
    actor User
    participant Textarea as #user-input
    participant Send as Send button
    participant SendFn as sendArgument()<br/>go-app.js:135
    participant Chat as #chat<br/>(bubble container)
    participant State as state object
    participant Fetch as fetch()
    participant Handler as /api/go-respond<br/>go-respond.js:74
    participant Claude as Claude API<br/>sonnet-4-20250514
    participant Parse as parseScore()<br/>go-app.js:38
    participant Score as Running score UI<br/>go-app.js:49

    Note over Send: DISABLED when<br/>textarea.value is empty
    User->>Textarea: type argument
    Textarea->>Send: input event enables
    User->>Send: click (or Enter key)
    Send->>SendFn: fires
    SendFn->>Chat: addBubble('user', text)
    SendFn->>Chat: append thinking dots element
    SendFn->>Fetch: POST with topic/side/round/userArg/history
    Fetch->>Handler: HTTP POST
    Handler->>Handler: buildSystemPrompt()<br/>line 20
    Handler->>Claude: messages API call<br/>temp 0.85, top_p 0.9, max_tokens 200
    Claude-->>Handler: counter-argument + [SCORE:X]
    Handler-->>Fetch: {response: text}
    Fetch-->>SendFn: JSON
    SendFn->>Chat: remove thinking dots
    SendFn->>Parse: parseScore(raw)
    Parse-->>SendFn: {score, clean}
    SendFn->>State: push score to roundScores[]
    SendFn->>Score: updateScoreDisplay()
    SendFn->>State: push user + assistant to messageHistory
    SendFn->>Chat: addBubble('ai', cleanResponse)

    alt round === 1
        SendFn->>User: show signup CTA
    end

    alt round < TOTAL_ROUNDS (3)
        SendFn->>State: round++
        SendFn->>Textarea: focus, enable next turn
    else round === TOTAL_ROUNDS
        SendFn->>State: debateOver = true
        SendFn->>User: hide input area, show "Scoring..."
        SendFn->>SendFn: await 3s, then showVerdict()
    end
```

**Notes:**
- Send button disable logic: `sendBtn.disabled = !userInput.value.trim()` on every keystroke (line 131).
- Mic button (`#mic`) is **entirely hidden** if the browser has no `SpeechRecognition` support — `initSpeech()` at line 237 sets `style.display = 'none'`. Not disabled, hidden.
- Running score pip colors: cyan (≥7), orange (≥5), magenta (<5). Set via inline `style.color` AND pip class names `filled-high/mid/low`. Both places need to match if you retheme.
- `[SCORE:X]` marker regex is `/\[SCORE:\s*(\d+\.?\d*)\s*\]/i`. The marker is stripped from the text the user sees — clean version goes in history.
- If fetch fails (network or non-200), thinking dots are removed and a canned "Something went wrong. Try again." bubble is added. Debate state is NOT reset — user can try again.
- Final-round hint: on round 3, the user's message gets a hidden suffix `[This is the final round. Make your closing argument count.]` appended before sending (line 153). The user never sees this.

---

## 3. Final Verdict

Fires automatically after the round-3 AI response, via a 3-second delay inside `sendArgument()`. Hits the same `/api/go-respond` endpoint but with `action: 'score'` — the handler branches on this and calls Claude a second time with a different prompt (`buildScoringPrompt`), expecting a JSON object back.

```mermaid
sequenceDiagram
    participant SendFn as sendArgument()<br/>(end of round 3)
    participant Verdict as showVerdict()<br/>go-app.js:287
    participant Fetch as fetch()
    participant Handler as /api/go-respond<br/>(action: 'score' branch)
    participant BuildS as buildScoringPrompt()<br/>go-respond.js:55
    participant Claude as Claude API
    participant DebateEl as #debate element
    participant VerdictEl as #verdict element
    participant Grid as #score-grid

    SendFn->>Verdict: called after 3s delay
    Verdict->>Fetch: POST {topic, side, action:'score', messageHistory}
    Fetch->>Handler: HTTP POST
    Handler->>BuildS: buildScoringPrompt(topic, side, history)
    BuildS-->>Handler: prompt requesting strict JSON<br/>(no markdown, no backticks)
    Handler->>Claude: messages API call<br/>temp 0.7, max_tokens 200
    Claude-->>Handler: JSON string
    Handler->>Handler: JSON.parse(raw.replace(/```json|```/g, ''))

    alt parse succeeds
        Handler-->>Fetch: {scores: {logic, evidence, delivery, rebuttal, verdict}}
    else parse fails
        Handler-->>Fetch: {scores: hardcoded fallback 6/5/6/5}
    end

    Fetch-->>Verdict: JSON
    Verdict->>Verdict: overall = avg(4 scores), rounded to 1dp
    Verdict->>DebateEl: remove 'active' class
    Verdict->>VerdictEl: add 'active' class
    Verdict->>Grid: innerHTML = 4 score items (Logic/Evidence/Delivery/Rebuttal)
    Verdict->>VerdictEl: verdict-score color = cyan/orange/magenta per threshold

    Note over Verdict: On fetch error:<br/>shows "—" score<br/>text: "Scoring unavailable.<br/>But you showed up — that counts."
```

**Notes:**
- The scoring prompt EXPLICITLY demands no markdown and no backticks, but the handler still runs `.replace(/```json|```/g, '')` defensively before parsing. Belt-and-suspenders.
- Hardcoded fallback scores (6/5/6/5) only fire on a successful Claude response that fails JSON parse — not on a network failure. Network failure goes through the `catch` block and shows the "—" screen.
- The Retry button (`#retry`) resets everything back to the setup screen — full state reset including `topic`, `side`, `roundScores`, and the button `data-selected` attributes. Doesn't reload the page.

---

## Cross-references

- **F-32 AI Judge (shipped)** — uses a nearly identical 4-criteria scorecard (Logic / Evidence / Delivery / Rebuttal) but at `supabase/functions/ai-sparring/index.ts:67`, scale 1-10 per criterion. F-49's scoring prompt is a cousin of F-32's `buildScoringPrompt()`. They share a lineage but are not the same file.
- **F-51 Live Moderated Debate Feed** — uses 1-5 per comment (not 1-10 per criterion). Scale incoherence is documented, not a bug.
- **Not connected to:** the main app's auth, DB, RPCs, or any Supabase infrastructure. `/go` is intentionally a dead-end marketing funnel with a signup CTA after round 1.

## Known quirks

- The file header comments in `api/go-respond.js` still say "Session 206 | Session 208: Swapped Groq → Claude API" — accurate. But the punch list description of F-49 still says Groq. The punch list is stale. One of them should be updated next doc sweep.
- There is no test coverage on this feature. No integration tests hit `/go` or `/api/go-respond`.
- CORS on the handler is locked to `https://themoderator.app` only — if you ever front the API from another domain (e.g., a preview deployment), the handler will silently reject it.
