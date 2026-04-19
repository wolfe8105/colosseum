# Stage 2 Outputs — tournaments.rpc.ts

## Agent 01

### createTournament
This async function accepts parameters for tournament title, category, entry fee, start time, and optional maximum players. It first checks `getIsPlaceholderMode()` and returns an error object if placeholder mode is active. Otherwise, it calls `safeRpc()` with the RPC name `'create_tournament'` and passes the input parameters mapped to prefixed keys, defaulting `max_players` to 64 if not provided. After awaiting the RPC result, it checks for a network error in the error field and returns an error object with the message if one exists. If no network error, it checks the data object's error field and returns that if present. On success, it returns an object containing the `tournament_id` from the response data.

### joinTournament
This async function accepts a tournament ID string. It checks `getIsPlaceholderMode()` and returns an error object if active. It then calls `safeRpc()` with the RPC name `'join_tournament'` and passes the tournament ID as `p_tournament_id`. After awaiting the result, it checks for a network error and returns an error object if one exists. If no network error, it checks the data object's error field and returns that if present. On success, it returns an object with `success: true`.

### cancelTournament
This async function accepts a tournament ID string. It checks `getIsPlaceholderMode()` and returns an error object if active. It calls `safeRpc()` with the RPC name `'cancel_tournament'` and passes the tournament ID as `p_tournament_id`. After awaiting the result, it checks for a network error and returns an error object if one exists. If no network error, it checks the data object's error field and returns that if present. On success, it returns an object with `success: true`.

### getActiveTournaments
This async function accepts an optional category string parameter. It checks `getIsPlaceholderMode()` and returns an empty array if active. It calls `safeRpc()` with the RPC name `'get_active_tournaments'` and passes the category as `p_category`, substituting null if the category is undefined. After awaiting the result, it checks for a network error or missing data and returns an empty array if either condition is true. Otherwise, it returns the data array.

### getTournamentBracket
This async function accepts a tournament ID string. It checks `getIsPlaceholderMode()` and returns an empty array if active. It calls `safeRpc()` with the RPC name `'get_tournament_bracket'` and passes the tournament ID as `p_tournament_id`. After awaiting the result, it checks for a network error or missing data and returns an empty array if either condition is true. Otherwise, it returns the data array of bracket matches.

### resolveTournamentMatch
This async function accepts a match ID string and a winner ID string. It checks `getIsPlaceholderMode()` and returns an error object if active. It calls `safeRpc()` with the RPC name `'resolve_tournament_match'` and passes the match ID as `p_tournament_match_id` and the winner ID as `p_winner_id`. After awaiting the result, it checks for a network error and returns an error object with the message if one exists. If no network error, it checks the data object's error field and returns that if present. On success, it returns an object with `success: true` and includes the `tournament_complete` boolean flag from the response data.

## Agent 02

### createTournament
On invocation, the function reads the `params` argument containing title, category, entry_fee, starts_at, and optional max_players. It calls `getIsPlaceholderMode()` and if true, returns early with an error object `{ error: 'Not available' }`. If not in placeholder mode, it awaits a call to `safeRpc` with operation name 'create_tournament' and a mapped parameter object where max_players defaults to 64 if not provided. Upon the safeRpc response, it destructures `data` and `error`. If `error` exists, it returns an error object with either the error message or a fallback 'Failed to create tournament' string. If `data?.error` exists, it returns that error. Otherwise, it returns an object containing the tournament_id extracted from data. The function is async and awaits only the safeRpc call.

### joinTournament
On invocation, the function reads the `tournamentId` parameter. It calls `getIsPlaceholderMode()` and if true, returns early with `{ error: 'Not available' }`. If not in placeholder mode, it awaits a call to `safeRpc` with operation name 'join_tournament' and passes tournamentId as p_tournament_id. Upon the safeRpc response, it destructures `data` and `error`. If `error` exists, it returns an error object with either the error message or a fallback 'Failed to join' string. If `data?.error` exists, it returns that error. Otherwise, it returns `{ success: true }`. The function is async and awaits only the safeRpc call.

### cancelTournament
On invocation, the function reads the `tournamentId` parameter. It calls `getIsPlaceholderMode()` and if true, returns early with `{ error: 'Not available' }`. If not in placeholder mode, it awaits a call to `safeRpc` with operation name 'cancel_tournament' and passes tournamentId as p_tournament_id. Upon the safeRpc response, it destructures `data` and `error`. If `error` exists, it returns an error object with either the error message or a fallback 'Failed to cancel' string. If `data?.error` exists, it returns that error. Otherwise, it returns `{ success: true }`. The function is async and awaits only the safeRpc call.

### getActiveTournaments
On invocation, the function reads the optional `category` parameter. It calls `getIsPlaceholderMode()` and if true, returns early with an empty array. If not in placeholder mode, it awaits a call to `safeRpc` with operation name 'get_active_tournaments' and passes category (or null if undefined) as p_category. Upon the safeRpc response, it destructures `data` and `error`. If either `error` exists or `data` is falsy, it returns an empty array. Otherwise, it returns the data array directly. The function is async and awaits only the safeRpc call.

### getTournamentBracket
On invocation, the function reads the `tournamentId` parameter. It calls `getIsPlaceholderMode()` and if true, returns early with an empty array. If not in placeholder mode, it awaits a call to `safeRpc` with operation name 'get_tournament_bracket' and passes tournamentId as p_tournament_id. Upon the safeRpc response, it destructures `data` and `error`. If either `error` exists or `data` is falsy, it returns an empty array. Otherwise, it returns the data array directly. The function is async and awaits only the safeRpc call.

### resolveTournamentMatch
On invocation, the function reads the `matchId` and `winnerId` parameters. It calls `getIsPlaceholderMode()` and if true, returns early with `{ error: 'Not available' }`. If not in placeholder mode, it awaits a call to `safeRpc` with operation name 'resolve_tournament_match' and passes matchId as p_tournament_match_id and winnerId as p_winner_id. Upon the safeRpc response, it destructures `data` and `error`. If `error` exists, it returns an error object with either the error message or a fallback 'Failed to resolve match' string. If `data?.error` exists, it returns that error. Otherwise, it returns an object with success set to true and tournament_complete extracted from the data response. The function is async and awaits only the safeRpc call.

## Agent 03

### createTournament
Reads params object containing title, category, entry_fee, starts_at, and optional max_players; reads placeholder mode state via getIsPlaceholderMode(). Returns early with error if in placeholder mode. Calls safeRpc asynchronously with method 'create_tournament' and mapped params (max_players defaults to 64 if undefined). Awaits safeRpc response containing data and error properties. Returns error object if safeRpc error exists. Returns error object if data.error exists. Returns tournament_id from data if all checks pass. Does not write to module state.

### joinTournament
Reads tournamentId param and placeholder mode state via getIsPlaceholderMode(). Returns early with error if in placeholder mode. Calls safeRpc asynchronously with method 'join_tournament' and tournamentId mapped to p_tournament_id. Awaits safeRpc response. Returns error object if safeRpc error exists. Returns error object if data.error exists. Returns success true on success path. Does not write to module state.

### cancelTournament
Reads tournamentId param and placeholder mode state via getIsPlaceholderMode(). Returns early with error if in placeholder mode. Calls safeRpc asynchronously with method 'cancel_tournament' and tournamentId mapped to p_tournament_id. Awaits safeRpc response. Returns error object if safeRpc error exists. Returns error object if data.error exists. Returns success true on success path. Does not write to module state.

### getActiveTournaments
Reads optional category param and placeholder mode state via getIsPlaceholderMode(). Returns empty array immediately if in placeholder mode. Calls safeRpc asynchronously with method 'get_active_tournaments' and category mapped to p_category (defaults to null if undefined). Awaits safeRpc response. Returns empty array if error exists or data is falsy. Returns data array typed as Tournament[] on success. Does not write to module state.

### getTournamentBracket
Reads tournamentId param and placeholder mode state via getIsPlaceholderMode(). Returns empty array immediately if in placeholder mode. Calls safeRpc asynchronously with method 'get_tournament_bracket' and tournamentId mapped to p_tournament_id. Awaits safeRpc response. Returns empty array if error exists or data is falsy. Returns data array typed as BracketMatch[] on success. Does not write to module state.

### resolveTournamentMatch
Reads matchId and winnerId params and placeholder mode state via getIsPlaceholderMode(). Returns early with error if in placeholder mode. Calls safeRpc asynchronously with method 'resolve_tournament_match' and maps matchId to p_tournament_match_id and winnerId to p_winner_id. Awaits safeRpc response typed with success, tournament_complete, round_complete, and error fields. Returns error object if safeRpc error exists. Returns error object if data.error exists. Returns success true and tournament_complete field from data on success path. Does not write to module state.

## Agent 04

### createTournament
This async function reads the `title`, `category`, `entry_fee`, `starts_at`, and optional `max_players` parameters from its input object. It calls `getIsPlaceholderMode()` and returns early with an error if placeholder mode is active. Otherwise, it awaits a call to `safeRpc()` with the RPC function name `'create_tournament'` and a mapped parameter object (using `p_` prefixed names, with `max_players` defaulting to 64 if not supplied). If the `safeRpc()` call returns an error, the function returns that error message. If `data` contains an error field, that is returned. On success, it returns the `tournament_id` from the response data.

### joinTournament
This async function reads a single `tournamentId` parameter. It calls `getIsPlaceholderMode()` and returns early with an error if placeholder mode is active. Otherwise, it awaits a call to `safeRpc()` with the RPC function name `'join_tournament'` and passes the tournament ID as `p_tournament_id`. If the `safeRpc()` call returns an error, that error message is returned. If `data` contains an error field, that is returned. On success, it returns `{ success: true }`.

### cancelTournament
This async function reads a single `tournamentId` parameter. It calls `getIsPlaceholderMode()` and returns early with an error if placeholder mode is active. Otherwise, it awaits a call to `safeRpc()` with the RPC function name `'cancel_tournament'` and passes the tournament ID as `p_tournament_id`. If the `safeRpc()` call returns an error, that error message is returned. If `data` contains an error field, that is returned. On success, it returns `{ success: true }`.

### getActiveTournaments
This async function reads an optional `category` parameter. It calls `getIsPlaceholderMode()` and returns an empty array if placeholder mode is active. Otherwise, it awaits a call to `safeRpc()` with the RPC function name `'get_active_tournaments'` and passes the category (or null if not supplied). If either the `safeRpc()` call returns an error or data is falsy, it returns an empty array. On success, it returns the data array of Tournament objects directly.

### getTournamentBracket
This async function reads a single `tournamentId` parameter. It calls `getIsPlaceholderMode()` and returns an empty array if placeholder mode is active. Otherwise, it awaits a call to `safeRpc()` with the RPC function name `'get_tournament_bracket'` and passes the tournament ID as `p_tournament_id`. If either the `safeRpc()` call returns an error or data is falsy, it returns an empty array. On success, it returns the data array of BracketMatch objects directly.

### resolveTournamentMatch
This async function reads `matchId` and `winnerId` parameters. It calls `getIsPlaceholderMode()` and returns early with an error if placeholder mode is active. Otherwise, it awaits a call to `safeRpc()` with the RPC function name `'resolve_tournament_match'` and passes the match ID as `p_tournament_match_id` and the winner ID as `p_winner_id`. If the `safeRpc()` call returns an error, that error message is returned. If `data` contains an error field, that is returned. On success, it returns an object with `success: true` and includes the `tournament_complete` boolean from the response data (which may be undefined).

## Agent 05

### createTournament
This async function reads `params` (title, category, entry_fee, starts_at, max_players) and the placeholder mode state via `getIsPlaceholderMode()`. If placeholder mode is active, it returns early with an error object. Otherwise, it awaits `safeRpc()` with the RPC procedure name 'create_tournament' and mapped parameters (max_players defaults to 64 if not provided). It checks the returned `error` object first and returns an error response if present. If no error but the response data contains an error field, it returns that error. On success, it extracts and returns the tournament_id from the data object. The function writes nothing to any store; it only returns response objects.

### joinTournament
This async function reads the tournamentId parameter and the placeholder mode state via `getIsPlaceholderMode()`. If placeholder mode is active, it returns early with an error object. Otherwise, it awaits `safeRpc()` with the RPC procedure name 'join_tournament' and the tournamentId mapped as p_tournament_id. It checks the returned `error` object first and returns an error response if present. If no error but the response data contains an error field, it returns that error. On success, it returns a success flag. The function writes nothing to any store; it only returns response objects.

### cancelTournament
This async function reads the tournamentId parameter and the placeholder mode state via `getIsPlaceholderMode()`. If placeholder mode is active, it returns early with an error object. Otherwise, it awaits `safeRpc()` with the RPC procedure name 'cancel_tournament' and the tournamentId mapped as p_tournament_id. It checks the returned `error` object first and returns an error response if present. If no error but the response data contains an error field, it returns that error. On success, it returns a success flag. The function writes nothing to any store; it only returns response objects.

### getActiveTournaments
This async function reads the optional category parameter and the placeholder mode state via `getIsPlaceholderMode()`. If placeholder mode is active, it returns an empty array. Otherwise, it awaits `safeRpc()` with the RPC procedure name 'get_active_tournaments' and the category mapped as p_category (defaulting to null if not provided). If either the returned `error` object is present or the data is falsy, it returns an empty array. On success, it returns the data array of Tournament objects. The function writes nothing to any store; it only returns arrays.

### getTournamentBracket
This async function reads the tournamentId parameter and the placeholder mode state via `getIsPlaceholderMode()`. If placeholder mode is active, it returns an empty array. Otherwise, it awaits `safeRpc()` with the RPC procedure name 'get_tournament_bracket' and the tournamentId mapped as p_tournament_id. If either the returned `error` object is present or the data is falsy, it returns an empty array. On success, it returns the data array of BracketMatch objects. The function writes nothing to any store; it only returns arrays.

### resolveTournamentMatch
This async function reads the matchId and winnerId parameters and the placeholder mode state via `getIsPlaceholderMode()`. If placeholder mode is active, it returns early with an error object. Otherwise, it awaits `safeRpc()` with the RPC procedure name 'resolve_tournament_match' and parameters mapped as p_tournament_match_id and p_winner_id. It checks the returned `error` object first and returns an error response if present. If no error but the response data contains an error field, it returns that error. On success, it extracts the tournament_complete field from the response data (if present) and returns both a success flag and the tournament_complete status. The function writes nothing to any store; it only returns response objects.
