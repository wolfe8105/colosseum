/**
 * THE MODERATOR — Async Module: Utility Functions
 *
 * Pure helpers: _timeAgo, _enterArenaWithTopic.
 * No state imports needed.
 */

import { navigateTo } from './navigation.ts';

declare const ModeratorArena:
  | {
      enterQueue: (mode: string, topic: string) => void;
    }
  | undefined;

export function _timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  const days = Math.floor(hrs / 24);
  return days + 'd';
}

export function _enterArenaWithTopic(topic: string): void {
  setTimeout(() => {
    navigateTo('arena');
    if (typeof ModeratorArena !== 'undefined' && ModeratorArena?.enterQueue) {
      ModeratorArena.enterQueue('ai', topic);
    }
  }, 800);
}
