# Anchor List — tournaments.ts

1. initTournaments  (line 25)

## Resolution notes

- `checkMyTournamentMatch`, `startTournamentMatchPoll`, `stopTournamentMatchPoll`, `getPendingMatch` (line 17 re-export): excluded — these are re-exported from `tournaments.indicator.ts`; they have no definition body in this file.
- `createTournament`, `joinTournament`, `cancelTournament`, `getActiveTournaments`, `getTournamentBracket`, `resolveTournamentMatch` (line 18 re-export): excluded — re-exported from `tournaments.rpc.ts`; no definition body in this file.
- `renderTournamentBanner`, `renderTournamentCard` (line 19 re-export): excluded — re-exported from `tournaments.render.ts`; no definition body in this file.
- `Tournament`, `TournamentMatch`, `BracketMatch` (line 16 re-export): excluded — type re-exports, not callable function definitions.
