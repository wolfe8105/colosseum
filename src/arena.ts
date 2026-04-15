/**
 * THE MODERATOR — Arena Module (TypeScript)
 *
 * Barrel re-export file. The arena monolith has been split into
 * 20 files under src/arena/. This file re-exports the public API
 * so existing imports (e.g. home.ts) continue to work.
 *
 * Side-effect: importing this module triggers arena-core.ts which
 * registers the popstate listener and auto-inits on auth ready.
 */

// --- Side-effect: auto-init + popstate registration ---
import './arena/arena-core.ts';

// --- Types ---
export type { ArenaView, DebateMode, DebateStatus, DebateRole, ModeInfo, DebateMessage, CurrentDebate, SelectedModerator } from './arena/arena-types.ts';
export type { MatchData, MatchAcceptResponse } from './arena/arena-types-match.ts';
export type { ArenaFeedItem, AutoDebateItem } from './arena/arena-types-feed-list.ts';
export type { AvailableModerator, ModQueueItem, ModDebateJoinResult, ModDebateCheckResult } from './arena/arena-types-moderator.ts';
export type { PowerUpEquipped, RankedCheckResult, UpdateDebateResult, ReferenceItem } from './arena/arena-types-results.ts';
export type { AIScoreResult, SideScores } from './arena/arena-types-ai-scoring.ts';

// --- Constants ---
export { MODES, TEXT_MAX_CHARS } from './arena/arena-constants.ts';

// --- State (re-export for any external consumers) ---
export {
  referencePollTimer,
  pendingReferences,
  activatedPowerUps,
  shieldActive,
  equippedForDebate,
  silenceTimer,
  _rulingCountdownTimer,
} from './arena/arena-state.ts';

// --- Core ---
export { init, destroy, getView, getCurrentDebate } from './arena/arena-core.ts';

// --- Lobby ---
export async function showPowerUpShop(): Promise<void> {
  const { showPowerUpShop: fn } = await import('./arena/arena-lobby.ts');
  fn();
}

// --- Config ---
export {
  showRankedPicker, closeRankedPicker,
  showRulesetPicker, closeRulesetPicker,
} from './arena/arena-config-settings.ts';
export { showModeSelect, closeModeSelect } from './arena/arena-config-mode.ts';

// --- Queue ---
export { enterQueue, leaveQueue } from './arena/arena-queue.ts';

// --- Room ---
export { showPreDebate } from './arena/arena-room-predebate.ts';
export { enterRoom } from './arena/arena-room-enter.ts';
export { submitTextArgument, addMessage, addSystemMessage } from './arena/arena-room-live.ts';
export { wireVoiceMemoControls } from './arena/arena-room-voicememo.ts';
export { endCurrentDebate } from './arena/arena-room-end.ts';

// --- Moderator ---
export { assignSelectedMod, addReferenceButton, showReferenceForm, hideReferenceForm, showRulingPanel, startReferencePoll } from './arena/arena-mod-refs.ts';
export { renderModScoring } from './arena/arena-mod-scoring.ts';

// --- Private Lobby ---
export { showPrivateLobbyPicker } from './arena/arena-private-picker.ts';
