# Refactor Prompt — src/analytics.ts (242 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/analytics.ts (242 lines).

Read CLAUDE.md first, then read src/analytics.ts in full before touching anything.
This file has two distinct concerns: data collection utilities (visitor ID,
traffic source, user ID, opt-out, key migration) and event firing (trackEvent,
checkSignup). These are separate layers — utilities have no side effects,
event firing calls the network.

SPLIT MAP (verify against file before executing):

  src/analytics.utils.ts  (~130 lines)
    Keeps: TrafficSource and EventMetadata type definitions,
            KEY_MIGRATIONS constant, _migrated flag,
            migrateKeys, isOptedOut, setAnalyticsOptOut,
            getVisitorId, getTrafficSource, getUserId
    These are pure read/write utilities with no network calls.
    Imports: SUPABASE_URL from config.ts (getUserId needs it)

  src/analytics.ts  (~115 lines)
    Keeps: trackEvent, checkSignup, ModeratorAnalytics facade,
            auto-init (checkSignup call on import)
    Imports: import type { TrafficSource, EventMetadata } from './analytics.utils.ts'
    Imports: migrateKeys, isOptedOut, getVisitorId, getTrafficSource, getUserId
             from ./analytics.utils.ts
    Re-exports: TrafficSource, EventMetadata, isOptedOut, setAnalyticsOptOut,
                getVisitorId, getTrafficSource, getUserId
                (preserves existing import paths for any callers)

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: analytics.utils.ts → analytics.ts.
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-ANALYTICS-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
