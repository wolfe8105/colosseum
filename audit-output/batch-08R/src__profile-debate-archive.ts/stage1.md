# Stage 1 Outputs — src/profile-debate-archive.ts

## Agent 01

| Lines | Primitive | Name |
|-------|-----------|------|
| 1–4 | comment | — |
| 5 | blank | — |
| 6–8 | import | `getCurrentUser`, `safeRpc` / `showAdInterstitial` / `escapeHTML`, `showToast` |
| 9 | blank | — |
| 10 | comment | — |
| 11–37 | bind name to type | `ArchiveEntry` |
| 38 | blank | — |
| 39–50 | bind name to type | `RecentDebate` |
| 51–55 | blank/comment | — |
| 56 | bind name to value | `_entries` |
| 57 | bind name to value | `_filterCat` |
| 58 | bind name to value | `_filterResult` |
| 59 | bind name to value | `_filterSearch` |
| 60 | bind name to value | `_isOwner` |
| 61 | bind name to value | `_cssInjected` |
| 62–66 | blank/comment | — |
| 67–155 | bind name to function | `_injectCSS` |
| 156–165 | bind name to function | `_archiveUrl` |
| 166–185 | bind name to function | `_filtered` |
| 186–271 | bind name to function | `_renderTable` |
| 272–332 | bind name to function | `_wireTable` |
| 333–380 | bind name to function | `_showAddPicker` |
| 381–437 | bind name to function | `_showEditSheet` |
| 438–452 | bind name to function | `_toggleHide` |
| 453–464 | bind name to function | `_removeEntry` |
| 465–482 | bind name to function | `_loadAndRender` |
| 483–503 | bind name to function (exported) | `loadDebateArchive` |
| 504–522 | bind name to function (exported) | `loadPublicDebateArchive` |

**Named callable bindings**

| Line | Name | Exported |
|------|------|----------|
| 67 | `_injectCSS` | no |
| 156 | `_archiveUrl` | no |
| 166 | `_filtered` | no |
| 186 | `_renderTable` | no |
| 272 | `_wireTable` | no |
| 333 | `_showAddPicker` | no |
| 381 | `_showEditSheet` | no |
| 438 | `_toggleHide` | no |
| 453 | `_removeEntry` | no |
| 465 | `_loadAndRender` | no |
| 483 | `loadDebateArchive` | yes |
| 504 | `loadPublicDebateArchive` | yes |

---

## Agent 02

| Lines | Primitive | Name |
|-------|-----------|------|
| 1–8 | comment/blank | — |
| 9 | comment | — |
| 10 | import | `getCurrentUser`, `safeRpc` |
| 11 | import | `showAdInterstitial` |
| 12 | import | `escapeHTML`, `showToast` |
| 13–17 | blank/comment | — |
| 18–37 | bind name to type | `ArchiveEntry` |
| 38 | blank | — |
| 39–50 | bind name to type | `RecentDebate` |
| 51–55 | blank/comment | — |
| 56 | bind name to value | `_entries` |
| 57 | bind name to value | `_filterCat` |
| 58 | bind name to value | `_filterResult` |
| 59 | bind name to value | `_filterSearch` |
| 60 | bind name to value | `_isOwner` |
| 61 | bind name to value | `_cssInjected` |
| 62–66 | blank/comment | — |
| 67 | bind name to function | `_injectCSS` |
| 156 | bind name to function | `_archiveUrl` |
| 166 | bind name to function | `_filtered` |
| 186 | bind name to function | `_renderTable` |
| 272 | bind name to function | `_wireTable` |
| 333 | bind name to function | `_showAddPicker` |
| 381 | bind name to function | `_showEditSheet` |
| 438 | bind name to function | `_toggleHide` |
| 453 | bind name to function | `_removeEntry` |
| 465 | bind name to function | `_loadAndRender` |
| 483 | bind name to function (exported) | `loadDebateArchive` |
| 504 | bind name to function (exported) | `loadPublicDebateArchive` |

**Named callable bindings**

| Line | Name | Exported |
|------|------|----------|
| 67 | `_injectCSS` | no |
| 156 | `_archiveUrl` | no |
| 166 | `_filtered` | no |
| 186 | `_renderTable` | no |
| 272 | `_wireTable` | no |
| 333 | `_showAddPicker` | no |
| 381 | `_showEditSheet` | no |
| 438 | `_toggleHide` | no |
| 453 | `_removeEntry` | no |
| 465 | `_loadAndRender` | no |
| 483 | `loadDebateArchive` | yes |
| 504 | `loadPublicDebateArchive` | yes |

---

## Agent 03

(Same binding structure as Agents 01–02; all 12 named callables identified at same lines.)

**Named callable bindings**

| Line | Name | Exported |
|------|------|----------|
| 67 | `_injectCSS` | no |
| 156 | `_archiveUrl` | no |
| 166 | `_filtered` | no |
| 186 | `_renderTable` | no |
| 272 | `_wireTable` | no |
| 333 | `_showAddPicker` | no |
| 381 | `_showEditSheet` | no |
| 438 | `_toggleHide` | no |
| 453 | `_removeEntry` | no |
| 465 | `_loadAndRender` | no |
| 483 | `loadDebateArchive` (exported) | yes |
| 504 | `loadPublicDebateArchive` (exported) | yes |

---

## Agent 04

(Same binding structure as Agents 01–02; all 12 named callables identified at same lines.)

**Named callable bindings**

| Line | Name | Exported |
|------|------|----------|
| 67 | `_injectCSS` | no |
| 156 | `_archiveUrl` | no |
| 166 | `_filtered` | no |
| 186 | `_renderTable` | no |
| 272 | `_wireTable` | no |
| 333 | `_showAddPicker` | no |
| 381 | `_showEditSheet` | no |
| 438 | `_toggleHide` | no |
| 453 | `_removeEntry` | no |
| 465 | `_loadAndRender` | no |
| 483 | `loadDebateArchive` | yes |
| 504 | `loadPublicDebateArchive` | yes |

---

## Agent 05

(Same named callables as all other agents; provided overly granular interface field inventory but named callable bindings are identical.)

**Named callable bindings**

| Line | Name | Exported |
|------|------|----------|
| 67 | `_injectCSS` | no |
| 156 | `_archiveUrl` | no |
| 166 | `_filtered` | no |
| 186 | `_renderTable` | no |
| 272 | `_wireTable` | no |
| 333 | `_showAddPicker` | no |
| 381 | `_showEditSheet` | no |
| 438 | `_toggleHide` | no |
| 453 | `_removeEntry` | no |
| 465 | `_loadAndRender` | no |
| 483 | `loadDebateArchive` | yes |
| 504 | `loadPublicDebateArchive` | yes |
