// ============================================================
// COLOSSEUM AUTH — Authentication Module (Item 6.2.2.2)
// Supabase auth: signup, login, logout, OAuth, profile CRUD,
// follows, rivals, password reset, account deletion, session mgmt.
// Placeholder mode when no Supabase credentials.
//
// SESSION 17: Migrated all writes to .rpc() calls.
// SESSION 23: Added ready promise, getPublicProfile(),
//   getFollowCounts(), rivals functions, showUserProfile() modal.
// SESSION 47: safeRpc() wrapper added — 401 recovery with one refresh + retry.
//   1. noOpLock in createClient (GitHub issue supabase-js#1594)
//   2. onAuthStateChange with INITIAL_SESSION as sole init path
//      (no separate getSession call — it's redundant and can hang)
//   3. No await inside onAuthStateChange callback (Supabase docs
//      explicitly warn this causes deadlocks)
// ============================================================

window.ColosseumAuth = (() => {

  let supabase = null;
  let currentUser = null;
  let currentProfile = null;
  let listeners = [];
  let isPlaceholderMode = true;

  // SESSION 23: Ready promise — resolves when auth state is known
  let _resolveReady;
  const readyPromise = new Promise(resolve => { _resolveReady = resolve; });

  // --- Init ---
  function init() {
    if (typeof ColosseumConfig === 'undefined') {
      console.warn('ColosseumAuth: config not loaded, entering placeholder mode');
      _enterPlaceholderMode();
      return;
    }

    if (ColosseumConfig.placeholderMode.supabase) {
      console.warn('ColosseumAuth: Supabase credentials missing, placeholder mode');
      _enterPlaceholderMode();
      return;
    }

    try {
      if (!window.supabase?.createClient) throw new Error('Supabase CDN not loaded');

      // SESSION 31: noOpLock bypasses navigator.locks at constructor level.
      // Supabase v2 auth uses navigator.locks internally and deadlocks
      // when orphaned locks exist (GitHub issue supabase-js#1594).
      const noOpLock = async (name, acquireTimeout, fn) => { return await fn(); };

      supabase = window.supabase.createClient(
        ColosseumConfig.SUPABASE_URL,
        ColosseumConfig.SUPABASE_ANON_KEY,
        { auth: { lock: noOpLock } }
      );
      isPlaceholderMode = false;

      // SESSION 31: Safety timeout — if INITIAL_SESSION never fires,
      // resolve ready anyway so the app isn't stuck forever.
      const safetyTimeout = setTimeout(() => {
        if (!currentUser && !currentProfile) {
          console.warn('ColosseumAuth: INITIAL_SESSION never fired after 5s — continuing as guest');
          _resolveReady();
        }
      }, 5000);

      // SESSION 31: onAuthStateChange is the SOLE init mechanism.
      // INITIAL_SESSION fires once after the client loads the session
      // from localStorage. No separate getSession() call needed.
      //
      // CRITICAL: Supabase docs say "Do not use other Supabase functions
      // in the callback function" and "Avoid using async functions as
      // callbacks." Profile loading is dispatched outside via setTimeout.
      supabase.auth.onAuthStateChange((event, session) => {

        if (event === 'INITIAL_SESSION') {
          clearTimeout(safetyTimeout);
          if (session?.user) {
            currentUser = session.user;
            // Dispatch profile load OUTSIDE callback to avoid deadlock
            setTimeout(() => {
              _loadProfile(session.user.id).then(() => _resolveReady());
            }, 0);
          } else {
            // Not logged in — resolve ready immediately
            _resolveReady();
          }
        }

        else if (event === 'SIGNED_IN' && session?.user) {
          currentUser = session.user;
          // Dispatch outside callback
          setTimeout(() => _loadProfile(session.user.id), 0);
        }

        else if (event === 'TOKEN_REFRESHED' && session?.user) {
          currentUser = session.user;
          // No profile reload needed — just update the user object
        }

        else if (event === 'PASSWORD_RECOVERY' && session?.user) {
          currentUser = session.user;
          _notify(currentUser, currentProfile);
        }

        else if (event === 'SIGNED_OUT') {
          currentUser = null;
          currentProfile = null;
          _notify(null, null);
        }
      });

    } catch (e) {
      console.error('ColosseumAuth: Supabase init failed', e);
      _enterPlaceholderMode();
    }
  }

  function _enterPlaceholderMode() {
    isPlaceholderMode = true;
    currentUser = { id: 'placeholder-user', email: 'gladiator@colosseum.app' };
    currentProfile = {
      id: 'placeholder-user',
      username: 'gladiator',
      display_name: 'Gladiator',
      elo_rating: 1200,
      wins: 0,
      losses: 0,
      current_streak: 0,
      level: 1,
      xp: 0,
      debates_completed: 0,
      token_balance: 50,
      subscription_tier: 'free',
      profile_depth_pct: 0,
      trust_score: 50,
      is_minor: false,
      avatar_url: null,
      bio: '',
      is_moderator: false,
      mod_available: false,
      mod_rating: 50,
      mod_debates_total: 0,
      mod_rulings_total: 0,
      mod_approval_pct: 0,
      created_at: new Date().toISOString(),
    };
    _notify(currentUser, currentProfile);
    _resolveReady();
  }

  // --- Profile (READ — .from() SELECT is fine, RLS allows reads) ---
  async function _loadProfile(userId) {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      currentProfile = data;
      _notify(currentUser, currentProfile);
    } catch (e) {
      console.error('ColosseumAuth: load profile failed', e);
    }
  }

  // --- Sign Up (Item 14.4.1.1) ---
  async function signUp({ email, password, username, displayName, dob }) {
    if (isPlaceholderMode) {
      console.log('[Placeholder] signUp called:', email);
      return { success: true, placeholder: true };
    }

    try {
      const redirectTo = (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.APP?.baseUrl)
        ? ColosseumConfig.APP.baseUrl + '/colosseum-login.html'
        : window.location.origin + '/colosseum-login.html';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            username,
            display_name: displayName,
            date_of_birth: dob,
          }
        }
      });
      if (error) throw error;

      return { success: true, user: data.user, session: data.session };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Log In (Item 14.4.1.1) ---
  async function logIn({ email, password }) {
    if (isPlaceholderMode) {
      console.log('[Placeholder] logIn called:', email);
      return { success: true, placeholder: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, user: data.user, session: data.session };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- OAuth (Items 14.4.1.12, 14.4.1.13) ---
  async function oauthLogin(provider) {
    if (isPlaceholderMode) {
      console.log('[Placeholder] OAuth called:', provider);
      return { success: true, placeholder: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      return { success: true, url: data.url };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Log Out ---
  async function logOut() {
    if (isPlaceholderMode) {
      console.log('[Placeholder] logOut called');
      return { success: true };
    }

    try {
      // Timeout wrapper — signOut can hang if something goes wrong.
      // Force-clear local state regardless so logout always works.
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(() => {
          console.warn('ColosseumAuth: signOut timed out after 3s — forcing local cleanup');
          resolve();
        }, 3000)),
      ]);
    } catch (e) {
      console.error('ColosseumAuth: signOut error (continuing anyway)', e);
    }

    // Always clear local state even if signOut hung or errored
    currentUser = null;
    currentProfile = null;
    _notify(null, null);
    return { success: true };
  }

  // --- Password Reset (Item 14.4.1.9) ---
  async function resetPassword(email) {
    if (isPlaceholderMode) return { success: true, placeholder: true };

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/colosseum-login.html?reset=true`
      });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Update Password (after reset link clicked) ---
  async function updatePassword(newPassword) {
    if (isPlaceholderMode) return { success: true, placeholder: true };

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Update Profile (SESSION 17: migrated to RPC) ---
  async function updateProfile(updates) {
    if (isPlaceholderMode) {
      Object.assign(currentProfile, updates);
      _notify(currentUser, currentProfile);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.rpc('update_profile', {
        p_display_name: updates.display_name || null,
        p_avatar_url: updates.avatar_url || null,
        p_bio: updates.bio !== undefined ? updates.bio : null,
        p_username: updates.username || null,
      });

      if (error) throw error;

      const safeFields = ['display_name', 'avatar_url', 'bio', 'username'];
      safeFields.forEach(f => {
        if (updates[f] !== undefined) currentProfile[f] = updates[f];
      });
      _notify(currentUser, currentProfile);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Delete Account (Item 14.4.1.10) ---
  async function deleteAccount() {
    if (isPlaceholderMode) return { success: true };

    try {
      await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', currentUser.id);

      await supabase.auth.signOut();
      currentUser = null;
      currentProfile = null;
      _notify(null, null);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Follow System (SESSION 17: migrated to RPC) ---
  async function followUser(targetUserId) {
    if (isPlaceholderMode) return { success: true };

    try {
      const { data, error } = await supabase.rpc('follow_user', {
        p_target_user_id: targetUserId
      });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function unfollowUser(targetUserId) {
    if (isPlaceholderMode) return { success: true };

    try {
      const { data, error } = await supabase.rpc('unfollow_user', {
        p_target_user_id: targetUserId
      });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Follow reads (SELECT — .from() is fine, RLS allows reads) ---
  async function getFollowers(userId) {
    if (isPlaceholderMode) return { success: true, data: [], count: 0 };
    try {
      const { data, count, error } = await supabase
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(username, display_name, elo_rating)', { count: 'exact' })
        .eq('following_id', userId);
      if (error) throw error;
      return { success: true, data, count };
    } catch (e) {
      return { success: false, error: e.message, data: [], count: 0 };
    }
  }

  async function getFollowing(userId) {
    if (isPlaceholderMode) return { success: true, data: [], count: 0 };
    try {
      const { data, count, error } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(username, display_name, elo_rating)', { count: 'exact' })
        .eq('follower_id', userId);
      if (error) throw error;
      return { success: true, data, count };
    } catch (e) {
      return { success: false, error: e.message, data: [], count: 0 };
    }
  }

  // --- SESSION 23: Follow Counts (via RPC) ---
  async function getFollowCounts(userId) {
    if (isPlaceholderMode) return { followers: 0, following: 0 };
    try {
      const { data, error } = await supabase.rpc('get_follow_counts', { p_user_id: userId });
      if (error) throw error;
      return data || { followers: 0, following: 0 };
    } catch (e) {
      console.error('getFollowCounts error:', e);
      return { followers: 0, following: 0 };
    }
  }

  // --- SESSION 23: Public Profile Lookup ---
  async function getPublicProfile(userId) {
    if (isPlaceholderMode) {
      return {
        id: userId, username: 'gladiator', display_name: 'Gladiator',
        elo_rating: 1200, wins: 5, losses: 3, current_streak: 2,
        level: 3, debates_completed: 8, bio: 'Placeholder profile',
        followers: 12, following: 8, is_following: false,
        subscription_tier: 'free', created_at: new Date().toISOString(),
      };
    }
    try {
      const { data, error } = await supabase.rpc('get_public_profile', { p_user_id: userId });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('getPublicProfile error:', e);
      return null;
    }
  }

  // --- SESSION 23: Rivals ---
  async function declareRival(targetId, message) {
    if (isPlaceholderMode) return { success: true };
    try {
      const { data, error } = await supabase.rpc('declare_rival', {
        p_target_id: targetId,
        p_message: message || null
      });
      if (error) throw error;
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function respondRival(rivalId, accept) {
    if (isPlaceholderMode) return { success: true };
    try {
      const { data, error } = await supabase.rpc('respond_rival', {
        p_rival_id: rivalId,
        p_accept: accept
      });
      if (error) throw error;
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function getMyRivals() {
    if (isPlaceholderMode) return [];
    try {
      const { data, error } = await supabase.rpc('get_my_rivals');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getMyRivals error:', e);
      return [];
    }
  }

  // --- SESSION 23: User Profile Modal ---
  async function showUserProfile(userId) {
    if (!userId || userId === currentUser?.id) return; // Don't show modal for self

    // Remove existing modal
    document.getElementById('user-profile-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'user-profile-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
    modal.innerHTML = `
      <div style="background:linear-gradient(180deg,#132240 0%,#0a1628 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));">
        <div style="width:40px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 20px;"></div>
        <div style="text-align:center;color:#6a7a90;font-size:13px;">Loading profile...</div>
      </div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    // Fetch profile
    const profile = await getPublicProfile(userId);
    if (!profile || profile.error) {
      modal.querySelector('div > div:last-child').innerHTML = `<div style="text-align:center;color:#cc2936;font-size:14px;">User not found</div>`;
      return;
    }

    const initial = (profile.display_name || profile.username || '?')[0].toUpperCase();
    const tierLabels = { free: 'FREE', contender: 'CONTENDER', champion: 'CHAMPION', creator: 'CREATOR' };
    const tierLabel = tierLabels[profile.subscription_tier] || 'FREE';
    const esc = ColosseumConfig?.escapeHTML || (s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
    const safeName = esc((profile.display_name || profile.username || 'UNKNOWN')).toUpperCase();
    const safeBio = profile.bio ? esc(profile.bio) : '';

    modal.querySelector('div > div:last-child').remove();
    modal.querySelector('div').innerHTML += `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="width:64px;height:64px;border-radius:50%;border:3px solid #b8922e;background:rgb(10,17,40);color:#d4a843;font-family:'Cinzel',serif;font-size:24px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">${initial}</div>
        <div style="font-family:'Cinzel',serif;font-size:18px;letter-spacing:2px;color:#f0f0f0;">${safeName}</div>
        <div style="font-size:11px;color:#b8922e;letter-spacing:2px;margin-top:4px;">${tierLabel}</div>
        ${safeBio ? `<div style="font-size:13px;color:#a0a8b8;margin-top:8px;line-height:1.4;">${safeBio}</div>` : ''}
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 4px;">
          <div style="font-family:'Cinzel',serif;font-size:18px;color:#d4a843;">${profile.elo_rating || 1200}</div>
          <div style="font-size:10px;color:#a0a8b8;letter-spacing:1px;">ELO</div>
        </div>
        <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 4px;">
          <div style="font-family:'Cinzel',serif;font-size:18px;color:#f0f0f0;">${profile.wins || 0}-${profile.losses || 0}</div>
          <div style="font-size:10px;color:#a0a8b8;letter-spacing:1px;">W-L</div>
        </div>
        <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 4px;">
          <div style="font-family:'Cinzel',serif;font-size:18px;color:#f0f0f0;">${profile.followers || 0}</div>
          <div style="font-size:10px;color:#a0a8b8;letter-spacing:1px;">FOLLOWERS</div>
        </div>
        <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 4px;">
          <div style="font-family:'Cinzel',serif;font-size:18px;color:#f0f0f0;">${profile.following || 0}</div>
          <div style="font-size:10px;color:#a0a8b8;letter-spacing:1px;">FOLLOWING</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <button id="upm-follow-btn" style="flex:1;padding:12px;border-radius:10px;font-family:'Cinzel',serif;font-size:14px;letter-spacing:2px;cursor:pointer;border:none;${profile.is_following ? 'background:rgba(255,255,255,0.08);color:#a0a8b8;border:1px solid rgba(255,255,255,0.15);' : 'background:#d4a843;color:#0a1628;'}">${profile.is_following ? 'FOLLOWING' : 'FOLLOW'}</button>
        <button id="upm-rival-btn" style="flex:1;padding:12px;background:rgba(204,41,54,0.15);color:#cc2936;border:1px solid rgba(204,41,54,0.3);border-radius:10px;font-family:'Cinzel',serif;font-size:14px;letter-spacing:2px;cursor:pointer;">⚔️ RIVAL</button>
        <button style="padding:12px 16px;background:rgba(255,255,255,0.05);color:#a0a8b8;border:1px solid rgba(255,255,255,0.1);border-radius:10px;font-size:14px;cursor:pointer;" onclick="document.getElementById('user-profile-modal')?.remove()">✕</button>
      </div>`;

    // Follow button handler
    const followBtn = document.getElementById('upm-follow-btn');
    let isFollowing = profile.is_following;
    followBtn.addEventListener('click', async () => {
      followBtn.style.opacity = '0.5';
      if (isFollowing) {
        const result = await unfollowUser(userId);
        if (result.success) {
          isFollowing = false;
          followBtn.textContent = 'FOLLOW';
          followBtn.style.cssText = followBtn.style.cssText.replace(/background:[^;]+;color:[^;]+;/, '') + 'background:#d4a843;color:#0a1628;';
        }
      } else {
        const result = await followUser(userId);
        if (result.success) {
          isFollowing = true;
          followBtn.textContent = 'FOLLOWING';
          followBtn.style.cssText = followBtn.style.cssText.replace(/background:[^;]+;color:[^;]+;/, '') + 'background:rgba(255,255,255,0.08);color:#a0a8b8;';
        }
      }
      followBtn.style.opacity = '1';
    });

    // Rival button handler
    const rivalBtn = document.getElementById('upm-rival-btn');
    rivalBtn.addEventListener('click', async () => {
      rivalBtn.style.opacity = '0.5';
      rivalBtn.textContent = '⏳';
      const result = await declareRival(userId);
      if (result?.success) {
        rivalBtn.textContent = '⚔️ SENT';
        rivalBtn.style.background = 'rgba(204,41,54,0.3)';
        rivalBtn.disabled = true;
      } else {
        rivalBtn.textContent = result?.error || 'Error';
        setTimeout(() => { rivalBtn.textContent = '⚔️ RIVAL'; }, 2000);
      }
      rivalBtn.style.opacity = '1';
    });
  }

  // --- SESSION 39: Moderator Functions ---
  async function toggleModerator(enabled) {
    if (isPlaceholderMode) {
      currentProfile.is_moderator = enabled;
      if (!enabled) currentProfile.mod_available = false;
      _notify(currentUser, currentProfile);
      return { success: true };
    }
    try {
      const { data, error } = await supabase.rpc('toggle_moderator_status', { p_enabled: enabled });
      if (error) throw error;
      currentProfile.is_moderator = enabled;
      if (!enabled) currentProfile.mod_available = false;
      _notify(currentUser, currentProfile);
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function toggleModAvailable(available) {
    if (isPlaceholderMode) {
      currentProfile.mod_available = available;
      _notify(currentUser, currentProfile);
      return { success: true };
    }
    try {
      const { data, error } = await supabase.rpc('toggle_mod_available', { p_available: available });
      if (error) throw error;
      currentProfile.mod_available = available;
      _notify(currentUser, currentProfile);
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function submitReference(debateId, url, description, supportsSide) {
    if (isPlaceholderMode) return { success: true, reference_id: 'placeholder-ref-' + Date.now() };
    try {
      const { data, error } = await supabase.rpc('submit_reference', {
        p_debate_id: debateId,
        p_url: url || null,
        p_description: description || null,
        p_supports_side: supportsSide || null,
      });
      if (error) throw error;
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function ruleOnReference(referenceId, ruling, reason, ruledByType) {
    if (isPlaceholderMode) return { success: true };
    try {
      const { data, error } = await supabase.rpc('rule_on_reference', {
        p_reference_id: referenceId,
        p_ruling: ruling,
        p_reason: reason || null,
        p_ruled_by_type: ruledByType || 'human',
      });
      if (error) throw error;
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function scoreModerator(debateId, score) {
    if (isPlaceholderMode) return { success: true };
    try {
      const { data, error } = await supabase.rpc('score_moderator', {
        p_debate_id: debateId,
        p_score: score,
      });
      if (error) throw error;
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function assignModerator(debateId, moderatorId, moderatorType) {
    if (isPlaceholderMode) return { success: true, moderator_type: moderatorType || 'ai' };
    try {
      const { data, error } = await supabase.rpc('assign_moderator', {
        p_debate_id: debateId,
        p_moderator_id: moderatorId || null,
        p_moderator_type: moderatorType || 'human',
      });
      if (error) throw error;
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function getAvailableModerators(excludeIds) {
    if (isPlaceholderMode) return [
      { id: 'mod-1', display_name: 'FairJudge', mod_rating: 82, mod_debates_total: 15, mod_approval_pct: 78 },
      { id: 'mod-2', display_name: 'NeutralMod', mod_rating: 71, mod_debates_total: 8, mod_approval_pct: 65 },
    ];
    try {
      const { data, error } = await supabase.rpc('get_available_moderators', {
        p_exclude_ids: excludeIds || [],
      });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getAvailableModerators error:', e);
      return [];
    }
  }

  async function getDebateReferences(debateId) {
    if (isPlaceholderMode) return [];
    try {
      const { data, error } = await supabase.rpc('get_debate_references', {
        p_debate_id: debateId,
      });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getDebateReferences error:', e);
      return [];
    }
  }

  // --- SESSION 47: safeRpc — 401 recovery wrapper ---
  // Replaces direct supabase.rpc() calls app-wide.
  // On 401/PGRST301: refreshes session once, retries the call.
  // On refresh failure: triggers sign-out so user lands on login page.
  // Usage: const { data, error } = await ColosseumAuth.safeRpc('fn_name', { args });
  async function safeRpc(fnName, args = {}) {
    if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

    const attempt = async () => supabase.rpc(fnName, args);

    let result = await attempt();

    // 401 or JWT-expired error codes
    const is401 = result.error && (
      result.error.status === 401 ||
      result.error.code === 'PGRST301' ||
      (result.error.message || '').toLowerCase().includes('jwt expired')
    );

    if (is401) {
      console.warn('safeRpc: 401 on', fnName, '— attempting token refresh');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('safeRpc: refresh failed, signing out', refreshError);
        // Don't await — kicks off sign-out without blocking caller
        supabase.auth.signOut();
        return { data: null, error: refreshError };
      }
      // Retry once with fresh token
      result = await attempt();
    }

    return result;
  }

  // --- Observer Pattern ---
  function onChange(fn) {
    listeners.push(fn);
    if (currentUser || currentProfile) fn(currentUser, currentProfile);
  }

  function _notify(user, profile) {
    listeners.forEach(fn => {
      try { fn(user, profile); } catch (e) { console.error('Auth listener error:', e); }
    });
  }

  // --- Auto-init on load ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // --- Public API ---
  return {
    get currentUser() { return currentUser; },
    get currentProfile() { return currentProfile; },
    get isPlaceholderMode() { return isPlaceholderMode; },
    get supabase() { return supabase; },
    ready: readyPromise, // SESSION 23: await ColosseumAuth.ready before rendering
    init,
    signUp,
    logIn,
    oauthLogin,
    logOut,
    resetPassword,
    updatePassword,
    updateProfile,
    deleteAccount,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowCounts,    // SESSION 23
    getPublicProfile,   // SESSION 23
    declareRival,       // SESSION 23
    respondRival,       // SESSION 23
    getMyRivals,        // SESSION 23
    showUserProfile,    // SESSION 23
    toggleModerator,    // SESSION 39
    toggleModAvailable, // SESSION 39
    submitReference,    // SESSION 39
    ruleOnReference,    // SESSION 39
    scoreModerator,     // SESSION 39
    assignModerator,    // SESSION 39
    getAvailableModerators, // SESSION 39
    getDebateReferences,    // SESSION 39
    safeRpc,                // SESSION 47
    onChange,
    _notify,
  };

})();
