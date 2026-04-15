/**
 * THE MODERATOR — Profile Debate Archive Filter
 * _filtered, _archiveUrl — pure helpers, no DOM dependency.
 */

import { entries, filterCat, filterResult, filterSearch } from './profile-debate-archive.state.ts';
import type { ArchiveEntry } from './profile-debate-archive.types.ts';

export function archiveUrl(entry: ArchiveEntry): string {
  const mode = entry.debate_mode;
  if (mode === 'ai') return `/moderator-auto-debate.html?id=${encodeURIComponent(entry.debate_id)}`;
  return `/moderator-spectate.html?id=${encodeURIComponent(entry.debate_id)}`;
}

export function filtered(): ArchiveEntry[] {
  return entries.filter(e => {
    if (filterCat !== 'all' && (e.category ?? 'general') !== filterCat) return false;
    if (filterResult === 'win' && !e.is_win) return false;
    if (filterResult === 'loss' && e.is_win) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const topic = (e.topic ?? '').toLowerCase();
      const opp = (e.opponent_name ?? e.opponent_username ?? '').toLowerCase();
      const name = (e.custom_name ?? '').toLowerCase();
      if (!topic.includes(q) && !opp.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });
}
