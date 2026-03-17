/**
 * THE COLOSSEUM — Async Module (TypeScript)
 *
 * Typed mirror of colosseum-async.js. Hot takes, predictions, rivals,
 * challenges. Post → React → Challenge → Structure appears.
 *
 * Source of truth for runtime: colosseum-async.js (until Phase 4 cutover)
 * Source of truth for types: this file
 *
 * Migration: Session 127 (Phase 3)
 */

import type { SafeRpcResult } from './auth.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface HotTake {
  id: string;
  user_id: string;
  username?: string;
  user: string;
  elo: number;
  tokens?: number;
  text: string;
  section: string;
  reactions: number;
  challenges: number;
  time: string;
  userReacted: boolean;
}

export interface Prediction {
  debate_id: string;
  topic: string;
  p1: string;
  p2: string;
  p1_elo: number;
  p2_elo: number;
  total: number;
  pct_a: number;
  pct_b: number;
  user_pick: 'a' | 'b' | null;
  status: string;
}

export interface StandaloneQuestion {
  id: string;
  topic: string;
  side_a_label: string;
  side_b_label: string;
  category: string | null;
  picks_a: number;
  picks_b: number;
  total_picks?: number;
  creator_display_name?: string;
  creator_username?: string;
  _userPick?: 'a' | 'b' | null;
}

export interface RivalEntry {
  id: string;
  rival_id: string;
  rival_username?: string;
  rival_display_name?: string;
  rival_elo?: number;
  rival_wins?: number;
  rival_losses?: number;
  status: 'pending' | 'active';
  direction: 'sent' | 'received';
}

export interface ReactResult {
  reaction_count: number;
  reacted: boolean;
}

export interface CreateHotTakeResult {
  id: string;
}

export type CategoryFilter = 'all' | 'politics' | 'sports' | 'entertainment' | 'trending' | 'technology' | string;

// ============================================================
// AUTH / CONFIG BRIDGE
// ============================================================

declare const ColosseumConfig: {
  escapeHTML: (str: string) => string;
  showToast?: (msg: string, type: string) => void;
};

declare const ColosseumAuth: {
  supabase: {
    from: (table: string) => unknown;
  } | null;
  isPlaceholderMode: boolean;
  currentUser: { id: string } | null;
  currentProfile: {
    username?: string;
    display_name?: string;
    elo_rating?: number;
    token_balance?: number;
  } | null;
  safeRpc: <T = unknown>(rpcName: string, params?: Record<string, unknown>) => Promise<SafeRpcResult<T>>;
  requireAuth: (label: string) => boolean;
  showUserProfile: (userId: string) => void;
  getMyRivals: () => Promise<RivalEntry[]>;
  respondRival: (id: string, accept: boolean) => Promise<{ error?: unknown }>;
};

declare const ColosseumShare: {
  shareTake?: (id: string, text: string) => void;
} | undefined;

declare const ColosseumTokens: {
  claimHotTake: (id: string) => void;
  claimReaction: (id: string) => void;
  claimPrediction: (id: string) => void;
  requireTokens: (amount: number, label: string) => boolean;
} | undefined;

declare const ColosseumArena: {
  enterQueue: (mode: string, topic: string) => void;
} | undefined;

declare function navigateTo(screen: string): void;

// ============================================================
// STATE
// ============================================================

let hotTakes: HotTake[] = [];
let predictions: Prediction[] = [];
let standaloneQuestions: StandaloneQuestion[] = [];
let currentFilter: CategoryFilter = 'all';
export let _pendingChallengeId: string | null = null;

/** FIX #3: Debounce lock for react toggle (LM-015) */
const reactingIds: Set<string> = new Set();

/** Track which containers have delegation wired */
const _wiredContainers: WeakSet<HTMLElement> = new WeakSet();

// ============================================================
// ESCAPE
// ============================================================

const esc: (str: string) => string =
  typeof ColosseumConfig !== 'undefined' && ColosseumConfig.escapeHTML
    ? ColosseumConfig.escapeHTML
    : (s: string) =>
        String(s ?? '').replace(
          /[&<>"']/g,
          (c: string) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
        );

// ============================================================
// PLACEHOLDER DATA
// ============================================================

const PLACEHOLDER_TAKES: Record<string, HotTake[]> = {
  all: [
    { id: 't1', user_id: 'u1', user: 'SHARPMIND', elo: 1847, text: 'AI is going to make 50% of white-collar jobs obsolete by 2030. Not a question of if.', section: 'trending', reactions: 1247, challenges: 23, time: '2h', userReacted: false },
    { id: 't2', user_id: 'u2', user: 'BOLDCLAIM', elo: 1280, text: "Patrick Mahomes is already the greatest QB ever. Stats don't lie.", section: 'sports', reactions: 531, challenges: 11, time: '45m', userReacted: false },
    { id: 't3', user_id: 'u3', user: 'SENATEWATCH', elo: 1340, text: 'Term limits would fix 80% of Congress overnight. Change my mind.', section: 'politics', reactions: 312, challenges: 4, time: '12m', userReacted: false },
    { id: 't4', user_id: 'u4', user: 'FILMTAKES', elo: 1190, text: 'Christopher Nolan peaked at The Dark Knight. Everything since is style over substance.', section: 'entertainment', reactions: 402, challenges: 8, time: '15m', userReacted: false },
    { id: 't5', user_id: 'u5', user: 'TECHBRO_NO', elo: 1590, text: "Every generation thinks they're living through the apocalypse. AI doomerism is no different.", section: 'trending', reactions: 894, challenges: 17, time: '3h', userReacted: false },
    { id: 't6', user_id: 'u6', user: 'HOOPHEAD', elo: 1420, text: 'The NBA play-in tournament is the best thing the league has done in 20 years.', section: 'sports', reactions: 247, challenges: 6, time: '8m', userReacted: false },
  ],
  politics: [],
  sports: [],
  entertainment: [],
  trending: [],
};

const PLACEHOLDER_PREDICTIONS: Prediction[] = [
  { debate_id: 'd1', topic: 'Should the Electoral College Be Abolished?', p1: 'ConstitutionFan', p2: 'DirectDemocrat', p1_elo: 1340, p2_elo: 1290, total: 847, pct_a: 38, pct_b: 62, user_pick: null, status: 'live' },
  { debate_id: 'd2', topic: "MJ vs LeBron — Who's the Real GOAT?", p1: 'ChicagoBull', p2: 'AkronHammer', p1_elo: 1580, p2_elo: 1620, total: 2341, pct_a: 55, pct_b: 45, user_pick: null, status: 'live' },
  { debate_id: 'd3', topic: 'AI Will Replace 50% of Jobs by 2030', p1: 'TechRealist', p2: 'HumanFirst', p1_elo: 1490, p2_elo: 1310, total: 1205, pct_a: 67, pct_b: 33, user_pick: null, status: 'scheduled' },
];

// Populate category filters
PLACEHOLDER_TAKES.all!.forEach((t) => {
  PLACEHOLDER_TAKES[t.section]?.push(t);
});

// ============================================================
// HELPERS
// ============================================================

function _timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  const days = Math.floor(hrs / 24);
  return days + 'd';
}

function _enterArenaWithTopic(topic: string): void {
  setTimeout(() => {
    if (typeof navigateTo === 'function') navigateTo('arena');
    if (typeof ColosseumArena !== 'undefined' && ColosseumArena?.enterQueue) {
      ColosseumArena.enterQueue('ai', topic);
    }
  }, 800);
}

// ============================================================
// INIT
// ============================================================

export function init(): void {
  hotTakes = [...PLACEHOLDER_TAKES.all!];
  predictions = [...PLACEHOLDER_PREDICTIONS];
}

// ============================================================
// DATA FETCHING
// ============================================================

export async function fetchTakes(section?: string): Promise<void> {
  if (typeof ColosseumAuth === 'undefined' || !ColosseumAuth.supabase || ColosseumAuth.isPlaceholderMode) return;

  try {
    // Uses supabase.from() directly for SELECT (RLS allows reads)
    const sb = ColosseumAuth.supabase as {
      from: (table: string) => {
        select: (cols: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => {
              eq: (col: string, val: string) => Promise<{ data: unknown[] | null; error: unknown }>;
            } & Promise<{ data: unknown[] | null; error: unknown }>;
          };
        };
      };
    };

    let query = sb.from('hot_takes')
      .select('id, content, section, created_at, user_id, reaction_count, challenge_count, profiles(username, display_name, elo_rating, token_balance)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (section && section !== 'all') {
      query = query.eq('section', section) as typeof query;
    }

    const { data, error } = await (query as unknown as Promise<{ data: unknown[] | null; error: unknown }>);
    if (error) throw error;

    if (data && data.length > 0) {
      hotTakes = (data as Record<string, unknown>[]).map((t) => {
        const profiles = t['profiles'] as Record<string, unknown> | null;
        return {
          id: t['id'] as string,
          user_id: t['user_id'] as string,
          username: (profiles?.['username'] as string) || '',
          user: ((profiles?.['username'] as string) || 'ANON').toUpperCase(),
          elo: (profiles?.['elo_rating'] as number) || 1200,
          tokens: (profiles?.['token_balance'] as number) || 0,
          text: t['content'] as string,
          section: t['section'] as string,
          reactions: (t['reaction_count'] as number) || 0,
          challenges: (t['challenge_count'] as number) || 0,
          time: _timeAgo(t['created_at'] as string),
          userReacted: false,
        };
      });

      // Load reactions for current user
      if (ColosseumAuth.currentUser?.id) {
        try {
          const reactionSb = ColosseumAuth.supabase as unknown as {
            from: (table: string) => {
              select: (cols: string) => {
                eq: (col: string, val: string) => {
                  in: (col: string, vals: string[]) => Promise<{ data: Array<{ hot_take_id: string }> | null }>;
                };
              };
            };
          };
          const { data: reacts } = await reactionSb
            .from('hot_take_reactions')
            .select('hot_take_id')
            .eq('user_id', ColosseumAuth.currentUser.id)
            .in('hot_take_id', hotTakes.map((t) => t.id));
          if (reacts) {
            const reactedIds = new Set(reacts.map((r) => r.hot_take_id));
            hotTakes.forEach((t) => { t.userReacted = reactedIds.has(t.id); });
          }
        } catch { /* non-critical */ }
      }
    }
  } catch (e) {
    console.error('fetchTakes error:', e);
  }
}

export async function fetchPredictions(): Promise<void> {
  if (typeof ColosseumAuth === 'undefined' || !ColosseumAuth.supabase || ColosseumAuth.isPlaceholderMode) return;

  try {
    const { data, error } = await ColosseumAuth.safeRpc<Record<string, unknown>[]>('get_hot_predictions', { p_limit: 10 });
    if (error) throw error;

    if (data && (data as Record<string, unknown>[]).length > 0) {
      predictions = (data as Record<string, unknown>[]).map((d) => ({
        debate_id: d['debate_id'] as string,
        topic: d['topic'] as string,
        p1: (d['p1_username'] as string) || (d['p1_display_name'] as string) || 'Side A',
        p2: (d['p2_username'] as string) || (d['p2_display_name'] as string) || 'Side B',
        p1_elo: (d['p1_elo'] as number) || 1200,
        p2_elo: (d['p2_elo'] as number) || 1200,
        total: (d['prediction_count'] as number) || 0,
        pct_a: (d['prediction_count'] as number) > 0 ? Math.round(((d['picks_a'] as number) / (d['prediction_count'] as number)) * 100) : 50,
        pct_b: (d['prediction_count'] as number) > 0 ? Math.round(((d['picks_b'] as number) / (d['prediction_count'] as number)) * 100) : 50,
        user_pick: null,
        status: d['status'] as string,
      }));
    }
  } catch (e) {
    console.error('fetchPredictions error:', e);
  }
}

export async function fetchStandaloneQuestions(category?: string): Promise<void> {
  if (typeof ColosseumAuth === 'undefined' || !ColosseumAuth.supabase || ColosseumAuth.isPlaceholderMode) return;
  try {
    const { data, error } = await ColosseumAuth.safeRpc<StandaloneQuestion[]>('get_prediction_questions', {
      p_limit: 20,
      p_category: category || null,
    });
    if (error) throw error;
    if (data && Array.isArray(data) && data.length > 0) {
      standaloneQuestions = data as StandaloneQuestion[];
    }
  } catch (e) {
    console.error('fetchStandaloneQuestions error:', e);
  }
}

// ============================================================
// DELEGATION WIRING
// ============================================================

function _wireTakeDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset['action'];
    if (action === 'react') react(btn.dataset['id'] ?? '');
    else if (action === 'challenge') challenge(btn.dataset['id'] ?? '');
    else if (action === 'share') ColosseumShare?.shareTake?.(btn.dataset['id'] ?? '', btn.dataset['text'] ?? '');
    else if (action === 'expand') {
      const card = btn.closest('.hot-take-card');
      if (!card) return;
      const textEl = card.querySelector('[data-action="expand"]') as HTMLElement | null;
      if (textEl) {
        textEl.style.display = '';
        textEl.style.webkitLineClamp = 'unset';
        textEl.style.overflow = 'visible';
      }
    } else if (action === 'profile') {
      if (btn.dataset['username']) window.location.href = '/u/' + encodeURIComponent(btn.dataset['username']);
      else if (typeof ColosseumAuth !== 'undefined') ColosseumAuth.showUserProfile(btn.dataset['userId'] ?? '');
    }
  });
}

function _wirePredictionDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset['action'] === 'predict') {
      void placePrediction(btn.dataset['id'] ?? '', btn.dataset['pick'] ?? '');
    } else if (btn.dataset['action'] === 'standalone-pick') {
      void pickStandaloneQuestion(btn.dataset['id'] ?? '', btn.dataset['pick'] ?? '');
    } else if (btn.dataset['action'] === 'create-prediction') {
      openCreatePredictionForm();
    }
  });
}

function _wireRivalDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset['action'] === 'profile') {
      if (btn.dataset['username']) window.location.href = '/u/' + encodeURIComponent(btn.dataset['username']);
      else if (typeof ColosseumAuth !== 'undefined') ColosseumAuth.showUserProfile(btn.dataset['userId'] ?? '');
    } else if (btn.dataset['action'] === 'accept-rival') {
      ColosseumAuth?.respondRival?.(btn.dataset['id'] ?? '', true).then(() => void refreshRivals());
    }
  });
}

// ============================================================
// HOT TAKES — LOAD + RENDER
// ============================================================

export function loadHotTakes(category: CategoryFilter = 'all'): void {
  currentFilter = category;
  const container = document.getElementById('hot-takes-feed');
  if (!container) return;

  if (!_wiredContainers.has(container)) {
    _wireTakeDelegation(container);
    _wiredContainers.add(container);
  }

  const takes = category === 'all' ? hotTakes : hotTakes.filter((t) => t.section === category);

  if (takes.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 16px;color:#a0a8b8;">
        <div style="font-size:36px;margin-bottom:8px;">🤫</div>
        <div style="font-size:14px;">No takes here yet. Be the first.</div>
      </div>`;
    return;
  }

  container.innerHTML = takes.map((t) => _renderTake(t)).join('');
}

function _renderTake(t: HotTake): string {
  const userClickable = t.user_id && t.user_id !== ColosseumAuth?.currentUser?.id;
  const safeUser = esc(t.user);
  const safeInitial = esc((t.user || '?')[0] ?? '');
  const safeText = esc(t.text);
  const safeId = esc(t.id);
  const safeUserId = esc(t.user_id);
  const safeUsername = esc(t.username ?? '');

  const profileAttr = userClickable ? `data-action="profile" data-user-id="${safeUserId}" data-username="${safeUsername}" style="cursor:pointer;"` : '';

  return `
    <div class="hot-take-card" data-id="${safeId}" style="
      background:#132240;border:1px solid rgba(255,255,255,0.06);border-radius:12px;
      padding:14px;margin-bottom:10px;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div ${profileAttr} style="width:32px;height:32px;border-radius:50%;background:#1a2d4a;border:2px solid #d4a843;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#d4a843;${userClickable ? 'cursor:pointer;' : ''}">
          ${safeInitial}
        </div>
        <div>
          <span ${profileAttr} style="font-weight:700;font-size:13px;color:#f0f0f0;${userClickable ? 'cursor:pointer;' : ''}">${safeUser}</span>
          <span style="font-size:11px;color:#d4a843;margin-left:6px;">🪙 ${Number(t.tokens || 0)}</span>
        </div>
        <div style="margin-left:auto;font-size:11px;color:#6a7a90;">${esc(t.time)}</div>
      </div>
      <div data-action="expand" data-id="${safeId}" style="font-size:14px;line-height:1.5;color:#f0f0f0;margin-bottom:12px;cursor:pointer;${t.text.length > 150 ? 'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;' : ''}">${safeText}</div>${t.text.length > 150 ? '<div data-action="expand" data-id="' + safeId + '" style="font-size:12px;color:#d4a843;cursor:pointer;margin-top:-8px;margin-bottom:12px;">tap to read more</div>' : ''}
      <div style="display:flex;align-items:center;gap:12px;">
        <button data-action="react" data-id="${safeId}" style="
          display:flex;align-items:center;gap:4px;background:${t.userReacted ? 'rgba(204,41,54,0.15)' : 'rgba(255,255,255,0.05)'};
          border:1px solid ${t.userReacted ? 'rgba(204,41,54,0.3)' : 'rgba(255,255,255,0.08)'};
          color:${t.userReacted ? '#cc2936' : '#a0a8b8'};
          padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
        ">🔥 ${Number(t.reactions)}</button>
        <button data-action="challenge" data-id="${safeId}" style="
          display:flex;align-items:center;gap:4px;
          background:rgba(204,41,54,0.1);border:1px solid rgba(204,41,54,0.3);
          color:#cc2936;padding:6px 12px;border-radius:20px;
          font-size:12px;font-weight:700;cursor:pointer;
        ">⚔️ BET. (${Number(t.challenges)})</button>
        <button data-action="share" data-id="${safeId}" data-text="${esc(t.text)}" style="
          display:flex;align-items:center;gap:4px;
          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
          color:#a0a8b8;padding:6px 12px;border-radius:20px;
          font-size:12px;cursor:pointer;
        ">↗ Share</button>
      </div>
    </div>`;
}

// ============================================================
// PREDICTIONS — RENDER + PLACE
// ============================================================

export function renderPredictions(container: HTMLElement): void {
  if (!container) return;
  if (!_wiredContainers.has(container)) {
    _wirePredictionDelegation(container);
    _wiredContainers.add(container);
  }
  // Full render logic matches colosseum-async.js renderPredictions()
  const hasDebatePreds = predictions.length > 0;
  const hasStandalone = standaloneQuestions.length > 0;

  if (!hasDebatePreds && !hasStandalone) {
    container.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <div style="color:#6a7a90;font-size:13px;margin-bottom:12px;">No active predictions yet.</div>
        <button data-action="create-prediction" style="padding:10px 20px;border-radius:20px;border:1px solid rgba(212,168,67,0.3);background:rgba(212,168,67,0.1);color:#d4a843;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;">➕ CREATE PREDICTION</button>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 8px;">
      <div style="font-family:'Cinzel',serif;font-size:14px;letter-spacing:2px;color:#d4a843;">🔮 PREDICTIONS</div>
      <button data-action="create-prediction" style="padding:5px 12px;border-radius:14px;border:1px solid rgba(212,168,67,0.25);background:rgba(212,168,67,0.08);color:#d4a843;font-size:11px;font-weight:600;letter-spacing:1px;cursor:pointer;">➕ CREATE</button>
    </div>
    ${predictions.map((p) => _renderPredictionCard(p)).join('')}
    ${standaloneQuestions.map((q) => _renderStandaloneCard(q)).join('')}`;
}

function _renderPredictionCard(_p: Prediction): string {
  // Full HTML template — matches colosseum-async.js _renderPredictionCard()
  // Abbreviated here; full implementation in .js file
  const safeTopic = esc(_p.topic);
  const safeP1 = esc(_p.p1);
  const safeP2 = esc(_p.p2);
  const safeDebateId = esc(_p.debate_id);
  const isLive = _p.status === 'live' || _p.status === 'in_progress';
  return `<div style="background:#132240;border:1px solid rgba(212,168,67,0.15);border-radius:12px;padding:14px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      ${isLive ? '<span style="font-size:11px;color:#cc2936;font-weight:600;letter-spacing:1px;">● LIVE</span>' : '<span style="font-size:11px;color:#d4a843;letter-spacing:1px;">UPCOMING</span>'}
      <span style="font-size:11px;color:#6a7a90;">${Number(_p.total)} predictions</span>
    </div>
    <div style="font-family:\'Cinzel\',serif;font-size:14px;color:#f0f0f0;margin-bottom:12px;line-height:1.3;">${safeTopic}</div>
    <div style="display:flex;gap:8px;margin-bottom:10px;">
      <button data-action="predict" data-id="${safeDebateId}" data-pick="a" style="flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:1px solid ${_p.user_pick === 'a' ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.08)'};background:${_p.user_pick === 'a' ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.04)'};">
        <div style="font-weight:700;font-size:13px;color:#f0f0f0;">${safeP1}</div>
        <div style="font-size:11px;color:#6a7a90;">ELO ${Number(_p.p1_elo)}</div>
      </button>
      <button data-action="predict" data-id="${safeDebateId}" data-pick="b" style="flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:1px solid ${_p.user_pick === 'b' ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.08)'};background:${_p.user_pick === 'b' ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.04)'};">
        <div style="font-weight:700;font-size:13px;color:#f0f0f0;">${safeP2}</div>
        <div style="font-size:11px;color:#6a7a90;">ELO ${Number(_p.p2_elo)}</div>
      </button>
    </div>
    <div style="position:relative;height:24px;background:rgba(255,255,255,0.04);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <div style="position:absolute;left:0;top:0;height:100%;width:${Number(_p.pct_a)}%;background:linear-gradient(90deg,rgba(212,168,67,0.3),rgba(212,168,67,0.15));border-radius:12px 0 0 12px;"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:11px;font-weight:700;">
        <span style="color:#d4a843;">${Number(_p.pct_a)}%</span>
        <span style="color:#a0a8b8;">${Number(_p.pct_b)}%</span>
      </div>
    </div>
  </div>`;
}

function _renderStandaloneCard(_q: StandaloneQuestion): string {
  const safeTopic = esc(_q.topic);
  const safeA = esc(_q.side_a_label);
  const safeB = esc(_q.side_b_label);
  const safeId = esc(_q.id);
  const total = Number(_q.total_picks) || (Number(_q.picks_a) + Number(_q.picks_b)) || 0;
  const pctA = total > 0 ? Math.round((Number(_q.picks_a) / total) * 100) : 50;
  const pctB = total > 0 ? 100 - pctA : 50;
  const creator = esc(_q.creator_display_name ?? _q.creator_username ?? 'Anonymous');
  const userPick = _q._userPick ?? null;

  return `<div style="background:#132240;border:1px solid rgba(212,168,67,0.15);border-radius:12px;padding:14px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:11px;color:#d4a843;letter-spacing:1px;">COMMUNITY</span>
      <span style="font-size:11px;color:#6a7a90;">${total} picks · by ${creator}</span>
    </div>
    <div style="font-family:'Cinzel',serif;font-size:14px;color:#f0f0f0;margin-bottom:12px;line-height:1.3;">${safeTopic}</div>
    <div style="display:flex;gap:8px;margin-bottom:10px;">
      <button data-action="standalone-pick" data-id="${safeId}" data-pick="a" style="flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:1px solid ${userPick === 'a' ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.08)'};background:${userPick === 'a' ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.04)'};">
        <div style="font-weight:700;font-size:13px;color:#f0f0f0;">${safeA}</div>
      </button>
      <div style="display:flex;align-items:center;font-family:'Cinzel',serif;font-size:12px;color:#cc2936;letter-spacing:1px;">VS</div>
      <button data-action="standalone-pick" data-id="${safeId}" data-pick="b" style="flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:1px solid ${userPick === 'b' ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.08)'};background:${userPick === 'b' ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.04)'};">
        <div style="font-weight:700;font-size:13px;color:#f0f0f0;">${safeB}</div>
      </button>
    </div>
    <div style="position:relative;height:24px;background:rgba(255,255,255,0.04);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <div style="position:absolute;left:0;top:0;height:100%;width:${pctA}%;background:linear-gradient(90deg,rgba(212,168,67,0.3),rgba(212,168,67,0.15));border-radius:12px 0 0 12px;"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:11px;font-weight:700;">
        <span style="color:#d4a843;">${pctA}%</span>
        <span style="color:#a0a8b8;">${pctB}%</span>
      </div>
    </div>
  </div>`;
}

// ============================================================
// ACTIONS
// ============================================================

export async function placePrediction(debateId: string, side: string): Promise<void> {
  if (typeof ColosseumAuth !== 'undefined' && !ColosseumAuth.requireAuth('place predictions')) return;
  if (typeof ColosseumTokens !== 'undefined' && !ColosseumTokens.requireTokens(100, 'place predictions')) return;
  const pred = predictions.find((p) => p.debate_id === debateId);
  if (!pred) return;
  if (pred.user_pick === side) return;

  const oldPick = pred.user_pick;
  pred.user_pick = side as 'a' | 'b';

  if (!oldPick) {
    const countA = Math.round((pred.total * pred.pct_a) / 100);
    pred.total++;
    const newCountA = countA + (side === 'a' ? 1 : 0);
    // newCountB not needed — pct_b derived as 100 - pct_a
    pred.pct_a = Math.min(99, Math.max(1, Math.round((newCountA / pred.total) * 100)));
    pred.pct_b = 100 - pred.pct_a;
  }

  const predContainer = document.getElementById('predictions-feed');
  if (predContainer) renderPredictions(predContainer);

  if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase && !ColosseumAuth.isPlaceholderMode) {
    try {
      const { error } = await ColosseumAuth.safeRpc('place_prediction', {
        p_debate_id: debateId,
        p_predicted_winner: side,
        p_amount: 0,
      });
      if (error) {
        pred.user_pick = oldPick;
        if (predContainer) renderPredictions(predContainer);
        return;
      }
      if (typeof ColosseumTokens !== 'undefined') ColosseumTokens.claimPrediction(debateId);
    } catch { /* handled */ }
  }

  ColosseumConfig?.showToast?.(`🔮 Predicted ${side === 'a' ? pred.p1 : pred.p2} wins!`, 'success');
}

export async function pickStandaloneQuestion(questionId: string, side: string): Promise<void> {
  if (typeof ColosseumAuth !== 'undefined' && !ColosseumAuth.requireAuth('make predictions')) return;
  const q = standaloneQuestions.find((x) => x.id === questionId);
  if (!q) return;
  if (q._userPick === side) return;

  const oldPick = q._userPick;
  q._userPick = side as 'a' | 'b';
  if (!oldPick) {
    if (side === 'a') q.picks_a = (Number(q.picks_a) || 0) + 1;
    else q.picks_b = (Number(q.picks_b) || 0) + 1;
  } else {
    if (side === 'a') { q.picks_a = (Number(q.picks_a) || 0) + 1; q.picks_b = Math.max(0, (Number(q.picks_b) || 0) - 1); }
    else { q.picks_b = (Number(q.picks_b) || 0) + 1; q.picks_a = Math.max(0, (Number(q.picks_a) || 0) - 1); }
  }

  const predContainer = document.getElementById('predictions-feed');
  if (predContainer) renderPredictions(predContainer);

  if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase && !ColosseumAuth.isPlaceholderMode) {
    try {
      const { error } = await ColosseumAuth.safeRpc('pick_prediction', { p_question_id: questionId, p_pick: side });
      if (error) {
        q._userPick = oldPick ?? undefined;
        if (predContainer) renderPredictions(predContainer);
        return;
      }
    } catch {
      q._userPick = oldPick ?? undefined;
      if (predContainer) renderPredictions(predContainer);
      return;
    }
  }

  ColosseumConfig?.showToast?.(`🔮 Picked ${side === 'a' ? q.side_a_label : q.side_b_label}!`, 'success');
}

export function openCreatePredictionForm(): void {
  if (typeof ColosseumAuth !== 'undefined' && !ColosseumAuth.requireAuth('create predictions')) return;
  // Full implementation in colosseum-async.js — creates bottom sheet with form fields
  // TypeScript mirror provides the function signature for compile-time checking
}

export async function react(takeId: string): Promise<void> {
  if (typeof ColosseumAuth !== 'undefined' && !ColosseumAuth.requireAuth('react to hot takes')) return;
  if (reactingIds.has(takeId)) return;
  const take = hotTakes.find((t) => t.id === takeId);
  if (!take) return;

  reactingIds.add(takeId);
  take.userReacted = !take.userReacted;
  take.reactions += take.userReacted ? 1 : -1;
  loadHotTakes(currentFilter);

  if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase && !ColosseumAuth.isPlaceholderMode) {
    try {
      const { data, error } = await ColosseumAuth.safeRpc<ReactResult>('react_hot_take', {
        p_hot_take_id: takeId,
        p_reaction_type: 'fire',
      });
      if (error) {
        take.userReacted = !take.userReacted;
        take.reactions += take.userReacted ? 1 : -1;
        loadHotTakes(currentFilter);
      } else if (data) {
        take.reactions = (data as ReactResult).reaction_count;
        take.userReacted = (data as ReactResult).reacted;
        loadHotTakes(currentFilter);
        if ((data as ReactResult).reacted && typeof ColosseumTokens !== 'undefined') ColosseumTokens.claimReaction(takeId);
      }
    } catch { /* handled */ }
  }

  reactingIds.delete(takeId);
}

export function challenge(takeId: string): void {
  if (typeof ColosseumAuth !== 'undefined' && !ColosseumAuth.requireAuth('challenge someone to a debate')) return;
  if (typeof ColosseumTokens !== 'undefined' && !ColosseumTokens.requireTokens(50, 'challenge someone')) return;
  const take = hotTakes.find((t) => t.id === takeId);
  if (!take) return;
  _showChallengeModal(take);
}

function _showChallengeModal(_take: HotTake): void {
  // Full implementation in colosseum-async.js — creates modal with counter-argument textarea
  // TypeScript mirror provides the function signature for compile-time checking
  _pendingChallengeId = _take.id;
}

export async function _submitChallenge(takeId: string | null): Promise<void> {
  if (!takeId) return;
  const take = hotTakes.find((t) => t.id === takeId);
  if (!take) return;

  const textarea = document.getElementById('challenge-response') as HTMLTextAreaElement | null;
  const text = textarea?.value?.trim();
  if (!text) {
    if (textarea) textarea.style.borderColor = '#cc2936';
    return;
  }

  take.challenges++;
  document.getElementById('challenge-modal')?.remove();
  loadHotTakes(currentFilter);

  if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase && !ColosseumAuth.isPlaceholderMode) {
    try {
      const { error } = await ColosseumAuth.safeRpc('create_challenge', {
        p_hot_take_id: takeId,
        p_counter_argument: text,
        p_topic: take.text,
      });
      if (error) {
        take.challenges--;
        loadHotTakes(currentFilter);
        ColosseumConfig?.showToast?.('Challenge failed — try again', 'error');
        return;
      }
      ColosseumConfig?.showToast?.('⚔️ Challenge sent! Entering the arena...', 'success');
      _enterArenaWithTopic(take.text);
    } catch {
      take.challenges--;
      loadHotTakes(currentFilter);
      ColosseumConfig?.showToast?.('Challenge failed — try again', 'error');
    }
  } else {
    ColosseumConfig?.showToast?.('⚔️ Challenge sent! Entering the arena...', 'success');
    _enterArenaWithTopic(take.text);
  }
}

export async function postTake(): Promise<void> {
  if (typeof ColosseumAuth !== 'undefined' && !ColosseumAuth.requireAuth('post hot takes')) return;
  if (typeof ColosseumTokens !== 'undefined' && !ColosseumTokens.requireTokens(25, 'post hot takes')) return;
  const input = document.getElementById('hot-take-input') as HTMLTextAreaElement | null;
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const profile = typeof ColosseumAuth !== 'undefined' ? ColosseumAuth.currentProfile : null;
  const section = currentFilter === 'all' ? 'trending' : currentFilter;

  const newTake: HotTake = {
    id: 't_' + Date.now(),
    user_id: ColosseumAuth?.currentUser?.id ?? '',
    user: (profile?.username ?? 'YOU').toUpperCase(),
    elo: profile?.elo_rating ?? 1200,
    text,
    section,
    reactions: 0,
    challenges: 0,
    time: 'now',
    userReacted: false,
  };

  const snapshot = [...hotTakes];
  hotTakes.unshift(newTake);
  input.value = '';
  loadHotTakes(currentFilter);

  if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase && !ColosseumAuth.isPlaceholderMode) {
    try {
      const { data, error } = await ColosseumAuth.safeRpc<CreateHotTakeResult>('create_hot_take', {
        p_content: text,
        p_section: section,
      });
      if (error) {
        hotTakes = snapshot;
        loadHotTakes(currentFilter);
        ColosseumConfig?.showToast?.('Post failed — try again', 'error');
      } else if (data && (data as CreateHotTakeResult).id) {
        newTake.id = (data as CreateHotTakeResult).id;
        if (typeof ColosseumTokens !== 'undefined') ColosseumTokens.claimHotTake((data as CreateHotTakeResult).id);
      }
    } catch {
      hotTakes = snapshot;
      loadHotTakes(currentFilter);
      ColosseumConfig?.showToast?.('Post failed — try again', 'error');
    }
  }
}

// ============================================================
// RIVALS
// ============================================================

export async function renderRivals(container: HTMLElement): Promise<void> {
  if (!container) return;
  if (!_wiredContainers.has(container)) {
    _wireRivalDelegation(container);
    _wiredContainers.add(container);
  }

  const rivals: RivalEntry[] = (typeof ColosseumAuth !== 'undefined' ? await ColosseumAuth.getMyRivals?.() : []) ?? [];

  if (!rivals.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:20px;color:#6a7a90;">
        <div style="font-size:28px;margin-bottom:6px;">⚔️</div>
        <div style="font-size:13px;">No rivals yet. Tap a username to declare one.</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="padding:0 0 8px;font-family:'Cinzel',serif;font-size:14px;letter-spacing:2px;color:#cc2936;">⚔️ HATED RIVALS</div>
    ${rivals.map((r) => {
      const safeName = esc((r.rival_display_name ?? r.rival_username ?? 'Unknown').toUpperCase());
      const safeInitial = esc((r.rival_display_name ?? r.rival_username ?? '?')[0]?.toUpperCase() ?? '');
      const safeRivalId = esc(r.rival_id);
      const safeRivalUsername = esc(r.rival_username ?? '');
      const safeId = esc(r.id);
      return `<div style="background:#132240;border:1px solid rgba(204,41,54,0.2);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;">
        <div data-action="profile" data-user-id="${safeRivalId}" data-username="${safeRivalUsername}" style="width:40px;height:40px;border-radius:50%;background:#1a2d4a;border:2px solid #cc2936;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#cc2936;cursor:pointer;">${safeInitial}</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14px;color:#f0f0f0;">${safeName}</div>
          <div style="font-size:11px;color:#6a7a90;">ELO ${Number(r.rival_elo ?? 1200)} · ${Number(r.rival_wins ?? 0)}W-${Number(r.rival_losses ?? 0)}L</div>
        </div>
        <div style="text-align:right;">
          ${r.status === 'pending'
            ? (r.direction === 'received'
              ? `<button data-action="accept-rival" data-id="${safeId}" style="padding:6px 12px;background:#cc2936;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">ACCEPT</button>`
              : '<span style="font-size:11px;color:#d4a843;letter-spacing:1px;">PENDING</span>')
            : '<span style="font-size:11px;color:#cc2936;font-weight:700;letter-spacing:1px;">⚔️ ACTIVE</span>'}
        </div>
      </div>`;
    }).join('')}`;
}

export async function refreshRivals(): Promise<void> {
  const container = document.getElementById('rivals-feed');
  if (container) await renderRivals(container);
}

// ============================================================
// COMPOSER
// ============================================================

export function getComposerHTML(): string {
  return `
    <div style="background:#132240;border:1px solid rgba(212,168,67,0.15);border-radius:12px;padding:14px;margin-bottom:16px;">
      <textarea id="hot-take-input" placeholder="Drop a hot take..." style="
        width:100%;background:#1a2d4a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;
        color:#f0f0f0;padding:12px;font-size:14px;resize:none;height:60px;
        font-family:'Barlow Condensed',sans-serif;margin-bottom:8px;box-sizing:border-box;
      " maxlength="280"></textarea>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div id="take-char-count" style="font-size:11px;color:#6a7a90;">0 / 280</div>
        <button data-action="post-take" style="
          background:#cc2936;color:#fff;border:none;border-radius:8px;
          padding:8px 20px;font-family:'Cinzel',serif;font-size:14px;
          letter-spacing:1px;cursor:pointer;
        ">POST</button>
      </div>
    </div>`;
}

// ============================================================
// WINDOW GLOBAL BRIDGE (removed in Phase 4)
// ============================================================

export const ColosseumAsync = {
  loadHotTakes,
  fetchTakes,
  fetchPredictions,
  fetchStandaloneQuestions,
  renderPredictions,
  placePrediction,
  renderRivals,
  refreshRivals,
  react,
  challenge,
  postTake,
  getComposerHTML,
  _submitChallenge,
  get predictions() { return predictions; },
} as const;
