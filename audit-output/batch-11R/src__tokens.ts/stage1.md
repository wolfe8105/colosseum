# Stage 1 Outputs — tokens.ts

## Agent 01

| Line | Operation | Name | Exported |
|------|-----------|------|----------|
| 1 | comment | (file header block) | no |
| 10 | import | showToast, escapeHTML from './config.ts' | no |
| 11 | import | safeRpc, getCurrentUser, getCurrentProfile, getIsPlaceholderMode, onChange from './auth.ts' | no |
| 12 | import | type Profile from './auth.ts' | no |
| 13 | import | nudge from './nudge.ts' | no |
| 19 | export type | MilestoneKey | yes |
| 34 | export interface | MilestoneDefinition | yes |
| 41 | export interface | ClaimResult | yes |
| 57 | export interface | MilestoneListItem | yes |
| 62 | export interface | TokenSummary | yes |
| 72 | bind name to value | lastKnownBalance | no |
| 73 | bind name to value | milestoneClaimed | no |
| 74 | bind name to value | dailyLoginClaimed | no |
| 75 | bind name to value | _dailyLoginInFlight | no |
| 76 | bind name to value | _bc | no |
| 82 | bind name to value | MILESTONES | yes |
| 102 | bind name to value | cssInjected | no |
| 104 | declare function | _injectCSS | no |
| 154 | declare function | _coinFlyUp | no |
| 171 | declare function | _tokenToast | no |
| 179 | declare function | _milestoneToast | no |
| 202 | declare function | _updateBalanceDisplay | no |
| 216 | declare function | updateBalance | yes |
| 226 | declare function | _rpc | no |
| 246 | declare function | requireTokens | yes |
| 261 | declare function | claimMilestone | yes |
| 277 | declare function | _loadMilestones | yes |
| 286 | declare function | _checkStreakMilestones | no |
| 297 | declare function | claimDailyLogin | yes |
| 328 | declare function | claimHotTake | yes |
| 340 | declare function | claimReaction | yes |
| 350 | declare function | claimVote | yes |
| 362 | declare function | claimDebate | yes |
| 385 | declare function | claimAiSparring | yes |
| 395 | declare function | claimPrediction | yes |
| 405 | declare function | checkProfileMilestones | yes |
| 417 | declare function | getSummary | yes |
| 424 | declare function | getMilestoneList | yes |
| 436 | declare function | getBalance | yes |
| 444 | declare function | _initBroadcast | no |
| 459 | declare function | init | yes |
| 480 | bind name to value | tokens | no |
| 498 | top-level statement | export default tokens | yes |
| 506 | top-level statement | (if document.readyState conditional — auto-init) | no |

## Agent 02

| Line | Name | Kind | Exported |
|------|------|------|----------|
| 104 | _injectCSS | function declaration | No |
| 154 | _coinFlyUp | function declaration | No |
| 171 | _tokenToast | function declaration | No |
| 179 | _milestoneToast | function declaration | No |
| 202 | _updateBalanceDisplay | function declaration | No |
| 216 | updateBalance | function declaration | Yes |
| 226 | _rpc | async function declaration | No |
| 246 | requireTokens | function declaration | Yes |
| 261 | claimMilestone | async function declaration | Yes |
| 277 | _loadMilestones | async function declaration | Yes |
| 286 | _checkStreakMilestones | function declaration | No |
| 297 | claimDailyLogin | async function declaration | Yes |
| 328 | claimHotTake | async function declaration | Yes |
| 340 | claimReaction | async function declaration | Yes |
| 350 | claimVote | async function declaration | Yes |
| 362 | claimDebate | async function declaration | Yes |
| 385 | claimAiSparring | async function declaration | Yes |
| 395 | claimPrediction | async function declaration | Yes |
| 405 | checkProfileMilestones | async function declaration | Yes |
| 417 | getSummary | async function declaration | Yes |
| 424 | getMilestoneList | function declaration | Yes |
| 436 | getBalance | function declaration | Yes |
| 444 | _initBroadcast | function declaration | No |
| 459 | init | function declaration | Yes |

## Agent 03

Confirmed 24 entries — identical list to Agent 02. No const arrow function bindings. Excluded: MILESTONES (object literal), tokens (object literal), get balance()/get MILESTONES() (accessor properties inside tokens object), lastKnownBalance/milestoneClaimed/dailyLoginClaimed/_dailyLoginInFlight/_bc/cssInjected (non-function bindings).

## Agent 04

Confirmed 24 entries — identical list to Agents 02 and 03. No const arrow function bindings found. Items correctly excluded: MILESTONES (line 82) as object literal, tokens (line 480) as object literal default export, all type/interface declarations, all non-function state bindings.

## Agent 05

Confirmed 24 entries — identical list. Additional note: _loadMilestones (line 277) carries `export` keyword despite leading underscore naming convention — it is intentionally exported. No const arrow function bindings in this file.
