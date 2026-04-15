/**
 * arena-entrance.ts — F-03 Entrance Sequences / Battle Animations
 *
 * Plays a full-screen animated entrance between the pre-debate screen
 * and the live debate room. Duration ~2.4s so it's fast and satisfying.
 *
 * Three tiers based on debater win-rate (mirrors Session 166 spec):
 *   Tier 1 (0–25% win rate OR <5 debates)  — Standard: clean fade + names
 *   Tier 2 (26–50%)                          — Enhanced: slide-in clash
 *   Tier 3 (51%+)                            — Dramatic: full arena reveal
 *
 * All animation is CSS + Web Audio — no asset loading.
 */

import { getCurrentProfile } from '../auth.ts';
import { playSound } from './arena-sounds.ts';
import type { CurrentDebate } from './arena-types.ts';

// ============================================================
// CSS (injected once)
// ============================================================

let _cssInjected = false;

function _injectCSS(): void {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    /* ── Entrance backdrop ──────────────────────────────────── */
    .ent-stage {
      position: fixed; inset: 0; z-index: 8000;
      background: var(--mod-bg-base);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      overflow: hidden;
      font-family: var(--mod-font-display, 'Antonio', sans-serif);
    }

    /* ── Tier 1: Standard ─────────────────────────────────── */
    .ent-t1-wrap {
      text-align: center;
      animation: entT1Fade 2.4s ease forwards;
    }
    @keyframes entT1Fade {
      0%   { opacity: 0; }
      15%  { opacity: 1; }
      75%  { opacity: 1; }
      100% { opacity: 0; }
    }
    .ent-t1-badge {
      font-size: 11px; letter-spacing: 4px;
      color: var(--mod-accent, #d4a843);
      margin-bottom: 20px;
    }
    .ent-t1-vs {
      display: flex; align-items: center; gap: 24px;
    }
    .ent-t1-debater { text-align: center; }
    .ent-t1-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: var(--mod-accent-muted, rgba(212,168,67,0.15));
      border: 2px solid var(--mod-accent-border, rgba(212,168,67,0.3));
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; font-weight: 700;
      color: var(--mod-accent, #d4a843);
      margin: 0 auto 10px;
    }
    .ent-t1-name {
      font-size: 15px; font-weight: 700; color: var(--mod-text-on-accent);
      max-width: 110px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .ent-t1-elo {
      font-size: 11px; color: rgba(255,255,255,0.45);
      margin-top: 3px; letter-spacing: 1px;
    }
    .ent-t1-sword {
      font-size: 36px;
      color: var(--mod-accent, #d4a843);
    }

    /* ── Tier 2: Enhanced ─────────────────────────────────── */
    .ent-t2-wrap { width: 100%; position: relative; }

    .ent-t2-left {
      position: absolute; left: 0; top: 50%; transform: translateY(-50%);
      width: 45%; text-align: center;
      animation: entT2SlideLeft 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both;
    }
    .ent-t2-right {
      position: absolute; right: 0; top: 50%; transform: translateY(-50%);
      width: 45%; text-align: center;
      animation: entT2SlideRight 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both;
    }
    @keyframes entT2SlideLeft {
      from { opacity: 0; transform: translateY(-50%) translateX(-80px); }
      to   { opacity: 1; transform: translateY(-50%) translateX(0); }
    }
    @keyframes entT2SlideRight {
      from { opacity: 0; transform: translateY(-50%) translateX(80px); }
      to   { opacity: 1; transform: translateY(-50%) translateX(0); }
    }

    .ent-t2-avatar {
      width: 80px; height: 80px; border-radius: 50%;
      background: var(--mod-accent-muted, rgba(212,168,67,0.12));
      border: 2px solid var(--mod-accent, #d4a843);
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; font-weight: 700;
      color: var(--mod-accent, #d4a843);
      margin: 0 auto 12px;
      box-shadow: 0 0 20px rgba(212,168,67,0.3);
    }
    .ent-t2-name {
      font-size: 18px; font-weight: 700; color: var(--mod-text-on-accent);
      letter-spacing: 0.5px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ent-t2-elo { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 4px; }

    .ent-t2-center {
      position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      animation: entT2VsPop 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.55s both;
    }
    @keyframes entT2VsPop {
      from { opacity: 0; transform: translate(-50%,-50%) scale(0.3); }
      to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
    }
    .ent-t2-vs-text {
      font-size: 48px; font-weight: 900;
      color: var(--mod-accent, #d4a843);
      text-shadow: 0 0 24px rgba(212,168,67,0.6), 0 0 4px #000;
      letter-spacing: 2px;
    }

    .ent-t2-clash {
      position: absolute; left: 50%; top: 30%;
      transform: translateX(-50%);
      font-size: 28px;
      animation: entT2Clash 0.3s ease 0.9s both;
      opacity: 0;
    }
    @keyframes entT2Clash {
      0%   { opacity: 0; transform: translateX(-50%) scale(0.5); }
      50%  { opacity: 1; transform: translateX(-50%) scale(1.4); }
      100% { opacity: 0; transform: translateX(-50%) scale(1); }
    }

    .ent-t2-topic {
      position: absolute; bottom: 18%; left: 50%; transform: translateX(-50%);
      font-family: var(--mod-font-ui, sans-serif);
      font-size: 12px; color: rgba(255,255,255,0.5);
      letter-spacing: 0.5px; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
      max-width: 86vw; text-align: center;
      animation: entT1Fade 2.4s ease forwards;
    }

    .ent-t2-wrap-outer {
      width: 100vw; height: 200px; position: relative;
      animation: entT2Wrap 2.4s ease forwards;
    }
    @keyframes entT2Wrap {
      0%   { opacity: 0; }
      12%  { opacity: 1; }
      72%  { opacity: 1; }
      100% { opacity: 0; }
    }

    /* ── Tier 3: Dramatic ─────────────────────────────────── */
    .ent-t3-bg {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 70% 50% at 50% 50%,
        rgba(212,168,67,0.12) 0%, transparent 70%);
      animation: entT3Pulse 2.4s ease forwards;
    }
    @keyframes entT3Pulse {
      0%,100% { opacity: 0; }
      20%,70% { opacity: 1; }
    }

    .ent-t3-scanline {
      position: absolute; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, transparent, var(--mod-accent, #d4a843), transparent);
      animation: entT3Scan 0.6s ease 0.3s forwards;
      opacity: 0;
    }
    @keyframes entT3Scan {
      0%  { top: 0%; opacity: 1; }
      100%{ top: 100%; opacity: 0.3; }
    }

    .ent-t3-left {
      position: absolute; left: 4%; top: 50%; transform: translateY(-50%);
      width: 38%; text-align: center;
      animation: entT3HeroLeft 0.4s cubic-bezier(0.22,1,0.36,1) 0.35s both;
    }
    .ent-t3-right {
      position: absolute; right: 4%; top: 50%; transform: translateY(-50%);
      width: 38%; text-align: center;
      animation: entT3HeroRight 0.4s cubic-bezier(0.22,1,0.36,1) 0.35s both;
    }
    @keyframes entT3HeroLeft {
      from { opacity: 0; transform: translateY(-50%) translateX(-120px) scale(0.8); }
      to   { opacity: 1; transform: translateY(-50%) translateX(0) scale(1); }
    }
    @keyframes entT3HeroRight {
      from { opacity: 0; transform: translateY(-50%) translateX(120px) scale(0.8); }
      to   { opacity: 1; transform: translateY(-50%) translateX(0) scale(1); }
    }

    .ent-t3-avatar {
      width: 96px; height: 96px; border-radius: 50%;
      background: linear-gradient(135deg,
        rgba(212,168,67,0.2) 0%, rgba(212,168,67,0.06) 100%);
      border: 2px solid var(--mod-accent, #d4a843);
      display: flex; align-items: center; justify-content: center;
      font-size: 40px; font-weight: 700;
      color: var(--mod-accent, #d4a843);
      margin: 0 auto 14px;
      box-shadow:
        0 0 30px rgba(212,168,67,0.35),
        0 0 60px rgba(212,168,67,0.12),
        inset 0 0 20px rgba(212,168,67,0.06);
    }
    .ent-t3-name {
      font-size: 20px; font-weight: 900; color: #fff;
      letter-spacing: 1px; text-transform: uppercase;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      text-shadow: 0 0 12px rgba(212,168,67,0.3);
    }
    .ent-t3-elo {
      font-size: 12px; letter-spacing: 2px;
      color: var(--mod-accent, #d4a843);
      margin-top: 6px;
    }
    .ent-t3-record {
      font-size: 11px; color: rgba(255,255,255,0.35);
      margin-top: 3px; letter-spacing: 0.5px;
    }

    .ent-t3-center {
      position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      animation: entT3VsPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.72s both;
    }
    @keyframes entT3VsPop {
      from { opacity: 0; transform: translate(-50%,-50%) scale(0.1) rotate(-15deg); }
      to   { opacity: 1; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
    }
    .ent-t3-vs-text {
      font-size: 64px; font-weight: 900;
      color: var(--mod-accent, #d4a843);
      text-shadow:
        0 0 30px rgba(212,168,67,0.8),
        0 0 60px rgba(212,168,67,0.4),
        0 0 4px #000;
      letter-spacing: 4px; line-height: 1;
    }
    .ent-t3-divider {
      width: 2px; height: 120px;
      background: linear-gradient(to bottom,
        transparent, var(--mod-accent, #d4a843), transparent);
      margin: 0 auto;
      animation: entT3LineGrow 0.35s ease 0.8s both;
      transform-origin: center;
    }
    @keyframes entT3LineGrow {
      from { transform: scaleY(0); opacity: 0; }
      to   { transform: scaleY(1); opacity: 1; }
    }

    .ent-t3-title {
      position: absolute; top: 14%; left: 50%; transform: translateX(-50%);
      font-size: 11px; letter-spacing: 5px; color: rgba(212,168,67,0.6);
      white-space: nowrap;
      animation: entT3Title 0.4s ease 0.2s both;
    }
    @keyframes entT3Title {
      from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    .ent-t3-topic {
      position: absolute; bottom: 14%; left: 50%; transform: translateX(-50%);
      font-family: var(--mod-font-ui, sans-serif);
      font-size: 13px; color: rgba(255,255,255,0.55);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 82vw; text-align: center;
      animation: entT3Title 0.4s ease 0.5s both;
    }

    .ent-t3-wrap {
      width: 100vw; height: 100vh; position: relative;
      animation: entT3OuterFade 2.4s ease forwards;
    }
    @keyframes entT3OuterFade {
      0%   { opacity: 0; }
      10%  { opacity: 1; }
      70%  { opacity: 1; }
      100% { opacity: 0; }
    }

    /* ── Ranked badge ───────────────────────────────────────── */
    .ent-ranked-badge {
      position: absolute; top: 14%; left: 50%; transform: translateX(-50%);
      font-size: 10px; letter-spacing: 4px;
      color: var(--mod-accent, #d4a843);
      opacity: 0.7;
      animation: entT1Fade 2.4s ease forwards;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(s);
}

// ============================================================
// TIER CALCULATION
// ============================================================

function _getTier(wins: number, losses: number, debatesCompleted: number): 1 | 2 | 3 {
  if (debatesCompleted < 5) return 1; // Not enough data — standard
  const total = wins + losses;
  if (total === 0) return 1;
  const winRate = wins / total;
  if (winRate > 0.50) return 3;
  if (winRate > 0.25) return 2;
  return 1;
}

// ============================================================
// ENTRANCE SEQUENCE
// ============================================================

/**
 * Plays entrance animation and resolves when it finishes.
 * Call BEFORE rendering the debate room.
 */
export function playEntranceSequence(debate: CurrentDebate): Promise<void> {
  return new Promise(resolve => {
    _injectCSS();

    const profile   = getCurrentProfile();
    const wins      = profile?.wins            ?? 0;
    const losses    = profile?.losses          ?? 0;
    const completed = profile?.debates_completed ?? 0;
    const tier      = _getTier(wins, losses, completed);

    const myName    = profile?.display_name || profile?.username || 'You';
    const myInitial = (myName[0] || '?').toUpperCase();
    const myElo     = profile?.elo_rating ?? 1200;
    const oppName   = debate.opponentName || 'Opponent';
    const oppInitial= (oppName[0] || '?').toUpperCase();
    const oppElo    = debate.opponentElo   ?? 1200;
    const isAI      = debate.mode === 'ai';
    const isRanked  = debate.ranked;
    const topic     = debate.topic;

    const stage = document.createElement('div');
    stage.className = 'ent-stage';
    stage.id = 'ent-stage';

    if (tier === 1) {
      _renderTier1(stage, myInitial, myName, myElo, oppInitial, oppName, oppElo, isAI, isRanked);
    } else if (tier === 2) {
      _renderTier2(stage, myInitial, myName, myElo, oppInitial, oppName, oppElo, isAI, topic, isRanked);
    } else {
      _renderTier3(stage, myInitial, myName, myElo, wins, losses, oppInitial, oppName, oppElo, isAI, topic, isRanked);
    }

    document.body.appendChild(stage);

    // Sound: round-start cue on tier 1/2, louder on tier 3
    try {
      if (tier === 3) {
        playSound('roundStart');
        setTimeout(() => { try { playSound('roundStart'); } catch { /* sound optional */ } }, 600);
      } else {
        playSound('roundStart');
      }
    } catch { /* sound optional */ }

    // Auto-remove after animation completes
    const DURATION = 2450;
    setTimeout(() => {
      stage.style.transition = 'opacity 0.15s';
      stage.style.opacity = '0';
      setTimeout(() => {
        stage.remove();
        resolve();
      }, 160);
    }, DURATION);
  });
}

// ============================================================
// TIER RENDERERS
// ============================================================

function _esc(s: string): string {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _renderTier1(
  stage: HTMLElement,
  myI: string, myName: string, myElo: number,
  oppI: string, oppName: string, oppElo: number,
  isAI: boolean, isRanked: boolean
): void {
  stage.innerHTML = `
    ${isRanked ? '<div class="ent-ranked-badge">⚔️ RANKED BATTLE</div>' : ''}
    <div class="ent-t1-wrap">
      <div class="ent-t1-badge">MATCH FOUND</div>
      <div class="ent-t1-vs">
        <div class="ent-t1-debater">
          <div class="ent-t1-avatar">${_esc(myI)}</div>
          <div class="ent-t1-name">${_esc(myName)}</div>
          <div class="ent-t1-elo">${myElo} ELO</div>
        </div>
        <div class="ent-t1-sword">⚔️</div>
        <div class="ent-t1-debater">
          <div class="ent-t1-avatar">${isAI ? '🤖' : _esc(oppI)}</div>
          <div class="ent-t1-name">${_esc(oppName)}</div>
          <div class="ent-t1-elo">${isAI ? 'AI' : `${oppElo} ELO`}</div>
        </div>
      </div>
    </div>
  `;
}

function _renderTier2(
  stage: HTMLElement,
  myI: string, myName: string, myElo: number,
  oppI: string, oppName: string, oppElo: number,
  isAI: boolean, topic: string, isRanked: boolean
): void {
  stage.innerHTML = `
    <div class="ent-t2-wrap-outer">
      <div class="ent-t2-left">
        <div class="ent-t2-avatar">${_esc(myI)}</div>
        <div class="ent-t2-name">${_esc(myName)}</div>
        <div class="ent-t2-elo">${myElo} ELO</div>
      </div>
      <div class="ent-t2-center">
        <div class="ent-t2-vs-text">VS</div>
      </div>
      <div class="ent-t2-right">
        <div class="ent-t2-avatar">${isAI ? '🤖' : _esc(oppI)}</div>
        <div class="ent-t2-name">${_esc(oppName)}</div>
        <div class="ent-t2-elo">${isAI ? 'AI' : `${oppElo} ELO`}</div>
      </div>
      <div class="ent-t2-clash">⚔️</div>
    </div>
    <div class="ent-t2-topic">${_esc(topic)}</div>
    ${isRanked ? '<div class="ent-ranked-badge" style="top:auto;bottom:8%;">⚔️ RANKED</div>' : ''}
  `;
}

function _renderTier3(
  stage: HTMLElement,
  myI: string, myName: string, myElo: number,
  wins: number, losses: number,
  oppI: string, oppName: string, oppElo: number,
  isAI: boolean, topic: string, isRanked: boolean
): void {
  stage.innerHTML = `
    <div class="ent-t3-wrap">
      <div class="ent-t3-bg"></div>
      <div class="ent-t3-scanline"></div>
      <div class="ent-t3-title">${isRanked ? '⚔️ RANKED BATTLE' : 'ENTER THE ARENA'}</div>
      <div class="ent-t3-left">
        <div class="ent-t3-avatar">${_esc(myI)}</div>
        <div class="ent-t3-name">${_esc(myName)}</div>
        <div class="ent-t3-elo">${myElo} ELO</div>
        <div class="ent-t3-record">${wins}W – ${losses}L</div>
      </div>
      <div class="ent-t3-center">
        <div class="ent-t3-divider"></div>
        <div class="ent-t3-vs-text">VS</div>
        <div class="ent-t3-divider"></div>
      </div>
      <div class="ent-t3-right">
        <div class="ent-t3-avatar">${isAI ? '🤖' : _esc(oppI)}</div>
        <div class="ent-t3-name">${_esc(oppName)}</div>
        <div class="ent-t3-elo">${isAI ? 'AI SPARRING' : `${oppElo} ELO`}</div>
        <div class="ent-t3-record">&nbsp;</div>
      </div>
      <div class="ent-t3-topic">${_esc(topic)}</div>
    </div>
  `;
}
