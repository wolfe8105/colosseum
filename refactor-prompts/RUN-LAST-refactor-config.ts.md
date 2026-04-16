# Refactor Prompt — src/config.ts (482 lines → 3 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/config.ts (482 lines).

Read CLAUDE.md first, then read src/config.ts in full before touching anything.

⚠️ HIGH BLAST RADIUS: config.ts is imported by ~125 files across the codebase.
Every import path change will require updating those files. This must be done
carefully. The safest strategy is to extract self-contained sections ONLY —
sections with no shared state dependencies — and keep the main file as the
canonical entry point.

SPLIT MAP (verify against file before executing):

  src/config.types.ts  (~100 lines)
    Keeps: ALL TypeScript interface and type declarations:
           ToastType, StripePrices, IceServer, AppSettings, SubscriptionTier,
           SubscriptionTiers, TokenEarning, TokenConfig, DebateSettings,
           FeatureFlags, TopicSection, PlaceholderMode, ModeratorConfig
    Imports: nothing

  src/config.toast.ts  (~75 lines)
    Keeps: _toastTimeout, _toastKeyframeInjected module-level vars, showToast function
    Imports: import type { ToastType } from './config.types.ts'

  src/config.ts  (orchestrator/main, ~310 lines)
    Keeps: all credentials, constants, FEATURES, SECTIONS, TIERS, TOKENS, DEBATE,
           escapeHTML, UUID_RE, friendlyError, isPlaceholder, placeholderMode,
           isAnyPlaceholder, named exports, default export
    Removes: showToast (imported from config.toast.ts), all interfaces (imported
             from config.types.ts)
    Re-exports: showToast from config.toast.ts (so all existing imports still work)
    Re-exports: all types from config.types.ts (so no import path changes needed
                in the 125 dependent files)

CRITICAL: The re-exports in config.ts MUST preserve every named export that
currently exists. No existing import should need to change. Test with:
grep -r "from.*config" src --include="*.ts" | head -5
to spot-check that config.ts is still the single entry point.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: config.types.ts → config.toast.ts → config.ts.
- Run npm run build after the split. Zero errors — any build error means an
  import path broke, find and fix before committing.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-CONFIG-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
