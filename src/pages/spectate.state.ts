/**
 * THE MODERATOR — Spectator View State Container
 */

// LM-SPECTATE-002: All mutable vars that were closure-scoped inside the original
// IIFE live here. ES module imports are read-only bindings — direct let exports
// cannot be reassigned from other files. All sibling files do state.foo = x.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SpectateDebate, SpectatorChatMessage, ReplayData } from './spectate.types.ts';

export const state = {
  sb: null as SupabaseClient | null,
  debateId: null as string | null,
  isLoggedIn: false,
  app: null as HTMLElement | null,
  loading: null as HTMLElement | null,
  debateData: null as SpectateDebate | null,
  replayData: null as ReplayData | null,
  chatMessages: [] as SpectatorChatMessage[],
  chatOpen: true,
  lastChatMessageAt: null as string | null,
  lastMessageTime: null as string | null,
  lastRenderedMessageCount: 0,
  pollTimer: null as ReturnType<typeof setInterval> | null,
  chatPollTimer: null as ReturnType<typeof setInterval> | null,
  voteCast: false,   // was `_voteCast` in the original
};
