/**
 * arena-entrance-render.ts — Tier HTML builders
 * _renderTier1, _renderTier2, _renderTier3.
 * Uses escapeHTML from config.ts (replaces the local _esc helper which was missing apostrophe).
 */

import { escapeHTML } from '../config.ts';

const esc = escapeHTML;

export function renderTier1(
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
          <div class="ent-t1-avatar">${esc(myI)}</div>
          <div class="ent-t1-name">${esc(myName)}</div>
          <div class="ent-t1-elo">${Number(myElo)} ELO</div>
        </div>
        <div class="ent-t1-sword">⚔️</div>
        <div class="ent-t1-debater">
          <div class="ent-t1-avatar">${isAI ? '🤖' : esc(oppI)}</div>
          <div class="ent-t1-name">${esc(oppName)}</div>
          <div class="ent-t1-elo">${isAI ? 'AI' : `${Number(oppElo)} ELO`}</div>
        </div>
      </div>
    </div>
  `;
}

export function renderTier2(
  stage: HTMLElement,
  myI: string, myName: string, myElo: number,
  oppI: string, oppName: string, oppElo: number,
  isAI: boolean, topic: string, isRanked: boolean
): void {
  stage.innerHTML = `
    <div class="ent-t2-wrap-outer">
      <div class="ent-t2-left">
        <div class="ent-t2-avatar">${esc(myI)}</div>
        <div class="ent-t2-name">${esc(myName)}</div>
        <div class="ent-t2-elo">${Number(myElo)} ELO</div>
      </div>
      <div class="ent-t2-center"><div class="ent-t2-vs-text">VS</div></div>
      <div class="ent-t2-right">
        <div class="ent-t2-avatar">${isAI ? '🤖' : esc(oppI)}</div>
        <div class="ent-t2-name">${esc(oppName)}</div>
        <div class="ent-t2-elo">${isAI ? 'AI' : `${Number(oppElo)} ELO`}</div>
      </div>
      <div class="ent-t2-clash">⚔️</div>
    </div>
    <div class="ent-t2-topic">${esc(topic)}</div>
    ${isRanked ? '<div class="ent-ranked-badge" style="top:auto;bottom:8%;">⚔️ RANKED</div>' : ''}
  `;
}

export function renderTier3(
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
        <div class="ent-t3-avatar">${esc(myI)}</div>
        <div class="ent-t3-name">${esc(myName)}</div>
        <div class="ent-t3-elo">${Number(myElo)} ELO</div>
        <div class="ent-t3-record">${Number(wins)}W – ${Number(losses)}L</div>
      </div>
      <div class="ent-t3-center">
        <div class="ent-t3-divider"></div>
        <div class="ent-t3-vs-text">VS</div>
        <div class="ent-t3-divider"></div>
      </div>
      <div class="ent-t3-right">
        <div class="ent-t3-avatar">${isAI ? '🤖' : esc(oppI)}</div>
        <div class="ent-t3-name">${esc(oppName)}</div>
        <div class="ent-t3-elo">${isAI ? 'AI SPARRING' : `${Number(oppElo)} ELO`}</div>
        <div class="ent-t3-record">&nbsp;</div>
      </div>
      <div class="ent-t3-topic">${esc(topic)}</div>
    </div>
  `;
}
