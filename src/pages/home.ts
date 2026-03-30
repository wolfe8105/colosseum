/**
 * THE MODERATOR — Home Page Controller (TypeScript)
 *
 * Runtime module — entry point for index.html via Vite.
 * LCARS ring nav, category overlays, pull-to-refresh, activity indicators,
 * shop screen, hot takes feed wiring, leaderboard, predictions.
 *
 * Migration: Session 128 (Phase 4), Session 138 (cutover — auth/config/tokens use ES imports),
 *   Session 139 (ModeratorAsync ES import, 5 dead window globals removed,
 *     inline onclick handlers migrated to data-action + addEventListener),
 *   Session 142 (added side-effect imports for all 16 modules — removed
 *     legacy .js script tags from index.html)
 *   Session 157 (Ring-to-Stack mobile nav — 7 segments, expand/collapse,
 *     stacked bars with real routing, sidebar hidden on mobile)
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
import { registerNavigate } from '../navigation.ts';

// --- Side-effect imports ---
import { showPowerUpShop } from '../arena.ts';
import '../notifications.ts';
import '../leaderboard.ts';
import '../scoring.ts';
import '../tiers.ts';
import '../paywall.ts';
import '../cards.ts';
import '../analytics.ts';
import { showForgeForm, renderArsenal, renderLibrary, verifyReference, ArsenalReference } from '../reference-arsenal.ts';

// ============================================================
// APP SHELL V5 — Session 157: Ring-to-Stack Nav
// ============================================================

// --- CATEGORIES (used by openCategory, loadCategoryCounts, ?cat= param) ---
const CATEGORIES: Category[]=[
  {id:'politics',icon:'🏛️',label:'Politics',section:'THE FLOOR',count:'3 Live',hasLive:true},
  {id:'sports',icon:'🏈',label:'Sports',section:'THE PRESSBOX',count:'7 Live',hasLive:true},
  {id:'entertainment',icon:'🎬',label:'Film & TV',section:'THE SPOTLIGHT',count:'2 Live',hasLive:true},
  {id:'couples',icon:'💔',label:"Couples\nCourt",section:'COUPLES COURT',count:'5 Live',hasLive:true},
  {id:'trending',icon:'🔥',label:'Trending',section:'THE FIRE',count:'12 Hot',hasLive:false},
  {id:'music',icon:'🎵',label:'Music',section:'THE STAGE',count:'1 Live',hasLive:true},
];

const wheel=document.getElementById('spokeWheel');
const homeScreen=document.getElementById('screen-home');
const overlay=document.getElementById('categoryOverlay');
const overlayTitle=document.getElementById('overlayTitle');
const overlayContent=document.getElementById('overlayContent');
const overlayClose=document.getElementById('overlayClose');


// --- RING SEGMENTS (7 segments for the LCARS ring nav) ---
interface RingBar {
  label: string;
  action: () => void;
}
interface RingSegment {
  id: string;
  label: string;
  color: string;
  textColor: string;
  bars: RingBar[];
  catId?: string;  // links to CATEGORIES id for count updates
}

const RING_SEGMENTS: RingSegment[] = [
  {
    id: 'politics', label: 'POLITICS', color: '#7B8DB8', textColor: '#0a1128', catId: 'politics',
    bars: [
      { label: 'HOT TAKES', action: () => openCategoryTab('politics', 'takes') },
      { label: 'PREDICTIONS', action: () => openCategoryTab('politics', 'predictions') },
      { label: 'TRENDING', action: () => openCategoryTab('trending', 'takes') },
      { label: 'GROUPS', action: () => { window.location.href = 'moderator-groups.html'; } },
    ]
  },
  {
    id: 'sports', label: 'SPORTS', color: '#B8BECC', textColor: '#0a1128', catId: 'sports',
    bars: [
      { label: 'HOT TAKES', action: () => openCategoryTab('sports', 'takes') },
      { label: 'PREDICTIONS', action: () => openCategoryTab('sports', 'predictions') },
      { label: 'TRENDING', action: () => openCategoryTab('trending', 'takes') },
      { label: 'GROUPS', action: () => { window.location.href = 'moderator-groups.html'; } },
    ]
  },
  {
    id: 'entertainment', label: 'FILM & TV', color: '#9A8CBB', textColor: '#0a1128', catId: 'entertainment',
    bars: [
      { label: 'HOT TAKES', action: () => openCategoryTab('entertainment', 'takes') },
      { label: 'PREDICTIONS', action: () => openCategoryTab('entertainment', 'predictions') },
      { label: 'TRENDING', action: () => openCategoryTab('trending', 'takes') },
      { label: 'GROUPS', action: () => { window.location.href = 'moderator-groups.html'; } },
    ]
  },
  {
    id: 'couples', label: 'COUPLES', color: '#C4956A', textColor: '#0a1128', catId: 'couples',
    bars: [
      { label: 'HOT TAKES', action: () => openCategoryTab('couples', 'takes') },
      { label: 'PREDICTIONS', action: () => openCategoryTab('couples', 'predictions') },
      { label: 'TRENDING', action: () => openCategoryTab('trending', 'takes') },
      { label: 'GROUPS', action: () => { window.location.href = 'moderator-groups.html'; } },
    ]
  },
  {
    id: 'music', label: 'MUSIC', color: '#6BA8A0', textColor: '#0a1128', catId: 'music',
    bars: [
      { label: 'HOT TAKES', action: () => openCategoryTab('music', 'takes') },
      { label: 'PREDICTIONS', action: () => openCategoryTab('music', 'predictions') },
      { label: 'TRENDING', action: () => openCategoryTab('trending', 'takes') },
      { label: 'GROUPS', action: () => { window.location.href = 'moderator-groups.html'; } },
    ]
  },
  {
    id: 'arena', label: 'ARENA', color: '#E7442A', textColor: '#0a1128',
    bars: [
      { label: 'QUICK MATCH', action: () => { collapseRing(); navigateTo('arena'); } },
      { label: 'AI SPARRING', action: () => { collapseRing(); navigateTo('arena'); } },
      { label: 'RANKED', action: () => { collapseRing(); navigateTo('arena'); } },
      { label: 'CASUAL', action: () => { collapseRing(); navigateTo('arena'); } },
    ]
  },
  {
    id: 'you', label: 'YOU', color: '#8B7EC8', textColor: '#0a1128',
    bars: [
      { label: 'PROFILE', action: () => { collapseRing(); navigateTo('profile'); } },
      { label: 'RANKS', action: () => { collapseRing(); navigateTo('leaderboard'); } },
      { label: 'SHOP', action: () => { collapseRing(); navigateTo('shop'); } },
      { label: 'SETTINGS', action: () => { window.location.href = 'moderator-settings.html'; } },
      { label: 'ARSENAL', action: () => { collapseRing(); navigateTo('arsenal'); } },
    ]
  },
];


// --- RING STATE ---
let ringExpanded = false;
let currentSegmentIdx = -1;
let stacksContainer: HTMLElement | null = null;
const isMobile = () => window.matchMedia('(max-width: 767px)').matches;


// --- LCARS RING BUILDER (Session 157) ---
function buildLCARSNav() {
  const segCount = RING_SEGMENTS.length;
  const cx = 160, cy = 160, R = 138, r = 55, gap = 2;
  const segAngle = 360 / segCount;

  let s = `<svg viewBox="0 0 320 320" class="lcars-nav-svg" xmlns="http://www.w3.org/2000/svg">`;

  RING_SEGMENTS.forEach((seg, i) => {
    const a1 = (i * segAngle - 90 + gap / 2) * Math.PI / 180;
    const a2 = ((i + 1) * segAngle - 90 - gap / 2) * Math.PI / 180;
    const mid = (i * segAngle - 90 + segAngle / 2) * Math.PI / 180;

    // Arc path
    const d = `M${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`
      + `L${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}`
      + `A${R} ${R} 0 0 1 ${cx + R * Math.cos(a2)} ${cy + R * Math.sin(a2)}`
      + `L${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)}`
      + `A${r} ${r} 0 0 0 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}Z`;

    // Label position (inner track)
    const lr = (R + r) / 2 - 8;
    const lx = cx + lr * Math.cos(mid);
    const ly = cy + lr * Math.sin(mid);

    // Count position (outer track)
    const cr = (R + r) / 2 + 14;
    const clx = cx + cr * Math.cos(mid);
    const cly = cy + cr * Math.sin(mid);

    s += `<g class="lcars-arc" data-id="${seg.id}" data-idx="${i}">`;
    s += `<path d="${d}" fill="${seg.color}" class="arc-path"/>`;
    s += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" fill="${seg.textColor}" class="arc-label">${seg.label}</text>`;
    s += `<text x="${clx}" y="${cly}" text-anchor="middle" dominant-baseline="central" fill="${seg.textColor}" class="arc-count"></text>`;
    s += `</g>`;
  });

  // Center hole
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#111419"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="8" fill="#8890A8"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="3" fill="#111419"/>`;
  s += `</svg>`;

  wheel.innerHTML = s;

  // Click handler — different behavior mobile vs desktop
  wheel.addEventListener('click', handleRingClick);
}


function handleRingClick(e: Event) {
  const arc = (e.target as HTMLElement).closest('.lcars-arc') as HTMLElement | null;

  // If ring is mini (expanded state), collapse on any click
  if (ringExpanded) {
    collapseRing();
    return;
  }

  if (!arc) return;
  const idx = parseInt(arc.dataset.idx || '0', 10);
  const seg = RING_SEGMENTS[idx];

  if (isMobile()) {
    // Mobile: expand into stacked bars
    expandSegment(idx);
  } else {
    // Desktop: direct action — open category overlay or navigate
    if (seg.catId) {
      const cat = CATEGORIES.find(c => c.id === seg.catId);
      if (cat) openCategory(cat);
    } else if (seg.id === 'arena') {
      navigateTo('arena');
    } else if (seg.id === 'you') {
      navigateTo('profile');
    }
  }
}


function expandSegment(idx: number) {
  if (ringExpanded) return;
  ringExpanded = true;
  currentSegmentIdx = idx;
  const seg = RING_SEGMENTS[idx];

  // Shrink ring to bottom-right
  wheel.classList.add('ring-mini');

  // Build stacked bars
  if (!stacksContainer) return;
  stacksContainer.innerHTML = '';

  // Title
  const title = document.createElement('div');
  title.className = 'lcars-stacks-title';
  title.style.color = seg.color;
  title.textContent = seg.label;
  stacksContainer.appendChild(title);

  // Build bars with stagger
  const barWidths = [100, 92, 84, 76, 68, 60]; // decreasing widths
  seg.bars.forEach((bar, i) => {
    const el = document.createElement('div');
    el.className = 'lcars-bar';
    el.style.background = seg.color;
    el.style.width = (barWidths[i] || 52) + '%';
    el.textContent = bar.label;
    el.addEventListener('click', () => {
      bar.action();
    });
    stacksContainer.appendChild(el);

    // Staggered animation
    setTimeout(() => { el.classList.add('animate-in'); }, 80 + i * 60);
  });

  // Show stacks
  stacksContainer.classList.add('visible');
}


function collapseRing() {
  if (!ringExpanded) return;
  ringExpanded = false;
  currentSegmentIdx = -1;

  // Restore ring
  wheel.classList.remove('ring-mini');

  // Hide stacks
  if (stacksContainer) {
    stacksContainer.classList.remove('visible');
  }
}


// --- Helper: open category overlay with specific tab ---
function openCategoryTab(catId: string, tab: string) {
  collapseRing();
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return;
  // Open overlay then switch to correct tab
  openCategory(cat);
  // After overlay opens, switch tab
  setTimeout(() => {
    const tabEl = document.querySelector(`.overlay-tab[data-tab="${tab}"]`) as HTMLElement | null;
    if (tabEl) tabEl.click();
  }, 50);
}


// --- SESSION 23: Category Overlay (async, tabbed: Takes + Predictions) ---
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
  const tab = e.target.closest('.overlay-tab');
  if (!tab) return;
  const tabName = tab.dataset.tab;
  document.querySelectorAll('.overlay-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById('overlay-takes-tab').style.display = tabName === 'takes' ? '' : 'none';
  document.getElementById('overlay-predictions-tab').style.display = tabName === 'predictions' ? '' : 'none';
});

overlayClose.addEventListener('click',()=>{overlay.classList.remove('open');});
let overlayStartY=0;
overlay.addEventListener('touchstart',(e)=>{overlayStartY=e.touches[0].clientY;},{passive:true});
overlay.addEventListener('touchend',(e)=>{if(e.changedTouches[0].clientY-overlayStartY>100)overlay.classList.remove('open');});


// --- PULL TO REFRESH (Area 2, Item 2.15) ---
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
    'pointer-events:none;z-index:10;color:var(--mod-accent);font-size:13px;font-weight:600;letter-spacing:1px;'
  ].join('');
  overlayContent.style.position = 'relative';
  overlayContent.insertBefore(ptr, overlayContent.firstChild);

  const style = document.createElement('style');
  style.textContent = `
    #ptr-indicator { user-select:none; }
    .ptr-spinner { width:18px;height:18px;border-radius:50%;
      border:2px solid var(--mod-accent-border);
      border-top-color:var(--mod-accent);
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
    ptr.style.opacity = progress;
    ptr.style.transform = `translateY(${dy - 100}%)`;
    ptr.querySelector('.ptr-label').textContent = dy >= PTR_THRESHOLD ? 'Release to refresh' : 'Pull to refresh';
    ptrTriggered = dy >= PTR_THRESHOLD;
  }, { passive: true });

  overlayContent.addEventListener('touchend', async () => {
    if (!ptrDragging) return;
    ptrDragging = false;
    if (!ptrTriggered || !currentOverlayCat) {
      ptr.style.opacity = 0;
      ptr.style.transform = 'translateY(-100%)';
      return;
    }
    ptr.querySelector('.ptr-label').textContent = 'Refreshing…';
    ptr.querySelector('.ptr-spinner').classList.add('spinning');
    ptr.style.transform = 'translateY(0)';
    ptr.style.opacity = 1;
    try {
      await ModeratorAsync.fetchTakes(currentOverlayCat.id);
      ModeratorAsync.loadHotTakes(currentOverlayCat.id);
      await ModeratorAsync.fetchPredictions();
      await ModeratorAsync.fetchStandaloneQuestions?.();
      const predsTab = document.getElementById('overlay-predictions-tab');
      if (predsTab) ModeratorAsync.renderPredictions(predsTab);
    } catch(e) { /* non-critical */ }
    ptr.querySelector('.ptr-spinner').classList.remove('spinning');
    ptr.style.opacity = 0;
    ptr.style.transform = 'translateY(-100%)';
    ptrTriggered = false;
  });
})();


// --- NAVIGATION ---
const VALID_SCREENS=['home','arena','profile','shop','leaderboard','arsenal'];
function navigateTo(screenId: string){
  if(!VALID_SCREENS.includes(screenId))screenId='home';

  // Session 157: collapse ring when leaving home
  if (screenId !== 'home') collapseRing();

  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b=>b.classList.remove('active'));
  const screen=document.getElementById('screen-'+screenId);if(screen)screen.classList.add('active');
  const btn=document.querySelector(`.bottom-nav-btn[data-screen="${screenId}"]`);if(btn)btn.classList.add('active');
  try{localStorage.setItem('colosseum_last_screen',screenId);}catch(e){}

  if(screenId==='profile'){
    ModeratorAsync?.renderRivals?.(document.getElementById('rivals-feed'));
    loadFollowCounts();
  }
  if(screenId==='arsenal'){
    loadArsenalScreen();
  }
}
document.querySelectorAll('.bottom-nav-btn').forEach(btn=>{btn.addEventListener('click',()=>navigateTo(btn.dataset.screen));});
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
  }
});


// --- SESSION 148: Reference Arsenal screen wiring ---
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


// --- User Dropdown ---
const avatarBtn=document.getElementById('user-avatar-btn');
const dropdown=document.getElementById('user-dropdown');
avatarBtn.addEventListener('click',(e)=>{e.stopPropagation();dropdown.classList.toggle('open');});
document.addEventListener('click',()=>{dropdown.classList.remove('open');});

// --- Logout ---
document.getElementById('logout-btn').addEventListener('click',async()=>{
  await logOut();
  window.location.href='moderator-plinko.html';
});


// --- SESSION 23: Load Follow Counts ---
async function loadFollowCounts() {
  const user = getCurrentUser();
  if (!user?.id) return;
  try {
    const counts = await getFollowCounts(user.id);
    document.getElementById('profile-followers').textContent = counts.followers || 0;
    document.getElementById('profile-following').textContent = counts.following || 0;
  } catch(e) { /* non-critical */ }
}


// --- Area 3, Item 3.4: Live category counts for ring tiles ---
async function loadCategoryCounts() {
  if (!getSupabaseClient() || getIsPlaceholderMode()) return;
  try {
    const { data, error } = await safeRpc('get_category_counts');
    if (error || !data) return;
    data.forEach(row => {
      const arc = document.querySelector(`.lcars-arc[data-id="${row.section}"]`);
      if (!arc) return;
      const countEl = arc.querySelector('.arc-count');
      if (!countEl) return;
      const liveCount = Number(row.live_debates) || 0;
      const takeCount = Number(row.hot_takes) || 0;
      if (liveCount > 0) {
        countEl.textContent = `${liveCount} LIVE`;
      } else if (takeCount > 0) {
        countEl.textContent = `${takeCount > 99 ? '99+' : takeCount} HOT`;
      } else {
        countEl.textContent = 'QUIET';
      }
    });
  } catch(e) { /* non-critical */ }
}


// --- Auth State → UI ---
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
  const tierLabels={free:'FREE TIER',contender:'CONTENDER',champion:'CHAMPION',creator:'CREATOR'};
  const tier=profile.subscription_tier||'free';
  document.getElementById('profile-tier').textContent=tierLabels[tier]||'FREE TIER';
  document.getElementById('dropdown-name').textContent=profile.display_name||profile.username||'Gladiator';
  document.getElementById('dropdown-tier').textContent=tierLabels[tier]||'Free Tier';
  document.getElementById('stat-elo').textContent=profile.elo_rating||1200;
  document.getElementById('stat-wins').textContent=profile.wins||0;
  document.getElementById('stat-losses').textContent=profile.losses||0;
  document.getElementById('stat-streak').textContent=profile.current_streak||0;
  document.getElementById('stat-debates').textContent=profile.debates_completed||0;
  document.getElementById('stat-tokens').textContent=(profile.token_balance||0).toLocaleString();
  document.getElementById('token-count').textContent=(profile.token_balance||0).toLocaleString();
  const shopBal=document.getElementById('shop-token-balance');if(shopBal)shopBal.textContent=(profile.token_balance||0).toLocaleString();
  const depth=profile.profile_depth_pct||0;
  document.getElementById('profile-depth-fill').style.width=depth+'%';
  document.getElementById('profile-depth-text').innerHTML=`Profile ${depth}% complete — <a href="moderator-profile-depth.html" style="color:var(--gold);">unlock rewards</a>`;
  const bioEl=document.getElementById('profile-bio-display');
  if(bioEl){
    const bio=profile.bio||'';
    if(bio.trim()){bioEl.textContent=bio;bioEl.classList.remove('placeholder');}
    else{bioEl.textContent='Tap to add bio';bioEl.classList.add('placeholder');}
  }
}
onChange(updateUIFromProfile);


// ============================================================
// SESSION 113: PROFILE DEPTH — Avatar picker, Bio edit, Follow list
// ============================================================

function _closeSheet(overlay: HTMLElement | null){if(overlay&&overlay.parentNode)overlay.remove();}

// --- 1. AVATAR EMOJI PICKER ---
const AVATAR_EMOJIS=['⚔️','🏛️','🔥','👑','🛡️','🎯','🦁','🐉','🦅','⚡','💀','🎭','🏆','🗡️','🌟','🐺','🦊','🎪','🧠','💎'];
document.getElementById('profile-avatar').addEventListener('click',()=>{
  document.getElementById('avatar-picker-sheet')?.remove();
  const currentUrl=getCurrentProfile()?.avatar_url||'';
  const currentEmoji=currentUrl.startsWith('emoji:')?currentUrl.slice(6):'';
  const overlay=document.createElement('div');
  overlay.id='avatar-picker-sheet';
  overlay.className='bottom-sheet-overlay';
  overlay.innerHTML=`
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">CHOOSE YOUR AVATAR</div>
      <div class="avatar-grid" id="avatar-grid">
        ${AVATAR_EMOJIS.map(e=>`<div class="avatar-option${e===currentEmoji?' selected':''}" data-emoji="${escapeHTML(e)}">${e}</div>`).join('')}
      </div>
    </div>`;
  overlay.addEventListener('click',(e)=>{if(e.target===overlay)_closeSheet(overlay);});
  overlay.querySelector('#avatar-grid').addEventListener('click',async(e)=>{
    const opt=e.target.closest('.avatar-option');
    if(!opt)return;
    const emoji=opt.dataset.emoji;
    overlay.querySelectorAll('.avatar-option').forEach(o=>o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.style.opacity='0.5';
    const result=await updateProfile({avatar_url:'emoji:'+emoji});
    opt.style.opacity='1';
    if(result?.success){
      _closeSheet(overlay);
      showToast('Avatar updated!','success');
    } else {
      showToast('Failed to save avatar','error');
    }
  });
  document.body.appendChild(overlay);
});

// --- 2. BIO INLINE EDIT ---
const bioDisplay=document.getElementById('profile-bio-display');
const bioEditPanel=document.getElementById('profile-bio-edit');
const bioTextarea=document.getElementById('profile-bio-textarea');
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
  const overlay=document.createElement('div');
  overlay.id='follow-list-sheet';
  overlay.className='bottom-sheet-overlay';
  overlay.innerHTML=`
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">${type==='followers'?'FOLLOWERS':'FOLLOWING'}</div>
      <div id="follow-list-content" style="min-height:60px;display:flex;align-items:center;justify-content:center;">
        <div style="color:var(--white-dim);font-size:13px;">Loading...</div>
      </div>
    </div>`;
  overlay.addEventListener('click',(e)=>{if(e.target===overlay)_closeSheet(overlay);});
  document.body.appendChild(overlay);

  const result=type==='followers'
    ? await getFollowers(userId)
    : await getFollowing(userId);
  const listEl=overlay.querySelector('#follow-list-content');
  if(!result?.success||!result.data?.length){
    listEl.innerHTML=`<div class="follow-list-empty">${type==='followers'?'No followers yet':'Not following anyone yet'}</div>`;
    return;
  }
  const items=result.data.map(row=>{
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
    const item=e.target.closest('.follow-list-item');
    if(!item)return;
    _closeSheet(overlay);
    const uid=item.dataset.userId;
    const username=item.dataset.username;
    if(uid){ showUserProfile(uid); }
    else if(username){ window.location.href='/u/'+encodeURIComponent(username); }
  });
}
document.getElementById('followers-stat').addEventListener('click',()=>_openFollowList('followers'));
document.getElementById('following-stat').addEventListener('click',()=>_openFollowList('following'));


// --- SESSION 32: INIT — Members Zone assumes valid session ---
async function appInit(){
  // Session 157: create stacked bars container
  stacksContainer = document.createElement('div');
  stacksContainer.className = 'lcars-stacks';
  homeScreen?.appendChild(stacksContainer);

  buildLCARSNav();

  try {
    await Promise.race([
      ready,
      new Promise(r => setTimeout(r, 6000))
    ]);
  } catch(e) { /* auth init rejected */ }

  const loading=document.getElementById('loading-screen');
  if(loading){loading.classList.add('fade-out');setTimeout(()=>loading.remove(),400);}

  if(!getCurrentUser() && !getIsPlaceholderMode()){
    window.location.href='moderator-plinko.html';
    return;
  }

  if(getIsPlaceholderMode()){
    updateUIFromProfile(null,{display_name:'Debater',username:'debater',elo_rating:1200,wins:0,losses:0,current_streak:0,level:1,debates_completed:0,token_balance:50,subscription_tier:'free',profile_depth_pct:0});
  }

  try{
    const urlScreen=new URLSearchParams(window.location.search).get('screen');
    const lastScreen=urlScreen||localStorage.getItem('colosseum_last_screen');
    if(lastScreen&&document.getElementById('screen-'+lastScreen)){navigateTo(lastScreen);}
  }catch(e){}

  loadFollowCounts();
  loadCategoryCounts();
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>appInit().catch(e=>console.error('appInit error:',e)));}
else{appInit().catch(e=>console.error('appInit error:',e));}

// --- Payment toasts ---
const urlParams=new URLSearchParams(window.location.search);
if(urlParams.get('payment')==='success'){showToast('✅ Payment successful!','success');window.history.replaceState({},'',window.location.pathname);}
if(urlParams.get('payment')==='canceled'){showToast('Payment canceled.','info');window.history.replaceState({},'',window.location.pathname);}

// --- SESSION 107: Auto-open category overlay from ?cat= query param ---
const catParam=urlParams.get('cat');
if(catParam){const matchedCat=CATEGORIES.find(c=>c.id===catParam);if(matchedCat){openCategory(matchedCat);window.history.replaceState({},'',window.location.pathname);}}
