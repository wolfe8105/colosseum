/**
 * THE MODERATOR — Rivals Presence (F-25)
 *
 * Tracks rival users coming online via Supabase Realtime presence.
 * When an accepted rival joins the global-online channel, fires an alert popup.
 *
 * Depends on: auth.ts
 * Init: called from pages/home.ts onChange after user + profile exist
 */

import { getSupabaseClient, getMyRivals, getCurrentUser, getIsPlaceholderMode } from './auth.ts';
import { FEATURES } from './config.ts';
import type { RivalEntry } from './async.ts';

// ============================================================
// TYPES
// ============================================================

interface PresencePayload {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

// ============================================================
// STATE
// ============================================================

let rivalSet = new Set<string>();          // accepted rival user_ids
let onlineRivals = new Set<string>();     // rival_ids currently online (suppress re-alert)
let alertQueue: PresencePayload[] = [];   // pending alerts to show
let alertActive = false;                  // is a popup currently showing
let presenceChannel: ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']> | null = null;
let initialized = false;

// ============================================================
// POPUP DOM
// ============================================================

function _injectCSS(): void {
  if (document.getElementById('rival-presence-css')) return;
  const style = document.createElement('style');
  style.id = 'rival-presence-css';
  style.textContent = `
    @keyframes rivalSlideIn {
      0%   { opacity:0; transform:translateX(-50%) translateY(-20px) scale(0.9); }
      20%  { opacity:1; transform:translateX(-50%) translateY(0) scale(1.03); }
      30%  { transform:translateX(-50%) translateY(0) scale(1); }
      100% { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
    }
    @keyframes rivalSlideOut {
      0%   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
      100% { opacity:0; transform:translateX(-50%) translateY(-20px) scale(0.9); }
    }
    #rival-alert-popup {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99998;
      background: linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 50%, #1a0a0a 100%);
      border: 2px solid var(--mod-magenta);
      border-radius: 14px;
      padding: 18px 20px;
      min-width: 280px;
      max-width: 340px;
      box-shadow: 0 0 30px rgba(204,41,54,0.4), 0 8px 32px rgba(0,0,0,0.6);
      animation: rivalSlideIn 0.4s ease-out forwards;
      font-family: var(--mod-font-ui);
    }
    #rival-alert-popup.dismissing {
      animation: rivalSlideOut 0.3s ease-in forwards;
    }
    #rival-alert-popup .rap-icon {
      font-size: 28px;
      text-align: center;
      margin-bottom: 6px;
    }
    #rival-alert-popup .rap-title {
      font-family: var(--mod-font-display);
      font-size: 13px;
      letter-spacing: 2px;
      color: var(--mod-magenta);
      text-align: center;
      margin-bottom: 4px;
    }
    #rival-alert-popup .rap-name {
      font-family: var(--mod-font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--mod-text-heading);
      text-align: center;
      margin-bottom: 4px;
    }
    #rival-alert-popup .rap-sub {
      font-size: 13px;
      color: var(--mod-text-sub);
      text-align: center;
      margin-bottom: 14px;
    }
    #rival-alert-popup .rap-actions {
      display: flex;
      gap: 8px;
    }
    #rival-alert-popup .rap-challenge {
      flex: 1;
      padding: 10px;
      background: var(--mod-magenta);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-family: var(--mod-font-display);
      font-size: 13px;
      letter-spacing: 1px;
      font-weight: 700;
      cursor: pointer;
    }
    #rival-alert-popup .rap-dismiss {
      flex: 1;
      padding: 10px;
      background: var(--mod-bg-subtle);
      color: var(--mod-text-sub);
      border: 1px solid var(--mod-border-primary);
      border-radius: 8px;
      font-family: var(--mod-font-ui);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

function _dismissPopup(): void {
  const popup = document.getElementById('rival-alert-popup');
  if (!popup) return;
  popup.classList.add('dismissing');
  setTimeout(() => {
    popup.remove();
    alertActive = false;
    // Show next in queue after short gap
    if (alertQueue.length > 0) {
      setTimeout(_showNext, 600);
    }
  }, 300);
}

function _showNext(): void {
  const payload = alertQueue.shift();
  if (!payload) { alertActive = false; return; }

  alertActive = true;
  _injectCSS();

  const existing = document.getElementById('rival-alert-popup');
  if (existing) existing.remove();

  const displayName = payload.display_name ?? payload.username ?? 'YOUR RIVAL';
  const safeName = displayName.toUpperCase().replace(/[<>]/g, '');

  const popup = document.createElement('div');
  popup.id = 'rival-alert-popup';
  popup.innerHTML = `
    <div class="rap-icon">⚔️</div>
    <div class="rap-title">RIVAL ALERT</div>
    <div class="rap-name">${safeName}</div>
    <div class="rap-sub">is online and ready to fight</div>
    <div class="rap-actions">
      <button class="rap-challenge" id="rap-challenge-btn">CHALLENGE</button>
      <button class="rap-dismiss" id="rap-dismiss-btn">LATER</button>
    </div>
  `;
  document.body.appendChild(popup);

  // Auto-dismiss after 8s
  const timer = setTimeout(_dismissPopup, 8000);

  document.getElementById('rap-dismiss-btn')?.addEventListener('click', () => {
    clearTimeout(timer);
    _dismissPopup();
  });

  document.getElementById('rap-challenge-btn')?.addEventListener('click', () => {
    clearTimeout(timer);
    _dismissPopup();
    // Open their profile modal — challenge link (F-39) not built yet
    if (payload.user_id) {
      import('./auth.ts').then(({ showUserProfile }) => {
        showUserProfile(payload.user_id, payload.username ?? undefined);
      }).catch((e) => console.warn('[Rivals] showUserProfile import failed:', e));
    }
  });
}

function _queueAlert(payload: PresencePayload): void {
  alertQueue.push(payload);
  if (!alertActive) _showNext();
}

// ============================================================
// PRESENCE CHANNEL
// ============================================================

async function _buildRivalSet(): Promise<void> {
  try {
    const rivals = (await getMyRivals()) as unknown as RivalEntry[];
    rivalSet.clear();
    for (const r of rivals) {
      // Only alert for accepted/active rivals — skip pending
      if (r.status !== 'pending' && r.rival_id) {
        rivalSet.add(r.rival_id);
      }
    }
  } catch (e) {
    console.warn('[RivalsPresence] Failed to load rivals:', e);
  }
}

async function _startPresence(): Promise<void> {
  const supabase = getSupabaseClient();
  const user = getCurrentUser();
  if (!supabase || !user) return;

  if (presenceChannel) {
    supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }

  // ADV-2: Set auth token for Realtime private channel RLS
  try { await supabase.realtime.setAuth(); } catch { /* session not ready */ }

  presenceChannel = supabase.channel('global-online', {
    config: {
      private: true, // ADV-2: enforce RLS on realtime.messages
      presence: { key: user.id },
    },
  });

  // When any user joins — check if they're a rival
  presenceChannel.on('presence', { event: 'join' }, ({ newPresences }: { newPresences: Array<Record<string, unknown>> }) => {
    for (const p of newPresences) {
      const payload = p as unknown as PresencePayload;
      if (!payload.user_id || payload.user_id === user.id) continue;
      if (!rivalSet.has(payload.user_id)) continue;
      if (onlineRivals.has(payload.user_id)) continue; // already alerted this session

      onlineRivals.add(payload.user_id);
      _queueAlert(payload);
    }
  });

  // When a rival leaves — allow re-alerting if they come back
  presenceChannel.on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: Array<Record<string, unknown>> }) => {
    for (const p of leftPresences) {
      const payload = p as unknown as PresencePayload;
      if (payload.user_id) onlineRivals.delete(payload.user_id);
    }
  });

  presenceChannel.subscribe(async (status: string, err?: Error) => {
    if (status === 'SUBSCRIBED') {
      // Track own presence
      const profile = (await import('./auth.ts')).getCurrentProfile();
      await presenceChannel!.track({
        user_id: user.id,
        username: profile?.username ?? null,
        display_name: profile?.display_name ?? null,
      });
    } else if (status === 'CHANNEL_ERROR') {
      // ADV-2: RLS rejected — log and degrade gracefully
      console.warn('[RivalsPresence] Channel denied:', err?.message ?? 'no permissions');
    }
  });
}

// ============================================================
// PUBLIC API
// ============================================================

export async function init(): Promise<void> {
  if (!FEATURES.rivals) return;
  if (getIsPlaceholderMode()) return;
  const user = getCurrentUser();
  if (!user) return;
  if (initialized) return; // only init once per session

  initialized = true;
  await _buildRivalSet();
  await _startPresence();
}

export function destroy(): void {
  const supabase = getSupabaseClient();
  if (supabase && presenceChannel) {
    supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }
  rivalSet.clear();
  onlineRivals.clear();
  alertQueue = [];
  alertActive = false;
  initialized = false;

  const popup = document.getElementById('rival-alert-popup');
  if (popup) popup.remove();
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const rivalsPresence = { init, destroy } as const;
export default rivalsPresence;
