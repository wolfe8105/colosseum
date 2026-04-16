/**
 * THE MODERATOR — Spectator View Utilities
 *
 * Pure display helpers. No DOM access, no state, no side effects.
 */

export function escHtml(str: unknown): string {
  if (!str) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function parseAvatar(avatarUrl: string | null, fallbackName: string) {
  if (avatarUrl && avatarUrl.startsWith('emoji:')) {
    return { type: 'emoji', value: avatarUrl.replace('emoji:', '') };
  }
  return { type: 'initial', value: (fallbackName || '?')[0].toUpperCase() };
}

export function renderAvatar(avatarUrl: string | null, name: string, sideClass: string): string {
  const av = parseAvatar(avatarUrl, name);
  if (av.type === 'emoji') {
    return '<div class="vs-avatar emoji">' + escHtml(av.value) + '</div>';
  }
  return '<div class="vs-avatar ' + sideClass + '">' + escHtml(av.value) + '</div>';
}

export function modeLabel(mode: string | null): string {
  const map: Record<string, string> = { live: '🎙️ LIVE AUDIO', voicememo: '🎤 VOICE MEMO', text: '⌨️ TEXT', ai: '🤖 AI SPARRING' };
  return map[mode as string] || mode?.toUpperCase() || 'DEBATE';
}

export function statusBadge(status: string | null): string {
  if (status === 'live') return '<span class="status-badge live"><span class="dot"></span> LIVE</span>';
  if (status === 'complete' || status === 'completed') return '<span class="status-badge complete">COMPLETE</span>';
  if (status === 'voting') return '<span class="status-badge voting">VOTING</span>';
  return '<span class="status-badge complete">' + escHtml(status?.toUpperCase() || 'UNKNOWN') + '</span>';
}

export function timeAgo(ts: string | null): string {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  return Math.floor(diff / 3600) + 'h';
}
