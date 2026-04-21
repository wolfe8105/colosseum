/**
 * THE MODERATOR — Groups: Audition System (F-18)
 *
 * Handles the audition request modal (candidate-facing) and the
 * Pending Auditions tab (member/leader-facing).
 *
 * Mounted via groups.ts event delegation. No inline onclick handlers.
 * Session 265.
 * Session 254 track: _renderAuditionsList + RULE_LABELS extracted to
 * groups.auditions.render.ts.
 */
import { safeRpc } from '../auth.ts';
import { request_audition } from '../contracts/rpc-schemas.ts';
import { showToast } from '../config.ts';
import { currentGroupId, callerRole } from './groups.state.ts';
import type { GroupDetail } from './groups.types.ts';
import { RULE_LABELS, renderAuditionsList } from './groups.auditions.render.ts';
import type { PendingAudition } from './groups.auditions.render.ts';

// ── LOCAL STATE ───────────────────────────────────────────────────────────────
let currentAuditionGroupId: string | null = null;
let currentAuditionConfig: Record<string, unknown> = {};

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/** Open the audition request modal for a candidate. */
export function openAuditionModal(g: GroupDetail): void {
  currentAuditionGroupId = g.id;
  currentAuditionConfig  = g.audition_config ?? {};

  // Reset all form fields to defaults before populating for the new group
  (document.getElementById('audition-topic') as HTMLInputElement).value = '';
  (document.getElementById('audition-category') as HTMLSelectElement).value = '';
  (document.getElementById('audition-ruleset') as HTMLSelectElement).value = 'amplified';
  (document.getElementById('audition-rounds') as HTMLSelectElement).value = '4';

  const rule      = (currentAuditionConfig.rule as string) ?? 'allowed_by_leader';
  const ruleLabel = RULE_LABELS[rule] ?? rule;

  // Populate rule description
  const ruleEl = document.getElementById('audition-rule-desc');
  if (ruleEl) ruleEl.textContent = ruleLabel;

  // Show/hide debate param fields based on rule
  const needsDebate = rule !== 'allowed_by_leader';
  const paramsEl    = document.getElementById('audition-debate-params');
  if (paramsEl) paramsEl.style.display = needsDebate ? 'block' : 'none';

  if (needsDebate) {
    _populateAuditionFields();
  }

  // Reset
  document.getElementById('audition-error')!.style.display = 'none';
  (document.getElementById('audition-submit-btn') as HTMLButtonElement).disabled = false;
  (document.getElementById('audition-submit-btn') as HTMLButtonElement).textContent = 'REQUEST AUDITION';

  document.getElementById('audition-modal')!.classList.add('open');
}

export function closeAuditionModal(): void {
  document.getElementById('audition-modal')!.classList.remove('open');
}

export async function submitAuditionRequest(): Promise<void> {
  const btn = document.getElementById('audition-submit-btn') as HTMLButtonElement;
  btn.disabled    = true;
  btn.textContent = 'REQUESTING…';
  document.getElementById('audition-error')!.style.display = 'none';

  try {
    const { data, error } = await safeRpc('request_audition', {
      p_group_id:     currentAuditionGroupId,
      p_topic:        (document.getElementById('audition-topic') as HTMLInputElement).value.trim() || null,
      p_category:     (document.getElementById('audition-category') as HTMLSelectElement).value || null,
      p_ruleset:      (document.getElementById('audition-ruleset') as HTMLSelectElement).value || 'amplified',
      p_total_rounds: Number((document.getElementById('audition-rounds') as HTMLSelectElement).value) || 4,
    }, request_audition);
    if (error) throw error;

    closeAuditionModal();
    showToast('Audition requested! The group will be in touch.');
    // Refresh auditions tab if visible
    await loadPendingAuditions(currentAuditionGroupId!, null);
  } catch (e) {
    const errEl = document.getElementById('audition-error');
    errEl!.textContent    = (e as Error).message || 'Could not request audition';
    errEl!.style.display  = 'block';
    btn.disabled         = false;
    btn.textContent      = 'REQUEST AUDITION';
  }
}

/** Load and render pending auditions into #detail-auditions. */
export async function loadPendingAuditions(
  groupId: string,
  myRole: string | null
): Promise<void> {
  const container = document.getElementById('detail-auditions');
  if (!container) return;
  container.innerHTML = '<div class="loading-state">Loading auditions…</div>';

  try {
    const { data, error } = await safeRpc('get_pending_auditions', { p_group_id: groupId });
    if (error) throw error;
    const auditions: PendingAudition[] = typeof data === 'string' ? JSON.parse(data) : (data ?? []);
    container.innerHTML = renderAuditionsList(auditions, myRole);
  } catch (e) {
    container.innerHTML = '<div class="loading-state">Could not load auditions</div>';
  }
}

/** Called by event delegation for audition action buttons. */
export async function handleAuditionAction(
  auditionId: string,
  action: 'accept' | 'approve' | 'deny' | 'withdraw'
): Promise<void> {
  const rpcMap = {
    accept:   'accept_audition',
    approve:  'approve_audition',
    deny:     'deny_audition',
    withdraw: 'withdraw_audition',
  } as const;

  const rpc = rpcMap[action];
  if (!rpc) return;

  try {
    const params: Record<string, unknown> = { p_audition_id: auditionId };
    const { data, error } = await safeRpc(rpc, params);
    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (action === 'accept' && result?.debate_id) {
      showToast('Audition accepted — debate created!');
      // Navigate to the debate lobby
      window.location.href = `index.html?screen=arena&lobby=${result.debate_id}`;
      return;
    }

    const messages = {
      approve:  'Candidate admitted to the group',
      deny:     'Audition denied',
      withdraw: 'Audition withdrawn',
    } as const;
    showToast(messages[action as keyof typeof messages] ?? 'Done');

    // L-C8 fix: withdraw is the candidate-side action — the candidate is
    // looking at the audition modal (currentAuditionGroupId is set) but
    // may not have a group detail page open (currentGroupId may be null
    // or stale). For all other actions (approve/deny) the leader IS on
    // their group's detail page, so currentGroupId is correct.
    const refreshGroupId = action === 'withdraw' ? currentAuditionGroupId : currentGroupId;
    await loadPendingAuditions(refreshGroupId!, callerRole);
  } catch (e) {
    showToast((e as Error).message || 'Action failed');
  }
}

// ── PRIVATE ───────────────────────────────────────────────────────────────────

function _populateAuditionFields(): void {
  const cfg = currentAuditionConfig;

  // Topic
  const topicInput = document.getElementById('audition-topic') as HTMLInputElement;
  const topicRow   = document.getElementById('audition-topic-row');
  if (cfg.locked_topic) {
    topicInput.value    = cfg.locked_topic as string;
    topicInput.disabled = true;
    if (topicRow) topicRow.dataset.locked = 'true';
  } else {
    topicInput.value    = '';
    topicInput.disabled = false;
    if (topicRow) delete topicRow.dataset.locked;
  }

  // Category
  const catSelect = document.getElementById('audition-category') as HTMLSelectElement;
  const catRow    = document.getElementById('audition-category-row');
  if (cfg.locked_category) {
    catSelect.value    = cfg.locked_category as string;
    catSelect.disabled = true;
    if (catRow) catRow.dataset.locked = 'true';
  } else {
    catSelect.value    = '';
    catSelect.disabled = false;
    if (catRow) delete catRow.dataset.locked;
  }

  // Ruleset
  const rulesetSelect = document.getElementById('audition-ruleset') as HTMLSelectElement;
  const rulesetRow    = document.getElementById('audition-ruleset-row');
  if (cfg.locked_ruleset) {
    rulesetSelect.value    = cfg.locked_ruleset as string;
    rulesetSelect.disabled = true;
    if (rulesetRow) rulesetRow.dataset.locked = 'true';
  } else {
    rulesetSelect.value    = 'amplified';
    rulesetSelect.disabled = false;
    if (rulesetRow) delete rulesetRow.dataset.locked;
  }

  // Rounds
  const roundsSelect = document.getElementById('audition-rounds') as HTMLSelectElement;
  const roundsRow    = document.getElementById('audition-rounds-row');
  if (cfg.locked_total_rounds) {
    roundsSelect.value    = String(cfg.locked_total_rounds);
    roundsSelect.disabled = true;
    if (roundsRow) roundsRow.dataset.locked = 'true';
  } else {
    roundsSelect.value    = '4';
    roundsSelect.disabled = false;
    if (roundsRow) delete roundsRow.dataset.locked;
  }
}
