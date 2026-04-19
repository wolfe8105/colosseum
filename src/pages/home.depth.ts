/**
 * Home — Profile depth editing: avatar picker, bio inline edit, follow list modal
 * Self-wiring side-effect module — no exports.
 */
import { getCurrentUser, getCurrentProfile, updateProfile, getFollowers, getFollowing, showUserProfile } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';

function _closeSheet(overlayEl: HTMLElement | null) { if (overlayEl && overlayEl.parentNode) overlayEl.remove(); }

// --- 1. AVATAR EMOJI PICKER ---
const AVATAR_EMOJIS = ['⚔️', '🏛️', '🔥', '👑', '🛡️', '🎯', '🦁', '🐉', '🦅', '⚡', '💀', '🎭', '🏆', '🗡️', '🌟', '🐺', '🦊', '🎪', '🧠', '💎'];
document.getElementById('profile-avatar')!.addEventListener('click', () => {
  document.getElementById('avatar-picker-sheet')?.remove();
  const currentUrl = getCurrentProfile()?.avatar_url || '';
  const currentEmoji = currentUrl.startsWith('emoji:') ? currentUrl.slice(6) : '';
  const sheetOverlay = document.createElement('div');
  sheetOverlay.id = 'avatar-picker-sheet';
  sheetOverlay.className = 'bottom-sheet-overlay';
  sheetOverlay.innerHTML = `
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">CHOOSE YOUR AVATAR</div>
      <div class="avatar-grid" id="avatar-grid">
        ${AVATAR_EMOJIS.map(e => `<div class="avatar-option${e === currentEmoji ? ' selected' : ''}" data-emoji="${escapeHTML(e)}">${e}</div>`).join('')}
      </div>
    </div>`;
  sheetOverlay.addEventListener('click', (e) => { if (e.target === sheetOverlay) _closeSheet(sheetOverlay); });
  let _avatarSaving = false;
  sheetOverlay.querySelector('#avatar-grid')!.addEventListener('click', async (e) => {
    const opt = (e.target as HTMLElement).closest('.avatar-option') as HTMLElement | null;
    if (!opt || _avatarSaving) return;
    _avatarSaving = true;
    const emoji = opt.dataset.emoji;
    sheetOverlay.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.style.opacity = '0.5';
    const result = await updateProfile({ avatar_url: 'emoji:' + emoji });
    opt.style.opacity = '1';
    _avatarSaving = false;
    if (result?.success) {
      _closeSheet(sheetOverlay);
      showToast('Avatar updated!', 'success');
    } else {
      showToast('Failed to save avatar', 'error');
    }
  });
  document.body.appendChild(sheetOverlay);
});

// --- 2. BIO INLINE EDIT ---
const bioDisplay = document.getElementById('profile-bio-display');
const bioEditPanel = document.getElementById('profile-bio-edit');
const bioTextarea = document.getElementById('profile-bio-textarea') as HTMLTextAreaElement;
const bioCharcount = document.getElementById('bio-charcount');
bioDisplay!.addEventListener('click', () => {
  const currentBio = getCurrentProfile()?.bio || '';
  bioTextarea.value = currentBio;
  bioCharcount!.textContent = currentBio.length + '/500';
  bioDisplay!.style.display = 'none';
  bioEditPanel!.style.display = 'block';
  bioTextarea.focus();
});
bioTextarea.addEventListener('input', () => {
  bioCharcount!.textContent = bioTextarea.value.length + '/500';
});
document.getElementById('bio-cancel-btn')!.addEventListener('click', () => {
  bioEditPanel!.style.display = 'none';
  bioDisplay!.style.display = '';
});
document.getElementById('bio-save-btn')!.addEventListener('click', async () => {
  const saveBtn = document.getElementById('bio-save-btn') as HTMLButtonElement;
  if (saveBtn?.disabled) return;
  if (saveBtn) { saveBtn.disabled = true; }
  const newBio = bioTextarea.value.trim();
  saveBtn.textContent = 'SAVING...';
  saveBtn.style.opacity = '0.5';
  try {
    const result = await updateProfile({ bio: newBio });
    if (result?.success) {
      bioEditPanel!.style.display = 'none';
      bioDisplay!.style.display = '';
      if (newBio) { bioDisplay!.textContent = newBio; bioDisplay!.classList.remove('placeholder'); }
      else { bioDisplay!.textContent = 'Tap to add bio'; bioDisplay!.classList.add('placeholder'); }
      showToast('Bio updated!', 'success');
    } else {
      showToast('Failed to save bio', 'error');
    }
  } catch {
    showToast('Failed to save bio', 'error');
  } finally {
    saveBtn.textContent = 'SAVE';
    saveBtn.style.opacity = '1';
    if (saveBtn) { saveBtn.disabled = false; }
  }
});

// --- 3. FOLLOW LIST MODAL ---
async function _openFollowList(type: string) {
  document.getElementById('follow-list-sheet')?.remove();
  const userId = getCurrentUser()?.id;
  if (!userId) return;
  const followOverlay = document.createElement('div');
  followOverlay.id = 'follow-list-sheet';
  followOverlay.className = 'bottom-sheet-overlay';
  followOverlay.innerHTML = `
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">${type === 'followers' ? 'FOLLOWERS' : 'FOLLOWING'}</div>
      <div id="follow-list-content" style="min-height:60px;display:flex;align-items:center;justify-content:center;">
        <div style="color:var(--mod-text-muted);font-size:13px;">Loading...</div>
      </div>
    </div>`;
  followOverlay.addEventListener('click', (e) => { if (e.target === followOverlay) _closeSheet(followOverlay); });
  document.body.appendChild(followOverlay);

  const result = type === 'followers'
    ? await getFollowers(userId)
    : await getFollowing(userId);
  const listEl = followOverlay.querySelector('#follow-list-content')!;
  if (!result?.success || !result.data?.length) {
    listEl.innerHTML = `<div class="follow-list-empty">${type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</div>`;
    return;
  }
  const items = result.data.map((row: any) => {
    const profileData = type === 'followers'
      ? row.profiles
      : row.profiles;
    if (!profileData) return '';
    const name = escapeHTML(profileData.display_name || profileData.username || 'Unknown');
    const initial = escapeHTML((profileData.display_name || profileData.username || '?')[0].toUpperCase());
    const elo = Number(profileData.elo_rating) || 1200;
    const uid = type === 'followers' ? row.follower_id : row.following_id;
    return `<div class="follow-list-item" data-user-id="${escapeHTML(uid)}" data-username="${escapeHTML(profileData.username || '')}">
      <div class="fl-avatar">${initial}</div>
      <div style="flex:1;min-width:0;">
        <div class="fl-name">${name}</div>
        <div class="fl-elo">ELO ${elo}</div>
      </div>
    </div>`;
  }).join('');
  listEl.innerHTML = items || `<div class="follow-list-empty">No users found</div>`;
  listEl.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.follow-list-item') as HTMLElement | null;
    if (!item) return;
    _closeSheet(followOverlay);
    const uid = item.dataset.userId;
    const username = item.dataset.username;
    if (uid) { showUserProfile(uid); }
    else if (username) { window.location.href = '/u/' + encodeURIComponent(username); }
  });
}
document.getElementById('followers-stat')!.addEventListener('click', () => _openFollowList('followers'));
document.getElementById('following-stat')!.addEventListener('click', () => _openFollowList('following'));
