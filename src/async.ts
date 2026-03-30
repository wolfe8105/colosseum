/**
 * THE MODERATOR — Async Module (TypeScript)
 *
 * Runtime module — replaces moderator-async.js when Vite build is active.
 * Hot takes, predictions, rivals, challenges.
 * Depends on: config.ts, auth.ts, share.ts
 *
 * Source of truth for runtime: this file (Phase 3 cutover)
 * Source of truth for types: this file
 *
 * Migration: Session 127 (Phase 3), Session 138 (ES imports, zero globalThis reads)
 */

import { escapeHTML, showToast } from './config.ts';
import {
  safeRpc,
  getCurrentUser,
  getCurrentProfile,
  getIsPlaceholderMode,
  getSupabaseClient,
  requireAuth,
  showUserProfile,
  getMyRivals,
  respondRival,
  ready,
} from './auth.ts';
import type { SafeRpcResult } from './auth.ts';
import { shareTake } from './share.ts';
import { navigateTo } from './navigation.ts';
import { nudge } from './nudge.ts';

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

export type CategoryFilter =
  | 'all'
  | 'politics'
  | 'sports'
  | 'entertainment'
  | 'trending'
  | 'technology'
  | string;

// ============================================================
// MODULE EXPORTS
// ============================================================

declare const ModeratorTokens:
  | {
      claimHotTake: (id: string) => void;
      claimReaction: (id: string) => void;
      claimPrediction: (id: string) => void;
      requireTokens: (amount: number, label: string) => boolean;
    }
  | undefined;

declare const ModeratorArena:
  | {
      enterQueue: (mode: string, topic: string) => void;
    }
  | undefined;

// ============================================================
// ESCAPE (imported from config.ts)
// ============================================================

const esc = escapeHTML;

// ============================================================
// STATE
// ============================================================

let hotTakes: HotTake[] = [];
let predictions: Prediction[] = [];
let standaloneQuestions: StandaloneQuestion[] = [];
let currentFilter: CategoryFilter = 'all';
let _pendingChallengeId: string | null = null;

/** FIX #3: Debounce lock for react toggle (LM-015) */
const reactingIds: Set<string> = new Set();

/** Track which containers have delegation wired */
const _wiredContainers: WeakSet<HTMLElement> = new WeakSet();

// ============================================================
// PLACEHOLDER DATA
// ============================================================

const PLACEHOLDER_TAKES: Record<string, HotTake[]> = {
  all: [
    {
      id: 't1',
      user_id: 'u1',
      user: 'SHARPMIND',
      elo: 1847,
      text: 'AI is going to make 50% of white-collar jobs obsolete by 2030. Not a question of if.',
      section: 'trending',
      reactions: 1247,
      challenges: 23,
      time: '2h',
      userReacted: false,
    },
    {
      id: 't2',
      user_id: 'u2',
      user: 'BOLDCLAIM',
      elo: 1280,
      text: "Patrick Mahomes is already the greatest QB ever. Stats don't lie.",
      section: 'sports',
      reactions: 531,
      challenges: 11,
      time: '45m',
      userReacted: false,
    },
    {
      id: 't3',
      user_id: 'u3',
      user: 'SENATEWATCH',
      elo: 1340,
      text: 'Term limits would fix 80% of Congress overnight. Change my mind.',
      section: 'politics',
      reactions: 312,
      challenges: 4,
      time: '12m',
      userReacted: false,
    },
    {
      id: 't4',
      user_id: 'u4',
      user: 'FILMTAKES',
      elo: 1190,
      text: 'Christopher Nolan peaked at The Dark Knight. Everything since is style over substance.',
      section: 'entertainment',
      reactions: 402,
      challenges: 8,
      time: '15m',
      userReacted: false,
    },
    {
      id: 't5',
      user_id: 'u5',
      user: 'TECHBRO_NO',
      elo: 1590,
      text: "Every generation thinks they're living through the apocalypse. AI doomerism is no different.",
      section: 'trending',
      reactions: 894,
      challenges: 17,
      time: '3h',
      userReacted: false,
    },
    {
      id: 't6',
      user_id: 'u6',
      user: 'HOOPHEAD',
      elo: 1420,
      text: 'The NBA play-in tournament is the best thing the league has done in 20 years.',
      section: 'sports',
      reactions: 247,
      challenges: 6,
      time: '8m',
      userReacted: false,
    },
  ],
  politics: [],
  sports: [],
  entertainment: [],
  trending: [],
};

const PLACEHOLDER_PREDICTIONS: Prediction[] = [
  {
    debate_id: 'd1',
    topic: 'Should the Electoral College Be Abolished?',
    p1: 'ConstitutionFan',
    p2: 'DirectDemocrat',
    p1_elo: 1340,
    p2_elo: 1290,
    total: 847,
    pct_a: 38,
    pct_b: 62,
    user_pick: null,
    status: 'live',
  },
  {
    debate_id: 'd2',
    topic: "MJ vs LeBron — Who's the Real GOAT?",
    p1: 'ChicagoBull',
    p2: 'AkronHammer',
    p1_elo: 1580,
    p2_elo: 1620,
    total: 2341,
    pct_a: 55,
    pct_b: 45,
    user_pick: null,
    status: 'live',
  },
  {
    debate_id: 'd3',
    topic: 'AI Will Replace 50% of Jobs by 2030',
    p1: 'TechRealist',
    p2: 'HumanFirst',
    p1_elo: 1490,
    p2_elo: 1310,
    total: 1205,
    pct_a: 67,
    pct_b: 33,
    user_pick: null,
    status: 'scheduled',
  },
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
    navigateTo('arena');
    if (typeof ModeratorArena !== 'undefined' && ModeratorArena?.enterQueue) {
      ModeratorArena.enterQueue('ai', topic);
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
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return;
  try {
    let query = (
      sb as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            order: (
              col: string,
              opts: { ascending: boolean }
            ) => {
              limit: (n: number) => {
                eq: (col: string, val: string) => unknown;
              } & Promise<{ data: unknown[] | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from('hot_takes')
      .select(
        'id, content, section, created_at, user_id, reaction_count, challenge_count, profiles(username, display_name, elo_rating, token_balance)'
      )
      .order('created_at', { ascending: false })
      .limit(30);

    if (section && section !== 'all') {
      query = query.eq('section', section) as typeof query;
    }

    const { data, error } = await (query as unknown as Promise<{
      data: unknown[] | null;
      error: unknown;
    }>);
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
      const userId = getCurrentUser()?.id;
      if (userId) {
        try {
          const reactionSb = sb as unknown as {
            from: (table: string) => {
              select: (cols: string) => {
                eq: (col: string, val: string) => {
                  in: (
                    col: string,
                    vals: string[]
                  ) => Promise<{ data: Array<{ hot_take_id: string }> | null }>;
                };
              };
            };
          };
          const { data: reacts } = await reactionSb
            .from('hot_take_reactions')
            .select('hot_take_id')
            .eq('user_id', userId)
            .in(
              'hot_take_id',
              hotTakes.map((t) => t.id)
            );
          if (reacts) {
            const reactedIds = new Set(reacts.map((r) => r.hot_take_id));
            hotTakes.forEach((t) => {
              t.userReacted = reactedIds.has(t.id);
            });
          }
        } catch {
          /* non-critical */
        }
      }
    }
  } catch (e) {
    console.error('fetchTakes error:', e);
  }
}

export async function fetchPredictions(): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return;
  try {
    const { data, error } = await safeRpc<Record<string, unknown>[]>(
      'get_hot_predictions',
      { p_limit: 10 }
    );
    if (error) throw error;
    if (data && (data as Record<string, unknown>[]).length > 0) {
      predictions = (data as Record<string, unknown>[]).map((d) => ({
        debate_id: d['debate_id'] as string,
        topic: d['topic'] as string,
        p1:
          (d['p1_username'] as string) ||
          (d['p1_display_name'] as string) ||
          'Side A',
        p2:
          (d['p2_username'] as string) ||
          (d['p2_display_name'] as string) ||
          'Side B',
        p1_elo: (d['p1_elo'] as number) || 1200,
        p2_elo: (d['p2_elo'] as number) || 1200,
        total: (d['prediction_count'] as number) || 0,
        pct_a:
          (d['prediction_count'] as number) > 0
            ? Math.round(
                ((d['picks_a'] as number) /
                  (d['prediction_count'] as number)) *
                  100
              )
            : 50,
        pct_b:
          (d['prediction_count'] as number) > 0
            ? Math.round(
                ((d['picks_b'] as number) /
                  (d['prediction_count'] as number)) *
                  100
              )
            : 50,
        user_pick: null,
        status: d['status'] as string,
      }));
    }
  } catch (e) {
    console.error('fetchPredictions error:', e);
  }
}

export async function fetchStandaloneQuestions(
  category?: string
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return;
  try {
    const { data, error } = await safeRpc<StandaloneQuestion[]>(
      'get_prediction_questions',
      {
        p_limit: 20,
        p_category: category || null,
      }
    );
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
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset['action'];
    if (action === 'react') react(btn.dataset['id'] ?? '');
    else if (action === 'challenge') challenge(btn.dataset['id'] ?? '');
    else if (action === 'share')
      shareTake(btn.dataset['id'] ?? '', btn.dataset['text'] ?? '');
    else if (action === 'expand') {
      const card = btn.closest('.mod-card');
      if (!card) return;
      const textEl = card.querySelector(
        '[data-action="expand"]'
      ) as HTMLElement | null;
      if (textEl) {
        textEl.style.display = '';
        textEl.style.webkitLineClamp = 'unset';
        textEl.style.overflow = 'visible';
      }
      const moreEl = card.querySelectorAll('[data-action="expand"]')[1] as
        | HTMLElement
        | undefined;
      if (moreEl && moreEl.textContent?.includes('tap')) moreEl.remove();
    } else if (action === 'profile') {
      if (btn.dataset['username'])
        window.location.href =
          '/u/' + encodeURIComponent(btn.dataset['username']);
      else showUserProfile(btn.dataset['userId'] ?? '');
    }
  });
}

function _wirePredictionDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset['action'] === 'predict') {
      void placePrediction(btn.dataset['id'] ?? '', btn.dataset['pick'] ?? '');
    } else if (btn.dataset['action'] === 'standalone-pick') {
      void pickStandaloneQuestion(
        btn.dataset['id'] ?? '',
        btn.dataset['pick'] ?? ''
      );
    } else if (btn.dataset['action'] === 'create-prediction') {
      openCreatePredictionForm();
    }
  });
}

function _wireRivalDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset['action'] === 'profile') {
      if (btn.dataset['username'])
        window.location.href =
          '/u/' + encodeURIComponent(btn.dataset['username']);
      else showUserProfile(btn.dataset['userId'] ?? '');
    } else if (btn.dataset['action'] === 'accept-rival') {
      respondRival(btn.dataset['id'] ?? '', true).then(() =>
        void refreshRivals()
      );
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

  const takes =
    category === 'all'
      ? hotTakes
      : hotTakes.filter((t) => t.section === category);

  if (takes.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 16px;color:var(--mod-text-sub);">
        <div style="font-size:36px;margin-bottom:8px;">🤫</div>
        <div style="font-size:14px;">No takes here yet. Be the first.</div>
      </div>`;
    return;
  }

  container.innerHTML = takes.map((t) => _renderTake(t)).join('');
}

function _renderTake(t: HotTake): string {
  const userClickable = t.user_id && t.user_id !== getCurrentUser()?.id;
  const safeUser = esc(t.user);
  const safeInitial = esc((t.user || '?')[0] ?? '');
  const safeText = esc(t.text);
  const safeId = esc(t.id);
  const safeUserId = esc(t.user_id);
  const safeUsername = esc(t.username ?? '');
  const profileAttr = userClickable
    ? `data-action="profile" data-user-id="${safeUserId}" data-username="${safeUsername}" style="cursor:pointer;"`
    : '';
  const catLabel = (t.section || 'general').toUpperCase();
  const truncate = t.text.length > 150;

  return `
    <div class="hot-take-card" data-id="${safeId}" style="
      background:#132240;border:1px solid var(--mod-border-secondary);border-radius:12px;
      padding:14px;margin-bottom:10px;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div ${profileAttr} style="width:32px;height:32px;border-radius:50%;background:var(--mod-bg-card);border:2px solid var(--mod-accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--mod-accent);${userClickable ? 'cursor:pointer;' : ''}">
          ${safeInitial}
        </div>
        <div>
          <span ${profileAttr} style="font-weight:700;font-size:13px;color:var(--mod-text-heading);${userClickable ? 'cursor:pointer;' : ''}">${safeUser}</span>
          <span style="font-size:11px;color:var(--mod-accent);margin-left:6px;">🪙 ${Number(t.tokens || 0)}</span>
        </div>
        <div style="margin-left:auto;font-size:11px;color:#6a7a90;">${esc(t.time)}</div>
      </div>
      <div data-action="expand" data-id="${safeId}" style="font-size:14px;line-height:1.5;color:var(--mod-text-heading);margin-bottom:12px;cursor:pointer;${t.text.length > 150 ? 'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;' : ''}">${safeText}</div>${t.text.length > 150 ? '<div data-action="expand" data-id="' + safeId + '" style="font-size:12px;color:var(--mod-accent);cursor:pointer;margin-top:-8px;margin-bottom:12px;">tap to read more</div>' : ''}
      <div style="display:flex;align-items:center;gap:12px;">
        <button data-action="react" data-id="${safeId}" style="
          display:flex;align-items:center;gap:4px;background:${t.userReacted ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${t.userReacted ? 'rgba(204,41,54,0.3)' : 'var(--mod-border-secondary)'};
          color:${t.userReacted ? 'var(--mod-magenta)' : 'var(--mod-text-sub)'};
          padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
        ">🔥 ${Number(t.reactions)}</button>
        <button data-action="challenge" data-id="${safeId}" style="
          display:flex;align-items:center;gap:4px;
          background:rgba(204,41,54,0.1);border:1px solid rgba(204,41,54,0.3);
          color:var(--mod-magenta);padding:6px 12px;border-radius:20px;
          font-size:12px;font-weight:700;cursor:pointer;
        ">⚔️ BET. (${Number(t.challenges)})</button>
        <button data-action="share" data-id="${safeId}" data-text="${esc(t.text)}" style="
          display:flex;align-items:center;gap:4px;
          background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);
          color:var(--mod-text-sub);padding:6px 12px;border-radius:20px;
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

  const hasDebatePreds = predictions.length > 0;
  const hasStandalone = standaloneQuestions.length > 0;

  if (!hasDebatePreds && !hasStandalone) {
    container.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <div style="color:#6a7a90;font-size:13px;margin-bottom:12px;">No active predictions yet.</div>
        <button data-action="create-prediction" style="padding:10px 20px;border-radius:20px;border:1px solid var(--mod-accent-border);background:var(--mod-accent-muted);color:var(--mod-accent);font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;">➕ CREATE PREDICTION</button>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 8px;">
      <div style="font-family:var(--mod-font-display);font-size:14px;letter-spacing:2px;color:var(--mod-accent);">🔮 PREDICTIONS</div>
      <button data-action="create-prediction" style="padding:5px 12px;border-radius:14px;border:1px solid var(--mod-accent-border);background:var(--mod-accent-muted);color:var(--mod-accent);font-size:11px;font-weight:600;letter-spacing:1px;cursor:pointer;">➕ CREATE</button>
    </div>
    ${predictions.map((p) => _renderPredictionCard(p)).join('')}
    ${standaloneQuestions.map((q) => _renderStandaloneCard(q)).join('')}`;
}

function _renderPredictionCard(p: Prediction): string {
  const safeTopic = esc(p.topic);
  const safeP1 = esc(p.p1);
  const safeP2 = esc(p.p2);
  const safeDebateId = esc(p.debate_id);
  const isLive = p.status === 'live' || p.status === 'in_progress';

  return `
    <div style="background:#132240;border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        ${isLive ? '<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--mod-magenta);font-weight:600;letter-spacing:1px;"><span style="width:6px;height:6px;background:var(--mod-magenta);border-radius:50%;animation:livePulse 1.5s ease-in-out infinite;"></span>LIVE</span>' : '<span style="font-size:11px;color:var(--mod-accent);letter-spacing:1px;">UPCOMING</span>'}
        <span style="font-size:11px;color:#6a7a90;">${Number(p.total)} predictions</span>
      </div>
      <div style="font-family:var(--mod-font-display);font-size:14px;color:var(--mod-text-heading);margin-bottom:12px;line-height:1.3;">${safeTopic}</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button data-action="predict" data-id="${safeDebateId}" data-pick="a" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${p.user_pick === 'a' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${p.user_pick === 'a' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeP1}</div>
          <div style="font-size:11px;color:#6a7a90;">ELO ${Number(p.p1_elo)}</div>
        </button>
        <div style="display:flex;align-items:center;font-family:var(--mod-font-display);font-size:12px;color:var(--mod-magenta);letter-spacing:1px;">VS</div>
        <button data-action="predict" data-id="${safeDebateId}" data-pick="b" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${p.user_pick === 'b' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${p.user_pick === 'b' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeP2}</div>
          <div style="font-size:11px;color:#6a7a90;">ELO ${Number(p.p2_elo)}</div>
        </button>
      </div>
      <div style="position:relative;height:24px;background:var(--mod-bg-subtle);border-radius:12px;overflow:hidden;border:1px solid var(--mod-border-secondary);">
        <div style="position:absolute;left:0;top:0;height:100%;width:${Number(p.pct_a)}%;background:linear-gradient(90deg,var(--mod-accent-border),var(--mod-accent-muted));border-radius:12px 0 0 12px;transition:width 0.5s ease;"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:11px;font-weight:700;">
          <span style="color:var(--mod-accent);">${Number(p.pct_a)}%</span>
          <span style="color:var(--mod-text-sub);">${Number(p.pct_b)}%</span>
        </div>
      </div>
    </div>`;
}

function _renderStandaloneCard(q: StandaloneQuestion): string {
  const safeTopic = esc(q.topic);
  const safeA = esc(q.side_a_label);
  const safeB = esc(q.side_b_label);
  const safeId = esc(q.id);
  const total =
    Number(q.total_picks) || Number(q.picks_a) + Number(q.picks_b) || 0;
  const pctA = total > 0 ? Math.round((Number(q.picks_a) / total) * 100) : 50;
  const pctB = total > 0 ? 100 - pctA : 50;
  const creator = esc(
    q.creator_display_name ?? q.creator_username ?? 'Anonymous'
  );
  const userPick = q._userPick ?? null;

  return `
    <div style="background:#132240;border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:11px;color:var(--mod-accent);letter-spacing:1px;">COMMUNITY</span>
        <span style="font-size:11px;color:#6a7a90;">${total} picks · by ${creator}</span>
      </div>
      <div style="font-family:var(--mod-font-display);font-size:14px;color:var(--mod-text-heading);margin-bottom:12px;line-height:1.3;">${safeTopic}</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button data-action="standalone-pick" data-id="${safeId}" data-pick="a" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${userPick === 'a' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${userPick === 'a' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeA}</div>
        </button>
        <div style="display:flex;align-items:center;font-family:var(--mod-font-display);font-size:12px;color:var(--mod-magenta);letter-spacing:1px;">VS</div>
        <button data-action="standalone-pick" data-id="${safeId}" data-pick="b" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${userPick === 'b' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${userPick === 'b' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeB}</div>
        </button>
      </div>
      <div style="position:relative;height:24px;background:var(--mod-bg-subtle);border-radius:12px;overflow:hidden;border:1px solid var(--mod-border-secondary);">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pctA}%;background:linear-gradient(90deg,var(--mod-accent-border),var(--mod-accent-muted));border-radius:12px 0 0 12px;transition:width 0.5s ease;"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:11px;font-weight:700;">
          <span style="color:var(--mod-accent);">${pctA}%</span>
          <span style="color:var(--mod-text-sub);">${pctB}%</span>
        </div>
      </div>
    </div>`;
}

// ============================================================
// ACTIONS
// ============================================================

export async function placePrediction(
  debateId: string,
  side: string
): Promise<void> {
  if (!requireAuth('place predictions')) return;
  if (
    typeof ModeratorTokens !== 'undefined' &&
    !ModeratorTokens.requireTokens(100, 'place predictions')
  )
    return;

  const pred = predictions.find((p) => p.debate_id === debateId);
  if (!pred) return;
  if (pred.user_pick === side) return;

  const oldPick = pred.user_pick;
  pred.user_pick = side as 'a' | 'b';

  if (!oldPick) {
    const countA = Math.round((pred.total * pred.pct_a) / 100);
    pred.total++;
    const newCountA = countA + (side === 'a' ? 1 : 0);
    pred.pct_a = Math.min(
      99,
      Math.max(1, Math.round((newCountA / pred.total) * 100))
    );
    pred.pct_b = 100 - pred.pct_a;
  }

  const predContainer = document.getElementById('predictions-feed');
  if (predContainer) renderPredictions(predContainer);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { data, error } = await safeRpc('place_prediction', {
        p_debate_id: debateId,
        p_predicted_winner: side,
        p_amount: 0,
      });
      if (error) {
        console.error('place_prediction error:', error);
        pred.user_pick = oldPick;
        if (predContainer) renderPredictions(predContainer);
        return;
      }
      if (typeof ModeratorTokens !== 'undefined')
        ModeratorTokens.claimPrediction(debateId);
    } catch (e) {
      console.error('place_prediction exception:', e);
    }
  }

  showToast(`🔮 Predicted ${side === 'a' ? pred.p1 : pred.p2} wins!`, 'success');
}

export async function pickStandaloneQuestion(
  questionId: string,
  side: string
): Promise<void> {
  if (!requireAuth('make predictions')) return;

  const q = standaloneQuestions.find((x) => x.id === questionId);
  if (!q) return;
  if (q._userPick === side) return;

  const oldPick = q._userPick;
  q._userPick = side as 'a' | 'b';

  if (!oldPick) {
    if (side === 'a') q.picks_a = (Number(q.picks_a) || 0) + 1;
    else q.picks_b = (Number(q.picks_b) || 0) + 1;
  } else {
    if (side === 'a') {
      q.picks_a = (Number(q.picks_a) || 0) + 1;
      q.picks_b = Math.max(0, (Number(q.picks_b) || 0) - 1);
    } else {
      q.picks_b = (Number(q.picks_b) || 0) + 1;
      q.picks_a = Math.max(0, (Number(q.picks_a) || 0) - 1);
    }
  }

  const predContainer = document.getElementById('predictions-feed');
  if (predContainer) renderPredictions(predContainer);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { error } = await safeRpc('pick_prediction', {
        p_question_id: questionId,
        p_pick: side,
      });
      if (error) {
        console.error('pick_prediction error:', error);
        q._userPick = oldPick ?? undefined;
        if (predContainer) renderPredictions(predContainer);
        return;
      }
    } catch (e) {
      console.error('pick_prediction exception:', e);
      q._userPick = oldPick ?? undefined;
      if (predContainer) renderPredictions(predContainer);
      return;
    }
  }

  showToast(
    `🔮 Picked ${side === 'a' ? q.side_a_label : q.side_b_label}!`,
    'success'
  );
}

export function openCreatePredictionForm(): void {
  if (!requireAuth('create predictions')) return;

  document.getElementById('create-prediction-sheet')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'create-prediction-sheet';
  overlay.style.cssText = 'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';

  overlay.innerHTML = `
    <div style="background:linear-gradient(180deg,#132240 0%,var(--mod-bg-base) 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;padding:20px;padding-bottom:max(20px,env(safe-area-inset-bottom));">
      <div style="width:40px;height:4px;background:var(--mod-bg-elevated);border-radius:2px;margin:0 auto 16px;"></div>
      <div style="font-family:var(--mod-font-display);font-size:16px;letter-spacing:2px;color:var(--mod-accent);text-align:center;margin-bottom:16px;">CREATE PREDICTION</div>
      <div style="margin-bottom:12px;">
        <label style="font-size:11px;color:var(--mod-text-sub);letter-spacing:1px;display:block;margin-bottom:4px;">QUESTION</label>
        <textarea id="cpq-topic" maxlength="200" placeholder="Will AI replace most jobs by 2030?" style="width:100%;min-height:60px;padding:10px 12px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-heading);font-family:var(--mod-font-ui);font-size:14px;resize:none;outline:none;"></textarea>
        <div id="cpq-topic-count" style="font-size:10px;color:#6a7a90;text-align:right;margin-top:2px;">0/200</div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <div style="flex:1;">
          <label style="font-size:11px;color:var(--mod-text-sub);letter-spacing:1px;display:block;margin-bottom:4px;">SIDE A</label>
          <input id="cpq-side-a" type="text" maxlength="50" placeholder="Yes" style="width:100%;padding:10px 12px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-heading);font-family:var(--mod-font-ui);font-size:14px;outline:none;">
        </div>
        <div style="flex:1;">
          <label style="font-size:11px;color:var(--mod-text-sub);letter-spacing:1px;display:block;margin-bottom:4px;">SIDE B</label>
          <input id="cpq-side-b" type="text" maxlength="50" placeholder="No" style="width:100%;padding:10px 12px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-heading);font-family:var(--mod-font-ui);font-size:14px;outline:none;">
        </div>
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:11px;color:var(--mod-text-sub);letter-spacing:1px;display:block;margin-bottom:4px;">CATEGORY (optional)</label>
        <select id="cpq-category" style="width:100%;padding:10px 12px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-heading);font-family:var(--mod-font-ui);font-size:14px;outline:none;-webkit-appearance:none;">
          <option value="">None</option>
          <option value="politics">Politics</option>
          <option value="sports">Sports</option>
          <option value="entertainment">Entertainment</option>
          <option value="trending">Trending</option>
          <option value="technology">Technology</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="cpq-cancel" style="flex:1;padding:12px;border-radius:10px;border:1px solid var(--mod-border-primary);background:none;color:var(--mod-text-sub);font-family:var(--mod-font-display);font-size:13px;letter-spacing:2px;cursor:pointer;">CANCEL</button>
        <button id="cpq-submit" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--mod-accent);color:var(--mod-bg-base);font-family:var(--mod-font-display);font-size:13px;font-weight:700;letter-spacing:2px;cursor:pointer;">POST</button>
      </div>
    </div>`;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);

  const topicEl = document.getElementById('cpq-topic') as HTMLTextAreaElement;
  topicEl.addEventListener('input', () => {
    document.getElementById('cpq-topic-count')!.textContent =
      topicEl.value.length + '/200';
  });

  document.getElementById('cpq-cancel')!.addEventListener('click', () =>
    overlay.remove()
  );

  document
    .getElementById('cpq-submit')!
    .addEventListener('click', async () => {
      const topic = topicEl.value.trim();
      const sideA =
        (document.getElementById('cpq-side-a') as HTMLInputElement).value.trim() ||
        'Yes';
      const sideB =
        (document.getElementById('cpq-side-b') as HTMLInputElement).value.trim() ||
        'No';
      const category =
        (document.getElementById('cpq-category') as HTMLSelectElement).value ||
        null;

      if (topic.length < 10) {
        showToast('Question must be at least 10 characters', 'error');
        return;
      }

      const btn = document.getElementById('cpq-submit')!;
      btn.textContent = 'POSTING...';
      btn.style.opacity = '0.5';

      if (getSupabaseClient() && !getIsPlaceholderMode()) {
        try {
          const { error } = await safeRpc('create_prediction_question', {
            p_topic: topic,
            p_side_a_label: sideA,
            p_side_b_label: sideB,
            p_category: category,
          });
          if (error) throw error;
        } catch (e) {
          console.error('create_prediction_question error:', e);
          showToast('Failed to create prediction', 'error');
          btn.textContent = 'POST';
          btn.style.opacity = '1';
          return;
        }
      }

      standaloneQuestions.unshift({
        id: 'local-' + Date.now(),
        topic,
        side_a_label: sideA,
        side_b_label: sideB,
        category,
        picks_a: 0,
        picks_b: 0,
        total_picks: 0,
        creator_display_name:
          getCurrentProfile()?.display_name ?? 'You',
        _userPick: null,
      });

      overlay.remove();
      showToast('🔮 Prediction posted!', 'success');
      const predContainer = document.getElementById('predictions-feed');
      if (predContainer) renderPredictions(predContainer);
      void fetchStandaloneQuestions();
    });
}

// ============================================================
// REACT + CHALLENGE
// ============================================================

export async function react(takeId: string): Promise<void> {
  if (!requireAuth('react to hot takes')) return;
  if (reactingIds.has(takeId)) return;
  const take = hotTakes.find((t) => t.id === takeId);
  if (!take) return;

  reactingIds.add(takeId);
  take.userReacted = !take.userReacted;
  take.reactions += take.userReacted ? 1 : -1;
  loadHotTakes(currentFilter);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { data, error } = await safeRpc<ReactResult>('react_hot_take', {
        p_hot_take_id: takeId,
        p_reaction_type: 'fire',
      });
      if (error) {
        console.error('react_hot_take error:', error);
        take.userReacted = !take.userReacted;
        take.reactions += take.userReacted ? 1 : -1;
        loadHotTakes(currentFilter);
      } else if (data) {
        take.reactions = (data as ReactResult).reaction_count;
        take.userReacted = (data as ReactResult).reacted;
        loadHotTakes(currentFilter);
        if ((data as ReactResult).reacted) {
          nudge('first_vote', '\uD83D\uDDF3\uFE0F Vote cast. Your voice shapes the verdict.');
          if (typeof ModeratorTokens !== 'undefined')
            ModeratorTokens.claimReaction(takeId);
        }
      }
    } catch {
      /* handled */
    }
  }

  reactingIds.delete(takeId);
}

export function challenge(takeId: string): void {
  if (!requireAuth('challenge someone to a debate')) return;
  if (
    typeof ModeratorTokens !== 'undefined' &&
    !ModeratorTokens.requireTokens(50, 'challenge someone')
  )
    return;
  const take = hotTakes.find((t) => t.id === takeId);
  if (!take) return;
  _showChallengeModal(take);
}

function _showChallengeModal(take: HotTake): void {
  document.getElementById('challenge-modal')?.remove();
  const safeUser = esc(take.user);
  const safeText = esc(take.text);
  _pendingChallengeId = take.id;

  const modal = document.createElement('div');
  modal.id = 'challenge-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';

  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#132240 0%,var(--mod-bg-base) 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));">
      <div style="width:40px;height:4px;background:var(--mod-bg-elevated);border-radius:2px;margin:0 auto 20px;"></div>
      <div style="font-family:var(--mod-font-display);font-size:22px;letter-spacing:2px;color:var(--mod-magenta);text-align:center;margin-bottom:4px;">⚔️ CHALLENGE</div>
      <div style="color:var(--mod-text-sub);text-align:center;font-size:13px;margin-bottom:16px;">You disagree with ${safeUser}?</div>
      <div style="background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="font-size:13px;color:var(--mod-text-heading);line-height:1.4;">"${safeText}"</div>
        <div style="font-size:11px;color:#6a7a90;margin-top:6px;">— ${safeUser} (ELO ${Number(take.elo)})</div>
      </div>
      <textarea id="challenge-response" placeholder="Your counter-argument..." style="
        width:100%;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:10px;
        color:var(--mod-text-heading);padding:12px;font-size:14px;resize:none;height:80px;
        font-family:var(--mod-font-ui);margin-bottom:12px;box-sizing:border-box;
      "></textarea>
      <div style="display:flex;gap:8px;">
        <button data-action="cancel-challenge" style="
          flex:1;padding:12px;background:var(--mod-bg-card);color:var(--mod-text-sub);border:1px solid var(--mod-border-primary);
          border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;
        ">CANCEL</button>
        <button data-action="submit-challenge" style="
          flex:1;padding:12px;background:var(--mod-magenta);color:#fff;border:none;
          border-radius:10px;font-family:var(--mod-font-display);font-size:16px;
          letter-spacing:2px;cursor:pointer;
        ">⚔️ BET.</button>
      </div>
    </div>`;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      return;
    }
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset['action'] === 'cancel-challenge') modal.remove();
    else if (btn.dataset['action'] === 'submit-challenge')
      void _submitChallenge(_pendingChallengeId);
  });

  document.body.appendChild(modal);
}

export async function _submitChallenge(takeId: string | null): Promise<void> {
  if (!takeId) return;
  const take = hotTakes.find((t) => t.id === takeId);
  if (!take) return;
  const textarea = document.getElementById(
    'challenge-response'
  ) as HTMLTextAreaElement | null;
  const text = textarea?.value?.trim();
  if (!text) {
    if (textarea) textarea.style.borderColor = 'var(--mod-magenta)';
    return;
  }

  take.challenges++;
  document.getElementById('challenge-modal')?.remove();
  loadHotTakes(currentFilter);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { error } = await safeRpc('create_challenge', {
        p_hot_take_id: takeId,
        p_counter_argument: text,
        p_topic: take.text,
      });
      if (error) {
        console.error('create_challenge error:', error);
        take.challenges--;
        loadHotTakes(currentFilter);
        showToast('Challenge failed — try again', 'error');
        return;
      }
      showToast('⚔️ Challenge sent! Entering the arena...', 'success');
      _enterArenaWithTopic(take.text);
    } catch (e) {
      console.error('create_challenge exception:', e);
      take.challenges--;
      loadHotTakes(currentFilter);
      showToast('Challenge failed — try again', 'error');
    }
  } else {
    showToast('⚔️ Challenge sent! Entering the arena...', 'success');
    _enterArenaWithTopic(take.text);
  }
}

// ============================================================
// POST TAKE
// ============================================================

export async function postTake(): Promise<void> {
  if (!requireAuth('post hot takes')) return;
  if (
    typeof ModeratorTokens !== 'undefined' &&
    !ModeratorTokens.requireTokens(25, 'post hot takes')
  )
    return;

  const input = document.getElementById(
    'hot-take-input'
  ) as HTMLTextAreaElement | null;
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const profile = getCurrentProfile();
  const section = currentFilter === 'all' ? 'trending' : currentFilter;
  const newTake: HotTake = {
    id: 't_' + Date.now(),
    user_id: getCurrentUser()?.id ?? '',
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

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { data, error } = await safeRpc<CreateHotTakeResult>(
        'create_hot_take',
        {
          p_content: text,
          p_section: section,
        }
      );
      if (error) {
        console.error('create_hot_take error:', error);
        hotTakes = snapshot;
        loadHotTakes(currentFilter);
        showToast('Post failed — try again', 'error');
      } else if (data && (data as CreateHotTakeResult).id) {
        newTake.id = (data as CreateHotTakeResult).id;
        if (typeof ModeratorTokens !== 'undefined')
          ModeratorTokens.claimHotTake((data as CreateHotTakeResult).id);
      }
    } catch {
      hotTakes = snapshot;
      loadHotTakes(currentFilter);
      showToast('Post failed — try again', 'error');
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

  const rivals: RivalEntry[] =
    ((await getMyRivals()) as RivalEntry[]) ?? [];

  if (!rivals.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:20px;color:#6a7a90;">
        <div style="font-size:28px;margin-bottom:6px;">⚔️</div>
        <div style="font-size:13px;">No rivals yet. Tap a username to declare one.</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="padding:0 0 8px;font-family:var(--mod-font-display);font-size:14px;letter-spacing:2px;color:var(--mod-magenta);">⚔️ HATED RIVALS</div>
    ${rivals.map((r) => {
      const safeName = esc((r.rival_display_name ?? r.rival_username ?? 'Unknown').toUpperCase());
      const safeInitial = esc((r.rival_display_name ?? r.rival_username ?? '?')[0]?.toUpperCase() ?? '');
      const safeRivalId = esc(r.rival_id);
      const safeRivalUsername = esc(r.rival_username ?? '');
      const safeId = esc(r.id);

      return `
        <div style="background:#132240;border:1px solid rgba(204,41,54,0.2);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;">
          <div data-action="profile" data-user-id="${safeRivalId}" data-username="${safeRivalUsername}" style="width:40px;height:40px;border-radius:50%;background:var(--mod-bg-card);border:2px solid var(--mod-magenta);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--mod-magenta);cursor:pointer;">${safeInitial}</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;color:var(--mod-text-heading);">${safeName}</div>
            <div style="font-size:11px;color:#6a7a90;">ELO ${Number(r.rival_elo ?? 1200)} · ${Number(r.rival_wins ?? 0)}W-${Number(r.rival_losses ?? 0)}L</div>
          </div>
          <div style="text-align:right;">
            ${r.status === 'pending'
              ? (r.direction === 'received'
                ? `<button data-action="accept-rival" data-id="${safeId}" style="padding:6px 12px;background:var(--mod-magenta);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">ACCEPT</button>`
                : '<span style="font-size:11px;color:var(--mod-accent);letter-spacing:1px;">PENDING</span>')
              : '<span style="font-size:11px;color:var(--mod-magenta);font-weight:700;letter-spacing:1px;">⚔️ ACTIVE</span>'}
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
    <div style="background:#132240;border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:16px;">
      <textarea id="hot-take-input" placeholder="Drop a hot take..." style="
        width:100%;background:var(--mod-bg-card);border:1px solid var(--mod-border-secondary);border-radius:10px;
        color:var(--mod-text-heading);padding:12px;font-size:14px;resize:none;height:60px;
        font-family:var(--mod-font-ui);margin-bottom:8px;box-sizing:border-box;
      " maxlength="280"></textarea>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div id="take-char-count" style="font-size:11px;color:#6a7a90;">0 / 280</div>
        <button data-action="post-take" style="
          background:var(--mod-magenta);color:#fff;border:none;border-radius:8px;
          padding:8px 20px;font-family:var(--mod-font-display);font-size:14px;
          letter-spacing:1px;cursor:pointer;
        ">POST</button>
      </div>
    </div>`;
}

// ============================================================

export const ModeratorAsync = {
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
  get predictions() {
    return predictions;
  },
} as const;

// ============================================================
// DOCUMENT-LEVEL DELEGATION — post-take button
// Named reference so destroy() can remove it cleanly.
// ============================================================

const _onDocClick = (e: Event): void => {
  const btn = (e.target as HTMLElement).closest('[data-action="post-take"]');
  if (btn) void postTake();
};

document.addEventListener('click', _onDocClick);

// ============================================================
// DESTROY — call on page teardown / hot-nav away
// ============================================================

export function destroy(): void {
  document.removeEventListener('click', _onDocClick);
}

// ============================================================
// AUTO-INIT
// ============================================================

ready.then(() => init());
