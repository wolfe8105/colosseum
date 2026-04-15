/**
 * THE MODERATOR — Spectate Render: Timeline
 * renderTimeline — enriched timeline with power-ups, references, point awards.
 * Extracted private helpers reduce the main function from ~190 to ~80 lines.
 */

import { state } from './spectate.state.ts';
import { escHtml } from './spectate.utils.ts';
import { renderMessages, formatPointBadge } from './spectate.render-messages.ts';
import type {
  SpectateDebate, DebateMessage, ReplayPowerUp, ReplayReference,
  ReplayPointAward, ReplaySpeechEvent, TimelineEntry,
} from './spectate.types.ts';

// ── Private entry renderers ──────────────────────────────────

function _renderMessage(m: DebateMessage, d: SpectateDebate, lastRound: number): { html: string; lastRound: number } {
  let html = '';
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
  return { html, lastRound };
}

function _renderSpeech(se: ReplaySpeechEvent, award: ReplayPointAward | undefined, lastRound: number): { html: string; lastRound: number } {
  let html = '';
  if (se.round && se.round !== lastRound) {
    html += '<div class="round-divider">\u2014 Round ' + Number(se.round) + ' \u2014</div>';
    lastRound = se.round;
  }
  const side = se.side || 'a';
  html += '<div class="msg side-' + escHtml(side) + '">';
  html += '<div class="msg-name">' + escHtml(se.debater_name) + '</div>';
  html += '<div class="msg-text">' + escHtml(se.content || '') + '</div>';
  if (award) {
    const awardSideClass = award.side === 'a' ? 'award-side-a' : 'award-side-b';
    html += '<div class="msg-score-badge ' + awardSideClass + '">\u26A1 ' + formatPointBadge(award) + '</div>';
  }
  html += '<div class="msg-round">Round ' + Number(se.round) + '</div>';
  html += '</div>';
  if (se.created_at && (!state.lastMessageTime || se.created_at > state.lastMessageTime)) {
    state.lastMessageTime = se.created_at;
  }
  return { html, lastRound };
}

function _renderScore(pa: ReplayPointAward, d: SpectateDebate): string {
  const sideClass = pa.side === 'a' ? 'side-a' : 'side-b';
  const sideName  = pa.side === 'a' ? (d.debater_a_name || 'Side A') : (d.debater_b_name || 'Side B');
  return '<div class="timeline-event score-event ' + sideClass + '">'
    + '<span class="timeline-icon">\u26A1</span>'
    + '<span class="timeline-text">' + formatPointBadge(pa) + ' for <strong>' + escHtml(sideName) + '</strong></span>'
    + '</div>';
}

function _renderPowerUp(pu: ReplayPowerUp): string {
  const sideClass = pu.side === 'a' ? 'side-a' : 'side-b';
  return '<div class="timeline-event power-up-event ' + sideClass + '">'
    + '<span class="timeline-icon">' + escHtml(pu.power_up_icon) + '</span>'
    + '<span class="timeline-text">' + escHtml(pu.user_name) + ' used <strong>' + escHtml(pu.power_up_name) + '</strong></span>'
    + '</div>';
}

function _renderReference(ref: ReplayReference): string {
  const sideClass = ref.side === 'a' ? 'side-a' : 'side-b';
  const rulingIcon = ref.ruling === 'accepted' ? '\u2705' : ref.ruling === 'rejected' ? '\u274C' : '\u23F3';
  const rulingText = ref.ruling === 'accepted' ? 'Accepted' : ref.ruling === 'rejected' ? 'Rejected' : 'Pending';
  let html = '<div class="timeline-event reference-event ' + sideClass + '">'
    + '<span class="timeline-icon">\uD83D\uDCCE</span>'
    + '<span class="timeline-text">' + escHtml(ref.submitter_name) + ' cited a source</span>';
  if (ref.description) html += '<div class="ref-desc">' + escHtml(ref.description) + '</div>';
  if (ref.url) html += '<div class="ref-url">' + escHtml(ref.url) + '</div>';
  html += '<div class="ref-ruling">' + rulingIcon + ' ' + rulingText;
  if (ref.ruling_reason) html += ' \u2014 ' + escHtml(ref.ruling_reason);
  html += '</div></div>';
  return html;
}

// ── Main export ──────────────────────────────────────────────

export function renderTimeline(messages: DebateMessage[], d: SpectateDebate): string {
  const rd = state.replayData;

  const pointAwardMap = new Map<string, ReplayPointAward>();
  const orphanAwards: ReplayPointAward[] = [];
  if (rd?.point_awards?.length) {
    for (const pa of rd.point_awards) {
      const sid = pa.metadata?.scored_event_id;
      if (sid) pointAwardMap.set(String(sid), pa);
      else orphanAwards.push(pa);
    }
  }

  const hasSpeechEvents = (rd?.speech_events?.length ?? 0) > 0;
  const hasEnrichment = rd && (rd.power_ups.length > 0 || rd.references.length > 0 || hasSpeechEvents || (rd.point_awards?.length ?? 0) > 0);
  if (!hasEnrichment && messages.length > 0) return renderMessages(messages, d);

  const entries: TimelineEntry[] = [];

  if (hasSpeechEvents) {
    for (const se of rd!.speech_events) entries.push({ type: 'speech', timestamp: se.created_at, round: se.round, side: se.side, data: se });
    for (const pa of orphanAwards) entries.push({ type: 'score', timestamp: pa.created_at, round: pa.round, side: pa.side, data: pa });
  } else {
    for (const m of messages) entries.push({ type: 'message', timestamp: m.created_at || '1970-01-01T00:00:00Z', round: m.round, side: m.side, data: m });
    for (const pa of [...orphanAwards, ...pointAwardMap.values()]) entries.push({ type: 'score', timestamp: pa.created_at, round: pa.round, side: pa.side, data: pa });
  }

  if (rd?.power_ups?.length) for (const pu of rd.power_ups) entries.push({ type: 'power_up', timestamp: pu.activated_at, round: null, side: pu.side, data: pu });
  if (rd?.references?.length) for (const ref of rd.references) entries.push({ type: 'reference', timestamp: ref.created_at, round: ref.round, side: ref.side, data: ref });

  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let html = '';
  let lastRound = 0;

  for (const entry of entries) {
    if (entry.type === 'message') {
      const r = _renderMessage(entry.data as DebateMessage, d, lastRound);
      html += r.html; lastRound = r.lastRound;
    } else if (entry.type === 'speech') {
      const r = _renderSpeech(entry.data as ReplaySpeechEvent, pointAwardMap.get((entry.data as ReplaySpeechEvent).id), lastRound);
      html += r.html; lastRound = r.lastRound;
    } else if (entry.type === 'score') {
      html += _renderScore(entry.data as ReplayPointAward, d);
    } else if (entry.type === 'power_up') {
      html += _renderPowerUp(entry.data as ReplayPowerUp);
    } else if (entry.type === 'reference') {
      html += _renderReference(entry.data as ReplayReference);
    }
  }

  return html;
}
