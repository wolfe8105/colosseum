/**
 * Home — Live debate card feed
 */
import { getSupabaseClient, getIsPlaceholderMode } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { bountyDot } from '../bounties.ts';
import { ModeratorAsync } from '../async.ts';
import type { LiveDebate } from './home.types.ts';

/** Raw shape returned by the arena_debates Supabase query with joined profiles */
interface ArenaDebateRow {
  id: string;
  topic: string;
  category: string;
  status: string;
  mode: string;
  spectator_count: number;
  current_round: number;
  max_rounds: number;
  debater_a: string | null;
  debater_b: string | null;
  debater_a_profile: { display_name: string | null; username: string | null }[] | null;
  debater_b_profile: { display_name: string | null; username: string | null }[] | null;
}

async function fetchLiveDebates(): Promise<LiveDebate[]> {
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return [];
  try {
    const { data, error } = await (sb as ReturnType<typeof getSupabaseClient> & { from: (t: string) => any })
      .from('arena_debates')
      .select('id, topic, category, status, mode, spectator_count, current_round, max_rounds, debater_a, debater_b, debater_a_profile:profiles!arena_debates_debater_a_fkey(display_name, username), debater_b_profile:profiles!arena_debates_debater_b_fkey(display_name, username)')
      .in('status', ['live', 'round_break', 'voting'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (error || !data) return [];
    return (data as ArenaDebateRow[]).map((d) => ({
      id: d.id,
      topic: d.topic,
      category: d.category,
      status: d.status,
      mode: d.mode,
      spectator_count: d.spectator_count || 0,
      current_round: d.current_round || 1,
      max_rounds: d.max_rounds || 5,
      debater_a_id: d.debater_a ?? null,
      debater_b_id: d.debater_b ?? null,
      debater_a_name: d.debater_a_profile?.[0]?.display_name || d.debater_a_profile?.[0]?.username || 'Debater A',
      debater_b_name: d.debater_b_profile?.[0]?.display_name || d.debater_b_profile?.[0]?.username || 'Debater B',
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
          <span class="mod-debater">${escapeHTML(d.debater_a_name || 'Debater A')}${bountyDot(d.debater_a_id)}</span>
          <span class="mod-vs-text">VS</span>
          <span class="mod-debater">${escapeHTML(d.debater_b_name || 'Debater B')}${bountyDot(d.debater_b_id)}</span>
        </div>
        <div class="mod-card-text" style="text-transform:none;">${escapeHTML(d.topic || 'Live Debate')}</div>
        <div class="mod-card-meta">${Number(d.spectator_count) || 0} watching · Round ${Number(d.current_round) || 1} of ${Number(d.max_rounds) || 5}</div>
        <button class="mod-spectate-btn" data-action="spectate-live" data-debate-id="${escapeHTML(d.id)}">Watch Live</button>
      </div>`;
  }

  html += ModeratorAsync.getComposerHTML();
  html += '<div id="hot-takes-feed"></div>';
  feedEl.innerHTML = html;

  const input = document.getElementById('hot-take-input') as HTMLInputElement | null;
  const counter = document.getElementById('take-char-count');
  if (input && counter) {
    input.addEventListener('input', () => {
      counter.textContent = input.value.length + ' / 280';
    });
  }

  ModeratorAsync.loadHotTakes('all');
}
