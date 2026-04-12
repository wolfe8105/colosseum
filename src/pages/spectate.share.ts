/**
 * THE MODERATOR — Spectator View Share Buttons
 *
 * Share button wiring with social proof copy.
 */

import type { SpectateDebate } from './spectate.types.ts';

export function wireShareButtons(d: SpectateDebate): void {
  const url = window.location.href;
  const specCount = Number(d.spectator_count) || 0;
  const proofText = specCount > 1 ? specCount + ' watching — ' : '';
  const text = '⚔️ ' + proofText + (d.topic || 'Live Debate') + ' — Watch on The Moderator';

  document.getElementById('share-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('share-copy');
      if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 2000); }
    }).catch((e) => console.warn('[Spectate] clipboard copy failed:', e));
  });

  document.getElementById('share-x')?.addEventListener('click', () => {
    window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank');
  });

  document.getElementById('share-wa')?.addEventListener('click', () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank');
  });

  document.getElementById('share-native')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: d.topic || 'Live Debate', text: text, url: url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch((e) => console.warn('[Spectate] clipboard fallback failed:', e));
    }
  });
}
