/**
 * THE MODERATOR — Groups: module-level state variables
 *
 * Part of groups decomposition (7 files):
 *   groups.types.ts, groups.state.ts, groups.utils.ts,
 *   groups.feed.ts, groups.members.ts, groups.challenges.ts, groups.ts
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';

// ── STATE ─────────────────────────────────────────────────────────────────────
export let sb: SupabaseClient | null = null;
export let currentUser: User | null = null;
export let activeTab = 'discover';
export let activeDetailTab = 'feed';
export let activeCategory: string | null = null;
export let selectedEmoji = '⚔️';
export let currentGroupId: string | null = null;
export let isMember = false;
export let callerRole: string | null = null; // F-14: caller's role in currently open group

export const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  politics: '🏛️ Politics',
  sports: '🏆 Sports',
  entertainment: '🎬 Entertainment',
  music: '🎵 Music',
  couples_court: '💔 Couples Court'
};

// ── SETTERS (state is mutable from other modules via these) ──────────────────
export function setSb(val: SupabaseClient | null) { sb = val; }
export function setCurrentUser(val: User | null) { currentUser = val; }
export function setActiveTab(val: string) { activeTab = val; }
export function setActiveDetailTab(val: string) { activeDetailTab = val; }
export function setActiveCategory(val: string | null) { activeCategory = val; }
export function setSelectedEmoji(val: string) { selectedEmoji = val; }
export function setCurrentGroupId(val: string | null) { currentGroupId = val; }
export function setIsMember(val: boolean) { isMember = val; }
export function setCallerRole(val: string | null) { callerRole = val; }
