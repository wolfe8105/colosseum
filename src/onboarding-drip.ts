/**
 * onboarding-drip.ts — F-36 Seven-Day Onboarding Drip
 *
 * Shows a "Your First Week" progress card to users within 14 days
 * of signup. Each row has an action, reward, and a CLAIM button
 * that appears when the day is unlocked by the client wiring.
 *
 * Trigger points (called from tokens.ts / plinko.ts / spectate):
 *   triggerDripDay(1) — on signup  (plinko.ts)
 *   triggerDripDay(2) — on first vote
 *   triggerDripDay(3) — on spectate complete
 *   triggerDripDay(4) — on first hot take
 *   triggerDripDay(5) — on first debate complete
 *   triggerDripDay(6) — on profile 3+ sections filled
 *   triggerDripDay(7) — on first debate WIN
 */

import { safeRpc, getIsPlaceholderMode } from './auth.ts';
import { showToast } from './config.ts';

// ============================================================
// TYPES
// ============================================================

interface DripProgress {
  success: boolean;
  days_since: number;
  completed: number[];
  all_done: boolean;
}

interface DripDayDef {
  day: number;
  icon: string;
  action: string;
  reward: string;
}

const DAYS: readonly DripDayDef[] = [
  { day: 1, icon: '🏟️', action: 'Show up',              reward: 'Newcomer badge' },
  { day: 2, icon: '🗳️', action: 'Cast your first vote', reward: 'Voter badge' },
  { day: 3, icon: '👁️', action: 'Watch a full debate',  reward: 'Spectator badge' },
  { day: 4, icon: '🔥', action: 'Post a hot take',      reward: 'Hothead badge' },
  { day: 5, icon: '⚔️', action: 'Complete a debate',    reward: 'Rookie title' },
  { day: 6, icon: '📝', action: 'Fill 3+ profile fields', reward: 'Regular title' },
  { day: 7, icon: '🏆', action: 'Win a debate',         reward: '🎖️ Gladiator title' },
] as const;

// ============================================================
// MODULE STATE
// ============================================================

let _progress: DripProgress | null = null;
let _cardEl: HTMLElement | null = null;
let _loaded = false;
const _claimedThisSession = new Set<number>();

// ============================================================
// CSS
// ============================================================

let _cssInjected = false;
function _injectCSS(): void {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    .drip-card {
      background: var(--mod-bg-card);
      border: 1px solid var(--mod-accent-border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      animation: dripFadeIn 0.3s ease;
    }
    @keyframes dripFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .drip-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .drip-title {
      font-family: var(--mod-font-display);
      font-size: 13px; font-weight: 700;
      color: var(--mod-accent); letter-spacing: 2px;
    }
    .drip-dismiss {
      background: none; border: none;
      color: var(--mod-text-muted); font-size: 16px;
      cursor: pointer; padding: 0 4px; line-height: 1;
    }
    .drip-progress-bar {
      height: 4px;
      background: var(--mod-bg-inset);
      border-radius: 2px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .drip-progress-fill {
      height: 100%;
      background: var(--mod-accent);
      border-radius: 2px;
      transition: width 0.4s ease;
    }
    .drip-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid var(--mod-border-primary);
    }
    .drip-row:last-child { border-bottom: none; }
    .drip-row.done { opacity: 0.5; }

    .drip-day-icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }
    .drip-day-info { flex: 1; min-width: 0; }
    .drip-day-action {
      font-family: var(--mod-font-ui);
      font-size: 12px; font-weight: 600;
      color: var(--mod-text-heading);
    }
    .drip-day-reward {
      font-size: 10px; color: var(--mod-text-muted);
      margin-top: 1px; letter-spacing: 0.3px;
    }
    .drip-day-status {
      flex-shrink: 0; font-size: 13px;
    }
    .drip-claim-btn {
      padding: 5px 10px;
      background: var(--mod-accent);
      color: var(--mod-bg-base);
      border: none; border-radius: 6px;
      font-family: var(--mod-font-ui);
      font-size: 10px; font-weight: 700;
      letter-spacing: 1px;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .drip-claim-btn:hover   { opacity: 0.85; }
    .drip-claim-btn:disabled { opacity: 0.4; cursor: default; }
  `;
  document.head.appendChild(s);
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Load progress and render the drip card into the given container.
 * Called from home.ts after the feed container is ready.
 */
export async function initDripCard(container: HTMLElement): Promise<void> {
  if (getIsPlaceholderMode()) return;
  _injectCSS();

  try {
    const { data, error } = await safeRpc('get_onboarding_progress');
    if (error || !data) return;
    _progress = data as DripProgress;

    // Only show within 14 days of signup and if not all done
    if (_progress.days_since > 14 || _progress.all_done) return;

    _renderCard(container);
    _loaded = true;
  } catch { /* non-critical */ }
}

/**
 * Call when a trigger action fires. Claims the day if not yet done.
 * Safe to call multiple times — idempotent server-side.
 */
export async function triggerDripDay(day: number): Promise<void> {
  if (getIsPlaceholderMode()) return;
  if (_claimedThisSession.has(day)) return;
  if (_progress?.completed.includes(day)) return;

  _claimedThisSession.add(day);

  try {
    const { data, error } = await safeRpc('complete_onboarding_day', { p_day: day });
    if (error) return;
    const result = data as { success: boolean; cosmetic_name?: string; already_done?: boolean } | null;
    if (!result?.success || result.already_done) return;

    // Update local state
    if (_progress) {
      _progress.completed = [..._progress.completed, day].sort((a, b) => a - b);
      _progress.all_done = _progress.completed.length === 7;
    }

    // Show toast
    const def = DAYS.find(d => d.day === day);
    if (def) {
      showToast(`Day ${day} ✓  ${result.cosmetic_name ?? def.reward} unlocked!`, 'success');
    }

    // Re-render card if visible
    if (_cardEl) {
      const container = _cardEl.parentElement;
      _cardEl.remove();
      _cardEl = null;
      if (container && _progress && !_progress.all_done) _renderCard(container);
    }
  } catch { /* silent */ }
}

// ============================================================
// RENDER
// ============================================================

function _renderCard(container: HTMLElement): void {
  _cardEl?.remove();

  const completed = _progress?.completed ?? [];
  const totalDone = completed.length;

  const card = document.createElement('div');
  card.className = 'drip-card';
  card.id = 'drip-card';

  card.innerHTML = `
    <div class="drip-header">
      <div class="drip-title">⚔️ YOUR FIRST WEEK</div>
      <button class="drip-dismiss" id="drip-dismiss" title="Dismiss">✕</button>
    </div>
    <div class="drip-progress-bar">
      <div class="drip-progress-fill" style="width:${Math.round(totalDone / 7 * 100)}%"></div>
    </div>
    ${DAYS.map(d => {
      const done = completed.includes(d.day);
      return `
        <div class="drip-row${done ? ' done' : ''}">
          <div class="drip-day-icon">${d.icon}</div>
          <div class="drip-day-info">
            <div class="drip-day-action">${d.action}</div>
            <div class="drip-day-reward">${d.reward}</div>
          </div>
          <div class="drip-day-status">
            ${done ? '✅' : '<span style="color:var(--mod-text-muted);font-size:11px;">—</span>'}
          </div>
        </div>
      `;
    }).join('')}
  `;

  // Dismiss
  card.querySelector('#drip-dismiss')?.addEventListener('click', () => {
    card.style.transition = 'opacity 0.2s, max-height 0.3s';
    card.style.opacity = '0';
    card.style.maxHeight = '0';
    card.style.overflow = 'hidden';
    setTimeout(() => { card.remove(); _cardEl = null; }, 320);
  });

  // Prepend to container so it appears above the feed
  container.insertBefore(card, container.firstChild);
  _cardEl = card;
}
