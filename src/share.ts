/**
 * THE COLOSSEUM — Share Module (TypeScript)
 *
 * Runtime module — replaces moderator-share.js when Vite build is active.
 * Depends on: config.ts, auth.ts
 *
 * Source of truth for runtime: this file (Phase 3 cutover)
 * Source of truth for types: this file
 *
 * Migration: Session 127 (Phase 3), Session 138 (ES imports, zero globalThis reads)
 */

import { APP } from './config.ts';
import { getCurrentUser, ready } from './auth.ts';

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
// INTERNAL STATE
// ============================================================

/** BUG 1 FIX: Store result in module scope instead of serializing into onclick attribute */
let _pendingShareResult: ShareResultParams | null = null;

// ============================================================
// HELPERS
// ============================================================

function getBaseUrl(): string {
  return APP.baseUrl || window.location.origin;
}

function generateRefCode(userId: string): string {
  const base = (userId || 'demo').slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

function showToast(msg: string): void {
  const t = document.createElement('div');
  t.style.cssText =
    'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#2ecc71;color:#fff;padding:12px 24px;border-radius:8px;font-weight:700;z-index:9999;font-size:14px;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
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
  const userId = getCurrentUser()?.id ?? 'demo';
  const refCode = generateRefCode(userId);
  const url = `${getBaseUrl()}/join?ref=${encodeURIComponent(refCode)}`;
  const text = `Think you can hold your own? Join me on The Moderator.\n\n${url}`;
  void share({ title: 'Join The Moderator', text, url });
}

export function shareTake(takeId: string, takeText: string): void {
  const url = `${getBaseUrl()}/take/${encodeURIComponent(takeId)}`;
  const decoded = decodeURIComponent(takeText);
  const text = `🔥 Hot Take on The Moderator:\n"${decoded}"\n\nReact or challenge: ${url}`;
  void share({ title: 'Hot Take — The Moderator', text, url });
}

export function showPostDebatePrompt(result: ShareResultParams): void {
  const existing = document.getElementById('post-debate-share');
  if (existing) existing.remove();

  _pendingShareResult = result || {};

  const won = (result as Record<string, unknown> | undefined)?.['won'];

  const modal = document.createElement('div');
  modal.id = 'post-debate-share';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;
    display:flex;align-items:flex-end;justify-content:center;
  `;

  modal.innerHTML = `
    <div style="
      background:linear-gradient(180deg,#132240 0%,#0a1628 100%);
      border-top-left-radius:20px;border-top-right-radius:20px;
      width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));
      text-align:center;
    ">
      <div style="font-size:48px;margin-bottom:8px;">${won ? '🏆' : '⚔️'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:${won ? '#d4a843' : '#f0f0f0'};">
        ${won ? 'YOU WON' : 'GOOD DEBATE'}
      </div>
      <div style="color:#a0a8b8;font-size:14px;margin:8px 0 20px;">
        ${won ? 'Share your win with the world.' : 'Challenge them to a rematch?'}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button id="post-debate-share-btn" style="
          flex:1;padding:14px;background:#cc2936;color:#fff;border:none;border-radius:10px;
          font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;cursor:pointer;
        ">📤 SHARE</button>
        <button id="post-debate-invite-btn" style="
          flex:1;padding:14px;background:#1a2d4a;color:#d4a843;border:1px solid rgba(212,168,67,0.3);border-radius:10px;
          font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;cursor:pointer;
        ">📨 INVITE</button>
      </div>
      <button id="post-debate-skip-btn" style="
        width:100%;padding:12px;background:none;color:#a0a8b8;border:none;font-size:13px;cursor:pointer;
      ">Skip</button>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);

  document.getElementById('post-debate-share-btn')?.addEventListener('click', () => {
    if (_pendingShareResult) shareResult(_pendingShareResult);
    modal.remove();
  });

  document.getElementById('post-debate-invite-btn')?.addEventListener('click', () => {
    inviteFriend();
    modal.remove();
  });

  document.getElementById('post-debate-skip-btn')?.addEventListener('click', () => {
    modal.remove();
  });
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
  }

  if (debate) {
    setTimeout(() => {
      const nav = (window as unknown as { navigateTo?: (screen: string) => void }).navigateTo;
      if (typeof nav === 'function') nav('arena');
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
  showPostDebatePrompt,
  handleDeepLink,
} as const;


// ============================================================
// AUTO-INIT (deep link handler runs after auth is ready)
// ============================================================

ready.then(() => handleDeepLink());
