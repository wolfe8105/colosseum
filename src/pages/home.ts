/**
 * THE MODERATOR — Home Page Controller (TypeScript)
 *
 * Runtime module — entry point for index.html via Vite.
 * Card feed (hot takes + live debates), category overlays,
 * pull-to-refresh, shop screen, leaderboard, predictions.
 *
 * Session 201: Replaced LCARS ring nav with card feed.
 * Ring/spoke/LCARS code fully removed. Feed renders hot takes
 * from all categories + live debate cards into #screen-home.
 */
// --- ES imports (all window globals eliminated) ---
import type { User } from '@supabase/supabase-js';
import { onChange, getCurrentUser, getCurrentProfile, getIsPlaceholderMode, getSupabaseClient, logOut, getFollowCounts, getFollowers, getFollowing, showUserProfile, updateProfile, requireAuth, ready, safeRpc } from '../auth.ts';
import type { Profile } from '../auth.ts';
import { showToast, escapeHTML } from '../config.ts';

/** Shape of entries in the CATEGORIES array */
interface Category {
  id: string;
  icon: string;
  label: string;
  section: string;
  count: string;
  hasLive: boolean;
}
import '../tokens.ts';
import { ModeratorAsync } from '../async.ts';
import { shareProfile, inviteFriend } from '../share.ts';
import { subscribe } from '../payments.ts';
import { destroy as destroyArena } from '../arena.ts';
import { registerNavigate } from '../navigation.ts';

// --- Side-effect imports ---
import { showPowerUpShop } from '../arena.ts';
import { init as initRivalsPresence, destroy as destroyRivalsPresence } from '../rivals-presence.ts';
import '../notifications.ts';
import '../leaderboard.ts';
import '../scoring.ts';
import '../tiers.ts';
import '../paywall.ts';
import '../cards.ts';
import '../analytics.ts';
import { showForgeForm, renderArsenal, renderLibrary, verifyReference, ArsenalReference } from '../reference-arsenal.ts';

// ============================================================
// CATEGORIES (used by openCategory, ?cat= param)
// ============================================================

const CATEGORIES: Category[]=[
  {id:'politics',icon:'🏛️',label:'Politics',section:'THE FLOOR',count:'3 Live',hasLive:true},
  {id:'sports',icon:'🏈',label:'Sports',section:'THE PRESSBOX',count:'7 Live',hasLive:true},
  {id:'entertainment',icon:'🎬',label:'Film & TV',section:'THE SPOTLIGHT',count:'2 Live',hasLive:true},
  {id:'couples',icon:'💔',label:"Couples\nCourt",section:'COUPLES COURT',count:'5 Live',hasLive:true},
  {id:'trending',icon:'🔥',label:'Trending',section:'THE FIRE',count:'12 Hot',hasLive:false},
  {id:'music',icon:'🎵',label:'Music',section:'THE STAGE',count:'1 Live',hasLive:true},
];

const homeScreen=document.getElementById('screen-home');
const overlay=document.getElementById('categoryOverlay');
const overlayTitle=document.getElementById('overlayTitle');
const overlayContent=document.getElementById('overlayContent');
const overlayClose=document.getElementById('overlayClose');


// ============================================================
// FEED — Render hot takes + live debates into #screen-home
// ============================================================

interface LiveDebate {
  id: string;
  topic: string;
  category: string;
  status: string;
  mode: string;
  spectator_count: number;
  current_round: number;
  max_rounds: number;
  debater_a_name?: string;
  debater_b_name?: string;
}

async function renderFeed(): Promise<void> {
  if (!homeScreen) return;

  // Build feed container if not already there
  let feedEl = document.getElementById('home-feed-container');
  if (!feedEl) {
    feedEl = document.createElement('div');
    feedEl.id = 'home-feed-container';
    feedEl.style.cssText = 'width:100%;';
    homeScreen.appendChild(feedEl);
  }

  // Show loading state
  feedEl.innerHTML = '<div style="text-align:center;padding:30px;"><div class="loading-spinner" style="margin:0 auto;"></div></div>';

  // Fetch live debates
  const liveDebates = await fetchLiveDebates();

  // Fetch hot takes (populates internal state in async.ts)
  await ModeratorAsync.fetchTakes();

  // Build feed HTML: live debates first, then hot takes container
  let html = '';

  // Live debate cards
  for (const d of liveDebates) {
    const catLabel = (d.category || 'General').toUpperCase();
    html += `
      <div class="mod-card mod-card-live" style="margin-bottom:12px;">
        <div class="gloss"></div>
        <span class="mod-live-badge">LIVE</span>
        <div class="mod-card-category">${escapeHTML(catLabel)}</div>
        <div class="mod-card-vs">
          <span class="mod-debater">${escapeHTML(d.debater_a_name || 'Debater A')}</span>
          <span class="mod-vs-text">VS</span>
          <span class="mod-debater">${escapeHTML(d.debater_b_name || 'Debater B')}</span>
        </div>
        <div class="mod-card-text" style="text-transform:none;">${escapeHTML(d.topic || 'Live Debate')}</div>
        <div class="mod-card-meta">${d.spectator_count || 0} watching · Round ${d.current_round || 1} of ${d.max_rounds || 5}</div>
        <button class="mod-spectate-btn" data-action="spectate-live" data-debate-id="${escapeHTML(d.id)}">Watch Live</button>
      </div>`;
  }

  // Hot takes feed container — loadHotTakes renders into this
  html += '<div id="hot-takes-feed"></div>';

  feedEl.innerHTML = html;

  // Render hot takes into #hot-takes-feed
  ModeratorAsync.loadHotTakes('all');
}

async function fetchLiveDebates(): Promise<LiveDebate[]> {
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return [];
  try {
    const { data, error } = await (sb as any)
      .from('arena_debates')
      .select('id, topic, category, status, mode, spectator_count, current_round, max_rounds, debater_a_profile:profiles!arena_debates_debater_a_fkey(display_name, username), debater_b_profile:profiles!arena_debates_debater_b_fkey(display_name, username)')
      .in('status', ['live', 'round_break', 'voting'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      topic: d.topic,
      category: d.category,
      status: d.status,
      mode: d.mode,
      spectator_count: d.spectator_count || 0,
      current_round: d.current_round || 1,
      max_rounds: d.max_rounds || 5,
      debater_a_name: d.debater_a_profile?.display_name || d.debater_a_profile?.username || 'Debater A',
      debater_b_name: d.debater_b_profile?.display_name || d.debater_b_profile?.username || 'Debater B',
    }));
  } catch (e) {
    console.error('fetchLiveDebates error:', e);
    return [];
  }
}


// ============================================================
// CATEGORY OVERLAY
// ============================================================

// --- Helper: open category overlay with specific tab ---
function openCategoryTab(catId: string, tab: string) {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return;
  openCategory(cat);
  setTimeout(() => {
    const tabEl = document.querySelector(`.overlay-tab[data-tab="${tab}"]`) as HTMLElement | null;
    if (tabEl) tabEl.click();
  }, 50);
}

// --- Category Overlay (async, tabbed: Takes + Predictions) ---
let currentOverlayCat: Category | null = null;
async function openCategory(cat: Category){
  currentOverlayCat = cat;
  overlayTitle.textContent = cat.section || cat.label.replace('\n',' ');

  const takesTab = document.getElementById('overlay-takes-tab');
  const predsTab = document.getElementById('overlay-predictions-tab');
  takesTab.style.display = '';
  predsTab.style.display = 'none';
  document.querySelectorAll('.overlay-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.overlay-tab[data-tab="takes"]')?.classList.add('active');

  takesTab.innerHTML = '<div style="text-align:center;padding:30px;"><div class="loading-spinner" style="margin:0 auto;"></div></div>';
  predsTab.innerHTML = '';

  overlay.classList.add('open');

  try {
    await ModeratorAsync.fetchTakes(cat.id);
    takesTab.innerHTML = ModeratorAsync.getComposerHTML();
    const feedDiv = document.createElement('div');
    feedDiv.id = 'hot-takes-feed';
    takesTab.appendChild(feedDiv);
    ModeratorAsync.loadHotTakes(cat.id);

    const input = document.getElementById('hot-take-input');
    const counter = document.getElementById('take-char-count');
    if (input && counter) {
      input.addEventListener('input', () => {
        counter.textContent = input.value.length + ' / 280';
      });
    }
  } catch(e) {
    takesTab.innerHTML = '<div class="placeholder-text"><span class="emoji">⚠️</span>Failed to load hot takes. Pull down to retry.</div>';
  }

  try {
    await ModeratorAsync.fetchPredictions();
    await ModeratorAsync.fetchStandaloneQuestions?.();
    ModeratorAsync.renderPredictions(predsTab);
  } catch(e) {
    predsTab.innerHTML = '<div class="placeholder-text"><span class="emoji">⚠️</span>Failed to load predictions.</div>';
  }
}

// Overlay tab switching
document.getElementById('overlayTabs')?.addEventListener('click', (e) => {
  const tab = (e.target as HTMLElement).closest('.overlay-tab');
  if (!tab) return;
  const tabName = (tab as HTMLElement).dataset.tab;
  document.querySelectorAll('.overlay-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById('overlay-takes-tab').style.display = tabName === 'takes' ? '' : 'none';
  document.getElementById('overlay-predictions-tab').style.display = tabName === 'predictions' ? '' : 'none';
});

overlayClose.addEventListener('click',()=>{overlay.classList.remove('open');});
let overlayStartY=0;
overlay.addEventListener('touchstart',(e)=>{overlayStartY=e.touches[0].clientY;},{passive:true});
overlay.addEventListener('touchend',(e)=>{if(e.changedTouches[0].clientY-overlayStartY>100)overlay.classList.remove('open');});


// ============================================================
// PULL TO REFRESH (tied to category overlay content area)
// ============================================================
(function initPullToRefresh(){
  const PTR_THRESHOLD = 64;
  const PTR_MAX = 90;
  let ptrStartY = 0, ptrDragging = false, ptrTriggered = false;

  const ptr = document.createElement('div');
  ptr.id = 'ptr-indicator';
  ptr.innerHTML = '<div class="ptr-spinner"></div><span class="ptr-label">Release to refresh</span>';
  ptr.style.cssText = [
    'position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:center;',
    'gap:8px;padding:12px;opacity:0;transform:translateY(-100%);transition:opacity 0.2s;',
    'pointer-events:none;z-index:10;color:var(--mod-cyan);font-size:13px;font-weight:600;letter-spacing:1px;'
  ].join('');
  overlayContent.style.position = 'relative';
  overlayContent.insertBefore(ptr, overlayContent.firstChild);

  const style = document.createElement('style');
  style.textContent = `
    #ptr-indicator { user-select:none; }
    .ptr-spinner { width:18px;height:18px;border-radius:50%;
      border:2px solid var(--mod-border-primary);
      border-top-color:var(--mod-cyan);
      animation:none; }
    .ptr-spinner.spinning { animation:ptrSpin 0.7s linear infinite; }
    @keyframes ptrSpin { to { transform:rotate(360deg); } }
  `;
  document.head.appendChild(style);

  overlayContent.addEventListener('touchstart', (e) => {
    if (overlayContent.scrollTop === 0) {
      ptrStartY = e.touches[0].clientY;
      ptrDragging = true;
      ptrTriggered = false;
    }
  }, { passive: true });

  overlayContent.addEventListener('touchmove', (e) => {
    if (!ptrDragging) return;
    const dy = Math.min(e.touches[0].clientY - ptrStartY, PTR_MAX);
    if (dy <= 0) { ptrDragging = false; return; }
    const progress = Math.min(dy / PTR_THRESHOLD, 1);
    ptr.style.opacity = String(progress);
    ptr.style.transform = `translateY(${dy - 100}%)`;
    (ptr.querySelector('.ptr-label') as HTMLElement).textContent = dy >= PTR_THRESHOLD ? 'Release to refresh' : 'Pull to refresh';
    ptrTriggered = dy >= PTR_THRESHOLD;
  }, { passive: true });

  overlayContent.addEventListener('touchend', async () => {
    if (!ptrDragging) return;
    ptrDragging = false;
    if (!ptrTriggered || !currentOverlayCat) {
      ptr.style.opacity = '0';
      ptr.style.transform = 'translateY(-100%)';
      return;
    }
    (ptr.querySelector('.ptr-label') as HTMLElement).textContent = 'Refreshing…';
    (ptr.querySelector('.ptr-spinner') as HTMLElement).classList.add('spinning');
    ptr.style.transform = 'translateY(0)';
    ptr.style.opacity = '1';
    try {
      await ModeratorAsync.fetchTakes(currentOverlayCat.id);
      ModeratorAsync.loadHotTakes(currentOverlayCat.id);
      await ModeratorAsync.fetchPredictions();
      await ModeratorAsync.fetchStandaloneQuestions?.();
      const predsTab = document.getElementById('overlay-predictions-tab');
      if (predsTab) ModeratorAsync.renderPredictions(predsTab);
    } catch(e) { console.warn('[Home] predictions render failed:', e); }
    (ptr.querySelector('.ptr-spinner') as HTMLElement).classList.remove('spinning');
    ptr.style.opacity = '0';
    ptr.style.transform = 'translateY(-100%)';
    ptrTriggered = false;
  });
})();


// ============================================================
// NAVIGATION
// ============================================================
const VALID_SCREENS=['home','arena','profile','shop','leaderboard','arsenal'];
let _currentScreen = 'home';
function navigateTo(screenId: string){
  if(!VALID_SCREENS.includes(screenId))screenId='home';

  // Clean up previous screen's resources
  if (_currentScreen === 'arena' && screenId !== 'arena') {
    destroyArena();
  }
  _currentScreen = screenId;

  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b=>b.classList.remove('active'));
  const screen=document.getElementById('screen-'+screenId);if(screen)screen.classList.add('active');
  const btn=document.querySelector(`.bottom-nav-btn[data-screen="${screenId}"]`);if(btn)btn.classList.add('active');

  // Refresh feed when returning to home
  if(screenId==='home'){
    renderFeed().catch(e => console.error('renderFeed error:', e));
  }
  if(screenId==='profile'){
    ModeratorAsync?.renderRivals?.(document.getElementById('rivals-feed'));
    loadFollowCounts();
  }
  if(screenId==='arsenal'){
    loadArsenalScreen();
  }
}
document.querySelectorAll('.bottom-nav-btn').forEach(btn=>{btn.addEventListener('click',()=>navigateTo((btn as HTMLElement).dataset.screen));});
registerNavigate(navigateTo);


// --- data-action wiring ---
document.addEventListener('click', (e: Event) => {
  const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'powerup-shop') {
    navigateTo('arena');
    setTimeout(() => showPowerUpShop(), 300);
  } else if (action === 'share-profile') {
    const p = getCurrentProfile();
    const u = getCurrentUser();
    shareProfile({ userId: u?.id, username: p?.username, displayName: p?.display_name, elo: p?.elo_rating, wins: p?.wins, losses: p?.losses, streak: p?.current_streak });
  } else if (action === 'invite-friend') {
    inviteFriend();
  } else if (action === 'subscribe') {
    const tier = el.dataset.tier;
    if (tier) subscribe(tier);
  } else if (action === 'arsenal') {
    navigateTo('arsenal');
  } else if (action === 'spectate-live') {
    const debateId = el.dataset.debateId;
    if (debateId) {
      window.location.href = `moderator-spectate.html?id=${encodeURIComponent(debateId)}`;
    }
  }
});


// ============================================================
// REFERENCE ARSENAL SCREEN
// ============================================================
let arsenalForgeCleanup: (() => void) | null = null;
let arsenalActiveTab = 'my-arsenal';
let arsenalRefs: ArsenalReference[] = [];

function loadArsenalScreen(): void {
  if (arsenalForgeCleanup) { arsenalForgeCleanup(); arsenalForgeCleanup = null; }
  const container = document.getElementById('arsenal-content');
  if (!container) return;
  arsenalActiveTab = 'my-arsenal';
  document.querySelectorAll('[data-arsenal-tab]').forEach(t => {
    t.classList.toggle('active', (t as HTMLElement).dataset.arsenalTab === 'my-arsenal');
  });
  loadMyArsenal(container);
}

async function loadMyArsenal(container: HTMLElement): Promise<void> {
  arsenalRefs = await renderArsenal(container);
  wireArsenalButtons(container);
}

async function loadLibrary(container: HTMLElement): Promise<void> {
  await renderLibrary(container, async (refId: string) => {
    await verifyReference(refId);
    await loadLibrary(container);
  });
}

function wireArsenalButtons(container: HTMLElement): void {
  const forgeBtn = container.querySelector('#arsenal-forge-btn') as HTMLElement | null;
  if (forgeBtn) {
    forgeBtn.addEventListener('click', () => {
      arsenalForgeCleanup = showForgeForm(
        container,
        (_refId: string) => { arsenalForgeCleanup = null; loadMyArsenal(container); },
        () => { arsenalForgeCleanup = null; loadMyArsenal(container); },
      );
    });
  }
  container.querySelectorAll('.ref-card-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const refId = (btn as HTMLElement).dataset.refId;
      if (!refId) return;
      const ref = arsenalRefs.find(r => r.id === refId);
      if (!ref) return;
      arsenalForgeCleanup = showForgeForm(
        container,
        (_editedId: string) => { arsenalForgeCleanup = null; loadMyArsenal(container); },
        () => { arsenalForgeCleanup = null; loadMyArsenal(container); },
        ref,
      );
    });
  });
}

document.getElementById('arsenal-back-btn')?.addEventListener('click', () => {
  if (arsenalForgeCleanup) { arsenalForgeCleanup(); arsenalForgeCleanup = null; }
  navigateTo('profile');
});

document.querySelectorAll('[data-arsenal-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = (tab as HTMLElement).dataset.arsenalTab;
    if (!tabId || tabId === arsenalActiveTab) return;
    if (arsenalForgeCleanup) { arsenalForgeCleanup(); arsenalForgeCleanup = null; }
    arsenalActiveTab = tabId;
    document.querySelectorAll('[data-arsenal-tab]').forEach(t => {
      t.classList.toggle('active', (t as HTMLElement).dataset.arsenalTab === tabId);
    });
    const container = document.getElementById('arsenal-content');
    if (!container) return;
    if (tabId === 'my-arsenal') { loadMyArsenal(container); }
    else if (tabId === 'library') { loadLibrary(container); }
  });
});


// ============================================================
// USER DROPDOWN
// ============================================================
const avatarBtn=document.getElementById('user-avatar-btn');
const dropdown=document.getElementById('user-dropdown');
avatarBtn.addEventListener('click',(e)=>{e.stopPropagation();dropdown.classList.toggle('open');});
document.addEventListener('click',()=>{dropdown.classList.remove('open');});

// --- Logout ---
document.getElementById('logout-btn').addEventListener('click',async()=>{
  await logOut();
  window.location.href='moderator-plinko.html';
});


// ============================================================
// FOLLOW COUNTS
// ============================================================
async function loadFollowCounts() {
  const user = getCurrentUser();
  if (!user?.id) return;
  try {
    const counts = await getFollowCounts(user.id);
    document.getElementById('profile-followers').textContent = String(counts.followers || 0);
    document.getElementById('profile-following').textContent = String(counts.following || 0);
  } catch(e) { console.warn('[Home] follow counts render failed:', e); }
}


// ============================================================
// AUTH STATE → UI
// ============================================================
function _renderAvatar(el: HTMLElement, profile: Profile){
  const url=profile.avatar_url||'';
  if(url.startsWith('emoji:')){
    const emoji=url.slice(6);
    el.textContent='';
    el.style.fontSize='32px';
    el.innerHTML=escapeHTML(emoji)+'<span class="avatar-hint">✏️</span>';
  } else {
    const initial=(profile.display_name||profile.username||'?')[0].toUpperCase();
    el.textContent='';
    el.style.fontSize='';
    el.innerHTML=escapeHTML(initial)+'<span class="avatar-hint">✏️</span>';
  }
}
function _renderNavAvatar(el: HTMLElement, profile: Profile){
  const url=profile.avatar_url||'';
  if(url.startsWith('emoji:')){
    el.textContent=url.slice(6);
    el.style.fontSize='18px';
  } else {
    el.textContent=(profile.display_name||profile.username||'?')[0].toUpperCase();
    el.style.fontSize='';
  }
}
function updateUIFromProfile(user: User | null, profile: Profile | null){
  if(!profile)return;
  _renderNavAvatar(document.getElementById('user-avatar-btn'),profile);
  _renderAvatar(document.getElementById('profile-avatar'),profile);
  document.getElementById('profile-display-name').textContent=(profile.display_name||profile.username||'GLADIATOR').toUpperCase();
  const tierLabels: Record<string, string>={free:'FREE TIER',contender:'CONTENDER',champion:'CHAMPION',creator:'CREATOR'};
  const tier=profile.subscription_tier||'free';
  document.getElementById('profile-tier').textContent=tierLabels[tier]||'FREE TIER';
  document.getElementById('dropdown-name').textContent=profile.display_name||profile.username||'Gladiator';
  document.getElementById('dropdown-tier').textContent=tierLabels[tier]||'Free Tier';
  document.getElementById('stat-elo').textContent=String(profile.elo_rating||1200);
  document.getElementById('stat-wins').textContent=String(profile.wins||0);
  document.getElementById('stat-losses').textContent=String(profile.losses||0);
  document.getElementById('stat-streak').textContent=String(profile.current_streak||0);
  document.getElementById('stat-debates').textContent=String(profile.debates_completed||0);
  document.getElementById('stat-tokens').textContent=(profile.token_balance||0).toLocaleString();
  document.getElementById('token-count').textContent=(profile.token_balance||0).toLocaleString();
  const shopBal=document.getElementById('shop-token-balance');if(shopBal)shopBal.textContent=(profile.token_balance||0).toLocaleString();
  const depth=profile.profile_depth_pct||0;
  (document.getElementById('profile-depth-fill') as HTMLElement).style.width=depth+'%';
  document.getElementById('profile-depth-text').innerHTML=`Profile ${depth}% complete — <a href="moderator-profile-depth.html" style="color:var(--mod-text-heading);">unlock rewards</a>`;

  // F-45: Desktop panel
  const dpName=document.getElementById('dp-name');if(dpName)dpName.textContent=(profile.display_name||profile.username||'GLADIATOR').toUpperCase();
  const dpTier=document.getElementById('dp-tier');if(dpTier)dpTier.textContent=tierLabels[tier]||'Free Tier';
  const dpAvatar=document.getElementById('dp-avatar');if(dpAvatar)dpAvatar.textContent=(profile.display_name||profile.username||'?')[0].toUpperCase();
  const dpElo=document.getElementById('dp-elo');if(dpElo)dpElo.textContent=String(profile.elo_rating||1200);
  const dpWins=document.getElementById('dp-wins');if(dpWins)dpWins.textContent=String(profile.wins||0);
  const dpLosses=document.getElementById('dp-losses');if(dpLosses)dpLosses.textContent=String(profile.losses||0);
  const dpStreak=document.getElementById('dp-streak');if(dpStreak)dpStreak.textContent=String(profile.current_streak||0);
  const dpTokens=document.getElementById('dp-tokens');if(dpTokens)dpTokens.textContent=(profile.token_balance||0).toLocaleString();
  const dpDepthFill=document.getElementById('dp-depth-fill') as HTMLElement|null;if(dpDepthFill)dpDepthFill.style.width=depth+'%';
  const dpDepthPct=document.getElementById('dp-depth-pct');if(dpDepthPct)dpDepthPct.textContent=depth+'% complete';
  const bioEl=document.getElementById('profile-bio-display');
  if(bioEl){
    const bio=profile.bio||'';
    if(bio.trim()){bioEl.textContent=bio;bioEl.classList.remove('placeholder');}
    else{bioEl.textContent='Tap to add bio';bioEl.classList.add('placeholder');}
  }
}
onChange(updateUIFromProfile);

// F-25: Rival online alerts — init on login, destroy on logout
onChange((user, profile) => {
  if (user && profile) {
    void initRivalsPresence();
  } else {
    destroyRivalsPresence();
  }
});


// ============================================================
// PROFILE DEPTH — Avatar picker, Bio edit, Follow list
// ============================================================

function _closeSheet(overlayEl: HTMLElement | null){if(overlayEl&&overlayEl.parentNode)overlayEl.remove();}

// --- 1. AVATAR EMOJI PICKER ---
const AVATAR_EMOJIS=['⚔️','🏛️','🔥','👑','🛡️','🎯','🦁','🐉','🦅','⚡','💀','🎭','🏆','🗡️','🌟','🐺','🦊','🎪','🧠','💎'];
document.getElementById('profile-avatar').addEventListener('click',()=>{
  document.getElementById('avatar-picker-sheet')?.remove();
  const currentUrl=getCurrentProfile()?.avatar_url||'';
  const currentEmoji=currentUrl.startsWith('emoji:')?currentUrl.slice(6):'';
  const sheetOverlay=document.createElement('div');
  sheetOverlay.id='avatar-picker-sheet';
  sheetOverlay.className='bottom-sheet-overlay';
  sheetOverlay.innerHTML=`
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">CHOOSE YOUR AVATAR</div>
      <div class="avatar-grid" id="avatar-grid">
        ${AVATAR_EMOJIS.map(e=>`<div class="avatar-option${e===currentEmoji?' selected':''}" data-emoji="${escapeHTML(e)}">${e}</div>`).join('')}
      </div>
    </div>`;
  sheetOverlay.addEventListener('click',(e)=>{if(e.target===sheetOverlay)_closeSheet(sheetOverlay);});
  sheetOverlay.querySelector('#avatar-grid').addEventListener('click',async(e)=>{
    const opt=(e.target as HTMLElement).closest('.avatar-option') as HTMLElement|null;
    if(!opt)return;
    const emoji=opt.dataset.emoji;
    sheetOverlay.querySelectorAll('.avatar-option').forEach(o=>o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.style.opacity='0.5';
    const result=await updateProfile({avatar_url:'emoji:'+emoji});
    opt.style.opacity='1';
    if(result?.success){
      _closeSheet(sheetOverlay);
      showToast('Avatar updated!','success');
    } else {
      showToast('Failed to save avatar','error');
    }
  });
  document.body.appendChild(sheetOverlay);
});

// --- 2. BIO INLINE EDIT ---
const bioDisplay=document.getElementById('profile-bio-display');
const bioEditPanel=document.getElementById('profile-bio-edit');
const bioTextarea=document.getElementById('profile-bio-textarea') as HTMLTextAreaElement;
const bioCharcount=document.getElementById('bio-charcount');
bioDisplay.addEventListener('click',()=>{
  const currentBio=getCurrentProfile()?.bio||'';
  bioTextarea.value=currentBio;
  bioCharcount.textContent=currentBio.length+'/500';
  bioDisplay.style.display='none';
  bioEditPanel.style.display='block';
  bioTextarea.focus();
});
bioTextarea.addEventListener('input',()=>{
  bioCharcount.textContent=bioTextarea.value.length+'/500';
});
document.getElementById('bio-cancel-btn').addEventListener('click',()=>{
  bioEditPanel.style.display='none';
  bioDisplay.style.display='';
});
document.getElementById('bio-save-btn').addEventListener('click',async()=>{
  const newBio=bioTextarea.value.trim();
  const saveBtn=document.getElementById('bio-save-btn');
  saveBtn.textContent='SAVING...';
  saveBtn.style.opacity='0.5';
  const result=await updateProfile({bio:newBio});
  saveBtn.textContent='SAVE';
  saveBtn.style.opacity='1';
  if(result?.success){
    bioEditPanel.style.display='none';
    bioDisplay.style.display='';
    if(newBio){bioDisplay.textContent=newBio;bioDisplay.classList.remove('placeholder');}
    else{bioDisplay.textContent='Tap to add bio';bioDisplay.classList.add('placeholder');}
    showToast('Bio updated!','success');
  } else {
    showToast('Failed to save bio','error');
  }
});

// --- 3. FOLLOW LIST MODAL ---
async function _openFollowList(type: string){
  document.getElementById('follow-list-sheet')?.remove();
  const userId=getCurrentUser()?.id;
  if(!userId)return;
  const followOverlay=document.createElement('div');
  followOverlay.id='follow-list-sheet';
  followOverlay.className='bottom-sheet-overlay';
  followOverlay.innerHTML=`
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">${type==='followers'?'FOLLOWERS':'FOLLOWING'}</div>
      <div id="follow-list-content" style="min-height:60px;display:flex;align-items:center;justify-content:center;">
        <div style="color:var(--mod-text-muted);font-size:13px;">Loading...</div>
      </div>
    </div>`;
  followOverlay.addEventListener('click',(e)=>{if(e.target===followOverlay)_closeSheet(followOverlay);});
  document.body.appendChild(followOverlay);

  const result=type==='followers'
    ? await getFollowers(userId)
    : await getFollowing(userId);
  const listEl=followOverlay.querySelector('#follow-list-content');
  if(!result?.success||!result.data?.length){
    listEl.innerHTML=`<div class="follow-list-empty">${type==='followers'?'No followers yet':'Not following anyone yet'}</div>`;
    return;
  }
  const items=result.data.map((row: any)=>{
    const profileData=type==='followers'
      ? row.profiles
      : row.profiles;
    if(!profileData)return '';
    const name=escapeHTML(profileData.display_name||profileData.username||'Unknown');
    const initial=escapeHTML((profileData.display_name||profileData.username||'?')[0].toUpperCase());
    const elo=Number(profileData.elo_rating)||1200;
    const uid=type==='followers'?row.follower_id:row.following_id;
    return `<div class="follow-list-item" data-user-id="${escapeHTML(uid)}" data-username="${escapeHTML(profileData.username||'')}">
      <div class="fl-avatar">${initial}</div>
      <div style="flex:1;min-width:0;">
        <div class="fl-name">${name}</div>
        <div class="fl-elo">ELO ${elo}</div>
      </div>
    </div>`;
  }).join('');
  listEl.innerHTML=items||`<div class="follow-list-empty">No users found</div>`;
  listEl.addEventListener('click',(e)=>{
    const item=(e.target as HTMLElement).closest('.follow-list-item') as HTMLElement|null;
    if(!item)return;
    _closeSheet(followOverlay);
    const uid=item.dataset.userId;
    const username=item.dataset.username;
    if(uid){ showUserProfile(uid); }
    else if(username){ window.location.href='/u/'+encodeURIComponent(username); }
  });
}
document.getElementById('followers-stat').addEventListener('click',()=>_openFollowList('followers'));
document.getElementById('following-stat').addEventListener('click',()=>_openFollowList('following'));


// ============================================================
// INIT — Members Zone assumes valid session
// ============================================================
async function appInit(){
  try {
    await Promise.race([
      ready,
      new Promise(r => setTimeout(r, 6000))
    ]);
  } catch(e) { console.warn('[Home] auth init failed:', e); }

  const loading=document.getElementById('loading-screen');
  if(loading){loading.classList.add('fade-out');setTimeout(()=>loading.remove(),400);}

  if(!getCurrentUser() && !getIsPlaceholderMode()){
    window.location.href='moderator-plinko.html';
    return;
  }

  if(getIsPlaceholderMode()){
    updateUIFromProfile(null,{display_name:'Debater',username:'debater',elo_rating:1200,wins:0,losses:0,current_streak:0,level:1,debates_completed:0,token_balance:50,subscription_tier:'free',profile_depth_pct:0} as any);
  }

  try{
    const urlScreen=new URLSearchParams(window.location.search).get('screen');
    if(urlScreen&&document.getElementById('screen-'+urlScreen)){navigateTo(urlScreen);}
  }catch(e){ console.warn('[Home] screen nav failed:', e); }

  loadFollowCounts();

  // Render card feed on home screen
  renderFeed().catch(e => console.error('renderFeed error:', e));
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>appInit().catch(e=>console.error('appInit error:',e)));}
else{appInit().catch(e=>console.error('appInit error:',e));}

// --- Payment toasts ---
const urlParams=new URLSearchParams(window.location.search);
if(urlParams.get('payment')==='success'){showToast('✅ Payment successful!','success');window.history.replaceState({},'',window.location.pathname);}
if(urlParams.get('payment')==='canceled'){showToast('Payment canceled.','info');window.history.replaceState({},'',window.location.pathname);}

// --- Auto-open category overlay from ?cat= query param ---
const catParam=urlParams.get('cat');
if(catParam){const matchedCat=CATEGORIES.find(c=>c.id===catParam);if(matchedCat){openCategory(matchedCat);window.history.replaceState({},'',window.location.pathname);}}
