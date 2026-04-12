/**
 * Home — Live debate card feed
 */
import { getSupabaseClient, getIsPlaceholderMode } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { ModeratorAsync } from '../async.ts';
import type { LiveDebate } from './home.types.ts';

async function fetchLiveDebates(): Promise<LiveDebate[]> {
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return [];
  try {
    const { data, error } = await (sb as any)
      .from('arena_debates')
      .select('id, topic, category, status, mode, spectator_count, current_round, max_rounds, debater_a_profile:profiles!arena_debates_debater_a_fkey(display_name, username), debater_b_profile:profiles!arena_debates_debater_b_fkey(display_name, username)')
      .in('status', ['live', 'round_break', 'voting'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      topic: d.topic,
      category: d.category,
      status: d.status,
      mode: d.mode,
      spectator_count: d.spectator_count || 0,
      current_round: d.current_round || 1,
      max_rounds: d.max_rounds || 5,
      debater_a_name: d.debater_a_profile?.display_name || d.debater_a_profile?.username || 'Debater A',
      debater_b_name: d.debater_b_profile?.display_name || d.debater_b_profile?.username || 'Debater B',
    }));
  } catch (e) {
    console.error('fetchLiveDebates error:', e);
    return [];
  }
}

export async function renderFeed(): Promise<void> {
  const homeScreen = document.getElementById('screen-home');
  if (!homeScreen) return;

  let feedEl = document.getElementById('home-feed-container');
  if (!feedEl) {
    feedEl = document.createElement('div');
    feedEl.id = 'home-feed-container';
    feedEl.style.cssText = 'width:100%;';
    homeScreen.appendChild(feedEl);
  }

  feedEl.innerHTML = '<div style="text-align:center;padding:30px;"><div class="loading-spinner" style="margin:0 auto;"></div></div>';

  const liveDebates = await fetchLiveDebates();
  await ModeratorAsync.fetchTakes();

  let html = '';
  for (const d of liveDebates) {
    const catLabel = (d.category || 'General').toUpperCase();
    html += `
      <div class="mod-card mod-card-live" style="margin-bottom:12px;">
        <div class="gloss"></div>
        <span class="mod-live-badge">LIVE</span>
        <div class="mod-card-category">${escapeHTML(catLabel)}</div>
        <div class="mod-card-vs">
          <span class="mod-debater">${escapeHTML(d.debater_a_name || 'Debater A')}</span>
          <span class="mod-vs-text">VS</span>
          <span class="mod-debater">${escapeHTML(d.debater_b_name || 'Debater B')}</span>
        </div>
        <div class="mod-card-text" style="text-transform:none;">${escapeHTML(d.topic || 'Live Debate')}</div>
        <div class="mod-card-meta">${d.spectator_count || 0} watching · Round ${d.current_round || 1} of ${d.max_rounds || 5}</div>
        <button class="mod-spectate-btn" data-action="spectate-live" data-debate-id="${escapeHTML(d.id)}">Watch Live</button>
      </div>`;
  }

  html += '<div id="hot-takes-feed"></div>';
  feedEl.innerHTML = html;
  ModeratorAsync.loadHotTakes('all');
}
