/**
 * THE MODERATOR — Auth Profile (updateProfile, deleteAccount, getPublicProfile, showUserProfile)
 */

import { getSupabaseClient, getIsPlaceholderMode, getCurrentUser, getCurrentProfile, isUUID, _notify, _clearAuthState } from './auth.core.ts';
import { safeRpc } from './auth.rpc.ts';
import { requireAuth } from './auth.gate.ts';
import { escapeHTML, FEATURES } from './config.ts';
import { vgBadge } from './badge.ts';
import { followUser, unfollowUser } from './auth.follows.ts';
import { declareRival } from './auth.rivals.ts';
import type { AuthResult, PublicProfile, ProfileUpdate } from './auth.types.ts';
import { renderProfileBountySection, bountySlotLimit, bountyDot, renderMyBountiesSection } from './bounties.ts';

export async function updateProfile(updates: ProfileUpdate): Promise<AuthResult> {
  const currentProfile = getCurrentProfile();
  const currentUser = getCurrentUser();
  if (getIsPlaceholderMode()) {
    Object.assign(currentProfile!, updates);
    _notify(currentUser, currentProfile);
    return { success: true };
  }

  try {
    const { error } = await safeRpc('update_profile', {
      p_display_name: updates.display_name !== undefined ? updates.display_name : null,
      p_avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : null,
      p_bio: updates.bio !== undefined ? updates.bio : null,
      p_username: updates.username !== undefined ? updates.username : null,
      p_preferred_language: updates.preferred_language !== undefined ? updates.preferred_language : null,
      p_is_private: updates.is_private !== undefined ? updates.is_private : null,
    });
    if (error) throw error;

    const safeFields: (keyof ProfileUpdate)[] = ['display_name', 'avatar_url', 'bio', 'username', 'preferred_language'];
    safeFields.forEach(f => {
      if (updates[f] !== undefined && currentProfile) {
        (currentProfile as Record<string, unknown>)[f] = updates[f];
      }
    });
    _notify(currentUser, currentProfile);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteAccount(): Promise<AuthResult> {
  if (getIsPlaceholderMode()) return { success: true };

  try {
    const { error } = await safeRpc('soft_delete_account', {});
    if (error) throw error;

    _clearAuthState();
    _notify(null, null);

    try { await getSupabaseClient()!.auth.signOut(); } catch { /* best-effort */ }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  if (!isUUID(userId)) return null;
  if (getIsPlaceholderMode()) {
    return {
      id: userId, username: 'gladiator', display_name: 'Gladiator',
      avatar_url: null, bio: 'Placeholder profile',
      elo_rating: 1200, wins: 5, losses: 3, current_streak: 2,
      level: 3, debates_completed: 8,
      followers: 12, following: 8, is_following: false,
      subscription_tier: 'free', created_at: new Date().toISOString(),
    };
  }
  try {
    const { data, error } = await safeRpc<PublicProfile>('get_public_profile', { p_user_id: userId });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('getPublicProfile error:', e);
    return null;
  }
}

/**
 * Opens a bottom-sheet modal showing another user's profile.
 * Contains follow/rival buttons with auth gates.
 */
export async function showUserProfile(userId: string): Promise<void> {
  const currentUser = getCurrentUser();
  if (!userId || !isUUID(userId) || userId === currentUser?.id) return;

  const esc = escapeHTML;

  document.getElementById('user-profile-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'user-profile-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,var(--mod-bg-card) 0%,var(--mod-bg-base) 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));">
      <div style="width:40px;height:4px;background:var(--mod-bg-elevated);border-radius:2px;margin:0 auto 20px;"></div>
      <div style="text-align:center;color:var(--mod-text-sub);font-size:13px;">Loading profile...</div>
    </div>`;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);

  const profile = await getPublicProfile(userId);
  if (!profile) {
    const container = modal.querySelector('div > div:last-child');
    if (container) {
      container.innerHTML = '<div style="text-align:center;color:var(--mod-magenta);font-size:14px;">User not found</div>';
    }
    return;
  }

  // Emoji avatar support (Session 113)
  const avatarUrl = profile.avatar_url ?? '';
  const emojiAvatar = avatarUrl.startsWith('emoji:') ? esc(avatarUrl.slice(6)) : null;
  const initial = emojiAvatar ?? esc((profile.display_name ?? profile.username ?? '?')[0]?.toUpperCase());
  const avatarFontSize = emojiAvatar ? '32px' : '24px';
  const tierLabels: Record<string, string> = { free: 'FREE', contender: 'CONTENDER', champion: 'CHAMPION', creator: 'CREATOR' };
  const tierLabel = tierLabels[profile.subscription_tier] ?? 'FREE';
  const safeName = esc((profile.display_name ?? profile.username ?? 'UNKNOWN')).toUpperCase();
  const safeBio = profile.bio ? esc(profile.bio) : '';

  const lastChild = modal.querySelector('div > div:last-child');
  if (lastChild) lastChild.remove();

  const modalInner = modal.querySelector('div');
  if (!modalInner) return;

  modalInner.innerHTML += `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="width:64px;height:64px;border-radius:50%;border:3px solid var(--mod-accent);background:rgb(10,17,40);color:var(--mod-accent);font-family:var(--mod-font-display);font-size:${avatarFontSize};font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">${initial}</div>
      <div style="font-family:var(--mod-font-display);font-size:18px;letter-spacing:2px;color:var(--mod-text-heading);">${safeName}${vgBadge(profile.verified_gladiator)}${bountyDot(profile.id)}</div>
      <div style="font-size:11px;color:var(--mod-accent);letter-spacing:2px;margin-top:4px;">${tierLabel}</div>
      ${safeBio ? `<div style="font-size:13px;color:var(--mod-text-sub);margin-top:8px;line-height:1.4;">${safeBio}</div>` : ''}
      ${profile.username ? `<a href="/u/${encodeURIComponent(profile.username)}" style="display:inline-block;margin-top:8px;font-size:12px;color:var(--mod-accent);text-decoration:none;">View full profile →</a>` : ''}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid var(--mod-border-primary);border-radius:10px;padding:10px 4px;">
        <div style="font-family:var(--mod-font-display);font-size:18px;color:var(--mod-accent);">${Number(profile.elo_rating) || 1200}</div>
        <div style="font-size:10px;color:var(--mod-text-sub);letter-spacing:1px;">ELO</div>
      </div>
      <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid var(--mod-border-primary);border-radius:10px;padding:10px 4px;">
        <div style="font-family:var(--mod-font-display);font-size:18px;color:var(--mod-text-heading);">${Number(profile.wins) || 0}-${Number(profile.losses) || 0}</div>
        <div style="font-size:10px;color:var(--mod-text-sub);letter-spacing:1px;">W-L</div>
      </div>
      <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid var(--mod-border-primary);border-radius:10px;padding:10px 4px;">
        <div style="font-family:var(--mod-font-display);font-size:18px;color:var(--mod-text-heading);">${Number(profile.followers) || 0}</div>
        <div style="font-size:10px;color:var(--mod-text-sub);letter-spacing:1px;">FOLLOWERS</div>
      </div>
      <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid var(--mod-border-primary);border-radius:10px;padding:10px 4px;">
        <div style="font-family:var(--mod-font-display);font-size:18px;color:var(--mod-text-heading);">${Number(profile.following) || 0}</div>
        <div style="font-size:10px;color:var(--mod-text-sub);letter-spacing:1px;">FOLLOWING</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button id="upm-follow-btn" style="flex:1;padding:12px;border-radius:10px;font-family:var(--mod-font-display);font-size:14px;letter-spacing:2px;cursor:pointer;border:none;${profile.is_following ? 'background:var(--mod-bg-control);color:var(--mod-text-sub);border:1px solid var(--mod-border-primary);' : 'background:var(--mod-accent);color:var(--mod-bg-base);'}">${profile.is_following ? 'FOLLOWING' : 'FOLLOW'}</button>
      <button id="upm-rival-btn" style="flex:1;padding:12px;background:var(--mod-accent-muted);color:var(--mod-magenta);border:1px solid rgba(204,41,54,0.3);border-radius:10px;font-family:var(--mod-font-display);font-size:14px;letter-spacing:2px;cursor:pointer;">⚔️ RIVAL</button>
      <button id="upm-close-btn" style="padding:12px 16px;background:var(--mod-bg-subtle);color:var(--mod-text-sub);border:1px solid var(--mod-border-primary);border-radius:10px;font-size:14px;cursor:pointer;">✕</button>
    </div>`;

  // Close button handler
  document.getElementById('upm-close-btn')?.addEventListener('click', () => {
    document.getElementById('user-profile-modal')?.remove();
  });

  // Follow button handler
  const followBtn = document.getElementById('upm-follow-btn');
  if (!FEATURES.followsUI && followBtn) followBtn.style.display = 'none';
  let isFollowing = profile.is_following;
  followBtn?.addEventListener('click', async () => {
    if (!requireAuth('follow users')) return;
    if (followBtn) followBtn.style.opacity = '0.5';
    if (isFollowing) {
      const result = await unfollowUser(userId);
      if (result.success && followBtn) {
        isFollowing = false;
        followBtn.textContent = 'FOLLOW';
        followBtn.style.background = 'var(--mod-accent)';
        followBtn.style.color = 'var(--mod-bg-base)';
      }
    } else {
      const result = await followUser(userId);
      if (result.success && followBtn) {
        isFollowing = true;
        followBtn.textContent = 'FOLLOWING';
        followBtn.style.background = 'var(--mod-bg-control)';
        followBtn.style.color = 'var(--mod-text-sub)';
      }
    }
    if (followBtn) followBtn.style.opacity = '1';
  });

  // Rival button handler
  const rivalBtn = document.getElementById('upm-rival-btn');
  rivalBtn?.addEventListener('click', async () => {
    if (!requireAuth('declare rivals')) return;
    if (rivalBtn) {
      rivalBtn.style.opacity = '0.5';
      rivalBtn.textContent = '⏳';
    }
    const result = await declareRival(userId);
    if (result.success && rivalBtn) {
      rivalBtn.textContent = '⚔️ SENT';
      rivalBtn.style.background = 'var(--mod-magenta-glow)';
      (rivalBtn as HTMLButtonElement).disabled = true;
    } else if (rivalBtn) {
      console.error('declareRival failed:', result.error);
      rivalBtn.textContent = 'Try again';
      setTimeout(() => { if (rivalBtn) rivalBtn.textContent = '⚔️ RIVAL'; }, 2000);
    }
    if (rivalBtn) rivalBtn.style.opacity = '1';
  });

  // F-28: Bounty section — only shown to authenticated users viewing another user's profile
  if (currentUser && getCurrentProfile() && userId !== currentUser.id) {
    const bountyContainer = document.createElement('div');
    bountyContainer.id = 'upm-bounty-section';
    modalInner.appendChild(bountyContainer);

    // Count viewer's open outgoing bounties for slot check
    // We pass 0 as a starting count and let renderProfileBountySection
    // fetch the real count via getMyBounties internally
    const viewerDepth = Number(getCurrentProfile()!.profile_depth_pct) || 0;
    const viewerBalance = Number(getCurrentProfile()!.token_balance) || 0;
    const slotLimit = bountySlotLimit(viewerDepth);

    if (slotLimit > 0) {
      void renderProfileBountySection(
        bountyContainer,
        userId,
        viewerDepth,
        viewerBalance,
        0, // open count fetched inside renderProfileBountySection via getMyBounties
      );
    }
  }

  // F-28: My Bounties section — shown when viewing own profile
  if (currentUser && userId === currentUser.id) {
    const myBountiesContainer = document.createElement('div');
    myBountiesContainer.id = 'upm-my-bounties-section';
    modalInner.appendChild(myBountiesContainer);
    void renderMyBountiesSection(myBountiesContainer);
  }
}
