// ============================================================
// COLOSSEUM AUTH — Authentication Module (Item 6.2.2.2)
// Supabase auth: signup, login, logout, OAuth, profile CRUD,
// follows, password reset, account deletion, session management.
// Placeholder mode when no Supabase credentials.
// ============================================================

window.ColosseumAuth = (() => {

  let supabase = null;
  let currentUser = null;
  let currentProfile = null;
  let listeners = [];
  let isPlaceholderMode = true;

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
      supabase = window.supabase.createClient(
        ColosseumConfig.SUPABASE_URL,
        ColosseumConfig.SUPABASE_ANON_KEY
      );
      isPlaceholderMode = false;
      _checkSession();
      _listenAuthChanges();
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
      created_at: new Date().toISOString(),
    };
    _notify(currentUser, currentProfile);
  }

  // --- Session ---
  async function _checkSession() {
    if (isPlaceholderMode) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        currentUser = session.user;
        await _loadProfile(session.user.id);
      }
    } catch (e) {
      console.error('ColosseumAuth: session check failed', e);
    }
  }

  function _listenAuthChanges() {
    if (!supabase) return;
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        currentUser = session.user;
        await _loadProfile(session.user.id);
      } else if (event === 'PASSWORD_RECOVERY' && session?.user) {
        currentUser = session.user;
        _notify(currentUser, currentProfile);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentProfile = null;
        _notify(null, null);
      }
    });
  }

  // --- Profile ---
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

      // Create profile row (trigger should handle this, but belt & suspenders)
      if (data.user) {
        const isMinor = _calcAge(dob) < 18;
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: username,
          display_name: displayName,
          date_of_birth: dob,
          is_minor: isMinor,
          elo_rating: 1200,
          token_balance: 50,
          trust_score: 50,
          subscription_tier: 'free',
          level: 1,
          xp: 0,
        });
      }

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
        provider, // 'google' or 'apple'
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
      await supabase.auth.signOut();
      currentUser = null;
      currentProfile = null;
      _notify(null, null);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Password Reset (Item 14.4.1.9) ---
  async function resetPassword(email) {
    if (isPlaceholderMode) {
      console.log('[Placeholder] resetPassword called:', email);
      return { success: true, placeholder: true };
    }

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
    if (isPlaceholderMode) {
      console.log('[Placeholder] updatePassword called');
      return { success: true, placeholder: true };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Update Profile ---
  async function updateProfile(updates) {
    if (isPlaceholderMode) {
      Object.assign(currentProfile, updates);
      _notify(currentUser, currentProfile);
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);
      if (error) throw error;
      Object.assign(currentProfile, updates);
      _notify(currentUser, currentProfile);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Delete Account (Item 14.4.1.10) ---
  async function deleteAccount() {
    if (isPlaceholderMode) {
      console.log('[Placeholder] deleteAccount called');
      return { success: true };
    }

    try {
      // Soft delete: mark profile as deleted
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

  // --- Follow System (Items 14.5.1.1, 14.5.1.2) ---
  async function followUser(targetUserId) {
    if (isPlaceholderMode) {
      console.log('[Placeholder] followUser:', targetUserId);
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: targetUserId });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function unfollowUser(targetUserId) {
    if (isPlaceholderMode) return { success: true };

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

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

  // --- Helpers ---
  function _calcAge(dob) {
    if (!dob) return 99;
    const d = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
    return age;
  }

  // --- Observer Pattern ---
  function onChange(fn) {
    listeners.push(fn);
    // Immediately fire with current state
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
    onChange,
    _notify,
  };

})();
