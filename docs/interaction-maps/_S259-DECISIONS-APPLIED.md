# _S259 DECISIONS APPLIED — SCOPE DELTA

Delta against `_S259-TRACK-B-SCOPE.md` after applying decisions D1, D2, D3 from `_S259-DECISIONS-D1-D2-D3.md`.

---

## D1 — settings module

**Decision:** `src/pages/settings.ts` is LIVE (loaded by `moderator-settings.html:600`). `src/settings.ts` is DEAD.

**Applied:**
- `src/settings.ts` removed from Category 1 scope entirely (was 15 elements)
- Cat 1 drops from 34 files / 231 elements to 33 files / 216 elements
- Settings surface group reduces to: `moderator-settings.html` (22, Cat 1) + `src/pages/settings.ts` (11, Subtype A) = 33 elements across 2 files
- Dead file added to punch list (see `_PUNCH-LIST-S258-ADDITIONS-UPDATED.md`)

**A1 anomaly:** RESOLVED.

---

## D2 — staging HTML copies under src/pages/

**Decision:** All three staging HTML copies are DEAD. Not in Vite build input, not referenced anywhere.

**Applied:**
- No Track B count change (already excluded from Cat 1 per audit methodology)
- Dead files added to punch list as a cleanup item
- Future audit prompts should add `src/pages/*.html` to the default exclude list so this class of file never shows up again

**A2 anomaly:** RESOLVED.

---

## D3 — power-up shop

**Decision:** Power-up system is a standalone feature. F-01 covers queue/matchmaking and does not touch power-ups. The feature has 5 RPCs, a 460-line dedicated module (`src/powerups.ts`), and 3 separate UI surfaces.

**Applied:** A new feature map **F-51 power-up shop** will be drafted as a single-feature mapping session, following the same format as F-14/F-15/F-35. This is not a Track B surface; it slots into the feature-indexed track.

**Elements pulled out of Track B and into F-51:**

From `src/arena/arena-lobby.ts` (Subtype B → F-51):
- Line 121: `arena-powerup-shop-btn click` (opens shop)
- Line 327: `powerup-shop-back click` (back button)
- Line 334: `buttonEl click` (buy item)

From `src/powerups.ts` (Cat 1 standalone → F-51):
- All 4 elements (slot click, item click, equip btn, popup click)

Total audit-visible F-51 elements: 7. Actual F-51 scope larger per D3 (5 RPCs, 460-line module, 3 UI surfaces) — the feature map will cover everything the feature does, not only what the audit saw.

**Elements remaining in Subtype B from arena-lobby.ts:** 2 rows (line 151 challenge-cta, line 160 lobby click delegation). These stay as F-46 patches (or F-01 — to be decided at P2 prompt draft time based on which map owns lobby-level non-power-up flows).

---

## UPDATED SCOPE TOTALS

### Category 1 after D1 and D3

| Metric | Before | After |
|--------|-------:|------:|
| Files | 34 | 32 |
| Elements | 231 | 212 |

Removed: `src/settings.ts` (dead, 15 elements), `src/powerups.ts` (to F-51, 4 elements).

### Category 2 after D3

| Metric | Before | After |
|--------|-------:|------:|
| Subtype A (whole-surface gaps) | 87 | 87 |
| Subtype B (patchable misses) | 31 | 28 |
| Total Cat 2 rows active | 118 | 115 |

Moved to F-51: 3 arena-lobby rows.

### Subtype B (P2) distribution by target map

| Target | Elements | Source |
|--------|---------:|--------|
| F-01 | 9 | arena-config-mode dismiss (4), arena-config-settings dismiss (4), arena-queue AI spar (1) |
| F-02 | 1 | arena-room-setup ENTER BATTLE |
| F-14 + F-15 | 9 | groups.ts hot takes, GvG, search, modal dismiss |
| F-46 | 8 | arena-private-picker dismiss (5), arena-private-lobby copy link (1), arena-lobby challenge-cta (1), arena-lobby delegation (1) |
| F-48 | 1 | arena-mod-debate debater LEAVE |
| **P2 total** | **28** | |

Note: some arena-lobby rows and arena-queue rows list multiple host maps in the audit. The table above assigns each row to a single primary target based on feature intent. Actual assignment confirmed at P2 prompt draft time.

### Track B after all decisions

| Bucket | Surfaces | Elements |
|--------|---------:|---------:|
| Cat 1 HTML-anchored | 12 | ~200 |
| Cat 1 standalone TS | 10 | 44 |
| Cat 1 infrastructure excluded | 3 | 1 |
| Subtype A unmerged into HTML-anchored | 5 | 58 |
| **Track B total active** | **~27** | **~298** |

(Cat 1 totals within Track B: 212 elements = 33 files minus settings.ts paired into A6 minus infrastructure exclusions. HTML-anchored merge math will be recomputed precisely at Track B bulk-prompt draft time.)

### F-51 (new single-feature map, not Track B)

- Audit-visible elements: 7
- Actual scope: TBD by F-51 mapping session (larger per D3 evidence)
- CC session type: single-feature, same format as F-14/F-15/F-35

### Grand total work

| Track | Elements | CC sessions |
|-------|---------:|------------:|
| P2 (patches to existing maps) | 28 | 1 |
| F-51 (new feature map) | 7+ | 1 |
| Track B (surface-first mapping) | 298 | 3–5 rounds |
| Summary patch to audit report | 0 | 0 (Pat edit) |
| Dead code cleanup | 0 | 0 (Pat edit) |

---

## OPEN DECISIONS

None remaining. D1, D2, D3 resolved. P2 prompt, F-51 prompt, and Track B prompt are all drafteable now.

---

## NEXT IMMEDIATE ACTION

Chat-Claude drafts the **P2 patch CC prompt** using the Subtype B table above. After P2 runs, chat-Claude drafts the **F-51 single-feature CC prompt** and then the **Track B bulk prompt**.

**END OF DELTA.**
