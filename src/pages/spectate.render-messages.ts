/**
 * THE MODERATOR — Spectate Render: Messages
 * renderMessages, formatPointBadge.
 */

import { state } from './spectate.state.ts';
import { escHtml } from './spectate.utils.ts';
import type { SpectateDebate, DebateMessage, ReplayPointAward } from './spectate.types.ts';

export function renderMessages(messages: DebateMessage[], d: SpectateDebate): string {
  let html = '';
  let lastRound = 0;
  for (const m of messages) {
    if (m.round && m.round !== lastRound) {
      html += '<div class="round-divider">\u2014 Round ' + Number(m.round) + ' \u2014</div>';
      lastRound = m.round;
    }
    const side = m.side || 'a';
    const name = m.is_ai ? '\uD83E\uDD16 AI'
      : side === 'a' ? (d.debater_a_name || 'Side A')
      : (d.debater_b_name || 'Side B');
    html += '<div class="msg side-' + escHtml(side) + '">';
    html += '<div class="msg-name">' + escHtml(name) + '</div>';
    html += '<div class="msg-text">' + escHtml(m.content) + '</div>';
    html += '<div class="msg-round">Round ' + Number(m.round) + '</div>';
    html += '</div>';
    if (m.created_at && (!state.lastMessageTime || m.created_at > state.lastMessageTime)) {
      state.lastMessageTime = m.created_at;
    }
  }
  return html;
}

/**
 * F-05: Format a point award badge label.
 * No modifier:       "+3 pts"
 * Pure multiplier:   "+3 × 1.5 = 4.5 pts"
 * Pure flat:         "+5 pts"
 * Both:              "+3 × 1.5 + 1 = 5.5 pts"
 */
export function formatPointBadge(pa: ReplayPointAward): string {
  const meta  = pa.metadata;
  const base  = Number(meta?.base_score ?? pa.base_score ?? 0);
  const mult  = Number(meta?.in_debate_multiplier ?? 1.0);
  const flat  = Number(meta?.in_debate_flat ?? 0);
  const final = Number(meta?.final_contribution ?? base);
  const hasMult = mult !== 1.0;
  const hasFlat = flat !== 0;

  if (!hasMult && !hasFlat) return '+' + base + ' pts';
  if (hasMult && !hasFlat)  return '+' + base + ' \u00D7 ' + mult + ' = ' + final + ' pts';
  if (!hasMult && hasFlat)  return '+' + final + ' pts';
  return '+' + base + ' \u00D7 ' + mult + ' + ' + flat + ' = ' + final + ' pts';
}
