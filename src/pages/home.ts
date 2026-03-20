/**
 * THE COLOSSEUM — Home Page Controller (TypeScript)
 *
 * Runtime module — entry point for index.html via Vite.
 * Spoke carousel, category overlays, pull-to-refresh, activity indicators,
 * shop screen, hot takes feed wiring, leaderboard, predictions.
 *
 * Migration: Session 128 (Phase 4), Session 138 (cutover — auth/config/tokens use ES imports),
 *            Session 139 (ColosseumAsync ES import, 5 dead window globals removed)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- ES imports (all window globals eliminated) ---
import {
  onChange, getCurrentUser, getCurrentProfile, getIsPlaceholderMode,
  getSupabaseClient, logOut, getFollowCounts, getFollowers, getFollowing,
  showUserProfile, updateProfile, requireAuth, ready, safeRpc
} from '../auth.ts';
import { showToast, escapeHTML } from '../config.ts';
import '../tokens.ts'; // side-effect: auto-inits daily login, milestones, balance display
import { ColosseumAsync } from '../async.ts';

// ============================================================
// APP SHELL V4 — Session 23: Auth race fix, Predictions, Rivals, Follows
// ============================================================

// --- SPOKE CAROUSEL ---
const CATEGORIES=[
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

let angle=0,velocity=0,isDragging=false,startX=0,lastX=0,lastTime=0,animFrame=null;
let totalDragDistance=0,wasSpin=false,velocityHistory=[];
const TILE_COUNT=CATEGORIES.length;
const ANGLE_STEP=360/TILE_COUNT;
const RADIUS=120,TILT=65,FRICTION=0.93,MIN_VELOCITY=0.08,SPIN_THRESHOLD=10,FLICK_BOOST=1.2;

function buildTiles(){
  CATEGORIES.forEach((cat,i)=>{
    const tile=document.createElement('div');
    tile.className='spoke-tile';tile.dataset.index=i;tile.dataset.id=cat.id;
    tile.innerHTML=`<div class="tile-inner"><span class="tile-icon">${cat.icon}</span><span class="tile-label">${cat.label}</span>${cat.hasLive?`<span class="tile-live"><span class="pulse"></span>${cat.count}</span>`:`<span class="tile-count">${cat.count}</span>`}</div>`;
    tile.addEventListener('click',()=>{if(!wasSpin)openCategory(cat);});
    wheel.appendChild(tile);
  });
}

function positionTiles(){
  wheel.querySelectorAll('.spoke-tile').forEach((tile,i)=>{
    const tileAngle=angle+(i*ANGLE_STEP);
    const rad=(tileAngle*Math.PI)/180;
    const x=Math.sin(rad)*RADIUS,z=Math.cos(rad)*RADIUS;
    const nZ=(z+RADIUS)/(2*RADIUS);
    const scale=0.6+(nZ*0.4),y=Math.cos(rad)*TILT;
    tile.style.transform=`translateX(${x}px) translateY(${y}px) scale(${scale})`;
    tile.style.zIndex=Math.round(nZ*10);tile.style.opacity=1;
    nZ>0.9?tile.classList.add('front'):tile.classList.remove('front');
  });
}

function animate(){
  if(!isDragging&&Math.abs(velocity)>MIN_VELOCITY){angle+=velocity;velocity*=FRICTION;positionTiles();animFrame=requestAnimationFrame(animate);}
  else if(!isDragging){velocity=0;snapToNearest();}
}

function snapToNearest(){
  const na=((angle%360)+360)%360;let nearest=0,minDist=360;
  for(let i=0;i<TILE_COUNT;i++){const t=i*ANGLE_STEP;let d=Math.abs(na-t);if(d>180)d=360-d;if(d<minDist){minDist=d;nearest=t;}}
  let diff=nearest-na;if(diff>180)diff-=360;if(diff<-180)diff+=360;smoothSnap(angle+diff);
}

function smoothSnap(target: number){
  const diff=target-angle;if(Math.abs(diff)<0.5){angle=target;positionTiles();return;}
  angle+=diff*0.15;positionTiles();requestAnimationFrame(()=>smoothSnap(target));
}

function onStart(cX: number){isDragging=true;startX=cX;lastX=cX;lastTime=Date.now();velocity=0;totalDragDistance=0;wasSpin=false;velocityHistory=[];if(animFrame)cancelAnimationFrame(animFrame);}
function onMove(cX: number){
  if(!isDragging)return;const dx=cX-lastX,now=Date.now(),dt=now-lastTime;
  totalDragDistance+=Math.abs(dx);angle+=dx*0.3;positionTiles();
  if(dt>0){velocity=(dx*0.3)/Math.max(dt/16,1);velocityHistory.push(velocity);if(velocityHistory.length>5)velocityHistory.shift();}
  lastX=cX;lastTime=now;
}
function onEnd(){
  wasSpin=totalDragDistance>SPIN_THRESHOLD;isDragging=false;
  if(velocityHistory.length>0){const peak=velocityHistory.reduce((a,b)=>Math.abs(a)>Math.abs(b)?a:b);velocity=peak*FLICK_BOOST;}
  animFrame=requestAnimationFrame(animate);
}

homeScreen.addEventListener('touchstart',(e)=>{onStart(e.touches[0].clientX);},{passive:true});
homeScreen.addEventListener('touchmove',(e)=>{onMove(e.touches[0].clientX);},{passive:true});
homeScreen.addEventListener('touchend',onEnd);
homeScreen.addEventListener('touchcancel',onEnd);
homeScreen.addEventListener('mousedown',(e)=>{onStart(e.clientX);e.preventDefault();});
document.addEventListener('mousemove',(e)=>{onMove(e.clientX);});
document.addEventListener('mouseup',onEnd);

// --- SESSION 23: Category Overlay (async, tabbed: Takes + Predictions) ---
let currentOverlayCat = null;

async function openCategory(cat: any){
  currentOverlayCat = cat;
  overlayTitle.textContent = cat.section || cat.label.replace('\n',' ');

  // Reset tabs
  const takesTab = document.getElementById('overlay-takes-tab');
  const predsTab = document.getElementById('overlay-predictions-tab');
  takesTab.style.display = '';
  predsTab.style.display = 'none';
  document.querySelectorAll('.overlay-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.overlay-tab[data-tab="takes"]')?.classList.add('active');

  // Show loading
  takesTab.innerHTML = '<div style="text-align:center;padding:30px;"><div class="loading-spinner" style="margin:0 auto;"></div></div>';
  predsTab.innerHTML = '';
  overlay.classList.add('open');

  try {
    // Fetch hot takes
    await ColosseumAsync.fetchTakes(cat.id);
    
    // Render composer + feed
    takesTab.innerHTML = ColosseumAsync.getComposerHTML();
    const feedDiv = document.createElement('div');
    feedDiv.id = 'hot-takes-feed';
    takesTab.appendChild(feedDiv);
    ColosseumAsync.loadHotTakes(cat.id);

    // Wire char counter
    const input = document.getElementById('hot-take-input');
    const counter = document.getElementById('take-char-count');
    if (input && counter) {
      input.addEventListener('input', () => { counter.textContent = input.value.length + ' / 280'; });
    }
  } catch(e) {
    takesTab.innerHTML = '<div class="placeholder-text"><span class="emoji">⚠️</span>Failed to load hot takes. Pull down to retry.</div>';
  }

  try {
    // Fetch & render predictions
    await ColosseumAsync.fetchPredictions();
    await ColosseumAsync.fetchStandaloneQuestions?.();
    // predsTab variable already references the element — no id rename needed
    ColosseumAsync.renderPredictions(predsTab);
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
  const PTR_THRESHOLD = 64;   // px drag required to trigger
  const PTR_MAX      = 90;    // px max visual drag
  let ptrStartY = 0, ptrDragging = false, ptrTriggered = false;

  // Inject spinner element once
  const ptr = document.createElement('div');
  ptr.id = 'ptr-indicator';
  ptr.innerHTML = '<div class="ptr-spinner"></div><span class="ptr-label">Release to refresh</span>';
  ptr.style.cssText = [
    'position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:center;',
    'gap:8px;padding:12px;opacity:0;transform:translateY(-100%);transition:opacity 0.2s;',
    'pointer-events:none;z-index:10;color:rgba(212,168,67,0.9);font-size:13px;font-weight:600;letter-spacing:1px;'
  ].join('');
  overlayContent.style.position = 'relative';
  overlayContent.insertBefore(ptr, overlayContent.firstChild);

  // Inject spinner CSS once
  const style = document.createElement('style');
  style.textContent = `
    #ptr-indicator { user-select:none; }
    .ptr-spinner {
      width:18px;height:18px;border-radius:50%;
      border:2px solid rgba(212,168,67,0.3);
      border-top-color:rgba(212,168,67,0.9);
      animation:none;
    }
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
    // Show loading state
    ptr.querySelector('.ptr-label').textContent = 'Refreshing…';
    ptr.querySelector('.ptr-spinner').classList.add('spinning');
    ptr.style.transform = 'translateY(0)';
    ptr.style.opacity = 1;
    // Refresh feed
    try {
      await ColosseumAsync.fetchTakes(currentOverlayCat.id);
      ColosseumAsync.loadHotTakes(currentOverlayCat.id);
      await ColosseumAsync.fetchPredictions();
      await ColosseumAsync.fetchStandaloneQuestions?.();
      const predsTab = document.getElementById('overlay-predictions-tab');
      if (predsTab) ColosseumAsync.renderPredictions(predsTab);
    } catch(e) { /* non-critical */ }
    // Snap back
    ptr.querySelector('.ptr-spinner').classList.remove('spinning');
    ptr.style.opacity = 0;
    ptr.style.transform = 'translateY(-100%)';
    ptrTriggered = false;
  });
})();

// --- NAVIGATION ---
const VALID_SCREENS=['home','arena','profile','shop','leaderboard'];
function navigateTo(screenId: string){
  if(!VALID_SCREENS.includes(screenId))screenId='home';
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b=>b.classList.remove('active'));
  const screen=document.getElementById('screen-'+screenId);if(screen)screen.classList.add('active');
  const btn=document.querySelector(`.bottom-nav-btn[data-screen="${screenId}"]`);if(btn)btn.classList.add('active');
  try{localStorage.setItem('colosseum_last_screen',screenId);}catch(e){}

  // SESSION 23: Load rivals when switching to profile
  if(screenId==='profile'){
    ColosseumAsync?.renderRivals?.(document.getElementById('rivals-feed'));
    loadFollowCounts();
  }
}
document.querySelectorAll('.bottom-nav-btn').forEach(btn=>{btn.addEventListener('click',()=>navigateTo(btn.dataset.screen));});
(window as any).navigateTo = navigateTo;

// --- User Dropdown ---
const avatarBtn=document.getElementById('user-avatar-btn');
const dropdown=document.getElementById('user-dropdown');
avatarBtn.addEventListener('click',(e)=>{e.stopPropagation();dropdown.classList.toggle('open');});
document.addEventListener('click',()=>{dropdown.classList.remove('open');});

// --- Logout ---
document.getElementById('logout-btn').addEventListener('click',async()=>{
  await logOut();
  window.location.href='colosseum-plinko.html';
});

// --- SESSION 23: Load Follow Counts ---
async function loadFollowCounts() {
  const user = getCurrentUser();
  if (!user?.id) return;
  try {
    const counts = await getFollowCounts(user.id);
    document.getElementById('profile-followers').textContent = counts.followers || 0;
    document.getElementById('profile-following').textContent = counts.following || 0;
  } catch(e) { /* non-critical — counts stay at 0 */ }
}

// --- Area 3, Item 3.4: Live category counts for carousel tiles ---
async function loadCategoryCounts() {
  if (!getSupabaseClient() || getIsPlaceholderMode()) return;
  try {
    const { data, error } = await safeRpc('get_category_counts');
    if (error || !data) return;
    data.forEach(row => {
      const tile = document.querySelector(`.spoke-tile[data-id="${row.section}"]`);
      if (!tile) return;
      const liveCount = Number(row.live_debates) || 0;
      const takeCount = Number(row.hot_takes) || 0;
      const liveEl  = tile.querySelector('.tile-live');
      const countEl = tile.querySelector('.tile-count');
      if (liveCount > 0) {
        // Has live/active debates — show red live indicator
        if (liveEl) {
          liveEl.innerHTML = `<span class="pulse"></span>${liveCount} Live`;
        } else if (countEl) {
          countEl.outerHTML = `<span class="tile-live"><span class="pulse"></span>${liveCount} Live</span>`;
        }
      } else if (takeCount > 0) {
        // No live debates but has recent hot takes
        const label = `${takeCount > 99 ? '99+' : takeCount} Hot`;
        if (liveEl) {
          liveEl.outerHTML = `<span class="tile-count">${label}</span>`;
        } else if (countEl) {
          countEl.textContent = label;
        }
      } else {
        // Nothing active
        if (liveEl) liveEl.outerHTML = `<span class="tile-count">Quiet</span>`;
        else if (countEl) countEl.textContent = 'Quiet';
      }
    });
  } catch(e) { /* non-critical — static counts remain */ }
}

// --- Auth State → UI ---

// SESSION 113: Parse avatar_url — supports 'emoji:X' format or falls back to initial letter
function _renderAvatar(el: HTMLElement, profile: any){
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
function _renderNavAvatar(el: HTMLElement, profile: any){
  const url=profile.avatar_url||'';
  if(url.startsWith('emoji:')){
    el.textContent=url.slice(6);
    el.style.fontSize='18px';
  } else {
    el.textContent=(profile.display_name||profile.username||'?')[0].toUpperCase();
    el.style.fontSize='';
  }
}

function updateUIFromProfile(user: any, profile: any){
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
  document.getElementById('profile-depth-text').innerHTML=`Profile ${depth}% complete — <a href="colosseum-profile-depth.html" style="color:var(--gold);">unlock rewards</a>`;
  // SESSION 113: Bio display
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
// Bug 030: change avatar, edit bio, tap rival/following→profile
// ============================================================

// --- Shared: close bottom sheet on overlay click ---
function _closeSheet(overlay: HTMLElement | null){if(overlay&&overlay.parentNode)overlay.remove();}

// --- 1. AVATAR EMOJI PICKER ---
const AVATAR_EMOJIS=['⚔️','🏛️','🔥','👑','🛡️','🎯','🦁','🐉','🦅','⚡','💀','🎭','🏆','🗡️','🌟','🐺','🦊','🎪','🧠','💎'];

document.getElementById('profile-avatar').addEventListener('click',()=>{
  // Remove existing sheet if any
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

  // Handle emoji selection
  overlay.querySelector('#avatar-grid').addEventListener('click',async(e)=>{
    const opt=e.target.closest('.avatar-option');
    if(!opt)return;
    const emoji=opt.dataset.emoji;
    // Visual selection
    overlay.querySelectorAll('.avatar-option').forEach(o=>o.classList.remove('selected'));
    opt.classList.add('selected');
    // Save
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
  // type = 'followers' or 'following'
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

  // Fetch data
  const result=type==='followers'
    ? await getFollowers(userId)
    : await getFollowing(userId);

  const listEl=overlay.querySelector('#follow-list-content');
  if(!result?.success||!result.data?.length){
    listEl.innerHTML=`<div class="follow-list-empty">${type==='followers'?'No followers yet':'Not following anyone yet'}</div>`;
    return;
  }

  // Build list — getFollowers returns profiles via foreign key join
  const items=result.data.map(row=>{
    const profileData=type==='followers'
      ? row.profiles  // follows_follower_id_fkey join
      : row.profiles; // follows_following_id_fkey join
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

  // Wire click → navigate to profile
  listEl.addEventListener('click',(e)=>{
    const item=e.target.closest('.follow-list-item');
    if(!item)return;
    _closeSheet(overlay);
    // Try showUserProfile modal first, fall back to /u/ page
    const uid=item.dataset.userId;
    const username=item.dataset.username;
    if(uid){
      showUserProfile(uid);
    } else if(username){
      window.location.href='/u/'+encodeURIComponent(username);
    }
  });
}

document.getElementById('followers-stat').addEventListener('click',()=>_openFollowList('followers'));
document.getElementById('following-stat').addEventListener('click',()=>_openFollowList('following'));

// --- SESSION 32: INIT — Members Zone assumes valid session ---
// Unauthenticated users are redirected to the Plinko Gate.
// Bot army links point to the static mirror, not here.
async function appInit(){
  buildTiles();positionTiles();

  // Wait for auth to resolve, but never hang more than 4s total
  try {
    await Promise.race([
      ready,
      new Promise(r => setTimeout(r, 4000))
    ]);
  } catch(e) { /* auth init rejected — continue gracefully, gate check below handles redirect */ }

  // Fade out loading screen
  const loading=document.getElementById('loading-screen');
  if(loading){loading.classList.add('fade-out');setTimeout(()=>loading.remove(),400);}

  // SESSION 32: Members Zone auth gate — no session = redirect to Plinko
  if(!getCurrentUser() && !getIsPlaceholderMode()){
    window.location.href='colosseum-plinko.html';
    return;
  }

  // Placeholder fallback UI (dev/local only)
  if(getIsPlaceholderMode()){
    updateUIFromProfile(null,{display_name:'Debater',username:'debater',elo_rating:1200,wins:0,losses:0,current_streak:0,level:1,debates_completed:0,token_balance:50,subscription_tier:'free',profile_depth_pct:0});
  }

  // Restore last screen
  try{
    const urlScreen=new URLSearchParams(window.location.search).get('screen');
    const lastScreen=urlScreen||localStorage.getItem('colosseum_last_screen');
    if(lastScreen&&document.getElementById('screen-'+lastScreen)){navigateTo(lastScreen);}
  }catch(e){}

  // Load follow counts if on profile
  loadFollowCounts();
  // Load live category counts for carousel tiles (Area 3, Item 3.4)
  loadCategoryCounts();
}

// Fire init
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>appInit().catch(e=>console.error('appInit error:',e)));}
else{appInit().catch(e=>console.error('appInit error:',e));}

// --- Payment toasts (SESSION 60: uses global showToast) ---
const urlParams=new URLSearchParams(window.location.search);
if(urlParams.get('payment')==='success'){showToast('✅ Payment successful!','success');window.history.replaceState({},'',window.location.pathname);}
if(urlParams.get('payment')==='canceled'){showToast('Payment canceled.','info');window.history.replaceState({},'',window.location.pathname);}

// --- SESSION 107: Auto-open category overlay from ?cat= query param ---
const catParam=urlParams.get('cat');
if(catParam){const matchedCat=CATEGORIES.find(c=>c.id===catParam);if(matchedCat){openCategory(matchedCat);window.history.replaceState({},'',window.location.pathname);}}
