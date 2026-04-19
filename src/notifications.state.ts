/**
 * THE MODERATOR — Notifications State
 */

import type { Notification } from './notifications.types.ts';

export let notifications: Notification[] = [];
export let unreadCount = 0;
export let pollInterval: ReturnType<typeof setInterval> | null = null;
export let panelOpen = false;

export function setNotifications(n: Notification[]): void { notifications = n; }
export function setPanelOpen(v: boolean): void { panelOpen = v; }
export function setPollInterval(v: ReturnType<typeof setInterval> | null): void {
  if (pollInterval !== null) clearInterval(pollInterval);
  pollInterval = v;
}

export function markOneRead(id: string): boolean {
  const n = notifications.find(n => n.id === id);
  if (n && !n.read) { n.read = true; unreadCount = Math.max(0, unreadCount - 1); return true; }
  return false;
}

export function markAllAsRead(): void {
  notifications.forEach(n => { n.read = true; });
  unreadCount = 0;
}

export function computeUnreadCount(): void {
  unreadCount = notifications.filter(n => !n.read).length;
}

export function getPlaceholderNotifs(): Notification[] {
  return [
    { id: '1', type: 'challenge',  title: 'IRONMIND challenged you',         body: '"LeBron is NOT the GOAT" — accept?',                read: false },
    { id: '2', type: 'reaction',   title: '🔥 Your hot take is on fire',     body: '247 reactions on "NBA play-in is the best thing..."', read: false },
    { id: '3', type: 'result',     title: 'Debate result: YOU WON',          body: 'vs FACTCHECKER — ELO +18 (now 1,218)',                read: false },
    { id: '4', type: 'stake_won',  title: '🪙 Stake Won!',                   body: 'You won 45 tokens on "Is crypto dead?"',             read: false },
    { id: '5', type: 'tier_up',    title: '🏅 Tier Up!',                     body: 'You reached Spectator+! New perks unlocked.',        read: false },
    { id: '6', type: 'follow',     title: 'SHARPSHOOTER followed you',       body: 'ELO 1,654 — 42 wins',                                read: true  },
    { id: '7', type: 'system',     title: 'Welcome to The Moderator',        body: 'Post a hot take, watch a debate, or start one.',     read: true  },
  ];
}
