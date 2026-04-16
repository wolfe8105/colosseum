// ============================================================
// THE MODERATOR — Profile Page Helpers
// Split from api/profile.js (Session refactor)
//
// Pure utility functions — no imports, no side effects.
// ============================================================

export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function sanitizeAvatarUrl(url) {
  if (!url) return null;
  // Only allow https:// URLs — blocks javascript:, data:, etc.
  if (/^https:\/\//i.test(url)) return url;
  return null;
}

export function getRankTier(elo) {
  if (elo >= 1800) return { name: 'Legendary', color: '#d4a843', icon: '👑' };
  if (elo >= 1500) return { name: 'Champion', color: '#d4a843', icon: '⚔️' };
  if (elo >= 1300) return { name: 'Contender', color: '#7aa3d4', icon: '🛡️' };
  if (elo >= 1100) return { name: 'Gladiator', color: '#5b8abf', icon: '⚡' };
  return { name: 'Rookie', color: '#a0a8b8', icon: '🏛️' };
}

export function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getInitials(displayName, username) {
  const name = displayName || username || '?';
  return name.charAt(0).toUpperCase();
}

// SESSION 113: Parse emoji avatar format ('emoji:⚔️' → '⚔️', else null)
export function parseEmojiAvatar(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return null;
  if (avatarUrl.startsWith('emoji:')) return avatarUrl.slice(6);
  return null;
}
