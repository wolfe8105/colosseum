/**
 * Arena State — all mutable state variables
 */

import type { ArenaView, DebateMode, CurrentDebate, SelectedModerator } from './arena-types.ts';
import type { LoadoutReference, OpponentCitedRef } from './arena-types-feed-room.ts';
import type { EquippedItem } from '../powerups.ts';
import type { RealtimeChannel } from '../webrtc.types.ts';
import { DEBATE } from '../config.ts';

// View & mode
export let view: ArenaView = 'lobby';
export let selectedMode: DebateMode | null = null;
export let screenEl: HTMLElement | null = null;
export let cssInjected: boolean = false;

// Queue
export let queuePollTimer: ReturnType<typeof setInterval> | null = null;
export let queueElapsedTimer: ReturnType<typeof setInterval> | null = null;
export let queueSeconds: number = 0;
export let queueErrorState: boolean = false;
export let aiFallbackShown: boolean = false;
export let _queuePollInFlight: boolean = false;

// Match accept
export let matchAcceptTimer: ReturnType<typeof setInterval> | null = null;
export let matchAcceptPollTimer: ReturnType<typeof setInterval> | null = null;
export let matchAcceptSeconds: number = 0;
export let matchFoundDebate: CurrentDebate | null = null;

// Current debate & room
export let currentDebate: CurrentDebate | null = null;
export let roundTimer: ReturnType<typeof setInterval> | null = null;
export let roundTimeLeft: number = 0;

// Config selections
export let selectedModerator: SelectedModerator | null = null;
export let selectedRanked: boolean = false;
export let selectedRuleset: 'amplified' | 'unplugged' = 'amplified';
export let selectedRounds: number = DEBATE.defaultRounds;
export let selectedCategory: string | null = null;
export let selectedWantMod: boolean = false;

// Link card (F-62)
export let selectedLinkUrl: string | null = null;
export let selectedLinkPreview: { image_url: string; og_title: string | null; domain: string | null } | null = null;

// Private lobby
export let privateLobbyPollTimer: ReturnType<typeof setInterval> | null = null;
export let privateLobbyDebateId: string | null = null;
export let _pendingPrivateType: 'username' | 'group' | 'code' | null = null;

// Moderator
export let modQueuePollTimer: ReturnType<typeof setInterval> | null = null;
export let modStatusPollTimer: ReturnType<typeof setInterval> | null = null;
export let modCountdownTimer: ReturnType<typeof setInterval> | null = null;
export let modRequestModalShown: boolean = false;
export let modDebatePollTimer: ReturnType<typeof setInterval> | null = null;
export let modDebateId: string | null = null;

// References & power-ups
export let referencePollTimer: ReturnType<typeof setInterval> | null = null;
export let pendingReferences: unknown[] = [];
export let activatedPowerUps: Set<string> = new Set();
export let shieldActive: boolean = false;
export let equippedForDebate: EquippedItem[] = [];
export let silenceTimer: ReturnType<typeof setInterval> | null = null;
export let _rulingCountdownTimer: ReturnType<typeof setInterval> | null = null;

// Voice memo
export let vmRecording: boolean = false;
export let vmTimer: ReturnType<typeof setInterval> | null = null;
export let vmSeconds: number = 0;

// Opponent poll
export let opponentPollTimer: ReturnType<typeof setInterval> | null = null;
export let opponentPollElapsed: number = 0;

// Feed room (F-51)
export let feedTurnTimer: ReturnType<typeof setInterval> | null = null;
export let feedRealtimeChannel: RealtimeChannel | null = null;

// Feed room references (F-51 Phase 3)
export let loadedRefs: LoadoutReference[] = [];
export let opponentCitedRefs: OpponentCitedRef[] = [];
export let challengesRemaining: number = 3;  // FEED_TOTAL_ROUNDS - 1
export let feedPaused: boolean = false;
export let feedPauseTimeLeft: number = 0;  // remaining turn time when paused
export let challengeRulingTimer: ReturnType<typeof setInterval> | null = null;
export let activeChallengeRefId: string | null = null;  // reference_id currently under challenge ruling
export let activeChallengeId: string | null = null;  // F-55: challenge_id from reference_challenges table

// ============================================================
// SETTERS — needed because ES module let bindings are read-only
// from importing modules. Each setter mutates the variable in
// this module, and live bindings propagate the change.
// ============================================================

export function set_view(v: ArenaView) { view = v; }
export function set_selectedMode(v: DebateMode | null) { selectedMode = v; }
export function set_screenEl(v: HTMLElement | null) { screenEl = v; }
export function set_cssInjected(v: boolean) { cssInjected = v; }
export function set_queuePollTimer(v: ReturnType<typeof setInterval> | null) { queuePollTimer = v; }
export function set_queueElapsedTimer(v: ReturnType<typeof setInterval> | null) { queueElapsedTimer = v; }
export function set_queueSeconds(v: number) { queueSeconds = v; }
export function set_queueErrorState(v: boolean) { queueErrorState = v; }
export function set_aiFallbackShown(v: boolean) { aiFallbackShown = v; }
export function set__queuePollInFlight(v: boolean) { _queuePollInFlight = v; }
export function set_matchAcceptTimer(v: ReturnType<typeof setInterval> | null) { matchAcceptTimer = v; }
export function set_matchAcceptPollTimer(v: ReturnType<typeof setInterval> | null) { matchAcceptPollTimer = v; }
export function set_matchAcceptSeconds(v: number) { matchAcceptSeconds = v; }
export function set_matchFoundDebate(v: CurrentDebate | null) { matchFoundDebate = v; }
export function set_currentDebate(v: CurrentDebate | null) { currentDebate = v; }
export function set_roundTimer(v: ReturnType<typeof setInterval> | null) { roundTimer = v; }
export function set_roundTimeLeft(v: number) { roundTimeLeft = v; }
export function set_selectedModerator(v: SelectedModerator | null) { selectedModerator = v; }
export function set_selectedRanked(v: boolean) { selectedRanked = v; }
export function set_selectedRuleset(v: 'amplified' | 'unplugged') { selectedRuleset = v; }
export function set_selectedRounds(v: number) { selectedRounds = v; }
export function set_selectedCategory(v: string | null) { selectedCategory = v; }
export function set_selectedWantMod(v: boolean) { selectedWantMod = v; }
export function set_selectedLinkUrl(v: string | null) { selectedLinkUrl = v; }
export function set_selectedLinkPreview(v: typeof selectedLinkPreview) { selectedLinkPreview = v; }
export function set_privateLobbyPollTimer(v: ReturnType<typeof setInterval> | null) { privateLobbyPollTimer = v; }
export function set_privateLobbyDebateId(v: string | null) { privateLobbyDebateId = v; }
export function set__pendingPrivateType(v: 'username' | 'group' | 'code' | null) { _pendingPrivateType = v; }
export function set_modQueuePollTimer(v: ReturnType<typeof setInterval> | null) { modQueuePollTimer = v; }
export function set_modStatusPollTimer(v: ReturnType<typeof setInterval> | null) { modStatusPollTimer = v; }
export function set_modCountdownTimer(v: ReturnType<typeof setInterval> | null) { modCountdownTimer = v; }
export function set_modRequestModalShown(v: boolean) { modRequestModalShown = v; }
export function set_modDebatePollTimer(v: ReturnType<typeof setInterval> | null) { modDebatePollTimer = v; }
export function set_modDebateId(v: string | null) { modDebateId = v; }
export function set_referencePollTimer(v: ReturnType<typeof setInterval> | null) { referencePollTimer = v; }
export function set_pendingReferences(v: unknown[]) { pendingReferences = v; }
export function set_activatedPowerUps(v: Set<string>) { activatedPowerUps = v; }
export function set_shieldActive(v: boolean) { shieldActive = v; }
export function set_equippedForDebate(v: EquippedItem[]) { equippedForDebate = v; }
export function set_silenceTimer(v: ReturnType<typeof setInterval> | null) { silenceTimer = v; }
export function set__rulingCountdownTimer(v: ReturnType<typeof setInterval> | null) { _rulingCountdownTimer = v; }
export function set_vmRecording(v: boolean) { vmRecording = v; }
export function set_vmTimer(v: ReturnType<typeof setInterval> | null) { vmTimer = v; }
export function set_vmSeconds(v: number) { vmSeconds = v; }
export function set_opponentPollTimer(v: ReturnType<typeof setInterval> | null) { opponentPollTimer = v; }
export function set_opponentPollElapsed(v: number) { opponentPollElapsed = v; }
export function set_feedTurnTimer(v: ReturnType<typeof setInterval> | null) { feedTurnTimer = v; }
export function set_feedRealtimeChannel(v: RealtimeChannel | null) { feedRealtimeChannel = v; }
export function set_loadedRefs(v: LoadoutReference[]) { loadedRefs = v; }
export function set_opponentCitedRefs(v: OpponentCitedRef[]) { opponentCitedRefs = v; }
export function set_challengesRemaining(v: number) { challengesRemaining = v; }
export function set_feedPaused(v: boolean) { feedPaused = v; }
export function set_feedPauseTimeLeft(v: number) { feedPauseTimeLeft = v; }
export function set_challengeRulingTimer(v: ReturnType<typeof setInterval> | null) { challengeRulingTimer = v; }
export function set_activeChallengeRefId(v: string | null) { activeChallengeRefId = v; }
export function set_activeChallengeId(v: string | null) { activeChallengeId = v; }

// ============================================================
// RESET — called by destroy() to zero all mutable state
// ============================================================

export function resetState(): void {
  // View & mode
  view = 'lobby';
  selectedMode = null;
  // screenEl intentionally NOT reset — it's a DOM ref set once by init()
  // cssInjected intentionally NOT reset — CSS only needs injection once

  // Queue
  if (queuePollTimer) clearInterval(queuePollTimer);
  queuePollTimer = null;
  if (queueElapsedTimer) clearInterval(queueElapsedTimer);
  queueElapsedTimer = null;
  queueSeconds = 0;
  queueErrorState = false;
  aiFallbackShown = false;
  _queuePollInFlight = false;

  // Match accept
  if (matchAcceptTimer) clearInterval(matchAcceptTimer);
  matchAcceptTimer = null;
  if (matchAcceptPollTimer) clearInterval(matchAcceptPollTimer);
  matchAcceptPollTimer = null;
  matchAcceptSeconds = 0;
  matchFoundDebate = null;

  // Current debate & room
  currentDebate = null;
  if (roundTimer) clearInterval(roundTimer);
  roundTimer = null;
  roundTimeLeft = 0;

  // Config selections
  selectedModerator = null;
  selectedRanked = false;
  selectedRuleset = 'amplified';
  selectedRounds = DEBATE.defaultRounds;
  selectedCategory = null;
  selectedWantMod = false;

  // Private lobby
  if (privateLobbyPollTimer) clearInterval(privateLobbyPollTimer);
  privateLobbyPollTimer = null;
  privateLobbyDebateId = null;
  _pendingPrivateType = null;

  // Moderator
  if (modQueuePollTimer) clearInterval(modQueuePollTimer);
  modQueuePollTimer = null;
  if (modStatusPollTimer) clearInterval(modStatusPollTimer);
  modStatusPollTimer = null;
  modRequestModalShown = false;
  if (modDebatePollTimer) clearInterval(modDebatePollTimer);
  modDebatePollTimer = null;
  modDebateId = null;

  // References & power-ups
  if (referencePollTimer) clearInterval(referencePollTimer);
  referencePollTimer = null;
  pendingReferences = [];
  activatedPowerUps = new Set();
  shieldActive = false;
  equippedForDebate = [];
  if (silenceTimer) clearInterval(silenceTimer);
  silenceTimer = null;
  if (_rulingCountdownTimer) clearInterval(_rulingCountdownTimer);
  _rulingCountdownTimer = null;

  // Voice memo
  vmRecording = false;
  if (vmTimer) clearInterval(vmTimer);
  vmTimer = null;
  vmSeconds = 0;

  // Opponent poll
  if (opponentPollTimer) clearInterval(opponentPollTimer);
  opponentPollTimer = null;
  opponentPollElapsed = 0;

  // Feed room (F-51)
  if (feedTurnTimer) clearInterval(feedTurnTimer);
  feedTurnTimer = null;
  feedRealtimeChannel = null;

  // Feed room references (F-51 Phase 3)
  loadedRefs = [];
  opponentCitedRefs = [];
  challengesRemaining = 3;
  feedPaused = false;
  feedPauseTimeLeft = 0;
  if (challengeRulingTimer) clearInterval(challengeRulingTimer);
  challengeRulingTimer = null;
  activeChallengeRefId = null;
  activeChallengeId = null;
}
