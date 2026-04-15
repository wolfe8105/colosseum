/**
 * THE MODERATOR — Groups: Settings modal (F-16)
 *
 * Leader-only full-screen settings view pushed from Group Detail.
 * Handles: description, category, avatar_emoji, is_public, join_mode,
 * entry_requirements (F-17), audition_config (F-18), and group deletion.
 *
 * Mounted via groups.ts event delegation. No inline onclick handlers.
 * Session 265.
 */
import { safeRpc } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import { currentGroupId, callerRole } from './groups.state.ts';
import type { GroupDetail } from './groups.types.ts';

// ── LOCAL STATE ───────────────────────────────────────────────────────────────
let onSettingsSaved: (() => void) | null = null;
let onGroupDeleted: (() => void) | null = null;

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/** Open settings view pre-filled with current group data. Leader-only. */
export function openGroupSettings(
  g: GroupDetail,
  callbacks: { onSaved: () => void; onDeleted: () => void }
): void {
  if (callerRole !== 'leader') return;
  onSettingsSaved = callbacks.onSaved;
  onGroupDeleted  = callbacks.onDeleted;

  _populateSettings(g);
  document.getElementById('view-detail').style.display   = 'none';
  document.getElementById('view-settings').style.display = 'flex';
}

export function closeGroupSettings(): void {
  document.getElementById('view-settings').style.display = 'none';
  document.getElementById('view-detail').style.display   = 'flex';
  _hideDeleteConfirm();
}

/** Called by event delegation when join_mode radio changes. */
export function onJoinModeChange(mode: string): void {
  const reqSection = document.getElementById('settings-requirements-section');
  const audSection = document.getElementById('settings-audition-section');
  if (reqSection) reqSection.style.display = mode === 'requirements' ? 'block' : 'none';
  if (audSection) audSection.style.display = mode === 'audition'     ? 'block' : 'none';
}

export async function submitGroupSettings(): Promise<void> {
  const btn = document.getElementById('settings-save-btn') as HTMLButtonElement;
  btn.disabled    = true;
  btn.textContent = 'SAVING…';

  try {
    const joinMode = (document.querySelector(
      'input[name="join-mode"]:checked'
    ) as HTMLInputElement | null)?.value ?? 'open';

    // Build entry_requirements JSONB
    const minEloRaw = (document.getElementById('settings-min-elo') as HTMLInputElement).value.trim();
    const minTier   = (document.getElementById('settings-min-tier') as HTMLSelectElement).value;
    const reqProfile = (document.getElementById('settings-req-profile') as HTMLInputElement).checked;
    const entryReq: Record<string, unknown> = {};
    if (minEloRaw)        entryReq.min_elo               = Number(minEloRaw);
    if (minTier)          entryReq.min_tier               = minTier;
    if (reqProfile)       entryReq.require_profile_complete = true;

    // Build audition_config JSONB
    const audRule    = (document.getElementById('settings-aud-rule') as HTMLSelectElement).value;
    const audTopic   = (document.getElementById('settings-aud-topic') as HTMLInputElement).value.trim() || null;
    const audCat     = (document.getElementById('settings-aud-category') as HTMLSelectElement).value || null;
    const audRuleset = (document.getElementById('settings-aud-ruleset') as HTMLSelectElement).value || null;
    const audRounds  = (document.getElementById('settings-aud-rounds') as HTMLSelectElement).value || null;
    const audConfig: Record<string, unknown> = { rule: audRule };
    if (audTopic)   audConfig.locked_topic        = audTopic;
    if (audCat)     audConfig.locked_category     = audCat;
    if (audRuleset) audConfig.locked_ruleset      = audRuleset;
    if (audRounds)  audConfig.locked_total_rounds = Number(audRounds);

    const { error } = await safeRpc('update_group_settings', {
      p_group_id:           currentGroupId,
      p_description:        (document.getElementById('settings-desc') as HTMLTextAreaElement).value.trim() || null,
      p_category:           (document.getElementById('settings-category') as HTMLSelectElement).value,
      p_is_public:          (document.getElementById('settings-is-public') as HTMLInputElement).checked,
      p_avatar_emoji:       (document.getElementById('settings-emoji-selected') as HTMLElement).dataset.emoji || null,
      p_join_mode:          joinMode,
      p_entry_requirements: joinMode === 'requirements' ? entryReq : {},
      p_audition_config:    joinMode === 'audition'     ? audConfig : {},
    });

    if (error) throw error;
    showToast('Settings saved');
    closeGroupSettings();
    onSettingsSaved?.();
  } catch (e) {
    showToast((e as Error).message || 'Could not save settings');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'SAVE';
  }
}

export function showDeleteConfirm(): void {
  document.getElementById('settings-delete-confirm').style.display = 'block';
  (document.getElementById('settings-delete-name-input') as HTMLInputElement).value = '';
  document.getElementById('settings-delete-confirm').scrollIntoView({ behavior: 'smooth' });
}

export async function submitDeleteGroup(): Promise<void> {
  const confirmName = (document.getElementById('settings-delete-name-input') as HTMLInputElement).value.trim();
  if (!confirmName) { showToast('Type the group name to confirm'); return; }

  const btn = document.getElementById('settings-delete-submit-btn') as HTMLButtonElement;
  btn.disabled    = true;
  btn.textContent = 'DELETING…';

  try {
    const { error } = await safeRpc('delete_group', {
      p_group_id:    currentGroupId,
      p_confirm_name: confirmName,
    });
    if (error) throw error;
    document.getElementById('view-settings').style.display = 'none';
    onGroupDeleted?.();
  } catch (e) {
    showToast((e as Error).message || 'Could not delete group');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'DELETE FOREVER';
  }
}

export function selectSettingsEmoji(el: HTMLElement): void {
  document.querySelectorAll('.settings-emoji-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const display = document.getElementById('settings-emoji-selected') as HTMLElement;
  display.textContent    = el.dataset.emoji ?? '⚔️';
  display.dataset.emoji  = el.dataset.emoji ?? '⚔️';
}

// ── PRIVATE ───────────────────────────────────────────────────────────────────

function _populateSettings(g: GroupDetail): void {
  // General
  (document.getElementById('settings-desc') as HTMLTextAreaElement).value =
    g.description ?? '';
  (document.getElementById('settings-category') as HTMLSelectElement).value =
    g.category ?? 'general';
  (document.getElementById('settings-is-public') as HTMLInputElement).checked =
    g.is_public ?? true;

  // Emoji display
  const emojiDisplay = document.getElementById('settings-emoji-selected') as HTMLElement;
  emojiDisplay.textContent   = g.avatar_emoji ?? '⚔️';
  emojiDisplay.dataset.emoji = g.avatar_emoji ?? '⚔️';
  document.querySelectorAll('.settings-emoji-opt').forEach(o => {
    o.classList.toggle('selected', (o as HTMLElement).dataset.emoji === (g.avatar_emoji ?? '⚔️'));
  });

  // Join mode
  const mode = g.join_mode ?? 'open';
  const radio = document.querySelector(
    `input[name="join-mode"][value="${mode}"]`
  ) as HTMLInputElement | null;
  if (radio) radio.checked = true;
  onJoinModeChange(mode);

  // Requirements
  const req = g.entry_requirements ?? {};
  (document.getElementById('settings-min-elo') as HTMLInputElement).value =
    req.min_elo != null ? String(req.min_elo) : '';
  (document.getElementById('settings-min-tier') as HTMLSelectElement).value =
    req.min_tier ?? '';
  (document.getElementById('settings-req-profile') as HTMLInputElement).checked =
    req.require_profile_complete ?? false;

  // Audition config
  const aud = g.audition_config ?? {};
  (document.getElementById('settings-aud-rule') as HTMLSelectElement).value =
    aud.rule ?? 'allowed_by_leader';
  (document.getElementById('settings-aud-topic') as HTMLInputElement).value =
    aud.locked_topic ?? '';
  (document.getElementById('settings-aud-category') as HTMLSelectElement).value =
    aud.locked_category ?? '';
  (document.getElementById('settings-aud-ruleset') as HTMLSelectElement).value =
    aud.locked_ruleset ?? '';
  (document.getElementById('settings-aud-rounds') as HTMLSelectElement).value =
    aud.locked_total_rounds != null ? String(aud.locked_total_rounds) : '';

  // Reset danger zone
  _hideDeleteConfirm();
}

function _hideDeleteConfirm(): void {
  const el = document.getElementById('settings-delete-confirm');
  if (el) el.style.display = 'none';
}
