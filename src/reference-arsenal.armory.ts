/**
 * reference-arsenal.armory.ts — The Armory tab renderer
 *
 * renderArmory  — search, filter chips, trending shelf, cards, bottom sheet
 * renderLibrary — backward compat alias for renderArmory
 *
 * Extracted from reference-arsenal.render.ts (Session 254 track).
 */

import { safeRpc, getCurrentUser } from './auth.ts';
import { escapeHTML, showToast } from './config.ts';
import { powerDisplay } from './reference-arsenal.utils.ts';
import { SOURCE_TYPES, RARITY_COLORS, CHALLENGE_STATUS_LABELS, CATEGORIES, CATEGORY_LABELS } from './reference-arsenal.constants.ts';
import { secondReference, challengeReference, getLibrary, getTrendingReferences } from './reference-arsenal.rpc.ts';
import type { ArsenalReference, Rarity } from './reference-arsenal.types.ts';
import { renderReferenceCard } from './reference-arsenal.render.ts';

// ── Local helper (mirrors the one in render.ts — needed for trending shelf) ──
function rarityCardStyle(rarity: Rarity): string {
  if (rarity === 'mythic') {
    return `border:1.5px solid ${RARITY_COLORS.mythic};background:rgba(239,68,68,0.06);`;
  }
  return `border-left:3px solid ${RARITY_COLORS[rarity]};border-top:1px solid var(--mod-border-subtle);border-right:1px solid var(--mod-border-subtle);border-bottom:1px solid var(--mod-border-subtle);`;
}

interface ArmoryState {
  search: string;
  category: string; rarity: string; sourceType: string;
  graduated: string; challengeStatus: string; sort: string;
  loading: boolean;
  searchTimer: ReturnType<typeof setTimeout> | null;
}

export async function renderArmory(container: HTMLElement): Promise<void> {
  const state: ArmoryState = {
    search: '', category: '', rarity: '', sourceType: '',
    graduated: '', challengeStatus: '', sort: 'power',
    loading: false, searchTimer: null,
  };

  container.innerHTML = `
    <div class="armory-search-row">
      <input class="armory-search-input" id="armory-search" placeholder="Hunt a blade..." autocomplete="off" />
      <button class="armory-sharpen-btn" id="armory-sharpen-btn">
        ⚙ Sharpen<span class="armory-filter-badge" id="armory-filter-badge" style="display:none">0</span>
      </button>
    </div>
    <div class="armory-filter-drawer" id="armory-filter-drawer" style="display:none">
      <div class="armory-chip-section">
        <div class="armory-chip-label">Category</div>
        <div class="armory-chips-row">
          ${CATEGORIES.map(c => `<button class="armory-chip" data-filter="category" data-value="${c}">${CATEGORY_LABELS[c]}</button>`).join('')}
        </div>
      </div>
      <div class="armory-chip-section">
        <div class="armory-chip-label">Rarity</div>
        <div class="armory-chips-row">
          ${(['common','uncommon','rare','legendary','mythic'] as Rarity[]).map(r =>
            `<button class="armory-chip" data-filter="rarity" data-value="${r}" style="--chip-accent:${RARITY_COLORS[r]}">${r.toUpperCase()}</button>`
          ).join('')}
        </div>
      </div>
      <div class="armory-chip-section">
        <div class="armory-chip-label">Source Type</div>
        <div class="armory-chips-row">
          ${Object.entries(SOURCE_TYPES).map(([k, v]) =>
            `<button class="armory-chip" data-filter="sourceType" data-value="${k}">${v.label}</button>`
          ).join('')}
        </div>
      </div>
      <div class="armory-chip-section">
        <div class="armory-chip-label">Status</div>
        <div class="armory-chips-row">
          <button class="armory-chip" data-filter="graduated" data-value="true">⭐ Graduated</button>
          <button class="armory-chip" data-filter="challengeStatus" data-value="none">✅ Clean</button>
          <button class="armory-chip" data-filter="challengeStatus" data-value="disputed">⚠️ Disputed</button>
          <button class="armory-chip" data-filter="challengeStatus" data-value="frozen">🧊 Frozen</button>
        </div>
      </div>
      <div class="armory-chip-section">
        <div class="armory-chip-label">Sort</div>
        <div class="armory-chips-row">
          ${[['power','Power'],['strikes','Strikes'],['seconds','Seconds'],['newest','Newest'],['oldest','Oldest'],['alpha','A–Z']].map(([v, l]) =>
            `<button class="armory-chip${v === 'power' ? ' active' : ''}" data-filter="sort" data-value="${v}">${l}</button>`
          ).join('')}
        </div>
      </div>
    </div>
    <div id="armory-trending"></div>
    <div id="armory-cards"><p class="arsenal-loading">Loading the armory...</p></div>`;

  // Bottom sheet (shared singleton in body)
  if (!document.getElementById('armory-sheet')) {
    const el = document.createElement('div');
    el.id = 'armory-sheet-host';
    el.innerHTML = `
      <div class="armory-sheet-backdrop" id="armory-sheet-backdrop"></div>
      <div class="armory-sheet" id="armory-sheet">
        <div class="armory-sheet-handle"></div>
        <div class="armory-sheet-body" id="armory-sheet-body"></div>
        <div class="armory-sheet-actions" id="armory-sheet-actions"></div>
      </div>`;
    document.body.appendChild(el);
  }

  const closeSheet = (): void => {
    document.getElementById('armory-sheet-backdrop')?.classList.remove('open');
    document.getElementById('armory-sheet')?.classList.remove('open');
  };
  document.getElementById('armory-sheet-backdrop')?.addEventListener('click', closeSheet);

  // ── Trending ──────────────────────────────────────────────
  void (async () => {
    const trendEl = document.getElementById('armory-trending');
    if (!trendEl) return;
    const items = await getTrendingReferences();
    if (items.length === 0) return;
    const cards = items.map(t => `
      <div class="armory-trending-card" data-ref-id="${escapeHTML(t.id)}" style="${rarityCardStyle(t.rarity)}">
        <div class="armory-trending-claim">"${escapeHTML(t.claim_text)}"</div>
        <div class="armory-trending-meta">${escapeHTML(t.source_title)}</div>
        <div class="armory-trending-badge" style="color:${RARITY_COLORS[t.rarity]}">${t.rarity.toUpperCase()} · 🔥 ${t.cite_count}</div>
      </div>`).join('');
    trendEl.innerHTML = `<div class="armory-shelf-label">🔥 HOT IN THE ARENA</div>
      <div class="armory-trending-shelf">${cards}</div>`;
    trendEl.querySelectorAll<HTMLElement>('.armory-trending-card').forEach(card => {
      card.addEventListener('click', () => {
        const t = items.find(x => x.id === card.dataset.refId);
        if (t) openSheet({ ...t, source_date: '', locator: '', source_url: null, created_at: '' }, null);
      });
    });
  })();

  // ── Cards ─────────────────────────────────────────────────
  const loadCards = async (): Promise<void> => {
    const cardsEl = document.getElementById('armory-cards');
    if (!cardsEl || state.loading) return;
    state.loading = true;
    cardsEl.innerHTML = '<p class="arsenal-loading">Loading...</p>';
    try {
      const refs = await getLibrary({
        search:          state.search   || undefined,
        category:        state.category || undefined,
        rarity:          state.rarity   || undefined,
        sourceType:      state.sourceType || undefined,
        graduated:       state.graduated === 'true' ? true : state.graduated === 'false' ? false : undefined,
        challengeStatus: state.challengeStatus || undefined,
        sort:            (state.sort || 'power') as 'power',
      });
      const myId = getCurrentUser()?.id ?? null;
      if (refs.length === 0) {
        cardsEl.innerHTML = `<div class="arsenal-empty">
          <p>The Armory has no blades matching that grip. Forge one?</p>
          <button class="forge-btn-primary armory-forge-cta">⚔ Forge a Reference</button>
        </div>`;
        cardsEl.querySelector('.armory-forge-cta')?.addEventListener('click', () => {
          (document.querySelector('[data-arsenal-tab="forge"]') as HTMLElement | null)?.click();
        });
        return;
      }
      let html = '<div class="library-grid">';
      for (const ref of refs) html += `<div class="armory-card-wrap" data-ref-id="${escapeHTML(ref.id)}">${renderReferenceCard(ref, false)}</div>`;
      html += '</div>';
      cardsEl.innerHTML = html;
      cardsEl.querySelectorAll<HTMLElement>('.armory-card-wrap').forEach(wrap => {
        wrap.addEventListener('click', () => {
          const ref = refs.find(r => r.id === wrap.dataset.refId);
          if (ref) openSheet(ref, myId);
        });
      });
    } catch {
      cardsEl.innerHTML = '<p class="arsenal-empty">Could not load the armory.</p>';
    } finally {
      state.loading = false;
    }
  };

  // ── Bottom sheet ──────────────────────────────────────────
  const openSheet = (ref: ArsenalReference, myId: string | null): void => {
    const body    = document.getElementById('armory-sheet-body');
    const actions = document.getElementById('armory-sheet-actions');
    if (!body || !actions) return;
    const esc = escapeHTML;
    const srcInfo = SOURCE_TYPES[ref.source_type];
    body.innerHTML = `
      <div class="sheet-rarity" style="color:${RARITY_COLORS[ref.rarity]}">${ref.rarity.toUpperCase()}${ref.graduated ? ' ⭐' : ''}</div>
      <div class="sheet-claim">"${esc(ref.claim_text)}"</div>
      <table class="sheet-table">
        <tr><td>Source</td><td>${esc(ref.source_title)}</td></tr>
        <tr><td>Author</td><td>${esc(ref.source_author)}</td></tr>
        <tr><td>Date</td><td>${esc(ref.source_date)}</td></tr>
        <tr><td>Locator</td><td>${esc(ref.locator)}</td></tr>
        <tr><td>Type</td><td>${srcInfo.label}</td></tr>
        <tr><td>Forger</td><td>${esc(ref.owner_username ?? '—')}</td></tr>
        <tr><td>Power</td><td>${powerDisplay(ref)}</td></tr>
        <tr><td>Seconds</td><td>${Number(ref.seconds)}</td></tr>
        <tr><td>Strikes</td><td>${Number(ref.strikes)}</td></tr>
        <tr><td>Status</td><td>${CHALLENGE_STATUS_LABELS[ref.challenge_status] || '✅ Clean'}</td></tr>
      </table>
      ${ref.source_url ? `<a class="sheet-link" href="${esc(ref.source_url)}" target="_blank" rel="noopener">🔗 View Source</a>` : ''}`;

    const isOwn = ref.user_id === myId;
    const isFrozen = ref.challenge_status === 'frozen';
    actions.innerHTML = `
      ${!isOwn ? `<button class="sheet-btn sheet-second-btn" data-ref-id="${esc(ref.id)}">👍 Second</button>` : ''}
      ${!isOwn && !isFrozen ? `<button class="sheet-btn sheet-challenge-btn">⚔ Challenge</button>` : ''}
      <button class="sheet-btn sheet-close-btn">Close</button>`;

    actions.querySelector('.sheet-close-btn')?.addEventListener('click', closeSheet);
    actions.querySelector('.sheet-second-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      btn.disabled = true; btn.textContent = 'Seconding...';
      try {
        await secondReference(ref.id);
        showToast('Seconded! 👍', 'success');
        btn.textContent = '✓ Seconded';
        closeSheet(); void loadCards();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Second failed', 'error');
        btn.textContent = '👍 Second';
      } finally {
        btn.disabled = false;
      }
    });
    actions.querySelector('.sheet-challenge-btn')?.addEventListener('click', () => {
      body.innerHTML += `
        <div class="sheet-challenge-form">
          <label class="sheet-challenge-label" for="armory-challenge-grounds">Grounds for challenge</label>
          <textarea id="armory-challenge-grounds" class="sheet-challenge-ta" rows="3" maxlength="280" placeholder="Why is this reference inaccurate or miscategorized?"></textarea>
          <p class="sheet-challenge-hint">Challenging escrows tokens. If denied, escrow is burned.</p>
        </div>`;
      const submitBtn = document.createElement('button');
      submitBtn.className = 'sheet-btn sheet-challenge-submit';
      submitBtn.textContent = 'Submit Challenge';
      actions.insertBefore(submitBtn, actions.firstChild);
      submitBtn.addEventListener('click', async () => {
        const grounds = (document.getElementById('armory-challenge-grounds') as HTMLTextAreaElement)?.value?.trim();
        if (!grounds || grounds.length < 5) { showToast('Add grounds for the challenge', 'error'); return; }
        submitBtn.disabled = true; submitBtn.textContent = 'Submitting...';
        try {
          const result = await challengeReference(ref.id, grounds, null);
          if (result.action === 'shield_blocked') {
            showToast('Citation Shield active — cannot be challenged', 'error');
          } else {
            showToast('Challenge filed ⚔', 'success');
            closeSheet(); void loadCards();
          }
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Challenge failed', 'error');
          submitBtn.disabled = false; submitBtn.textContent = 'Submit Challenge';
        }
      });
    });

    document.getElementById('armory-sheet-backdrop')?.classList.add('open');
    document.getElementById('armory-sheet')?.classList.add('open');
  };

  // ── Filter / search wiring ────────────────────────────────
  const updateBadge = (): void => {
    const n = [state.category, state.rarity, state.sourceType, state.graduated, state.challengeStatus].filter(Boolean).length;
    const badge = document.getElementById('armory-filter-badge');
    if (badge) { badge.textContent = String(n); badge.style.display = n > 0 ? 'inline-flex' : 'none'; }
  };

  document.getElementById('armory-sharpen-btn')?.addEventListener('click', () => {
    const d = document.getElementById('armory-filter-drawer');
    if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
  });

  container.querySelectorAll<HTMLElement>('.armory-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter as keyof ArmoryState;
      const value  = chip.dataset.value ?? '';
      if (filter === 'sort') {
        container.querySelectorAll('[data-filter="sort"]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.sort = value;
      } else {
        const cur = state[filter] as string;
        const next = cur === value ? '' : value;
        (state as Record<string, unknown>)[filter] = next;
        container.querySelectorAll(`[data-filter="${filter}"]`).forEach(c =>
          c.classList.toggle('active', (c as HTMLElement).dataset.value === next && next !== ''));
      }
      updateBadge(); void loadCards();
    });
  });

  const searchEl = container.querySelector<HTMLInputElement>('#armory-search');
  searchEl?.addEventListener('input', () => {
    state.search = searchEl.value.trim();
    if (state.searchTimer) clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => void loadCards(), 320);
  });

  void loadCards();
}

// backward compat alias
export async function renderLibrary(container: HTMLElement, _?: unknown): Promise<void> {
  await renderArmory(container);
}
