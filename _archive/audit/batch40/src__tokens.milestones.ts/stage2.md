# Stage 2 Outputs — tokens.milestones.ts

## Agent 01

### claimMilestone

This async function reads the `milestoneClaimed` Set to check if the supplied `key` has already been claimed (line 29), then reads the `MILESTONES` object to get the definition (line 30). It calls `_rpc('claim_milestone', { p_milestone_key: key })` to attempt a backend claim (line 32). If the RPC returns `result?.success === false`, it checks if the error is 'Already claimed' and adds the key to `milestoneClaimed` if so, then returns null (lines 33–35). On success, it writes the key to `milestoneClaimed` (line 37), then calls `_updateBalanceDisplay(result.new_balance)` if a new balance is available (line 38), calls `_milestoneToast()` to show a toast notification (line 39), logs to console (line 40), and returns the full `result` object (line 41).

### _loadMilestones

This async function calls `_rpc('get_my_milestones')` with no arguments (line 45). If the result is falsy or `success` is false, it returns early (line 46). Otherwise, it casts the result to an object with an optional `claimed` string array property (line 47), then writes each claimed milestone key into the `milestoneClaimed` Set via iteration (line 48). It returns `void`.

### _checkStreakMilestones

This synchronous function reads the `streak` parameter and returns early if it is falsy (line 52). For each streak threshold (7, 30, 100), it calls `claimMilestone()` with the void operator to discard the Promise (lines 53–55). It returns `void`.

### getMilestoneList

This synchronous function reads the `MILESTONES` object via `Object.entries()` and maps each entry to a new object (lines 59–61). For each milestone, it combines the key and definition spread with a `claimed` boolean read from `milestoneClaimed.has(key)`. It returns an array of `MilestoneListItem[]`.

### checkProfileMilestones

This async function reads the `completedCount` parameter and returns early if it is falsy (line 68). At thresholds 3, 6, and 12, it calls `claimMilestone()` with the void operator (lines 69–72). At threshold 3, it also calls `claimMilestone('verified_gladiator')` and dynamically imports `'./onboarding-drip.ts'` and invokes `triggerDripDay(6)`, swallowing any errors (lines 73–75). It returns `void`.

## Agent 02

### claimMilestone

This async function reads the global `milestoneClaimed` Set and the `MILESTONES` constant. If the key is in `milestoneClaimed` or not found in `MILESTONES`, returns null immediately. Calls `_rpc('claim_milestone', { p_milestone_key: key })`. If the RPC result lacks a success flag, checks if error is 'Already claimed' and adds to `milestoneClaimed` if so before returning null. On success, adds key to `milestoneClaimed`, calls `_updateBalanceDisplay` if new balance present, triggers `_milestoneToast`, logs to console, returns RPC result.

### _loadMilestones

Calls `_rpc('get_my_milestones')` without parameters. If result lacks success flag, returns early. Otherwise extracts `claimed` property (with type cast), checks it is an array, and adds each element to `milestoneClaimed`. Returns `Promise<void>`.

### _checkStreakMilestones

Synchronous. Returns early if streak is falsy. Calls `claimMilestone('streak_7')` if >= 7, `claimMilestone('streak_30')` if >= 30, `claimMilestone('streak_100')` if >= 100, each prefixed with `void`. Returns void.

### getMilestoneList

Reads `MILESTONES` and `milestoneClaimed`. Maps `Object.entries(MILESTONES)` to `MilestoneListItem` objects by spreading definition and adding `claimed: milestoneClaimed.has(key)`. Returns array.

### checkProfileMilestones

Async. Returns early if `completedCount` falsy. Calls `claimMilestone('profile_3_sections')` and `claimMilestone('verified_gladiator')` (both void) at >= 3. Calls `claimMilestone('profile_6_sections')` at >= 6. Calls `claimMilestone('profile_12_sections')` at >= 12. At >= 3, dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(6)`, silently catching errors. Returns `Promise<void>`.

## Agent 03

### claimMilestone

Reads `milestoneClaimed` Set and `MILESTONES` object. Calls `_rpc('claim_milestone', ...)`. If RPC indicates success, adds key to `milestoneClaimed`, calls `_updateBalanceDisplay()` with new balance if provided, calls `_milestoneToast()`, logs, returns ClaimResult. If already claimed (key in Set) or def missing or RPC fails, returns null. If RPC error is 'Already claimed', adds key to `milestoneClaimed`. Async.

### _loadMilestones

Calls `_rpc('get_my_milestones')`. If success, extracts `claimed` array and adds each key to `milestoneClaimed`. Returns undefined. Async.

### _checkStreakMilestones

Synchronous. Returns if streak falsy. Conditionally calls `claimMilestone()` via void for 'streak_7', 'streak_30', 'streak_100' at thresholds 7, 30, 100. Returns undefined.

### getMilestoneList

Reads `MILESTONES` and `milestoneClaimed`. Maps Object.entries to MilestoneListItem array. Returns array.

### checkProfileMilestones

Async. Returns if completedCount falsy. Calls claimMilestone via void for profile_3_sections (>=3), profile_6_sections (>=6), profile_12_sections (>=12), verified_gladiator (>=3). At >=3, dynamically imports onboarding-drip.ts and calls triggerDripDay(6), catching errors. Returns void.

## Agent 04

### claimMilestone

Checks `milestoneClaimed` for key membership. Returns null if found. Looks up definition in `MILESTONES`. Calls `_rpc('claim_milestone', { p_milestone_key: key })`. If RPC fails, adds key to milestoneClaimed if error is 'Already claimed', returns null. On success, adds key to milestoneClaimed, calls `_updateBalanceDisplay` with new balance if present, calls `_milestoneToast`, logs, returns result. Async.

### _loadMilestones

Calls `_rpc('get_my_milestones')`. If result does not indicate success, returns void. Extracts `claimed` field, if array iterates and adds each key to `milestoneClaimed`. Async, returns void Promise.

### _checkStreakMilestones

Synchronous. Returns if streak falsy. Calls `claimMilestone` via void for streak_7 (>=7), streak_30 (>=30), streak_100 (>=100). Returns void.

### getMilestoneList

Reads MILESTONES and milestoneClaimed. Object.entries map to MilestoneListItem with claimed boolean. Returns array.

### checkProfileMilestones

Async. Returns void if completedCount falsy. Calls claimMilestone via void for profile_3_sections (>=3), profile_6_sections (>=6), profile_12_sections (>=12), verified_gladiator (>=3). At >=3, dynamically imports onboarding-drip.ts, calls triggerDripDay(6), catches errors silently. Returns void Promise.

## Agent 05

### claimMilestone

Reads `milestoneClaimed` Set and `MILESTONES`. Checks key in milestoneClaimed — if present, returns null immediately. Retrieves def from MILESTONES. Calls `_rpc('claim_milestone', { p_milestone_key: key })`. If RPC fails: adds key to milestoneClaimed only if error is 'Already claimed', returns null. On success: adds key to milestoneClaimed, calls `_updateBalanceDisplay(result.new_balance)` if not null, calls `_milestoneToast()` with icon/label/tokens/freezes, logs, returns result. Async.

### _loadMilestones

Calls `_rpc('get_my_milestones')`. If result has no success property, returns immediately. Casts result to object with optional claimed array, iterates and adds each key to `milestoneClaimed`. Returns void. Async.

### _checkStreakMilestones

Synchronous. If streak falsy, returns immediately. Calls claimMilestone via void for streak_7 (>=7), streak_30 (>=30), streak_100 (>=100). Returns void.

### getMilestoneList

Reads MILESTONES and milestoneClaimed. Maps Object.entries(MILESTONES) to MilestoneListItem array spreading definition and adding claimed boolean. Returns array.

### checkProfileMilestones

Async. If completedCount falsy, returns void. Calls claimMilestone via void for profile_3_sections (>=3), profile_6_sections (>=6), profile_12_sections (>=12), verified_gladiator (>=3). At >=3, dynamically imports onboarding-drip.ts, calls triggerDripDay(6), swallows errors. Returns void.
