# Stage 1 Outputs — rivals-presence.ts

## Agent 01
1. line 1–10: comment (JSDoc block)
2. line 12: import — `getSupabaseClient, getCurrentUser, getIsPlaceholderMode` from `'./auth.ts'`
3. line 13: import — `FEATURES` from `'./config.ts'`
4. line 14: import — `buildRivalSet, startPresence` from `'./rivals-presence-channel.ts'`
5. line 15: import — `queueAlert` from `'./rivals-presence-popup.ts'`
6. line 16: import — `type PopupState` from `'./rivals-presence-popup.ts'`
7. line 17: import — `type ChannelState` from `'./rivals-presence-channel.ts'`
8. line 19–21: comment (line comments — section header)
9. line 23–27: export — exported interface `PresencePayload`
10. line 29–31: comment (line comments — section header)
11. line 33: bind name to value — not exported, `PresenceChannel` (type alias)
12. line 35: bind name to value — not exported, `rivalSet`
13. line 36: bind name to value — not exported, `onlineRivals`
14. line 37: bind name to value — not exported, `popupState`
15. line 38: bind name to value — not exported, `channelRef`
16. line 39: bind name to value — not exported, `initialized`
17. line 41–43: comment (line comments — section header)
18. line 45–63: function declaration — exported, `init`
19. line 65–79: function declaration — exported, `destroy`
20. line 81–83: comment (line comments — section header)
21. line 85: bind name to value — not exported, `rivalsPresence`
22. line 86: export — default export of `rivalsPresence`

## Agent 02
[Identical — same 22 entries; minor classification difference: item 18 listed as "bind name to function definition" for `init`.]

## Agent 03
[Identical — same 22 entries; `init` listed as "function declaration — exported".]

## Agent 04
[Identical — same 22 entries.]

## Agent 05
[Identical — same 22 entries; item 18 listed as "bind name to function definition" for `init`.]
