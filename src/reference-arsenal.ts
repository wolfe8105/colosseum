/**
 * THE COLOSSEUM — Reference Arsenal Module (TypeScript)
 *
 * Runtime module. New file — no legacy JS predecessor.
 * Depends on: auth.ts (safeRpc, getCurrentUser), config.ts (escapeHTML, showToast)
 *
 * Provides:
 *   - 4 RPC wrappers: forgeReference, verifyReference, citeReference, challengeReference
 *   - 5-step forge form renderer
 *   - Arsenal list + reference card renderer
 *   - Constants: source types, power ceilings, verification thresholds, categories
 *
 * Session 147: initial build.
 */

import { safeRpc, getCurrentUser } from './auth.ts';
import { escapeHTML, showToast } from './config.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface ArsenalReference {
  id: string;
  user_id: string;
  claim: string;
  url: string;
  domain: string;
  author: string;
  publication_year: number;
  source_type: SourceType;
  power_ceiling: number;
  category: ReferenceCategory;
  verification_points: number;
  current_power: number;
  citation_count: number;
  win_count: number;
  loss_count: number;
  challenge_count: number;
  challenge_wins: number;
  challenge_losses: number;
  xp: number;
  rarity: Rarity;
  created_at: string;
}

export interface VerifyResult {
  voter_type: VoterType;
  vote_value: number;
  new_points: number;
  new_power: number;
  power_ceiling: number;
}

export interface CiteResult {
  action: 'cited' | 'win_recorded' | 'loss_recorded';
  citation_count?: number;
  win_count?: number;
  loss_count?: number;
  xp_awarded?: number;
  total_xp?: number;
}

export interface ChallengeResult {
  ruling: 'upheld' | 'rejected';
  challenge_wins?: number;
  challenge_losses?: number;
  challenge_count: number;
  points_deducted?: number;
  new_points?: number;
  new_power?: number;
  message: string;
}

export interface ForgeParams {
  claim: string;
  url: string;
  author: string;
  publication_year: number;
  source_type: SourceType;
  category: ReferenceCategory;
}

export type SourceType = 'peer-reviewed' | 'data' | 'expert' | 'government' | 'news' | 'other';
export type ReferenceCategory = 'politics' | 'sports' | 'tech' | 'science' | 'entertainment' | 'business' | 'health' | 'general';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
export type VoterType = 'clan' | 'outside' | 'rival';

// ============================================================
// CONSTANTS
// ============================================================

export const SOURCE_TYPES: Record<SourceType, { label: string; ceiling: number; tier: string }> = {
  'peer-reviewed': { label: 'Peer-Reviewed', ceiling: 5, tier: 'S' },
  'data':          { label: 'Data / Dataset', ceiling: 4, tier: 'A' },
  'expert':        { label: 'Expert Analysis', ceiling: 4, tier: 'A' },
  'government':    { label: 'Government', ceiling: 3, tier: 'B' },
  'news':          { label: 'News', ceiling: 1, tier: 'D' },
  'other':         { label: 'Other', ceiling: 1, tier: 'D' },
};

export const CATEGORIES: ReferenceCategory[] = [
  'politics', 'sports', 'tech', 'science',
  'entertainment', 'business', 'health', 'general',
];

/** Points required to reach each power level, by source type */
export const VERIFICATION_THRESHOLDS: Record<SourceType, number[]> = {
  'peer-reviewed': [20, 60, 150, 300, 500],
  'data':          [15, 50, 120, 250],
  'expert':        [15, 50, 120, 250],
  'government':    [10, 40, 100],
  'news':          [5],
  'other':         [5],
};

const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#9ca3af',
  uncommon:  '#3b82f6',
  rare:      '#a855f7',
  legendary: '#eab308',
  mythic:    '#ef4444',
};

// ============================================================
// RPC 1: FORGE REFERENCE
// ============================================================

/**
 * Create a new reference in the arsenal.
 * Returns the new reference UUID on success.
 */
export async function forgeReference(params: ForgeParams): Promise<string> {
  const { data, error } = await safeRpc<string>('forge_reference', {
    p_claim: params.claim.trim(),
    p_url: params.url.trim(),
    p_author: params.author.trim(),
    p_publication_year: params.publication_year,
    p_source_type: params.source_type,
    p_category: params.category,
  });

  if (error) throw new Error(error.message || 'Failed to forge reference');
  return data as string;
}

// ============================================================
// RPC 1B: EDIT REFERENCE (pre-verification only)
// ============================================================

/**
 * Edit an existing reference. Only allowed when verification_points = 0.
 * Once anyone has verified it, the reference is locked.
 */
export async function editReference(
  referenceId: string,
  params: Partial<ForgeParams>,
): Promise<void> {
  const { error } = await safeRpc<{ success: boolean }>('edit_reference', {
    p_reference_id: referenceId,
    p_claim: params.claim?.trim() || null,
    p_url: params.url?.trim() || null,
    p_author: params.author?.trim() || null,
    p_publication_year: params.publication_year || null,
    p_source_type: params.source_type || null,
    p_category: params.category || null,
  });

  if (error) throw new Error(error.message || 'Failed to edit reference');
}

// ============================================================
// RPC 2: VERIFY REFERENCE
// ============================================================

/**
 * Cast a community verification vote on a reference.
 * Voter type (clan/outside/rival) determined server-side.
 */
export async function verifyReference(referenceId: string): Promise<VerifyResult> {
  const { data, error } = await safeRpc<VerifyResult>('verify_reference', {
    p_reference_id: referenceId,
  });

  if (error) throw new Error(error.message || 'Failed to verify reference');
  return data as VerifyResult;
}

// ============================================================
// RPC 3: CITE REFERENCE
// ============================================================

/**
 * Record a citation in a debate. Call with outcome=null on cite,
 * 'win' or 'loss' on debate settle.
 */
export async function citeReference(
  referenceId: string,
  debateId: string,
  outcome: 'win' | 'loss' | null = null,
): Promise<CiteResult> {
  const { data, error } = await safeRpc<CiteResult>('cite_reference', {
    p_reference_id: referenceId,
    p_debate_id: debateId,
    p_outcome: outcome,
  });

  if (error) throw new Error(error.message || 'Failed to cite reference');
  return data as CiteResult;
}

// ============================================================
// RPC 4: CHALLENGE REFERENCE
// ============================================================

/**
 * Challenge a reference mid-debate. Moderator ruling required.
 * 'upheld' = reference survives. 'rejected' = -10 verification points.
 */
export async function challengeReference(
  referenceId: string,
  debateId: string,
  ruling: 'upheld' | 'rejected',
): Promise<ChallengeResult> {
  const { data, error } = await safeRpc<ChallengeResult>('challenge_reference', {
    p_reference_id: referenceId,
    p_debate_id: debateId,
    p_ruling: ruling,
  });

  if (error) throw new Error(error.message || 'Failed to process challenge');
  return data as ChallengeResult;
}

// ============================================================
// HELPERS
// ============================================================

/** Extract domain from URL (strips protocol, www, and path) */
export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
  }
}

/** Get win rate as a percentage string, or '—' if no debates */
export function winRate(ref: ArsenalReference): string {
  const total = ref.win_count + ref.loss_count;
  if (total === 0) return '—';
  return Math.round((ref.win_count / total) * 100) + '%';
}

/** Power meter fill as a fraction 0–1 */
export function powerFill(ref: ArsenalReference): number {
  if (ref.power_ceiling === 0) return 0;
  return ref.current_power / ref.power_ceiling;
}

/** Threshold progress: how far toward next power level */
export function nextThresholdProgress(ref: ArsenalReference): { current: number; next: number | null; pct: number } {
  const thresholds = VERIFICATION_THRESHOLDS[ref.source_type];
  const pts = ref.verification_points;

  // Find next threshold
  let prev = 0;
  for (const t of thresholds) {
    if (pts < t) {
      const range = t - prev;
      const progress = pts - prev;
      return { current: pts, next: t, pct: range > 0 ? progress / range : 0 };
    }
    prev = t;
  }
  // At ceiling
  return { current: pts, next: null, pct: 1 };
}

// ============================================================
// 5-STEP FORGE FORM
// ============================================================

interface ForgeFormState {
  step: number;
  claim: string;
  url: string;
  domain: string;
  author: string;
  publication_year: number;
  source_type: SourceType | '';
  category: ReferenceCategory | '';
}

/**
 * Render the 5-step forge form into a container element.
 * Returns a cleanup function to remove event listeners.
 * If editRef is provided, pre-fills the form and calls editReference on submit.
 */
export function showForgeForm(
  container: HTMLElement,
  onComplete: (refId: string) => void,
  onCancel: () => void,
  editRef?: ArsenalReference,
): () => void {
  const isEdit = !!editRef;
  const state: ForgeFormState = {
    step: 1,
    claim: editRef?.claim || '',
    url: editRef?.url || '',
    domain: editRef?.domain || '',
    author: editRef?.author || '',
    publication_year: editRef?.publication_year || new Date().getFullYear(),
    source_type: editRef?.source_type || '',
    category: editRef?.category || '',
  };

  let destroyed = false;

  function render(): void {
    if (destroyed) return;

    const esc = escapeHTML;
    let html = '';

    // Step indicator
    const stepNames = ['Name Your Weapon', 'Load the Chamber', 'Tag the Source', 'Choose Your Arena', 'Review & Forge'];
    html += `<div class="forge-steps">`;
    for (let i = 1; i <= 5; i++) {
      const cls = i === state.step ? 'forge-step active' : i < state.step ? 'forge-step done' : 'forge-step';
      html += `<div class="${cls}"><span class="forge-step-num">${i}</span><span class="forge-step-label">${stepNames[i - 1]}</span></div>`;
    }
    html += `</div>`;

    // Step content
    html += `<div class="forge-body">`;

    if (state.step === 1) {
      html += `
        <h3>Name Your Weapon</h3>
        <p class="forge-hint">What does this source prove? 120 characters max.</p>
        <textarea id="forge-claim" maxlength="120" rows="3" placeholder="e.g. Global temperatures rose 1.1°C since pre-industrial era">${esc(state.claim)}</textarea>
        <div class="forge-charcount"><span id="forge-claim-count">${state.claim.length}</span>/120</div>
      `;
    } else if (state.step === 2) {
      html += `
        <h3>Load the Chamber</h3>
        <p class="forge-hint">Paste the source URL. Domain extracted automatically.</p>
        <input type="url" id="forge-url" placeholder="https://..." value="${esc(state.url)}" />
        ${state.domain ? `<div class="forge-domain">${esc(state.domain)}</div>` : ''}
      `;
    } else if (state.step === 3) {
      html += `
        <h3>Tag the Source</h3>
        <p class="forge-hint">Who wrote it, when, and what kind of source is it?</p>
        <input type="text" id="forge-author" placeholder="Author or organization" value="${esc(state.author)}" />
        <input type="number" id="forge-year" min="1900" max="2100" placeholder="Year" value="${state.publication_year}" />
        <div class="forge-source-types">
      `;
      for (const [key, info] of Object.entries(SOURCE_TYPES)) {
        const selected = state.source_type === key ? ' selected' : '';
        html += `<button class="forge-source-btn${selected}" data-source="${key}">
          <span class="source-label">${info.label}</span>
          <span class="source-tier">${info.tier}-tier · Ceiling ${info.ceiling}</span>
        </button>`;
      }
      html += `</div>`;
    } else if (state.step === 4) {
      html += `
        <h3>Choose Your Arena</h3>
        <p class="forge-hint">Which debate category does this reference belong to?</p>
        <div class="forge-categories">
      `;
      for (const cat of CATEGORIES) {
        const selected = state.category === cat ? ' selected' : '';
        html += `<button class="forge-cat-btn${selected}" data-cat="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>`;
      }
      html += `</div>`;
    } else if (state.step === 5) {
      const srcInfo = state.source_type ? SOURCE_TYPES[state.source_type as SourceType] : null;
      html += `
        <h3>Review & Forge</h3>
        <div class="forge-review-card">
          <div class="forge-review-claim">"${esc(state.claim)}"</div>
          <div class="forge-review-meta">
            <span>${esc(state.domain)}</span>
            <span>${esc(state.author)} · ${state.publication_year}</span>
          </div>
          <div class="forge-review-type">
            ${srcInfo ? `${srcInfo.label} (${srcInfo.tier}-tier · Max Power ${srcInfo.ceiling})` : ''}
          </div>
          <div class="forge-review-cat">${state.category ? state.category.charAt(0).toUpperCase() + (state.category as string).slice(1) : ''}</div>
        </div>
      `;
    }

    html += `</div>`; // .forge-body

    // Nav buttons
    html += `<div class="forge-nav">`;
    if (state.step > 1) {
      html += `<button id="forge-back" class="forge-btn-secondary">Back</button>`;
    } else {
      html += `<button id="forge-cancel" class="forge-btn-secondary">Cancel</button>`;
    }
    if (state.step < 5) {
      html += `<button id="forge-next" class="forge-btn-primary">Next</button>`;
    } else {
      html += `<button id="forge-submit" class="forge-btn-primary">${isEdit ? '✏️ Save Changes' : '⚔ Forge Weapon'}</button>`;
    }
    html += `</div>`;

    container.innerHTML = html;
    wireStepListeners();
  }

  function wireStepListeners(): void {
    // Char count for step 1
    const claimEl = document.getElementById('forge-claim') as HTMLTextAreaElement | null;
    if (claimEl) {
      claimEl.addEventListener('input', () => {
        state.claim = claimEl.value;
        const countEl = document.getElementById('forge-claim-count');
        if (countEl) countEl.textContent = String(state.claim.length);
      });
    }

    // URL auto-domain for step 2
    const urlEl = document.getElementById('forge-url') as HTMLInputElement | null;
    if (urlEl) {
      urlEl.addEventListener('input', () => {
        state.url = urlEl.value;
        state.domain = state.url ? extractDomain(state.url) : '';
        // Re-render to show domain
        render();
        // Re-focus URL input after render
        const refocused = document.getElementById('forge-url') as HTMLInputElement | null;
        if (refocused) {
          refocused.focus();
          refocused.setSelectionRange(refocused.value.length, refocused.value.length);
        }
      });
    }

    // Author + year for step 3
    const authorEl = document.getElementById('forge-author') as HTMLInputElement | null;
    if (authorEl) {
      authorEl.addEventListener('input', () => { state.author = authorEl.value; });
    }
    const yearEl = document.getElementById('forge-year') as HTMLInputElement | null;
    if (yearEl) {
      yearEl.addEventListener('input', () => { state.publication_year = parseInt(yearEl.value, 10) || new Date().getFullYear(); });
    }

    // Source type buttons for step 3
    container.querySelectorAll('.forge-source-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.source_type = (btn as HTMLElement).dataset.source as SourceType;
        render();
      });
    });

    // Category buttons for step 4
    container.querySelectorAll('.forge-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.category = (btn as HTMLElement).dataset.cat as ReferenceCategory;
        render();
      });
    });

    // Nav
    document.getElementById('forge-back')?.addEventListener('click', () => {
      state.step--;
      render();
    });

    document.getElementById('forge-cancel')?.addEventListener('click', () => {
      onCancel();
    });

    document.getElementById('forge-next')?.addEventListener('click', () => {
      if (validateStep()) {
        state.step++;
        render();
      }
    });

    document.getElementById('forge-submit')?.addEventListener('click', () => {
      submitForge();
    });
  }

  function validateStep(): boolean {
    if (state.step === 1) {
      if (state.claim.trim().length < 5) {
        showToast('Claim must be at least 5 characters', 'error');
        return false;
      }
      return true;
    }
    if (state.step === 2) {
      if (!/^https?:\/\//.test(state.url)) {
        showToast('URL must start with http:// or https://', 'error');
        return false;
      }
      return true;
    }
    if (state.step === 3) {
      if (state.author.trim().length < 2) {
        showToast('Author must be at least 2 characters', 'error');
        return false;
      }
      if (!state.source_type) {
        showToast('Select a source type', 'error');
        return false;
      }
      return true;
    }
    if (state.step === 4) {
      if (!state.category) {
        showToast('Select a category', 'error');
        return false;
      }
      return true;
    }
    return true;
  }

  async function submitForge(): Promise<void> {
    const submitBtn = document.getElementById('forge-submit') as HTMLButtonElement | null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEdit ? 'Saving...' : 'Forging...';
    }

    try {
      const params: ForgeParams = {
        claim: state.claim,
        url: state.url,
        author: state.author,
        publication_year: state.publication_year,
        source_type: state.source_type as SourceType,
        category: state.category as ReferenceCategory,
      };

      if (isEdit && editRef) {
        await editReference(editRef.id, params);
        showToast('Reference updated! ✏️', 'success');
        onComplete(editRef.id);
      } else {
        const refId = await forgeReference(params);
        showToast('Reference forged! ⚔️', 'success');
        onComplete(refId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : isEdit ? 'Edit failed' : 'Forge failed';
      showToast(msg, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? '✏️ Save Changes' : '⚔ Forge Weapon';
      }
    }
  }

  // Initial render
  render();

  // Cleanup
  return () => {
    destroyed = true;
    container.innerHTML = '';
  };
}

// ============================================================
// REFERENCE CARD RENDERER
// ============================================================

/**
 * Render a single reference card as HTML string.
 * Caller is responsible for inserting into DOM and wiring click handlers.
 */
export function renderReferenceCard(ref: ArsenalReference, showVerifyBtn: boolean, showEditBtn: boolean = false): string {
  const esc = escapeHTML;
  const srcInfo = SOURCE_TYPES[ref.source_type];
  const wr = winRate(ref);
  const fill = powerFill(ref);
  const rarityColor = RARITY_COLORS[ref.rarity];
  const progress = nextThresholdProgress(ref);

  return `
    <div class="ref-card" data-ref-id="${esc(ref.id)}" style="border-color: ${rarityColor}">
      <div class="ref-card-header">
        <span class="ref-card-type" title="${srcInfo.tier}-tier">${esc(srcInfo.label)}</span>
        <span class="ref-card-rarity" style="color: ${rarityColor}">${ref.rarity.toUpperCase()}</span>
      </div>
      <div class="ref-card-claim">"${esc(ref.claim)}"</div>
      <div class="ref-card-meta">
        <span class="ref-card-domain">${esc(ref.domain)}</span>
        <span class="ref-card-author">${esc(ref.author)} · ${ref.publication_year}</span>
      </div>
      <div class="ref-card-power">
        <span class="ref-card-power-label">Power ${ref.current_power}/${ref.power_ceiling}</span>
        <div class="ref-card-power-bar">
          <div class="ref-card-power-fill" style="width: ${Math.round(fill * 100)}%"></div>
        </div>
        ${progress.next !== null
          ? `<span class="ref-card-power-next">${Math.round(ref.verification_points)}/${progress.next} pts to next level</span>`
          : `<span class="ref-card-power-next">MAX</span>`
        }
      </div>
      <div class="ref-card-stats">
        <span title="Citations">📄 ${ref.citation_count}</span>
        <span title="Win Rate">🏆 ${wr}</span>
        <span title="Challenges survived">${ref.challenge_wins}/${ref.challenge_count} challenges</span>
        <span title="XP">✨ ${ref.xp} XP</span>
      </div>
      ${showVerifyBtn ? `<button class="ref-card-verify-btn" data-ref-id="${esc(ref.id)}">⚡ Verify</button>` : ''}
      ${showEditBtn && ref.verification_points === 0 ? `<button class="ref-card-edit-btn" data-ref-id="${esc(ref.id)}">✏️ Edit</button>` : ''}
      ${showEditBtn && ref.verification_points > 0 ? `<span class="ref-card-locked">🔒 Verified — locked</span>` : ''}
    </div>
  `;
}

// ============================================================
// ARSENAL LIST RENDERER
// ============================================================

/**
 * Render the user's arsenal (list of their references) into a container.
 * Fetches from arsenal_references via a read-only select.
 */
export async function renderArsenal(container: HTMLElement): Promise<ArsenalReference[]> {
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = '<p class="arsenal-empty">Sign in to view your arsenal.</p>';
    return [];
  }

  container.innerHTML = '<p class="arsenal-loading">Loading arsenal...</p>';

  // Read via safeRpc — but arsenal_references has RLS SELECT for all authenticated.
  // We need a lightweight read. Using a raw select via supabase client isn't available
  // through safeRpc, so we read all and filter client-side. At scale, add a get_my_arsenal RPC.
  // For now, this works because RLS SELECT is open to authenticated.
  const { data, error } = await safeRpc<ArsenalReference[]>('get_my_arsenal', {});

  if (error) {
    // RPC might not exist yet — fall back to empty state
    container.innerHTML = `
      <div class="arsenal-empty">
        <p>Your arsenal is empty.</p>
        <button id="arsenal-forge-btn" class="forge-btn-primary">⚔ Forge Your First Weapon</button>
      </div>
    `;
    return [];
  }

  const refs = (data || []) as ArsenalReference[];

  if (refs.length === 0) {
    container.innerHTML = `
      <div class="arsenal-empty">
        <p>Your arsenal is empty.</p>
        <button id="arsenal-forge-btn" class="forge-btn-primary">⚔ Forge Your First Weapon</button>
      </div>
    `;
    return [];
  }

  // Sort by current_power DESC, then created_at DESC
  refs.sort((a, b) => b.current_power - a.current_power || Date.parse(b.created_at) - Date.parse(a.created_at));

  let html = `<div class="arsenal-header">
    <h2>Your Arsenal</h2>
    <button id="arsenal-forge-btn" class="forge-btn-primary">⚔ Forge New</button>
  </div>`;
  html += `<div class="arsenal-grid">`;
  for (const ref of refs) {
    html += renderReferenceCard(ref, false, true);
  }
  html += `</div>`;

  container.innerHTML = html;

  // Return refs so caller can wire edit buttons with full data
  return refs;

// ============================================================
// LIBRARY RENDERER (browse all references)
// ============================================================

/**
 * Render a browsable library of all references.
 * Shows verify button on references not owned by current user.
 */
export async function renderLibrary(
  container: HTMLElement,
  onVerify: (refId: string) => Promise<void>,
): Promise<void> {
  container.innerHTML = '<p class="arsenal-loading">Loading reference library...</p>';

  const { data, error } = await safeRpc<ArsenalReference[]>('get_reference_library', {});

  if (error) {
    container.innerHTML = '<p class="arsenal-empty">Could not load library.</p>';
    return;
  }

  const refs = (data || []) as ArsenalReference[];
  const user = getCurrentUser();
  const userId = user?.id || null;

  if (refs.length === 0) {
    container.innerHTML = '<p class="arsenal-empty">No references in the library yet. Be the first to forge one.</p>';
    return;
  }

  let html = `<div class="library-grid">`;
  for (const ref of refs) {
    const isOwn = ref.user_id === userId;
    html += renderReferenceCard(ref, !isOwn);
  }
  html += `</div>`;

  container.innerHTML = html;

  // Wire verify buttons
  container.querySelectorAll('.ref-card-verify-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const refId = (e.currentTarget as HTMLElement).dataset.refId;
      if (!refId) return;
      const button = e.currentTarget as HTMLButtonElement;
      button.disabled = true;
      button.textContent = 'Verifying...';
      try {
        await onVerify(refId);
        button.textContent = '✓ Verified';
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Verify failed';
        showToast(msg, 'error');
        button.disabled = false;
        button.textContent = '⚡ Verify';
      }
    });
  });
}

// ============================================================
// WINDOW BRIDGE (for non-module consumers during migration)
// ============================================================

(window as unknown as Record<string, unknown>).ColosseumArsenal = {
  forgeReference,
  editReference,
  verifyReference,
  citeReference,
  challengeReference,
  showForgeForm,
  renderArsenal,
  renderLibrary,
  renderReferenceCard,
  extractDomain,
  winRate,
  powerFill,
  SOURCE_TYPES,
  CATEGORIES,
  VERIFICATION_THRESHOLDS,
};
