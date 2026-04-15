// arena-room-end-nulled.ts — nulled debate early-return path
// Renders the NULLED post-debate screen and wires back-to-lobby. Skips scoring, Elo, tokens.

import { escapeHTML } from '../config.ts';
import { removeShieldIndicator } from '../powerups.ts';
import {
  silenceTimer, activatedPowerUps, screenEl,
  set_silenceTimer, set_shieldActive,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';

export function renderNulledDebate(debate: CurrentDebate): void {
  if (silenceTimer) { clearInterval(silenceTimer); set_silenceTimer(null); }
  removeShieldIndicator();
  set_shieldActive(false);
  activatedPowerUps.clear();
  document.getElementById('powerup-silence-overlay')?.remove();
  document.getElementById('powerup-reveal-popup')?.remove();

  const reason = debate._nullReason || 'Debate nulled';
  if (screenEl) screenEl.innerHTML = '';
  const post = document.createElement('div');
  post.className = 'arena-post arena-fade-in';
  post.innerHTML = `
    <div class="arena-rank-badge casual">\u26A0\uFE0F NULLED</div>
    <div class="arena-post-verdict">\u26D4</div>
    <div class="arena-post-title">DEBATE NULLED</div>
    <div class="arena-elo-change neutral">No Rating Change</div>
    <div class="arena-post-topic">${escapeHTML(debate.topic)}</div>
    <div class="arena-null-reason">${escapeHTML(reason)}</div>
    <div class="arena-post-actions">
      <button class="arena-post-btn primary" id="arena-back-to-lobby">\u2190 LOBBY</button>
    </div>
  `;
  screenEl?.appendChild(post);
  document.getElementById('arena-back-to-lobby')?.addEventListener('click', async () => {
    const { renderLobby } = await import('./arena-lobby.ts');
    renderLobby();
  });
}
