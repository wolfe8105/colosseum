# Anchor List — voicememo.player.ts (Run 2)

1. renderPlayer (line 10)
2. playInline (line 38)
3. togglePlayback (line 59)
4. resetPlayingState (line 80)

## Resolution notes

- audio.onended arrow callbacks in playInline (line 51) and togglePlayback (lines 73-76): inner callbacks assigned to property, not top-level bindings.
- isPlayingState (line 8): variable binding to false, not a function definition.
