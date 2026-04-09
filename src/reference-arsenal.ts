/**
 * THE MODERATOR — Reference Arsenal Module (TypeScript)
 *
 * F-55 OVERHAUL — Session 252.
 * Full rewrite for new structured reference schema.
 *
 * Depends on: auth.ts (safeRpc, getCurrentUser), config.ts (escapeHTML, showToast)
 *
 * Provides:
 *   - RPC wrappers: forgeReference, editReference, deleteReference,
 *     secondReference, citeReference, challengeReference
 *   - Structured forge form (title/author/date/locator/claim/type/category/url)
 *   - Arsenal list + reference card renderer
 *   - Loadout picker, debate cite/challenge wrappers
 *   - Constants: source types, categories, rarity colors
 *
 * Session 147: initial build.
 * Session 236: F-51 Phase 3 debate reference RPCs.
 * Session 252: F-55 overhaul — new schema, structured fields, rarity system.
 */

import { safeRpc, getCurrentUser } from './auth.ts';
import { escapeHTML, showToast } from './config.ts';

// ============================================================
// TYPE DEFINITIONS (F-55 schema)
// ============================================================

export interface ArsenalReference {
  id: string;
  user_id: string;
  source_title: string;
  source_author: string;
  source_date: string;
  locator: string;
  claim_text: string;
  source_type: SourceType;
  category: ReferenceCategory;
  source_url: string | null;
  seconds: number;
  strikes: number;
  rarity: Rarity;
  current_power: number;
  graduated: boolean;
  challenge_status: ChallengeStatus;
  created_at: string;
  // Joined field from library query
  owner_username?: string;
}

export interface ForgeParams {
  source_title: string;
  source_author: string;
  source_date: string;
  locator: string;
  claim_text: string;
  source_type: SourceType;
  category: ReferenceCategory;
  source_url?: string;
}

export interface ForgeResult {
  action: 'forged' | 'collision';
  ref_id?: string;
  existing_ref_id?: string;
  existing_owner?: string;
  existing_name?: string;
}

export interface EditResult {
  action: 'edited' | 'collision';
  existing_ref_id?: string;
  existing_owner?: string;
  existing_name?: string;
}

export interface SecondResult {
  action: 'seconded';
  seconds: number;
  strikes: number;
  rarity: string;
  current_power: number;
}

export interface ChallengeResult {
  action: 'challenged' | 'shield_blocked';
  challenge_id?: string;
  escrow_amount?: number;
  event_id?: number;
  message?: string;
}

export interface LoadoutRef {
  reference_id: string;
  cited: boolean;
  cited_at: string | null;
  source_title: string;
  claim_text: string;
  source_author: string;
  source_type: string;
  source_url: string | null;
  current_power: number;
  rarity: string;
  seconds: number;
  strikes: number;
  challenge_status: string;
  graduated: boolean;
}

export interface CiteResult2 {
  success: boolean;
  event_id: number;
  claim: string;
  reference_id: string;
}

export interface ChallengeResult2 {
  blocked: boolean;
  event_id: number;
  challenges_remaining?: number;
  challenge_id?: string;
  message?: string;
}

export type SourceType = 'primary' | 'academic' | 'book' | 'news' | 'other';
export type ReferenceCategory = 'politics' | 'sports' | 'entertainment' | 'music' | 'couples_court';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
export type ChallengeStatus = 'none' | 'disputed' | 'heavily_disputed' | 'frozen';

// ============================================================
// CONSTANTS
// ============================================================

export const SOURCE_TYPES: Record<SourceType, { label: string; ceiling: number; tier: string }> = {
  'primary':  { label: 'Primary Source', ceiling: 5, tier: 'S' },
  'academic': { label: 'Academic',       ceiling: 4, tier: 'A' },
  'book':     { label: 'Book',           ceiling: 3, tier: 'B' },
  'news':     { label: 'News',           ceiling: 1, tier: 'D' },
  'other':    { label: 'Other',          ceiling: 1, tier: 'D' },
};

export const CATEGORIES: ReferenceCategory[] = [
  'politics', 'sports', 'entertainment', 'music', 'couples_court',
];

const CATEGORY_LABELS: Record<ReferenceCategory, string> = {
  'politics':      'Politics',
  'sports':        'Sports',
  'entertainment': 'Entertainment',
  'music':         'Music',
  'couples_court': 'Couples Court',
};

const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#9ca3af',
  uncommon:  '#3b82f6',
  rare:      '#a855f7',
  legendary: '#eab308',
  mythic:    '#ef4444',
};

const CHALLENGE_STATUS_LABELS: Record<ChallengeStatus, string> = {
  none:             '',
  disputed:         '⚠️ Disputed',
  heavily_disputed: '🔴 Heavily Disputed',
  frozen:           '🧊 Frozen',
};

// ============================================================
// RPC 1: FORGE REFERENCE
// ============================================================

export async function forgeReference(params: ForgeParams): Promise<ForgeResult> {
  const { data, error } = await safeRpc<ForgeResult>('forge_reference', {
    p_source_title: params.source_title.trim(),
    p_source_author: params.source_author.trim(),
    p_source_date: params.source_date,
    p_locator: params.locator.trim(),
    p_claim_text: params.claim_text.trim(),
    p_source_type: params.source_type,
    p_category: params.category,
    p_source_url: params.source_url?.trim() || null,
  });

  if (error) throw new Error(error.message || 'Failed to forge reference');
  return data as ForgeResult;
}

// ============================================================
// RPC 2: EDIT REFERENCE
// ============================================================

export async function editReference(
  referenceId: string,
  params: Omit<ForgeParams, 'source_type' | 'source_url'>,
): Promise<EditResult> {
  const { data, error } = await safeRpc<EditResult>('edit_reference', {
    p_ref_id: referenceId,
    p_source_title: params.source_title.trim(),
    p_source_author: params.source_author.trim(),
    p_source_date: params.source_date,
    p_locator: params.locator.trim(),
    p_claim_text: params.claim_text.trim(),
    p_category: params.category,
  });

  if (error) throw new Error(error.message || 'Failed to edit reference');
  return data as EditResult;
}

// ============================================================
// RPC 3: DELETE REFERENCE
// ============================================================

export async function deleteReference(referenceId: string): Promise<void> {
  const { error } = await safeRpc<{ action: string }>('delete_reference', {
    p_ref_id: referenceId,
  });

  if (error) throw new Error(error.message || 'Failed to delete reference');
}

// ============================================================
// RPC 4: SECOND REFERENCE (replaces verify)
// ============================================================

export async function secondReference(referenceId: string): Promise<SecondResult> {
  const { data, error } = await safeRpc<SecondResult>('second_reference', {
    p_ref_id: referenceId,
  });

  if (error) throw new Error(error.message || 'Failed to second reference');
  return data as SecondResult;
}

// ============================================================
// RPC 5: CITE REFERENCE (kept — backward compat, no-op in F-55)
// ============================================================

export async function citeReference(
  referenceId: string,
  debateId: string,
  _outcome: 'win' | 'loss' | null = null,
): Promise<{ action: string }> {
  const { data, error } = await safeRpc<{ action: string }>('cite_reference', {
    p_reference_id: referenceId,
    p_debate_id: debateId,
    p_outcome: _outcome,
  });

  if (error) throw new Error(error.message || 'Failed to cite reference');
  return data as { action: string };
}

// ============================================================
// RPC 6: CHALLENGE REFERENCE
// ============================================================

export async function challengeReference(
  referenceId: string,
  grounds: string,
  contextDebateId: string | null = null,
): Promise<ChallengeResult> {
  const { data, error } = await safeRpc<ChallengeResult>('challenge_reference', {
    p_ref_id: referenceId,
    p_grounds: grounds,
    p_context_debate_id: contextDebateId,
  });

  if (error) throw new Error(error.message || 'Failed to process challenge');
  return data as ChallengeResult;
}

// ============================================================
// HELPERS
// ============================================================

/** Composite score for display */
export function compositeScore(ref: ArsenalReference): number {
  return (ref.seconds * 2) + ref.strikes;
}

/** Power display string */
export function powerDisplay(ref: ArsenalReference): string {
  const srcInfo = SOURCE_TYPES[ref.source_type];
  const ceiling = srcInfo ? srcInfo.ceiling : 1;
  return `${Number(ref.current_power)}/${ceiling + (ref.graduated ? 1 : 0)}`;
}

// ============================================================
// FORGE FORM (structured fields)
// ============================================================

interface ForgeFormState {
  step: number;
  source_title: string;
  source_author: string;
  source_date: string;
  locator: string;
  claim_text: string;
  source_type: SourceType | '';
  category: ReferenceCategory | '';
  source_url: string;
}

/**
 * Render the structured forge form into a container element.
 * If editRef is provided, pre-fills the form and calls editReference on submit.
 * source_type is disabled during edit (LM-206: locked at creation).
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
    source_title: editRef?.source_title || '',
    source_author: editRef?.source_author || '',
    source_date: editRef?.source_date || '',
    locator: editRef?.locator || '',
    claim_text: editRef?.claim_text || '',
    source_type: editRef?.source_type || '',
    category: editRef?.category || '',
    source_url: editRef?.source_url || '',
  };

  let destroyed = false;

  function render(): void {
    if (destroyed) return;

    const esc = escapeHTML;
    let html = '';

    // Step indicator
    const stepNames = [
      'Source Details',
      'Your Claim',
      'Source Type',
      'Choose Arena',
      'Review & Forge',
    ];
    html += `<div class="forge-steps">`;
    for (let i = 1; i <= 5; i++) {
      const cls = i === state.step ? 'forge-step active' : i < state.step ? 'forge-step done' : 'forge-step';
      html += `<div class="${cls}"><span class="forge-step-num">${i}</span><span class="forge-step-label">${stepNames[i - 1]}</span></div>`;
    }
    html += `</div>`;

    html += `<div class="forge-body">`;

    if (state.step === 1) {
      html += `
        <h3>Source Details</h3>
        <p class="forge-hint">Title, author, date, and specific locator (page, timestamp, paragraph).</p>
        <label class="forge-label">Source Title</label>
        <input type="text" id="forge-title" placeholder="e.g. IPCC Climate Report 2023" value="${esc(state.source_title)}" />
        <label class="forge-label">Author / Organization</label>
        <input type="text" id="forge-author" placeholder="e.g. IPCC Working Group I" value="${esc(state.source_author)}" />
        <label class="forge-label">Source Date</label>
        <input type="date" id="forge-date" value="${esc(state.source_date)}" />
        <label class="forge-label">Locator (page, timestamp, paragraph)</label>
        <input type="text" id="forge-locator" placeholder="e.g. p.42, 3:15, Section 2.1" value="${esc(state.locator)}" />
        <label class="forge-label">Source URL (optional)</label>
        <input type="url" id="forge-url" placeholder="https://..." value="${esc(state.source_url)}" />
      `;
    } else if (state.step === 2) {
      html += `
        <h3>Your Claim</h3>
        <p class="forge-hint">What does this source prove? Be specific. 120 characters max.</p>
        <textarea id="forge-claim" maxlength="120" rows="3" placeholder="e.g. Global temperatures rose 1.1\u00B0C since pre-industrial era">${esc(state.claim_text)}</textarea>
        <div class="forge-charcount"><span id="forge-claim-count">${state.claim_text.length}</span>/120</div>
      `;
    } else if (state.step === 3) {
      html += `
        <h3>Source Type</h3>
        <p class="forge-hint">What kind of source is this? ${isEdit ? '<strong>Locked at creation — cannot be changed.</strong>' : 'This determines the power ceiling.'}</p>
        <div class="forge-source-types">
      `;
      for (const [key, info] of Object.entries(SOURCE_TYPES)) {
        const selected = state.source_type === key ? ' selected' : '';
        const disabled = isEdit ? ' disabled' : '';
        html += `<button class="forge-source-btn${selected}${disabled}" data-source="${key}" ${isEdit ? 'disabled' : ''}>
          <span class="source-label">${info.label}</span>
          <span class="source-tier">${info.tier}-tier \u00B7 Ceiling ${info.ceiling}</span>
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
        html += `<button class="forge-cat-btn${selected}" data-cat="${cat}">${CATEGORY_LABELS[cat]}</button>`;
      }
      html += `</div>`;
    } else if (state.step === 5) {
      const srcInfo = state.source_type ? SOURCE_TYPES[state.source_type as SourceType] : null;
      html += `
        <h3>Review & Forge</h3>
        <div class="forge-review-card">
          <div class="forge-review-claim">"${esc(state.claim_text)}"</div>
          <div class="forge-review-meta">
            <strong>${esc(state.source_title)}</strong><br/>
            ${esc(state.source_author)} \u00B7 ${esc(state.source_date)}
          </div>
          <div class="forge-review-meta">
            Locator: ${esc(state.locator)}
            ${state.source_url ? `<br/><a href="${esc(state.source_url)}" target="_blank" rel="noopener">${esc(state.source_url)}</a>` : ''}
          </div>
          <div class="forge-review-type">
            ${srcInfo ? `${srcInfo.label} (${srcInfo.tier}-tier \u00B7 Max Power ${srcInfo.ceiling})` : ''}
          </div>
          <div class="forge-review-cat">${state.category ? CATEGORY_LABELS[state.category as ReferenceCategory] : ''}</div>
        </div>
        ${isEdit ? '<p class="forge-hint">Editing costs 10 tokens.</p>' : '<p class="forge-hint">Forging costs 50 tokens.</p>'}
      `;
    }

    html += `</div>`;

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
      html += `<button id="forge-submit" class="forge-btn-primary">${isEdit ? '\u270F\uFE0F Save Changes (10t)' : '\u2694 Forge Weapon (50t)'}</button>`;
    }
    html += `</div>`;

    container.innerHTML = html;
    wireStepListeners();
  }

  function wireStepListeners(): void {
    // Step 1: source details
    const titleEl = document.getElementById('forge-title') as HTMLInputElement | null;
    if (titleEl) {
      titleEl.addEventListener('input', () => { state.source_title = titleEl.value; });
    }
    const authorEl = document.getElementById('forge-author') as HTMLInputElement | null;
    if (authorEl) {
      authorEl.addEventListener('input', () => { state.source_author = authorEl.value; });
    }
    const dateEl = document.getElementById('forge-date') as HTMLInputElement | null;
    if (dateEl) {
      dateEl.addEventListener('input', () => { state.source_date = dateEl.value; });
    }
    const locatorEl = document.getElementById('forge-locator') as HTMLInputElement | null;
    if (locatorEl) {
      locatorEl.addEventListener('input', () => { state.locator = locatorEl.value; });
    }
    const urlEl = document.getElementById('forge-url') as HTMLInputElement | null;
    if (urlEl) {
      urlEl.addEventListener('input', () => { state.source_url = urlEl.value; });
    }

    // Step 2: claim
    const claimEl = document.getElementById('forge-claim') as HTMLTextAreaElement | null;
    if (claimEl) {
      claimEl.addEventListener('input', () => {
        state.claim_text = claimEl.value;
        const countEl = document.getElementById('forge-claim-count');
        if (countEl) countEl.textContent = String(state.claim_text.length);
      });
    }

    // Step 3: source type buttons
    if (!isEdit) {
      container.querySelectorAll('.forge-source-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.source_type = (btn as HTMLElement).dataset.source as SourceType;
          render();
        });
      });
    }

    // Step 4: category buttons
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
      if (state.source_title.trim().length < 2) {
        showToast('Source title must be at least 2 characters', 'error');
        return false;
      }
      if (state.source_author.trim().length < 2) {
        showToast('Author must be at least 2 characters', 'error');
        return false;
      }
      if (!state.source_date) {
        showToast('Source date is required', 'error');
        return false;
      }
      if (state.locator.trim().length < 1) {
        showToast('Locator is required (page, timestamp, paragraph, etc.)', 'error');
        return false;
      }
      return true;
    }
    if (state.step === 2) {
      if (state.claim_text.trim().length < 5) {
        showToast('Claim must be at least 5 characters', 'error');
        return false;
      }
      return true;
    }
    if (state.step === 3) {
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
      if (isEdit && editRef) {
        const result = await editReference(editRef.id, {
          source_title: state.source_title,
          source_author: state.source_author,
          source_date: state.source_date,
          locator: state.locator,
          claim_text: state.claim_text,
          category: state.category as ReferenceCategory,
        });

        if (result.action === 'collision') {
          showToast(`Collision: this source+locator already exists as "${result.existing_name}". Use the existing one instead.`, 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '\u270F\uFE0F Save Changes (10t)';
          }
          return;
        }

        showToast('Reference updated! \u270F\uFE0F', 'success');
        onComplete(editRef.id);
      } else {
        const result = await forgeReference({
          source_title: state.source_title,
          source_author: state.source_author,
          source_date: state.source_date,
          locator: state.locator,
          claim_text: state.claim_text,
          source_type: state.source_type as SourceType,
          category: state.category as ReferenceCategory,
          source_url: state.source_url || undefined,
        });

        if (result.action === 'collision') {
          showToast(`This source+locator already exists as "${result.existing_name}". Use it instead of forging a duplicate.`, 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '\u2694 Forge Weapon (50t)';
          }
          return;
        }

        showToast('Reference forged! \u2694\uFE0F', 'success');
        onComplete(result.ref_id || '');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : isEdit ? 'Edit failed' : 'Forge failed';
      showToast(msg, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? '\u270F\uFE0F Save Changes (10t)' : '\u2694 Forge Weapon (50t)';
      }
    }
  }

  render();

  return () => {
    destroyed = true;
    container.innerHTML = '';
  };
}

// ============================================================
// REFERENCE CARD RENDERER
// ============================================================

export function renderReferenceCard(
  ref: ArsenalReference,
  showSecondBtn: boolean,
  showEditBtn: boolean = false,
): string {
  const esc = escapeHTML;
  const srcInfo = SOURCE_TYPES[ref.source_type];
  const rarityColor = RARITY_COLORS[ref.rarity];
  const score = compositeScore(ref);
  const statusLabel = CHALLENGE_STATUS_LABELS[ref.challenge_status] || '';

  return `
    <div class="ref-card" data-ref-id="${esc(ref.id)}" style="border-color: ${rarityColor}">
      <div class="ref-card-header">
        <span class="ref-card-type" title="${srcInfo.tier}-tier">${esc(srcInfo.label)}</span>
        <span class="ref-card-rarity" style="color: ${rarityColor}">${ref.rarity.toUpperCase()}</span>
        ${ref.graduated ? '<span class="ref-card-graduated" title="Graduated">\u2B50</span>' : ''}
      </div>
      <div class="ref-card-claim">"${esc(ref.claim_text)}"</div>
      <div class="ref-card-meta">
        <span class="ref-card-title">${esc(ref.source_title)}</span>
        <span class="ref-card-author">${esc(ref.source_author)} \u00B7 ${esc(ref.source_date)}</span>
        <span class="ref-card-locator">Loc: ${esc(ref.locator)}</span>
      </div>
      <div class="ref-card-power">
        <span class="ref-card-power-label">Power ${powerDisplay(ref)}</span>
      </div>
      <div class="ref-card-stats">
        <span title="Seconds">\u{1F44D} ${Number(ref.seconds)}</span>
        <span title="Strikes">\u{1F4C4} ${Number(ref.strikes)}</span>
        <span title="Composite Score">\u2728 ${Number(score)}</span>
      </div>
      ${statusLabel ? `<div class="ref-card-status">${statusLabel}</div>` : ''}
      ${ref.source_url ? `<a class="ref-card-url" href="${esc(ref.source_url)}" target="_blank" rel="noopener">View Source</a>` : ''}
      ${showSecondBtn ? `<button class="ref-card-second-btn" data-ref-id="${esc(ref.id)}">\u{1F44D} Second</button>` : ''}
      ${showEditBtn ? `<button class="ref-card-edit-btn" data-ref-id="${esc(ref.id)}">\u270F\uFE0F Edit</button>` : ''}
      ${showEditBtn ? `<button class="ref-card-delete-btn" data-ref-id="${esc(ref.id)}">\u{1F5D1}\uFE0F Delete</button>` : ''}
    </div>
  `;
}

// ============================================================
// ARSENAL LIST RENDERER
// ============================================================

export async function renderArsenal(container: HTMLElement): Promise<ArsenalReference[]> {
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = '<p class="arsenal-empty">Sign in to view your arsenal.</p>';
    return [];
  }

  container.innerHTML = '<p class="arsenal-loading">Loading arsenal...</p>';

  const { data, error } = await safeRpc<ArsenalReference[]>('get_my_arsenal', {});

  if (error) {
    container.innerHTML = `
      <div class="arsenal-empty">
        <p>Your arsenal is empty.</p>
        <button id="arsenal-forge-btn" class="forge-btn-primary">\u2694 Forge Your First Weapon</button>
      </div>
    `;
    return [];
  }

  const refs = (data || []) as ArsenalReference[];

  if (refs.length === 0) {
    container.innerHTML = `
      <div class="arsenal-empty">
        <p>Your arsenal is empty.</p>
        <button id="arsenal-forge-btn" class="forge-btn-primary">\u2694 Forge Your First Weapon</button>
      </div>
    `;
    return [];
  }

  refs.sort((a, b) => b.current_power - a.current_power || Date.parse(b.created_at) - Date.parse(a.created_at));

  let html = `<div class="arsenal-header">
    <h2>Your Arsenal</h2>
    <button id="arsenal-forge-btn" class="forge-btn-primary">\u2694 Forge New</button>
  </div>`;
  html += `<div class="arsenal-grid">`;
  for (const ref of refs) {
    html += renderReferenceCard(ref, false, true);
  }
  html += `</div>`;

  container.innerHTML = html;

  return refs;
}

// ============================================================
// LIBRARY RENDERER
// ============================================================

export async function renderLibrary(
  container: HTMLElement,
  onSecond: (refId: string) => Promise<void>,
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

  // Wire second buttons
  container.querySelectorAll('.ref-card-second-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const refId = (e.currentTarget as HTMLElement).dataset.refId;
      if (!refId) return;
      const button = e.currentTarget as HTMLButtonElement;
      button.disabled = true;
      button.textContent = 'Seconding...';
      try {
        await onSecond(refId);
        button.textContent = '\u2713 Seconded';
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Second failed';
        showToast(msg, 'error');
        button.disabled = false;
        button.textContent = '\u{1F44D} Second';
      }
    });
  });
}

// ============================================================
// DEBATE REFERENCE RPCs (F-51 Phase 3 + F-55 updates)
// ============================================================

/** Save pre-debate reference loadout (max 5) */
export async function saveDebateLoadout(debateId: string, referenceIds: string[]): Promise<void> {
  const { error } = await safeRpc<{ success: boolean }>('save_debate_loadout', {
    p_debate_id: debateId,
    p_reference_ids: referenceIds,
  });
  if (error) throw new Error(error.message || 'Failed to save loadout');
}

/** Get my loaded references for a debate */
export async function getMyDebateLoadout(debateId: string): Promise<LoadoutRef[]> {
  const { data, error } = await safeRpc<LoadoutRef[]>('get_my_debate_loadout', {
    p_debate_id: debateId,
  });
  if (error) throw new Error(error.message || 'Failed to get loadout');
  return (data || []) as LoadoutRef[];
}

/** Cite a reference during a live debate (atomic: mark + stats + feed event) */
export async function citeDebateReference(
  debateId: string, referenceId: string, round: number, side: string,
): Promise<CiteResult2> {
  const { data, error } = await safeRpc<CiteResult2>('cite_debate_reference', {
    p_debate_id: debateId,
    p_reference_id: referenceId,
    p_round: round,
    p_side: side,
  });
  if (error) throw new Error(error.message || 'Failed to cite reference');
  return data as CiteResult2;
}

/** File a reference challenge (atomic: limit + Shield check + feed event) */
export async function fileReferenceChallenge(
  debateId: string, referenceId: string, round: number, side: string,
): Promise<ChallengeResult2> {
  const { data, error } = await safeRpc<ChallengeResult2>('file_reference_challenge', {
    p_debate_id: debateId,
    p_reference_id: referenceId,
    p_round: round,
    p_side: side,
  });
  if (error) throw new Error(error.message || 'Failed to file challenge');
  return data as ChallengeResult2;
}

// ============================================================
// LOADOUT PICKER
// ============================================================

export async function renderLoadoutPicker(
  container: HTMLElement,
  debateId: string,
): Promise<void> {
  container.innerHTML = '<p style="color:var(--mod-text-muted);text-align:center;font-size:13px;">Loading arsenal...</p>';

  let arsenal: ArsenalReference[];
  try {
    const { data, error } = await safeRpc<ArsenalReference[]>('get_my_arsenal', {});
    if (error || !data) { arsenal = []; }
    else { arsenal = data as ArsenalReference[]; }
  } catch {
    arsenal = [];
  }

  if (arsenal.length === 0) {
    container.innerHTML = `
      <div class="ref-loadout-empty">
        <span style="font-size:13px;color:var(--mod-text-muted);">No references forged. Enter battle without weapons.</span>
      </div>
    `;
    return;
  }

  // Filter out frozen refs (can't be loaded)
  arsenal = arsenal.filter(r => r.challenge_status !== 'frozen');

  arsenal.sort((a, b) => b.current_power - a.current_power || Date.parse(b.created_at) - Date.parse(a.created_at));

  const selected = new Set<string>();

  function render(): void {
    let html = `<div class="ref-loadout-header">
      <span class="ref-loadout-title">\u2694\uFE0F REFERENCE LOADOUT</span>
      <span class="ref-loadout-count" id="ref-loadout-count">${selected.size}/5</span>
    </div>`;
    html += '<div class="ref-loadout-grid">';
    for (const ref of arsenal) {
      const isSelected = selected.has(ref.id);
      const isDisabled = !isSelected && selected.size >= 5;
      const srcInfo = SOURCE_TYPES[ref.source_type];
      const rarityColor = RARITY_COLORS[ref.rarity];
      html += `
        <div class="ref-loadout-card${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}"
             data-ref-id="${escapeHTML(ref.id)}">
          <div class="ref-loadout-card-top">
            <span class="ref-loadout-type" style="border-color:${rarityColor}">${escapeHTML(srcInfo?.label || ref.source_type)}</span>
            <span class="ref-loadout-power">PWR ${powerDisplay(ref)}</span>
          </div>
          <div class="ref-loadout-claim">${escapeHTML(ref.claim_text)}</div>
          <div class="ref-loadout-meta">${escapeHTML(ref.source_title)} \u00B7 ${escapeHTML(ref.source_author)}</div>
          ${isSelected ? '<div class="ref-loadout-check">\u2705</div>' : ''}
        </div>
      `;
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.ref-loadout-card:not(.disabled)').forEach((card) => {
      card.addEventListener('click', () => {
        const refId = (card as HTMLElement).dataset.refId;
        if (!refId) return;
        if (selected.has(refId)) {
          selected.delete(refId);
        } else if (selected.size < 5) {
          selected.add(refId);
        }
        render();
        saveDebateLoadout(debateId, Array.from(selected)).catch((e) =>
          console.warn('[Arena] Loadout save failed:', e)
        );
      });
    });
  }

  render();
}

// ============================================================
// WINDOW BRIDGE
// ============================================================

(window as unknown as Record<string, unknown>).ModeratorArsenal = {
  forgeReference,
  editReference,
  deleteReference,
  secondReference,
  citeReference,
  challengeReference,
  showForgeForm,
  renderArsenal,
  renderLibrary,
  renderReferenceCard,
  compositeScore,
  powerDisplay,
  saveDebateLoadout,
  getMyDebateLoadout,
  citeDebateReference,
  fileReferenceChallenge,
  renderLoadoutPicker,
  SOURCE_TYPES,
  CATEGORIES,
};
