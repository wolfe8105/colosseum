/**
 * THE MODERATOR — Share Module (TypeScript)
 *
 * Runtime module — replaces moderator-share.js when Vite build is active.
 * Depends on: config.ts, auth.ts
 *
 * Source of truth for runtime: this file (Phase 3 cutover)
 * Source of truth for types: this file
 *
 * Migration: Session 127 (Phase 3), Session 138 (ES imports, zero globalThis reads)
 */

import { APP, showToast } from './config.ts';
import { getCurrentUser, ready } from './auth.ts';
import { navigateTo } from './navigation.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface ShareResultParams {
  debateId?: string;
  topic?: string;
  winner?: string;
  winnerElo?: number;
  loser?: string;
  loserElo?: number;
  spectators?: number;
}

export interface ShareProfileParams {
  userId?: string;
  username?: string;
  displayName?: string;
  elo?: number;
  wins?: number;
  losses?: number;
  streak?: number;
}

interface ShareData {
  title: string;
  text: string;
  url: string;
}

// ============================================================
// HELPERS
// ============================================================

function getBaseUrl(): string {
  return APP.baseUrl || window.location.origin;
}

// F-59: stable invite URL fetched from server once per session, cached in memory
let _cachedInviteUrl: string | null = null;

async function getStableInviteUrl(): Promise<string> {
  if (_cachedInviteUrl) return _cachedInviteUrl;
  try {
    const { safeRpc } = await import('./auth.ts');
    const result = await safeRpc('get_my_invite_link', {});
    const data = result.data as { url?: string; ref_code?: string } | null;
    if (data?.url) {
      _cachedInviteUrl = data.url;
      return _cachedInviteUrl;
    }
  } catch { /* fall through */ }
  // Fallback: unauthenticated or onboarding incomplete
  return `${getBaseUrl()}/moderator-plinko.html`;
}


async function share({ title, text, url }: ShareData): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  } catch {
    // Final fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Copied to clipboard!');
  }
}

// ============================================================
// PUBLIC API
// ============================================================

export function shareResult({
  debateId,
  topic,
  winner,
  winnerElo,
  loser,
  loserElo,
  spectators,
}: ShareResultParams): void {
  const url = `${getBaseUrl()}/debate/${encodeURIComponent(debateId ?? 'demo')}`;
  const text = `🏆 ${winner ?? 'Winner'} (${winnerElo ?? 1200}) won vs ${loser ?? 'Loser'} (${loserElo ?? 1200})\n"${topic ?? 'Debate'}"\n👁 ${spectators ?? 0} watched\n\n${url}`;
  void share({ title: 'Debate Result — The Moderator', text, url });
}

export function shareProfile({
  userId,
  username,
  displayName,
  elo,
  wins,
  losses,
  streak,
}: ShareProfileParams): void {
  const url = `${getBaseUrl()}/u/${encodeURIComponent(username ?? userId ?? 'debater')}`;
  const name = displayName ?? username ?? 'Debater';
  const text = `🏟️ ${name} on The Moderator\nELO: ${elo ?? 1200} | W: ${wins ?? 0} | L: ${losses ?? 0} | Streak: ${streak ?? 0}\n\n${url}`;
  void share({ title: `${name} — The Moderator`, text, url });
}

export function inviteFriend(): void {
  void getStableInviteUrl().then(url => {
    const text = `Think you can hold your own? Join me on The Moderator.\n\n${url}`;
    void share({ title: 'Join The Moderator', text, url });
  });
}

export function shareTake(takeId: string, takeText: string): void {
  const url = `${getBaseUrl()}/take/${encodeURIComponent(takeId)}`;
  const decoded = decodeURIComponent(takeText);
  const text = `🔥 Hot Take on The Moderator:\n"${decoded}"\n\nReact or challenge: ${url}`;
  void share({ title: 'Hot Take — The Moderator', text, url });
}

// ============================================================
// DEEP LINK HANDLER
// ============================================================

export function handleDeepLink(): void {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  const debate = params.get('debate');
  const challenge = params.get('from');

  if (ref) {
    localStorage.setItem('colosseum_referrer', ref);
    // F-59: If user is already authenticated (e.g. OAuth flow), attribute immediately
    const user = getCurrentUser();
    if (user) {
      void import('./auth.ts').then(({ safeRpc }) => {
        const deviceId = localStorage.getItem('mod_visitor_id') ?? undefined;
        void safeRpc('attribute_signup', {
          p_ref_code: ref,
          ...(deviceId ? { p_device_id: deviceId } : {}),
        });
      });
    }
  }

  if (debate) {
    setTimeout(() => {
      navigateTo('arena');
    }, 500);
  }

  if (challenge) {
    // BUG 3 FIX: Sanitize and truncate URL params before display
    const safeName = String(challenge).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
    const topic = params.get('topic') ?? 'Open challenge';
    const safeTopic = String(decodeURIComponent(topic)).slice(0, 100);
    setTimeout(() => {
      showToast(`⚔️ Challenge from ${safeName}: "${safeTopic}"`);
    }, 1000);
  }
}

// ============================================================
export const ModeratorShare = {
  shareResult,
  shareProfile,
  inviteFriend,
  shareTake,
  handleDeepLink,
} as const;


// ============================================================
// AUTO-INIT (deep link handler runs after auth is ready)
// ============================================================

ready.then(() => handleDeepLink());
