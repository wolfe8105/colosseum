/**
 * reference-arsenal.armory.ts — The Armory tab renderer
 *
 * renderArmory  — search, filter chips, trending shelf, cards, bottom sheet
 * renderLibrary — backward compat alias for renderArmory
 *
 * Extracted from reference-arsenal.render.ts (Session 254 track).
 */

import { getCurrentUser } from './auth.ts';
import { escapeHTML } from './config.ts';
import { SOURCE_TYPES, RARITY_COLORS, CATEGORIES, CATEGORY_LABELS } from './reference-arsenal.constants.ts';
import { getLibrary, getTrendingReferences } from './reference-arsenal.rpc.ts';
import type { ArsenalReference, Rarity } from './reference-arsenal.types.ts';
import { renderReferenceCard } from './reference-arsenal.render.ts';
import { openSheet, closeSheet } from './reference-arsenal.armory.sheet.ts';

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

  document.getElementById('armory-sheet-backdrop')?.addEventListener('click', closeSheet);

  // ── Cards ─────────────────────────────────────────────────
  // Defined before trending IIFE so loadCards can be passed as onReload callback.
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
          if (ref) openSheet(ref, myId, loadCards);
        });
      });
    } catch {
      cardsEl.innerHTML = '<p class="arsenal-empty">Could not load the armory.</p>';
    } finally {
      state.loading = false;
    }
  };

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
        if (t) openSheet({ ...t, source_date: '', locator: '', source_url: null, created_at: '' }, null, loadCards);
      });
    });
  })();

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
        (state as unknown as Record<string, unknown>)[filter] = next;
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
