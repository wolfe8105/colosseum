# Anchor List — tournaments.ts

1. initTournaments  (line 25)

## Resolution notes

- `checkMyTournamentMatch`, `startTournamentMatchPoll`, `stopTournamentMatchPoll`, `getPendingMatch`: re-exported from `tournaments.indicator.ts` — not defined in this file; excluded.
- `createTournament`, `joinTournament`, `cancelTournament`, `getActiveTournaments`, `getTournamentBracket`, `resolveTournamentMatch`: re-exported from `tournaments.rpc.ts` — not defined in this file; excluded.
- `renderTournamentBanner`, `renderTournamentCard`: re-exported from `tournaments.render.ts` — not defined in this file; excluded.
- `Tournament`, `TournamentMatch`, `BracketMatch`: type re-exports — not function definitions; excluded.
