# Stage 2 Outputs — reference-arsenal.constants.ts

## Agent 01
### [No functions on anchor list]

The file contains five exported constant value bindings with no runtime computation:

**SOURCE_TYPES** (line 9): A Record mapping source type keys to objects with static properties (label, ceiling, tier). All values are literals — no computation occurs at load time.

**CATEGORIES** (line 17): An array of string literals representing reference categories. Purely declarative; no runtime computation.

**CATEGORY_LABELS** (line 21): A Record mapping category keys to display label strings. All values are static string literals.

**RARITY_COLORS** (line 30): A Record mapping rarity enum keys to hardcoded hex color strings. Flagged with a TODO comment indicating these values are hardcoded rather than using CSS var tokens. No runtime computation — all values are static string literals.

**CHALLENGE_STATUS_LABELS** (line 38): A Record mapping challenge status keys to label strings, some containing emoji prefixes. All values are static string literals with no runtime computation.

Summary: All five constants are lookup tables with only literal values. No computation, transformation, or side effects occur at module load time.

## Agent 02
### [No functions on anchor list]

**Module-level runtime effects:** This file contains **five exported constants** that are all **pure data structures with zero runtime computation**:

1. **SOURCE_TYPES** — A Record<SourceType, { label: string; ceiling: number; tier: string }> mapping source type keys to descriptive metadata. Defined as static object literal.
2. **CATEGORIES** — An array of string literals (ReferenceCategory[]) containing category names. Pure array literal, no computation.
3. **CATEGORY_LABELS** — A Record<ReferenceCategory, string> mapping category keys to display labels. Static object literal.
4. **RARITY_COLORS** — A Record<Rarity, string> mapping rarity levels to hex color codes. **Contains a TODO comment on line 29** noting that "all RARITY_COLORS values are hardcoded" and indicating these should be replaced with CSS variable tokens. The colors are static hardcoded hex strings with no runtime computation.
5. **CHALLENGE_STATUS_LABELS** — A Record<ChallengeStatus, string> mapping status keys to display labels (including emoji strings). Pure static object literal.

## Agent 03
### [No functions on anchor list]

This module contains only static constant exports with no runtime computation at module load time.

1. **SOURCE_TYPES** (line 9-15): Record mapping source type keys to objects containing label, ceiling, and tier properties. All values are static literals.
2. **CATEGORIES** (line 17-19): Simple array of category strings. Statically defined.
3. **CATEGORY_LABELS** (line 21-27): Record mapping category keys to display strings. Static.
4. **RARITY_COLORS** (line 30-36): Record mapping rarity types to hex color strings. **TODO comment on line 29** flags that all color values are hardcoded hex codes and should use CSS variable tokens instead.
5. **CHALLENGE_STATUS_LABELS** (line 38-43): Record mapping challenge status keys to label strings (some with emoji indicators). Statically defined.

## Agent 04
### [No functions on anchor list]

Five exported constants, all static declarations with no runtime behavior:

**SOURCE_TYPES** — Record mapping source type keys to static label/ceiling/tier objects. No computed values.
**CATEGORIES** — Array of string literals (politics, sports, entertainment, music, couples_court). No runtime behavior.
**CATEGORY_LABELS** — Record mapping category keys to display labels. Static mapping.
**RARITY_COLORS** — Record mapping rarity levels to hardcoded hex strings. **Note:** Line 29 TODO comment flags these should use CSS variable tokens. Static values only.
**CHALLENGE_STATUS_LABELS** — Record mapping challenge status keys to label strings with emoji prefixes. Static.

**Module-level behavior:** None. Pure constants file with no initialization logic.

## Agent 05
### [No functions on anchor list]

Five exported constants — all static object literals with no runtime computation at module load time:

1. **SOURCE_TYPES** — Record mapping source type keys to objects with label, ceiling, tier properties. Hardcoded literals.
2. **CATEGORIES** — Array of five category strings: politics, sports, entertainment, music, couples_court.
3. **CATEGORY_LABELS** — Record mapping category keys to display labels. All string values hardcoded.
4. **RARITY_COLORS** — Record mapping rarity levels to hex color strings. **Notable: Line 29 contains a TODO comment flagging hardcoded hex codes should be replaced with CSS variable tokens.**  Includes the `none` challenge status mapping to an empty string.
5. **CHALLENGE_STATUS_LABELS** — Record with emoji-prefixed labels for disputed/heavily_disputed/frozen statuses; empty string for none.

**Module-level behavior:** None. Pure declarative constants file.
