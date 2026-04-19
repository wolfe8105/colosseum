# Anchor List — notifications.actions.ts

1. timeAgo  (line 10)
2. markRead  (line 25)
3. markAllRead  (line 36)

## Resolution notes

No candidates were excluded. All three items identified by the five agents meet the definition: each is a top-level exported function declaration. A full scan of the source confirms no additional function definitions were missed — the only other callables present are imported identifiers (`safeRpc`, `getIsPlaceholderMode`, `getSupabaseClient`, `markOneRead`, `markAllAsRead`, `updateBadge`, `renderList`), which are not defined in this file.
