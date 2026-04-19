// ============================================================
// THE MODERATOR — Challenge Link Page: Helpers
// Split from challenge.js (Session 188 — F-39)
// ============================================================

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCategoryLabel(category) {
  const map = {
    'politics': '🏛️ Politics',
    'sports': '🏆 Sports',
    'entertainment': '🎬 Entertainment',
    'couples-court': '💑 Couples Court',
    'music': '🎵 Music',
    'movies': '🎥 Movies',
    'cars': '🚗 Cars',
  };
  return map[category] || '🎙️ Open Debate';
}

function getModeLabel(mode) {
  const map = {
    'text': 'Text Battle',
    'voice_memo': 'Voice Memo',
    'live_audio': 'Live Audio',
    'ai_sparring': 'AI Sparring',
  };
  return map[mode] || 'Debate';
}

export { escapeHtml, getCategoryLabel, getModeLabel };
