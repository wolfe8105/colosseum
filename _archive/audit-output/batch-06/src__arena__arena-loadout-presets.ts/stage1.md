# Stage 1 Outputs — src/arena/arena-loadout-presets.ts

## Agent 01

### Imports
- `safeRpc` from `../auth.ts`
- `escapeHTML` from `../config.ts`
- `getMyPowerUps`, `equip` from `../powerups.ts`
- `renderLoadoutPicker` from `../reference-arsenal.loadout.ts`
- `type CurrentDebate` from `./arena-types.ts` (type-only)
- Dynamic imports inside `applyPreset` body: `renderLoadout`, `wireLoadout` from `../powerups.ts` (line 163); `getCurrentProfile` from `../auth.ts` (line 166)

### Types / Interfaces
- `LoadoutPreset` (interface, lines 17–22): `id: string`, `name: string`, `reference_ids: string[]`, `powerup_effect_ids: string[]`

### Module-level bindings
None.

### Functions
| Name | Line | Async | Exported |
|---|---|---|---|
| `renderPresetBar` | 31 | async | yes |
| `renderBar` | 50 | sync | no |
| `applyPreset` | 123 | async | no |
| `handleSave` | 181 | async | no |
| `handleDelete` | 236 | async | no |

### Classes
None.

---

## Agent 02

### Imports
- `safeRpc` (line 9) — `../auth.ts`
- `escapeHTML` (line 10) — `../config.ts`
- `getMyPowerUps`, `equip` (line 11) — `../powerups.ts`
- `renderLoadoutPicker` (line 12) — `../reference-arsenal.loadout.ts`
- `type CurrentDebate` (line 13) — `./arena-types.ts` (type-only)

### Types / Interfaces
- `LoadoutPreset` (lines 17–22) — `id: string; name: string; reference_ids: string[]; powerup_effect_ids: string[]`

### Module-level bindings
None.

### Functions
| Name | Line | Visibility | Notes |
|---|---|---|---|
| `renderPresetBar` | 31 | exported | async, public API |
| `renderBar` | 50 | internal | sync |
| `applyPreset` | 123 | internal | async |
| `handleSave` | 181 | internal | async |
| `handleDelete` | 236 | internal | async |

---

## Agent 03

### Imports
- `safeRpc` — `../auth.ts`
- `escapeHTML` — `../config.ts`
- `getMyPowerUps`, `equip` — `../powerups.ts`
- `renderLoadoutPicker` — `../reference-arsenal.loadout.ts`
- `type CurrentDebate` — `./arena-types.ts`

### Types / Interfaces
- `LoadoutPreset` (lines 17–22)

### Module-level bindings
None.

### Functions
| Name | Exported | Async | Params | Line |
|---|---|---|---|---|
| `renderPresetBar` | yes | yes | 4 | 31 |
| `renderBar` | no | no | 5 | 50 |
| `applyPreset` | no | yes | 5 | 123 |
| `handleSave` | no | yes | 5 | 181 |
| `handleDelete` | no | yes | 6 | 236 |

---

## Agent 04

### Imports
- `safeRpc` — `../auth.ts`
- `escapeHTML` — `../config.ts`
- `getMyPowerUps`, `equip` — `../powerups.ts`
- `renderLoadoutPicker` — `../reference-arsenal.loadout.ts`
- `type CurrentDebate` — `./arena-types.ts`
- Dynamic imports inside `applyPreset`: `renderLoadout`, `wireLoadout` from `../powerups.ts`; `getCurrentProfile` from `../auth.ts`

### Types / Interfaces
- `LoadoutPreset` (line 17) — 4 fields

### Module-level bindings
None.

### Functions
| Name | Line | Async | Exported |
|---|---|---|---|
| `renderPresetBar` | 31 | async | yes |
| `renderBar` | 50 | sync | no |
| `applyPreset` | 123 | async | no |
| `handleSave` | 181 | async | no |
| `handleDelete` | 236 | async | no |

---

## Agent 05

### Imports
- Static: `safeRpc`, `escapeHTML`, `getMyPowerUps`, `equip`, `renderLoadoutPicker`, `type CurrentDebate`
- Dynamic (inside `applyPreset`): `renderLoadout`, `wireLoadout` from `../powerups.ts`; `getCurrentProfile` from `../auth.ts`

### Types / Interfaces
- `LoadoutPreset` (line 17) — `id: string`, `name: string`, `reference_ids: string[]`, `powerup_effect_ids: string[]`

### Module-level bindings
None.

### Functions
| Name | Line | Async | Exported |
|---|---|---|---|
| `renderPresetBar` | 31 | async | yes |
| `renderBar` | 50 | sync | no |
| `applyPreset` | 123 | async | no |
| `handleSave` | 181 | async | no |
| `handleDelete` | 236 | async | no |

## Cross-Agent Consensus
All 5 agents agree: 5 functions at lines 31, 50, 123, 181, 236. `renderPresetBar` exported; all others internal. No module-level bindings. 1 interface (`LoadoutPreset`). All agents noted dynamic imports inside `applyPreset` body.
