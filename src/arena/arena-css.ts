/**
 * Arena CSS — orchestrator
 *
 * Calls each section's injectXxxCSS() in order. Guarded by cssInjected so the
 * whole batch only runs once per page. Each section appends its own <style>
 * element; order is preserved by call order below.
 *
 * Split performed 2026-04-14 from a single 773-line injectCSS() function.
 * See REFACTOR-HANDOFF.md. Target: each section < 300 lines, preference 150.
 */

import { cssInjected, set_cssInjected } from './arena-state.ts';
import { injectLobbyCSS } from './arena-css-lobby.ts';
import { injectModeSelectCSS } from './arena-css-mode-select.ts';
import { injectQueueMatchCSS } from './arena-css-queue-match.ts';
import { injectRoomCSS } from './arena-css-room.ts';
import { injectRoomInputCSS } from './arena-css-room-input.ts';
import { injectPostDebateCSS } from './arena-css-post-debate.ts';
import { injectMiscCSS } from './arena-css-misc.ts';
import { injectReferencesCSS } from './arena-css-references.ts';
import { injectRankedCSS } from './arena-css-ranked.ts';
import { injectPreDebateCSS } from './arena-css-pre-debate.ts';
import { injectAfterEffectsCSS } from './arena-css-after-effects.ts';
import { injectModeratorCSS } from './arena-css-moderator.ts';
import { injectTranscriptCSS } from './arena-css-transcript.ts';
import { injectUnpluggedCSS } from './arena-css-unplugged.ts';
import { injectFeedRoomCSS } from './arena-css-feed-room.ts';
import { injectFeedSpecChatCSS } from './arena-css-feed-spec-chat.ts';
import { injectFeedStreamCSS } from './arena-css-feed-stream.ts';
import { injectFeedControlsCSS } from './arena-css-feed-controls.ts';
import { injectFeedFireworksCSS } from './arena-css-feed-fireworks.ts';
import { injectReferencesPhase3CSS } from './arena-css-references-phase3.ts';
import { injectFeedPhase4_5CSS } from './arena-css-feed-phase4-5.ts';

export function injectCSS(): void {
  if (cssInjected) return;
  set_cssInjected(true);

  // Core arena sections
  injectLobbyCSS();
  injectModeSelectCSS();
  injectQueueMatchCSS();
  injectRoomCSS();
  injectRoomInputCSS();
  injectPostDebateCSS();
  injectMiscCSS();
  injectReferencesCSS();
  injectRankedCSS();
  injectPreDebateCSS();
  injectAfterEffectsCSS();
  injectModeratorCSS();
  injectTranscriptCSS();
  injectUnpluggedCSS();

  // F-51 feed room sections
  injectFeedRoomCSS();
  injectFeedSpecChatCSS();
  injectFeedStreamCSS();
  injectFeedControlsCSS();
  injectFeedFireworksCSS();
  injectReferencesPhase3CSS();
  injectFeedPhase4_5CSS();
}
