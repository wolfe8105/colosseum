// ============================================================
// COLOSSEUM CONFIG — Central Configuration (Item 6.2.2.5)
// Every credential, every feature flag, one file.
// PASTE HERE markers = functional placeholders for human action.
// App runs in placeholder mode when credentials are missing.
//
// SESSION 23: Added feature flags for rivals, followsUI, predictionsUI
// SESSION 24: Added arena feature flag, version bump to 2.2.0
// SESSION 60: Added showToast(), friendlyError() — Area 3 polish
// ============================================================

window.ColosseumConfig = (() => {

  // ========== SUPABASE (Item 14.4.6.1) ==========
  const SUPABASE_URL = 'https://faomczmipsccwbhpivmp.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb21jem1pcHNjY3diaHBpdm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTM4NzIsImV4cCI6MjA4Nzc2OTg3Mn0.d11AoWVu074DHo3vjVNNOA-1DT8KaoAXF340ysLoHYI';

  // ========== STRIPE (Item 14.11.3.4) ==========
  const STRIPE_PUBLISHABLE_KEY = 'pk_test_51T5T9uPuHT2VlOoCgqdUqtvuez0QHuN9dKcFtYOsclcsjSoSHce8ROcw6zzF5JhPeNkiJK8cJ8DCrB8FU9jhEHwk00GAYHTzzi';

  const STRIPE_PRICES = {
    contender_monthly:  'price_1T5THJPuHT2VlOoCYoDarYU5',
    champion_monthly:   'price_1T5THwPuHT2VlOoCQ6TQRBlN',
    creator_monthly:    'price_1T5TIDPuHT2VlOoCyuKuiBmx',
    tokens_50:          'price_1T5TIoPuHT2VlOoCgsNvdHdl',
    tokens_250:         'price_1T5TJ9PuHT2VlOoCahIFWQud',
    tokens_600:         'price_1T5TJXPuHT2VlOoCmk8lPXDF',
    tokens_1800:        'price_1T5TJxPuHT2VlOoCI55lrhHp',
  };

  const STRIPE_FUNCTION_URL = 'https://faomczmipsccwbhpivmp.supabase.co/functions/v1/create-checkout-session';

  // ========== WEBRTC / SIGNALING (Item 14.11.3.9) ==========
  const SIGNALING_SERVER_URL = null;

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // ========== DEEPGRAM (Item 14.11.2.5) ==========
  const DEEPGRAM_API_KEY = 'PASTE_YOUR_DEEPGRAM_API_KEY_HERE';

  // ========== APP SETTINGS ==========
  const APP = {
    name: 'The Colosseum',
    tagline: 'Where opinions fight.',
    version: '2.2.0',
    baseUrl: 'https://colosseum-six.vercel.app',
  };

  // ========== SUBSCRIPTION TIERS (Items 14.2.3) ==========
  const TIERS = {
    free:       { name: 'Lurker',     price: 0,     tokensPerDay: 10, ads: true,  features: ['basic_debates', 'spectate', 'vote', 'hot_takes', 'follow'] },
    contender:  { name: 'Contender',  price: 9.99,  tokensPerDay: 30, ads: false, features: ['all_free', 'custom_themes', 'priority_match', 'extended_stats'] },
    champion:   { name: 'Champion',   price: 19.99, tokensPerDay: 60, ads: false, features: ['all_contender', 'exclusive_cosmetics', 'private_rooms', 'analytics', 'recordings'] },
    creator:    { name: 'Creator',    price: 29.99, tokensPerDay: 100, ads: false, features: ['all_champion', 'creator_tools', 'revenue_share', 'early_access', 'overlays'] },
  };

  // ========== TOKEN ECONOMY (Items 14.2.4) ==========
  const TOKENS = {
    packages: [
      { id: 'tokens_50',   amount: 50,   price: 0.99 },
      { id: 'tokens_250',  amount: 250,  price: 3.99 },
      { id: 'tokens_600',  amount: 600,  price: 7.99 },
      { id: 'tokens_1800', amount: 1800, price: 19.99 },
    ],
    earning: {
      dailyLogin: 1,
      challenge: 3,
      firstWin: 2,
      streak3: 5,
      streak5: 10,
      streak10: 25,
      referral: 10,
      modWork: 2,
    },
    referralCap: 50,
  };

  // ========== DEBATE SETTINGS (Items 14.3.1-14.3.2) ==========
  const DEBATE = {
    roundDurationSec: 120,
    breakDurationSec: 30,
    defaultRounds: 5,
    maxSpectators: 500,
    minEloForRanked: 1000,
    startingElo: 1200,
    formats: ['standard', 'crossfire', 'qa_prep'],
  };

  // ========== FEATURE FLAGS (gradual rollout) ==========
  const FEATURES = {
    liveDebates: true,
    asyncDebates: true,
    hotTakes: true,
    predictions: true,        // Predictions core logic
    predictionsUI: true,      // SESSION 23: Predictions UI in feeds
    cosmetics: true,
    leaderboard: true,
    notifications: true,
    shareLinks: true,
    profileDepth: true,
    voiceMemo: true,
    followsUI: true,          // SESSION 23: Follow counts + user profile modal
    rivals: true,             // SESSION 23: Hated Rivals mechanic
    arena: true,              // SESSION 24: Full arena — lobby, matchmaking, 4 debate modes
    aiSparring: true,  // SESSION 64 FIX: was false, NT confirms AI Sparring is live
    recording: false,
    pushNotifications: false,
    dms: false,
    teams: false,
    tournaments: false,
  };

  // ========== TOPIC SECTIONS (Items 8.4, 14.6.7) ==========
  // SESSION 64 FIX: Added couples + music to match spoke carousel in index.html
  const SECTIONS = [
    { id: 'politics',      name: 'THE FLOOR',        icon: '🏛️', tier: 1 },
    { id: 'sports',        name: 'THE PRESSBOX',      icon: '🏟️', tier: 1 },
    { id: 'entertainment', name: 'THE SPOTLIGHT',     icon: '🎬', tier: 2 },
    { id: 'couples',       name: 'COUPLES COURT',     icon: '💔', tier: 2 },
    { id: 'trending',      name: 'THE FIRE',          icon: '🔥', tier: 1 },
    { id: 'music',         name: 'THE STAGE',         icon: '🎵', tier: 3 },
  ];

  // ========== XSS PROTECTION ==========
  // Use this whenever rendering user-supplied text into innerHTML / template literals.
  // The textContent round-trip is the same pattern used in colosseum-arena.js sanitize().
  function escapeHTML(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  // ========== GLOBAL TOAST — SESSION 60 ==========
  // Replaces scattered inline toast creators across all modules.
  // Usage: ColosseumConfig.showToast('Message', 'success')
  // Types: 'success' (gold), 'error' (red), 'info' (neutral)
  let _toastTimeout = null;
  function showToast(msg, type = 'info') {
    // Remove any existing toast
    const old = document.getElementById('colo-toast');
    if (old) old.remove();
    if (_toastTimeout) { clearTimeout(_toastTimeout); _toastTimeout = null; }

    const colors = {
      success: { bg: '#d4a843', text: '#0a1628' },
      error:   { bg: '#cc2936', text: '#ffffff' },
      info:    { bg: 'rgba(26,45,74,0.95)', text: '#f0f0f0' },
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.id = 'colo-toast';
    toast.setAttribute('role', 'alert');
    toast.style.cssText = [
      'position:fixed',
      'top:80px',
      'left:50%',
      'transform:translateX(-50%)',
      `background:${c.bg}`,
      `color:${c.text}`,
      'padding:12px 24px',
      'border-radius:8px',
      'font-family:"Barlow Condensed",sans-serif',
      'font-weight:700',
      'font-size:14px',
      'letter-spacing:0.5px',
      'z-index:99999',
      'max-width:90vw',
      'text-align:center',
      'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
      'border:1px solid rgba(255,255,255,0.1)',
      'animation:coloToastIn 0.25s ease',
    ].join(';');
    toast.textContent = msg;

    document.body.appendChild(toast);

    const duration = type === 'error' ? 4000 : 2500;
    _toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ========== FRIENDLY ERROR MAP — SESSION 60 ==========
  // Translates raw Supabase/network/auth errors into human-friendly copy.
  // Usage: ColosseumConfig.friendlyError(error)
  // Accepts: Error object, string, or { message, code, status } from Supabase
  function friendlyError(err) {
    if (!err) return 'Something went sideways. Give it another shot.';

    const msg = (typeof err === 'string' ? err : (err.message || err.msg || '')).toLowerCase();
    const code = err.code || '';
    const status = err.status || 0;

    // Rate limit
    if (msg.includes('rate') || msg.includes('too many') || code === '429' || status === 429) {
      return 'Easy there, gladiator. Try again in a few seconds.';
    }

    // Auth / JWT
    if (msg.includes('jwt expired') || code === 'PGRST301' || status === 401) {
      return 'Session timed out. Signing you back in...';
    }
    if (msg.includes('invalid login') || msg.includes('invalid email or password')) {
      return 'Wrong email or password. Double-check and try again.';
    }
    if (msg.includes('email already registered') || msg.includes('already been registered')) {
      return 'That email is already taken. Try logging in instead.';
    }
    if (msg.includes('user not found')) {
      return 'No account found with that email.';
    }

    // Duplicate / unique constraint
    if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists')) {
      return "You're already in. No need to double up.";
    }

    // Network
    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('dns') || msg.includes('econnrefused')) {
      return 'Connection lost. Check your signal and try again.';
    }
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) {
      return 'That took too long. Tap to try again.';
    }

    // Supabase down / 5xx
    if (status >= 500) {
      return 'Servers are having a moment. Try again shortly.';
    }

    // Permission
    if (msg.includes('permission denied') || msg.includes('not authorized') || status === 403) {
      return "You don't have access to that. Log in or level up.";
    }

    // Mic / media
    if (msg.includes('permission') && (msg.includes('mic') || msg.includes('audio') || msg.includes('media'))) {
      return 'Mic access blocked. Check your browser settings.';
    }

    // Stripe
    if (msg.includes('card') && (msg.includes('declined') || msg.includes('insufficient'))) {
      return 'Payment failed. Check your card and try again.';
    }

    // Fallback
    return 'Something went sideways. Give it another shot.';
  }

  // ========== PLACEHOLDER DETECTION ==========
  function isPlaceholder(val) {
    return typeof val === 'string' && (val.startsWith('PASTE_') || val.includes('PASTE_HERE'));
  }

  const placeholderMode = {
    supabase: isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY),
    stripe: isPlaceholder(STRIPE_PUBLISHABLE_KEY),
    stripeFunction: isPlaceholder(STRIPE_FUNCTION_URL),
    signaling: false,
    deepgram: isPlaceholder(DEEPGRAM_API_KEY),
  };

  const isAnyPlaceholder = placeholderMode.supabase || placeholderMode.stripe;

  if (isAnyPlaceholder) {
    console.warn(
      '%c⚠️ COLOSSEUM: Running in placeholder mode',
      'color: #d4a843; font-weight: bold; font-size: 14px;',
      '\nMissing credentials:',
      Object.entries(placeholderMode).filter(([,v]) => v).map(([k]) => k).join(', '),
      '\nSee colosseum-config.js and DEPLOYMENT-GUIDE.md'
    );
  }

  // ========== PUBLIC API ==========
  return {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    STRIPE_PUBLISHABLE_KEY,
    STRIPE_PRICES,
    STRIPE_FUNCTION_URL,
    SIGNALING_SERVER_URL,
    ICE_SERVERS,
    DEEPGRAM_API_KEY,
    APP,
    TIERS,
    TOKENS,
    DEBATE,
    FEATURES,
    SECTIONS,
    placeholderMode,
    isAnyPlaceholder,
    isPlaceholder,
    escapeHTML,
    showToast,       // SESSION 60
    friendlyError,   // SESSION 60
  };

})();
