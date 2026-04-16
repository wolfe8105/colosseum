# Wave 0-D — Delete Root Orphan Files

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Delete two dead-code files from the repo root.

These are the original pre-split monoliths. The live versions are in src/arena/.
Evidence: both have broken imports referencing files that no longer exist,
neither appears in the Vite build entry, and git log shows a prior delete
attempt that was reverted by accident.

FILES TO DELETE:
  arena-feed-room.ts      (root, 1648 lines)
  arena-feed-realtime.ts  (root, 337 lines)

Steps:
1. Confirm neither file is imported by any file in src/, lib/, api/ or any
   HTML entry point (grep -r "arena-feed-room\|arena-feed-realtime" . --include="*.ts" --include="*.js" --include="*.html" --exclude-dir=node_modules --exclude-dir=.git)
2. If no live imports found, delete both files.
3. Run npm run build. Confirm zero errors.
4. Commit: "chore: delete root orphan files arena-feed-room.ts + arena-feed-realtime.ts"
5. Push.

Do NOT touch any files in src/arena/. Only the root-level copies.
```

AFTER BUILD PASSES — commit and push to main:
```
git add -A
git commit -m "refactor: <describe what was split>"
git push origin HEAD:main
```
Confirm the push succeeded before ending the session.
