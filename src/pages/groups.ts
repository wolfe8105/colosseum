/**
 * THE MODERATOR — Groups Page Controller — ORCHESTRATOR
 *
 * Refactored: nav → groups.nav.ts, load → groups.load.ts,
 * detail → groups.detail.ts, create → groups.create.ts.
 *
 * Sub-modules: types, state, utils, feed, members, challenges,
 * settings, auditions, nav, load, detail, create.
 */

import { ready, getCurrentUser, getSupabaseClient } from '../auth.ts';
import { setSb, setCurrentUser, currentGroupId } from './groups.state.ts';
import { _injectMemberActionsModal, setGroupOpenCallback, setRefreshMembersCallback } from './groups.members.ts';
import { loadGroupMembers } from './groups.members.ts';
import { switchTab, switchDetailTab, filterCategory, showLobby, setNavOpenGroupCallback } from './groups.nav.ts';
import { loadDiscover, setLoadOpenGroupCallback } from './groups.load.ts';
import { openGroup, toggleMembership, currentGroupData } from './groups.detail.ts';
import { openCreateModal, closeCreateModal, selectEmoji, submitCreateGroup, setCreateOpenGroupCallback } from './groups.create.ts';
import { openGvGModal, closeGvGModal, submitGroupChallenge, clearGvGOpponent } from './groups.challenges.ts';
import {
  openGroupSettings, closeGroupSettings, onJoinModeChange,
  submitGroupSettings, showDeleteConfirm, submitDeleteGroup, selectSettingsEmoji,
} from './groups.settings.ts';
import { closeAuditionModal, submitAuditionRequest, handleAuditionAction } from './groups.auditions.ts';

// Wire openGroup into sub-modules that need it without circular deps
setNavOpenGroupCallback(openGroup);
setLoadOpenGroupCallback(openGroup);
setCreateOpenGroupCallback(openGroup);
setGroupOpenCallback(openGroup);
// Wire loadGroupMembers refresh callback to break modal ↔ members circular dep
setRefreshMembersCallback(loadGroupMembers);

ready.then(() => {
  setSb(getSupabaseClient());
  setCurrentUser(getCurrentUser());
  _injectMemberActionsModal();
  loadDiscover();
});

// URL param: open group directly
const urlGroup = new URLSearchParams(window.location.search).get('group');
if (urlGroup && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlGroup)) {
  ready.then(() => openGroup(urlGroup));
}

// Event delegation
document.addEventListener('click', (e) => {
  const actionEl = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!actionEl) return;
  switch (actionEl.dataset.action) {
    case 'go-home':                window.location.href = 'index.html'; break;
    case 'open-create-modal':      openCreateModal(); break;
    case 'switch-tab':             switchTab(actionEl.dataset.tab!); break;
    case 'filter-category':        filterCategory(actionEl.dataset.category || null, actionEl); break;
    case 'show-lobby':             showLobby(); break;
    case 'toggle-membership':      void toggleMembership(); break;
    case 'open-gvg-modal':         openGvGModal(); break;
    case 'switch-detail-tab':      switchDetailTab(actionEl.dataset.tab!); break;
    case 'create-modal-backdrop':  if (e.target === actionEl) closeCreateModal(); break;
    case 'select-emoji':           selectEmoji(actionEl); break;
    case 'submit-create-group':    void submitCreateGroup(); break;
    case 'gvg-modal-backdrop':     if (e.target === actionEl) closeGvGModal(); break;
    case 'close-gvg-modal':        closeGvGModal(); break;
    case 'submit-gvg-challenge':   void submitGroupChallenge(); break;
    case 'clear-gvg-opponent':     clearGvGOpponent(); break;
    case 'open-group-settings':
      if (currentGroupData) openGroupSettings(currentGroupData, { onSaved: () => currentGroupId && openGroup(currentGroupId), onDeleted: showLobby });
      break;
    case 'close-group-settings':   closeGroupSettings(); break;
    case 'settings-join-mode-change': onJoinModeChange((actionEl as HTMLInputElement).value); break;
    case 'save-group-settings':    void submitGroupSettings(); break;
    case 'show-delete-confirm':    showDeleteConfirm(); break;
    case 'submit-delete-group':    void submitDeleteGroup(); break;
    case 'select-settings-emoji':  selectSettingsEmoji(actionEl); break;
    case 'close-audition-modal':   closeAuditionModal(); break;
    case 'audition-modal-backdrop': if (e.target === actionEl) closeAuditionModal(); break;
    case 'submit-audition-request': void submitAuditionRequest(); break;
    case 'audition-action': {
      const id  = actionEl.dataset.auditionId!;
      const act = actionEl.dataset.auditionAction as 'accept'|'approve'|'deny'|'withdraw';
      void handleAuditionAction(id, act);
      break;
    }
  }
});

// F-19: Reload banner after upload
window.addEventListener('group-banner-updated', (e: Event) => {
  const groupId = (e as CustomEvent<{ groupId: string }>).detail?.groupId;
  if (groupId && groupId === currentGroupId) openGroup(groupId);
});
