/**
 * THE MODERATOR — Async Module: Predictions Rendering
 *
 * renderPredictions, _renderPredictionCard, _renderStandaloneCard.
 * Wire callback injected by the barrel via _setWirePredictions().
 */

import { state } from './async.state.ts';
import type { Prediction, StandaloneQuestion } from './async.types.ts';
import { escapeHTML, FEATURES } from './config.ts';

const esc = escapeHTML;

// ============================================================
// WIRING CALLBACK (set by barrel orchestrator)
// ============================================================

type WireFn = (container: HTMLElement) => void;
let _wirePredictions: WireFn | undefined;

export function _setWirePredictions(fn: WireFn): void {
  _wirePredictions = fn;
}

// ============================================================
// PREDICTIONS — RENDER
// ============================================================

export function renderPredictions(container: HTMLElement): void {
  if (!container) return;
  if (!FEATURES.predictionsUI) return;

  if (!state.wiredContainers.has(container)) {
    _wirePredictions?.(container);
    state.wiredContainers.add(container);
  }

  const hasDebatePreds = state.predictions.length > 0;
  const hasStandalone = state.standaloneQuestions.length > 0;

  if (!hasDebatePreds && !hasStandalone) {
    container.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <div style="color:var(--mod-text-sub);font-size:13px;margin-bottom:12px;">No active predictions yet.</div>
        <button data-action="create-prediction" style="padding:10px 20px;border-radius:20px;border:1px solid var(--mod-accent-border);background:var(--mod-accent-muted);color:var(--mod-accent);font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;">➕ CREATE PREDICTION</button>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 8px;">
      <div style="font-family:var(--mod-font-display);font-size:14px;letter-spacing:2px;color:var(--mod-accent);">🔮 PREDICTIONS</div>
      <button data-action="create-prediction" style="padding:5px 12px;border-radius:14px;border:1px solid var(--mod-accent-border);background:var(--mod-accent-muted);color:var(--mod-accent);font-size:11px;font-weight:600;letter-spacing:1px;cursor:pointer;">➕ CREATE</button>
    </div>
    ${state.predictions.map((p) => _renderPredictionCard(p)).join('')}
    ${state.standaloneQuestions.map((q) => _renderStandaloneCard(q)).join('')}`;
}

function _renderPredictionCard(p: Prediction): string {
  const safeTopic = esc(p.topic);
  const safeP1 = esc(p.p1);
  const safeP2 = esc(p.p2);
  const safeDebateId = esc(p.debate_id);
  const isLive = p.status === 'live' || p.status === 'in_progress';

  return `
    <div style="background:var(--mod-bg-card);border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        ${isLive ? '<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--mod-magenta);font-weight:600;letter-spacing:1px;"><span style="width:6px;height:6px;background:var(--mod-magenta);border-radius:50%;animation:livePulse 1.5s ease-in-out infinite;"></span>LIVE</span>' : '<span style="font-size:11px;color:var(--mod-accent);letter-spacing:1px;">UPCOMING</span>'}
        <span style="font-size:11px;color:var(--mod-text-sub);">${Number(p.total)} predictions</span>
      </div>
      <div style="font-family:var(--mod-font-display);font-size:14px;color:var(--mod-text-heading);margin-bottom:12px;line-height:1.3;">${safeTopic}</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button data-action="predict" data-id="${safeDebateId}" data-pick="a" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${p.user_pick === 'a' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${p.user_pick === 'a' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeP1}</div>
          <div style="font-size:11px;color:var(--mod-text-sub);">ELO ${Number(p.p1_elo)}</div>
        </button>
        <div style="display:flex;align-items:center;font-family:var(--mod-font-display);font-size:12px;color:var(--mod-magenta);letter-spacing:1px;">VS</div>
        <button data-action="predict" data-id="${safeDebateId}" data-pick="b" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${p.user_pick === 'b' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${p.user_pick === 'b' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeP2}</div>
          <div style="font-size:11px;color:var(--mod-text-sub);">ELO ${Number(p.p2_elo)}</div>
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
    <div style="background:var(--mod-bg-card);border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:11px;color:var(--mod-accent);letter-spacing:1px;">COMMUNITY</span>
        <span style="font-size:11px;color:var(--mod-text-sub);">${Number(total)} picks · by ${creator}</span>
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
          <span style="color:var(--mod-accent);">${Number(pctA)}%</span>
          <span style="color:var(--mod-text-sub);">${Number(pctB)}%</span>
        </div>
      </div>
    </div>`;
}
