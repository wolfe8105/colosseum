# The Moderator — B2B Dashboard Concept

**Session:** April 17, 2026
**Status:** Concept / design reference — not yet built
**Feature ID:** F-42 (B2B delivery layer)

---

## The Core Idea

Competitors sell poll responses — what people say they think when asked directly.
We sell conviction intelligence — what people do when they have to fight for a position.

The dashboard must communicate that difference before a single number is shown.

---

## The Two-Screen Experience

### Screen 1 — Their World (the boring shelf)
- Analog aesthetic: serif font (Special Elite), muted beige/gray palette, flat horizontal bars
- Feels like a government report or 1990s enterprise software — intentional
- 15 standard data products in a sidebar: Approval Rating, Political Lean, Issue Salience, Demographic Split, Party ID, Vote Intention, Trust Scores, Media Consumption, Issue Tracking, Favorable/Unfavorable, Economic Sentiment, Right Track/Wrong Track, Candidate Matchup, Policy Support, Enthusiasm Index
- User picks one — the selection travels through to Screen 2 as context
- CTA button: "See what this data actually means →"

### The Transition
- Green flash (#8ebe3f) on click
- Screen 1 fades and scales down
- Screen 2 explodes in

### Screen 2 — Our World
- Full dark background (#060a04)
- Full green/brass/copper color scheme — don't be afraid of color
- 3D conviction surface (full pitch/roll/yaw drag rotation, scroll zoom)
- The data product they picked from Screen 1 shows as the active badge
- "← Back to boring data" button is the arrogance closer

---

## The Crafting Interface (Screen 2 layout)

Like video game crafting — 1000 items, infinite combinations, you dial in the insight.

### Layout
- **Top toggles:** topic selector (Gun Control, Immigration, Climate, Economy, Healthcare, Education)
- **Left panel:** demographic selector + time window slider + conviction dial (rotatable)
- **Center:** 3D surface chart — the "output" of whatever you've crafted
- **Right panel:** signal cards (conviction score, win rate, source density, persuadability) + argument ridge breakdown
- **Bottom:** active layer tags + action buttons

### The Autofill Search
Primary way to add data dimensions — because we have so many that a blank interface is paralyzing.
Type "age" → surfaces: Age group breakdown, Age band win rate, Age × political lean crosstab
Type "women" → surfaces: Women vs men split, Women 25–44 conviction trend, Gender gap by topic
Type "persuad" → surfaces: Persuadability index, Persuadability by demographic, Persuadability trend

Each result adds a color-coded layer tag to the active query.

---

## The 3D Surface Chart

**Concept:** Looking into a 3D printer while it's printing. The chart is being constructed by what you've dialed in.

- X axis: argument type (Safety, 2nd Amendment, Mental Health, Data/Stats, Enforcement)
- Y axis: demographic spectrum (Liberal → Conservative, or age bands, or gender)
- Z axis: conviction intensity
- Peaks UP = FOR position (blue tips)
- Valleys DOWN = AGAINST position (red tips)
- Full mouse drag rotation: pitch, roll, yaw
- Scroll to zoom
- Surface redraws on every control change

**Color scheme:**
- FOR peaks: blue ramp (#1a6fc4 base → #d0e8ff tips)
- AGAINST valleys: red/copper ramp (#c44a1a base → #ffe8d0 tips)
- Neutral terrain: dark green (#060a04 → #3a6a10)

**Steampunk accents:**
- Brass/copper dial for conviction intensity (rotatable)
- Rivet details on panel borders
- Share Tech Mono for all instrument readings
- Rajdhani for labels and controls

---

## What Polling Can't Tell You (right panel insight cards)

These three cards are the sales pitch inside the product:

1. "Women 25–44 win 63% of debates FOR restrictions using safety arguments"
2. "Conservative moderators rule AGAINST the FOR side 71% of the time"
3. "Only 28% persuadability — deeply held. Don't waste budget here"

Every statement traces to existing database tables. No new data collection needed.

---

## Data Structure Required (F-42 prerequisite)

The dashboard wants rows where each row = one topic + one date + one demographic slice:

```
topic | date | demographic | side_a_pct | side_b_pct | total_debates |
win_rate_a | win_rate_b | source_density_a | source_density_b |
persuadability | controversy_score | side_switching_rate
```

This is the shape the 3D surface, trend charts, and crosstab all want natively.
No transposing. No reformatting. Build the database to match the output.

---

## Sales Chart Summary (us vs. them)

| Signal | The Moderator | Morning Consult / YouGov / Vantage |
|---|---|---|
| Stated opinion | ✓ Auto-debate votes | ✓ Core product |
| Which arguments win | ✓ Arena win/loss record | ✗ Impossible to measure |
| Evidence cited per side | ✓ Source density metric | ✗ Not a concept in polling |
| Who gets persuaded by what | ✓ Persuadability by demo | ✗ Not a concept in polling |
| How contested an issue is | ✓ Controversy score | ✗ Not a concept in polling |
| Moderator ruling patterns | ✓ Moderator bias data | ✗ Doesn't exist anywhere |
| Profile depth | 99 questions | ~15 questions |
| Data type | Behavioral (revealed) | Stated preference |
| Price | TBD — fraction of poll cost | $15K–$60K per poll |

Key academic backing: *"Political practitioners perform barely better than chance at predicting which messages persuade voters."* — PNAS 2024. We have the actual win/loss record. That's not a better poll — it's a different category of intelligence entirely.

---

## 3 Gaps to Fill for Political Buyer

Our 99-question profile depth covers almost everything the poll demographic header covers — plus 87 questions they don't have. Three gaps remain:

1. Party affiliation (not directly collected — p1 political lean is a proxy)
2. 2024 presidential vote (not collected)
3. Registered / likely voter status (not collected)

Add these 3 questions to profile depth to become a complete superset of every poll demographic header in the industry.

---

## Implementation Notes

- Everything traces to existing tables: `auto_debates`, `arena_debates`, `event_log`, `profile_depth_answers`, `debate_references`
- No new data collection required
- Gate: 10,000 DAU with 60% profile completion = viable for political buyer
- Delivery: dashboard first (non-technical buyers), REST API second, Snowflake/SFTP later
- Per War Chest §14.3: build when first buyer is close

---

*Reference doc — read before any B2B dashboard build session*
