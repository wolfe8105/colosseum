/**
 * THE MODERATOR — Nudge Module
 *
 * Polite engagement toasts fired at key moments (F-35B).
 * Suppression: once per session per ID, once per 24h per ID, max 3 per session total.
 * Never conflicts with token toasts — those fire from tokens.ts independently.
 */

import { showToast } from './config.ts';

const SESSION_KEY = 'mod_nudge_session';   // sessionStorage — which IDs fired this tab session
const HISTORY_KEY = 'mod_nudge_history';   // localStorage  — timestamp per ID for 24h suppression
const SESSION_CAP = 3;                      // max nudges per session total
const COOLDOWN_MS = 24 * 60 * 60 * 1000;  // 24 hours

function getSessionFired(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function markSessionFired(id: string): void {
  try {
    const fired = getSessionFired();
    fired.add(id);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...fired]));
  } catch { /* storage unavailable — silent */ }
}

function getHistory(): Record<string, number> {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) as Record<string, number> : {};
  } catch {
    return {};
  }
}

function markHistory(id: string): void {
  try {
    const history = getHistory();
    history[id] = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* storage unavailable — silent */ }
}

function isOnCooldown(id: string): boolean {
  try {
    const history = getHistory();
    const last = history[id];
    if (!last) return false;
    return Date.now() - last < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * Fire an engagement nudge toast.
 * @param id     Unique nudge identifier (used for suppression tracking)
 * @param msg    Toast message text
 * @param type   Toast type — defaults to 'info'
 */
export function nudge(id: string, msg: string, type: 'info' | 'success' | 'error' = 'info'): void {
  const sessionFired = getSessionFired();

  // Already fired this session
  if (sessionFired.has(id)) return;

  // Session cap reached
  if (sessionFired.size >= SESSION_CAP) return;

  // 24h cooldown not expired
  if (isOnCooldown(id)) return;

  // Fire
  showToast(msg, type);
  markSessionFired(id);
  markHistory(id);
}
