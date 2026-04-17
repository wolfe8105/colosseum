/**
 * THE MODERATOR — Auto-Debate Page Controller (TypeScript)
 *
 * Extracted from moderator-auto-debate.html inline script.
 * AI vs AI debate page. Ungated voting with fingerprint dedup.
 * Rage-click funnel, More Debates discovery section (E279/E280).
 *
 * Migration: Session 128 (Phase 4). Refactored Session 254
 * (types → auto-debate.types.ts, render → auto-debate.render.ts,
 *  vote → auto-debate.vote.ts).
 */

// ES imports (replaces window globals)
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, escapeHTML } from '../config.ts';
import { shareCard } from '../cards.ts';
import '../analytics.ts';
import type { AutoDebateData } from './auto-debate.types.ts';
import { renderDebate, loadMoreDebates } from './auto-debate.render.ts';
import { castVoteImpl, showResults } from './auto-debate.vote.ts';

// ============================================================
// INIT
// ============================================================

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
        neq: (col: string, val: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }> } };
      };
      neq: (col: string, val: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }> } };
      order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } };
    };
  };
};

const app = document.getElementById('app');
const loadingEl = document.getElementById('loading');

const urlParams = new URLSearchParams(window.location.search);
const debateId = urlParams.get('id');

// ============================================================
// HELPERS
// ============================================================

function showError(msg: string): void {
  if (loadingEl) loadingEl.style.display = 'none';
  if (app) app.innerHTML = `<div class="error-state">❌ ${escapeHTML(msg)}</div>
    <div style="text-align:center;margin-top:20px"><a href="/" class="join-btn">Go to The Moderator</a></div>`;
}

function getFingerprint(): string {
  let fp = localStorage.getItem('col_fp');
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
    localStorage.setItem('col_fp', fp);
  }
  return fp;
}

// ============================================================
// SHARE
// ============================================================

function shareDebateImpl(method: string): void {
  const d = (window as unknown as Record<string, unknown>)._debate as AutoDebateData | undefined;
  if (!d) return;
  const url = window.location.href;
  const text = d.share_hook ?? `AI judged this debate: "${d.topic}" — the result is wild.`;

  if (method === 'copy') {
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.querySelector('.share-bar .share-btn:first-child') as HTMLElement | null;
      if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 2000); }
    }).catch((e) => console.warn('[AutoDebate] clipboard copy failed:', e));
  } else if (method === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  } else if (method === 'native') {
    if (d.yes_votes !== undefined) {
      shareCard({ topic: d.topic, sideA: d.side_a ?? 'Side A', sideB: d.side_b ?? 'Side B', yesVotes: d.yes_votes ?? 0, noVotes: d.no_votes ?? 0, size: 'og' });
    } else if (navigator.share) {
      navigator.share({ title: d.topic, text, url }).catch(() => { /* cancelled */ });
    } else {
      navigator.clipboard.writeText(url).catch((e) => console.warn('[AutoDebate] clipboard fallback failed:', e));
    }
  }
}

// ============================================================
// LOAD DEBATE
// ============================================================

async function loadDebate(): Promise<void> {
  if (!debateId) return;
  try {
    const { data, error } = await sb.from('auto_debates').select('*').eq('id', debateId).single();
    if (error || !data) { showError('Debate not found or has been removed.'); return; }

    // Track view
    try { await sb.rpc('log_event', { p_event_type: 'debate_view', p_metadata: { debate_id: debateId, debate_topic: (data as AutoDebateData).topic ?? null } }); } catch { /* non-blocking */ }

    renderDebate(
      data as AutoDebateData,
      loadingEl,
      app,
      (id, cat) => void loadMoreDebates(sb as Parameters<typeof loadMoreDebates>[0], id, cat),
    );
  } catch {
    showError('Failed to load debate. Please try again.');
  }
}

// ============================================================
// UUID VALIDATION + INIT
// ============================================================

// UUID validation
if (debateId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(debateId)) {
  if (app) app.innerHTML = '<div style="text-align:center;padding:40px;color:var(--mod-magenta);font-size:16px;">Invalid debate link.</div>';
  if (loadingEl) loadingEl.style.display = 'none';
} else if (!debateId) {
  // No ID — fetch latest and redirect
  (async () => {
    try {
      const { data } = await sb.from('auto_debates').select('id').order('created_at', { ascending: false }).limit(1).single();
      if (data?.id) {
        window.location.replace('/moderator-auto-debate.html?id=' + data.id);
      } else {
        showError('No debates yet. Check back soon.');
      }
    } catch {
      showError('No debates yet. Check back soon.');
    }
  })();
} else {
  loadDebate();
}

// ============================================================
// EVENT DELEGATION (replaces inline onclick handlers)
// ============================================================

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!el) return;
  switch (el.dataset.action) {
    case 'cast-vote':
      void castVoteImpl(sb as Parameters<typeof castVoteImpl>[0], el.dataset.side!, getFingerprint);
      break;
    case 'share-debate':
      shareDebateImpl(el.dataset.method!);
      break;
  }
});

// Export showResults for use from vote.ts (already imported above but keeping unused ref below for TS)
void showResults;
