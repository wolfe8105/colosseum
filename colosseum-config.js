// ============================================================
// COLOSSEUM CONFIG — Central Configuration (Item 6.2.2.5)
// Every credential, every feature flag, one file.
// PASTE HERE markers = functional placeholders for human action.
// App runs in placeholder mode when credentials are missing.
// ============================================================

window.ColosseumConfig = (() => {

  // ========== SUPABASE (Item 14.4.6.1) ==========
  // Human: go to supabase.com → New Project → Settings → API
  // Copy your URL and anon key, replace the PASTE HERE values.
  const SUPABASE_URL = 'https://faomczmipsccwbhpivmp.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb21jem1pcHNjY3diaHBpdm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTM4NzIsImV4cCI6MjA4Nzc2OTg3Mn0.d11AoWVu074DHo3vjVNNOA-1DT8KaoAXF340ysLoHYI';

  // ========== STRIPE (Item 14.11.3.4) ==========
  // Human: go to stripe.com → Developers → API Keys
  // Copy your publishable key (starts with pk_)
  const STRIPE_PUBLISHABLE_KEY = 'PASTE_YOUR_STRIPE_PUBLISHABLE_KEY_HERE';

  // Stripe Price IDs — create products in Stripe Dashboard → Products
  // Then copy each price ID (starts with price_)
  const STRIPE_PRICES = {
    contender_monthly:  'PASTE_STRIPE_PRICE_ID_CONTENDER_MONTHLY',
    champion_monthly:   'PASTE_STRIPE_PRICE_ID_CHAMPION_MONTHLY',
    creator_monthly:    'PASTE_STRIPE_PRICE_ID_CREATOR_MONTHLY',
    tokens_50:          'PASTE_STRIPE_PRICE_ID_TOKENS_50',
    tokens_250:         'PASTE_STRIPE_PRICE_ID_TOKENS_250',
    tokens_600:         'PASTE_STRIPE_PRICE_ID_TOKENS_600',
    tokens_1800:        'PASTE_STRIPE_PRICE_ID_TOKENS_1800',
  };

  // Stripe Edge Function URL (deployed to Supabase Functions)
  const STRIPE_FUNCTION_URL = 'PASTE_YOUR_STRIPE_FUNCTION_URL_HERE';

  // ========== WEBRTC / SIGNALING (Item 14.11.3.9) ==========
  // Signaling handled by Supabase Realtime channels — no separate server needed.
  // This URL is reserved for future use (e.g., dedicated TURN relay or SFU).
  const SIGNALING_SERVER_URL = null; // Uses Supabase Realtime

  // TURN/STUN servers for WebRTC
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Human: if you set up a TURN server, add it here:
    // { urls: 'turn:YOUR_TURN_SERVER', username: 'PASTE_HERE', credential: 'PASTE_HERE' }
  ];

  // ========== DEEPGRAM (Item 14.11.2.5) ==========
  // Human: sign up at deepgram.com → copy API key
  // Used for speech-to-text transcription during debates
  const DEEPGRAM_API_KEY = 'PASTE_YOUR_DEEPGRAM_API_KEY_HERE';

  // ========== APP SETTINGS ==========
  const APP = {
    name: 'The Colosseum',
    tagline: 'Where opinions fight.',
    version: '2.0.0',
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
    referralCap: 50, // per month
  };

  // ========== DEBATE SETTINGS (Items 14.3.1-14.3.2) ==========
  const DEBATE = {
    roundDurationSec: 120,      // 2 minutes
    breakDurationSec: 30,       // 30 seconds between rounds
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
    predictions: true,
    cosmetics: true,
    leaderboard: true,
    notifications: true,
    shareLinks: true,
    profileDepth: true,
    voiceMemo: true,         // Item 14.3.3.2 — BUILT
    aiSparring: false,       // Item 14.3.3.3 — not yet built
    recording: false,        // Item 14.7.6.1 — not yet built
    pushNotifications: false, // Item 14.5.2.2 — not yet built
    dms: false,              // Item 14.5.4 — not yet built
    teams: false,            // Item 14.5.6 — not yet built
    tournaments: false,      // Item 14.8.7 — not yet built
  };

  // ========== TOPIC SECTIONS (Items 8.4, 14.6.7) ==========
  const SECTIONS = [
    { id: 'politics',      name: 'THE FLOOR',     icon: '🏛️', tier: 1 },
    { id: 'sports',        name: 'THE PRESSBOX',   icon: '🏟️', tier: 1 },
    { id: 'entertainment', name: 'THE SPOTLIGHT',  icon: '🎬', tier: 2 },
    { id: 'trending',      name: 'THE FIRE',       icon: '🔥', tier: 1 },
  ];

  // ========== PLACEHOLDER DETECTION ==========
  function isPlaceholder(val) {
    return typeof val === 'string' && (val.startsWith('PASTE_') || val.includes('PASTE_HERE'));
  }

  const placeholderMode = {
    supabase: isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY),
    stripe: isPlaceholder(STRIPE_PUBLISHABLE_KEY),
    signaling: false, // Uses Supabase Realtime, no separate server
    deepgram: isPlaceholder(DEEPGRAM_API_KEY),
  };

  // True if ANY critical service is placeholder
  const isAnyPlaceholder = placeholderMode.supabase || placeholderMode.stripe;

  // Console warning for dev
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
  };

})();
