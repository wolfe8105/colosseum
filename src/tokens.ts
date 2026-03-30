/**
 * THE MODERATOR — Token Earn System (TypeScript)
 *
 * Runtime module — replaces moderator-tokens.js when Vite build is active.
 * Depends on: config.ts, auth.ts
 *
 * Migration: Session 126 (Phase 2), Session 138 (cutover — imports replace globalThis reads)
 */

import { showToast, escapeHTML } from './config.ts';
import { safeRpc, getCurrentUser, getCurrentProfile, getIsPlaceholderMode, onChange } from './auth.ts';
import type { Profile } from './auth.ts';
import { nudge } from './nudge.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type MilestoneKey =
  | 'first_hot_take'
  | 'first_debate'
  | 'first_vote'
  | 'first_reaction'
  | 'first_ai_sparring'
  | 'first_prediction'
  | 'profile_3_sections'
  | 'profile_6_sections'
  | 'profile_12_sections'
  | 'verified_gladiator'
  | 'streak_7'
  | 'streak_30'
  | 'streak_100';

export interface MilestoneDefinition {
  readonly tokens: number;
  readonly label: string;
  readonly icon: string;
  readonly freezes?: number;
}

export interface ClaimResult {
  success: boolean;
  error?: string;
  tokens_earned?: number;
  new_balance?: number;
  freezes_earned?: number;
  is_winner?: boolean;
  upset_bonus?: number;
  freeze_used?: boolean;
  streak_bonus?: number;
  login_streak?: number;
  token_balance?: number;
}

export interface MilestoneListItem extends MilestoneDefinition {
  key: string;
  claimed: boolean;
}

export interface TokenSummary {
  success: boolean;
  token_balance?: number;
  [key: string]: unknown;
}

// ============================================================
// MODULE STATE
// ============================================================

let lastKnownBalance: number | null = null;
const milestoneClaimed = new Set<string>();
let dailyLoginClaimed = false;

// ============================================================
// MILESTONE DEFINITIONS
// ============================================================

export const MILESTONES: Readonly<Record<MilestoneKey, MilestoneDefinition>> = {
  first_hot_take:     { tokens: 25,  label: 'First Hot Take',    icon: '🔥' },
  first_debate:       { tokens: 50,  label: 'First Debate',      icon: '⚔️' },
  first_vote:         { tokens: 10,  label: 'First Vote',        icon: '🗳️' },
  first_reaction:     { tokens: 5,   label: 'First Reaction',    icon: '👊' },
  first_ai_sparring:  { tokens: 15,  label: 'First AI Sparring', icon: '🤖' },
  first_prediction:   { tokens: 10,  label: 'First Prediction',  icon: '🎯' },
  profile_3_sections: { tokens: 30,  label: '3 Profile Sections', icon: '📝' },
  profile_6_sections: { tokens: 75,  label: '6 Profile Sections', icon: '📋' },
  profile_12_sections:{ tokens: 150, label: 'All 12 Sections',   icon: '🏆' },
  verified_gladiator: { tokens: 100, label: 'Verified Gladiator', icon: '🛡️' },
  streak_7:           { tokens: 0,   label: '7-Day Streak',      icon: '❄️', freezes: 1 },
  streak_30:          { tokens: 0,   label: '30-Day Streak',      icon: '❄️', freezes: 3 },
  streak_100:         { tokens: 0,   label: '100-Day Streak',     icon: '❄️', freezes: 5 },
} as const;

// ============================================================
// CSS INJECTION
// ============================================================

let cssInjected = false;

function _injectCSS(): void {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes tokenFlyUp {
      0%   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
      60%  { opacity:1; transform:translateX(-50%) translateY(-60px) scale(1.2); }
      100% { opacity:0; transform:translateX(-50%) translateY(-100px) scale(0.8); }
    }
    @keyframes tokenFlash {
      0%   { box-shadow:0 0 0 0 rgba(212,168,67,0); }
      30%  { box-shadow:0 0 20px 8px var(--mod-accent-border); }
      100% { box-shadow:0 0 0 0 rgba(212,168,67,0); }
    }
    @keyframes milestoneSlide {
      0%   { opacity:0; transform:translateX(-50%) translateY(20px) scale(0.9); }
      20%  { opacity:1; transform:translateX(-50%) translateY(0) scale(1.05); }
      30%  { transform:translateX(-50%) translateY(0) scale(1); }
      80%  { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
      100% { opacity:0; transform:translateX(-50%) translateY(-10px) scale(0.95); }
    }
    .token-fly-coin {
      position:fixed; left:50%; z-index:100000; font-size:28px;
      pointer-events:none; animation: tokenFlyUp 0.9s ease-out forwards;
    }
    .token-earn-toast {
      position:fixed; top:20px; left:50%; transform:translateX(-50%);
      background:linear-gradient(135deg, #D4A843 0%, #b8942e 100%);
      color:#0A0A1A; font-family:"Cinzel",serif; font-weight:700;
      padding:10px 20px; border-radius:8px; z-index:99999; font-size:15px;
      white-space:nowrap; animation: tokenFlash 0.6s ease-out;
      box-shadow: 0 4px 12px var(--mod-accent-border);
    }
    .milestone-toast {
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:linear-gradient(135deg, #1a2d4a 0%, #2d5a8e 100%);
      border:2px solid #D4A843; color:#f0f0f0;
      font-family:"Barlow Condensed",sans-serif; font-weight:600;
      padding:14px 24px; border-radius:12px; z-index:99999; font-size:15px;
      text-align:center; max-width:320px;
      animation: milestoneSlide 3.5s ease-in-out forwards;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .milestone-toast .mt-icon   { font-size:28px; display:block; margin-bottom:4px; }
    .milestone-toast .mt-label  { color:#D4A843; font-family:"Cinzel",serif; font-size:14px; letter-spacing:1px; }
    .milestone-toast .mt-reward { font-size:13px; margin-top:4px; color:#a0a8b8; }
  `;
  document.head.appendChild(style);
}

// ============================================================
// ANIMATIONS
// ============================================================

function _coinFlyUp(): void {
  _injectCSS();
  const coin = document.createElement('div');
  coin.className = 'token-fly-coin';
  coin.textContent = '🪙';
  const bar = document.getElementById('token-display');
  if (bar) {
    const rect = bar.getBoundingClientRect();
    coin.style.left = rect.left + rect.width / 2 + 'px';
    coin.style.top  = rect.bottom + 'px';
  } else {
    coin.style.top = '60px';
  }
  document.body.appendChild(coin);
  setTimeout(() => coin.remove(), 1000);
}

function _tokenToast(tokens: number, label: string): void {
  if (!tokens || tokens <= 0) return;
  _injectCSS();
  _coinFlyUp();
  const msg = `+${tokens} 🪙 ${label}`;
  showToast(msg, 'success');
}

function _milestoneToast(icon: string, label: string, tokens: number, freezes: number): void {
  _injectCSS();
  const el = document.createElement('div');
  el.className = 'milestone-toast';
  let rewardText = '';
  if (tokens > 0)              rewardText = `+${Number(tokens)} 🪙 tokens`;
  if (freezes > 0)             rewardText = `+${Number(freezes)} ❄️ streak freeze${freezes > 1 ? 's' : ''}`;
  if (tokens > 0 && freezes > 0) rewardText = `+${Number(tokens)} 🪙 + ${Number(freezes)} ❄️`;
  el.innerHTML = `
    <span class="mt-icon">${escapeHTML(icon || '🏆')}</span>
    <span class="mt-label">MILESTONE UNLOCKED</span>
    <div style="font-size:16px;margin-top:2px;color:#f0f0f0;">${escapeHTML(label)}</div>
    <div class="mt-reward">${escapeHTML(rewardText)}</div>
  `;
  document.body.appendChild(el);
  if (tokens > 0) _coinFlyUp();
  setTimeout(() => el.remove(), 3600);
}

// ============================================================
// BALANCE DISPLAY
// ============================================================

function _updateBalanceDisplay(newBalance: number | null | undefined): void {
  if (newBalance == null) return;
  lastKnownBalance = newBalance;
  document.querySelectorAll('[data-token-balance]').forEach(el => {
    el.textContent = newBalance.toLocaleString();
  });
  const balEl = document.getElementById('token-balance');
  if (balEl) balEl.textContent = newBalance.toLocaleString();
  const countEl = document.getElementById('token-count');
  if (countEl) countEl.textContent = newBalance.toLocaleString();
  const bar = document.getElementById('token-display');
  if (bar) {
    bar.style.animation = 'tokenFlash 0.6s ease-out';
    setTimeout(() => { bar.style.animation = ''; }, 700);
  }
}

// ============================================================
// ORANGE DOT (F-35.3)
// ============================================================

function updateOrangeDot(): void {
  const profile = getCurrentProfile();
  const hasFreezes = (profile?.streak_freezes ?? 0) > 0;
  const show = !dailyLoginClaimed || hasFreezes;
  const dot = document.getElementById('token-dot');
  if (dot) dot.style.display = show ? 'block' : 'none';
}

// ============================================================
// SAFE RPC HELPER (uses imported safeRpc from auth.ts)
// ============================================================

async function _rpc(fnName: string, args: Record<string, unknown> = {}): Promise<ClaimResult | null> {
  if (getIsPlaceholderMode()) return null;
  if (!getCurrentUser()) return null;
  try {
    const { data, error } = await safeRpc(fnName, args);
    if (error) {
      console.warn(`[Tokens] ${fnName} error:`, error.message ?? error);
      return null;
    }
    return data as ClaimResult;
  } catch (e) {
    console.warn(`[Tokens] ${fnName} exception:`, e);
    return null;
  }
}

// ============================================================
// TOKEN GATE
// ============================================================

export function requireTokens(amount: number, actionLabel?: string): boolean {
  const profile = getCurrentProfile();
  if (!profile) return true;
  const balance = profile.token_balance || 0;
  if (balance >= amount) return true;
  const deficit = amount - balance;
  const msg = `Need ${amount} tokens to ${actionLabel ?? 'do that'} (${deficit} more to go)`;
  showToast(msg, 'error');
  return false;
}

// ============================================================
// MILESTONE CLAIM
// ============================================================

export async function claimMilestone(key: MilestoneKey): Promise<ClaimResult | null> {
  if (milestoneClaimed.has(key)) return null;
  const def = MILESTONES[key];
  if (!def) return null;
  const result = await _rpc('claim_milestone', { p_milestone_key: key });
  if (!result?.success) {
    if (result?.error === 'Already claimed') milestoneClaimed.add(key);
    return null;
  }
  milestoneClaimed.add(key);
  if (result.new_balance != null) _updateBalanceDisplay(result.new_balance);
  _milestoneToast(def.icon, def.label, result.tokens_earned ?? 0, result.freezes_earned ?? 0);
  console.log(`[Tokens] Milestone: ${key} → +${result.tokens_earned ?? 0} tokens, +${result.freezes_earned ?? 0} freezes`);
  return result;
}

export async function _loadMilestones(): Promise<void> {
  const result = await _rpc('get_my_milestones');
  if (!result?.success) return;
  const claimed = (result as unknown as { claimed?: string[] }).claimed;
  if (claimed && Array.isArray(claimed)) {
    claimed.forEach(k => milestoneClaimed.add(k));
  }
}

function _checkStreakMilestones(streak: number): void {
  if (!streak) return;
  if (streak >= 7)   void claimMilestone('streak_7');
  if (streak >= 30)  void claimMilestone('streak_30');
  if (streak >= 100) void claimMilestone('streak_100');
}

// ============================================================
// PUBLIC CLAIM FUNCTIONS
// ============================================================

export async function claimDailyLogin(): Promise<ClaimResult | null> {
  const result = await _rpc('claim_daily_login');
  if (!result) return null;
  if (!result.success) {
    if (result.error !== 'Already claimed today') {
      console.warn('[Tokens] Daily login:', result.error);
    }
    // Daily already claimed — mark and update dot regardless
    dailyLoginClaimed = true;
    updateOrangeDot();
    return null;
  }
  dailyLoginClaimed = true;
  updateOrangeDot();
  _updateBalanceDisplay(result.new_balance);
  let label = 'Daily login';
  if (result.freeze_used) {
    label = 'Daily login (❄️ freeze saved your streak!)';
  } else if ((result.streak_bonus ?? 0) > 0) {
    label = `Daily login + ${result.login_streak ?? 0}-day streak!`;
  }
  _tokenToast(result.tokens_earned ?? 0, label);
  nudge('return_visit', '🔥 Welcome back. The arena missed you.');
  console.log(`[Tokens] Daily login: +${result.tokens_earned ?? 0} (streak: ${result.login_streak ?? 0}, freeze used: ${result.freeze_used ?? false})`);
  _checkStreakMilestones(result.login_streak ?? 0);
  return result;
}

export async function claimHotTake(hotTakeId: string): Promise<ClaimResult | null> {
  if (!hotTakeId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'Hot take');
  void claimMilestone('first_hot_take');
  return result;
}

export async function claimReaction(hotTakeId: string): Promise<ClaimResult | null> {
  if (!hotTakeId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'reaction', p_reference_id: hotTakeId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'Reaction');
  void claimMilestone('first_reaction');
  return result;
}

export async function claimVote(debateId: string): Promise<ClaimResult | null> {
  if (!debateId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'Vote');
  void claimMilestone('first_vote');
  return result;
}

export async function claimDebate(debateId: string): Promise<ClaimResult | null> {
  if (!debateId) return null;
  const result = await _rpc('claim_debate_tokens', { p_debate_id: debateId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  let label = 'Debate complete';
  if (result.is_winner) {
    label = 'Debate win!';
    if ((result.upset_bonus ?? 0) > 0) label = 'Upset victory!';
  }
  _tokenToast(result.tokens_earned ?? 0, label);
  void claimMilestone('first_debate');
  return result;
}

export async function claimAiSparring(debateId: string): Promise<ClaimResult | null> {
  if (!debateId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'ai_sparring', p_reference_id: debateId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'AI Sparring');
  void claimMilestone('first_ai_sparring');
  return result;
}

export async function claimPrediction(debateId: string): Promise<ClaimResult | null> {
  if (!debateId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'prediction', p_reference_id: debateId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'Prediction');
  void claimMilestone('first_prediction');
  return result;
}

export async function checkProfileMilestones(completedCount: number): Promise<void> {
  if (!completedCount) return;
  if (completedCount >= 3)  void claimMilestone('profile_3_sections');
  if (completedCount >= 6)  void claimMilestone('profile_6_sections');
  if (completedCount >= 12) void claimMilestone('profile_12_sections');
  if (completedCount >= 3)  void claimMilestone('verified_gladiator');
}

export async function getSummary(): Promise<TokenSummary | null> {
  const result = await _rpc('get_my_token_summary');
  if (!result?.success) return null;
  _updateBalanceDisplay((result as unknown as TokenSummary).token_balance);
  return result as unknown as TokenSummary;
}

export function getMilestoneList(): MilestoneListItem[] {
  return Object.entries(MILESTONES).map(([key, def]) => ({
    key,
    ...def,
    claimed: milestoneClaimed.has(key),
  }));
}

// ============================================================
// GETTERS
// ============================================================

export function getBalance(): number | null {
  return lastKnownBalance;
}

// ============================================================
// INIT (matches moderator-tokens.js _init())
// ============================================================

export function init(): void {
  _injectCSS();
  onChange((user, profile) => {
    if (user && profile) {
      if (profile.token_balance != null) {
        _updateBalanceDisplay(profile.token_balance);
      }
      // Reset daily state on each auth cycle, show dot optimistically
      dailyLoginClaimed = false;
      updateOrangeDot();
      claimDailyLogin();
      _loadMilestones();
    } else {
      // Logged out — hide dot
      const dot = document.getElementById('token-dot');
      if (dot) dot.style.display = 'none';
    }
  });
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const tokens = {
  init,
  claimDailyLogin,
  claimHotTake,
  claimReaction,
  claimVote,
  claimDebate,
  claimAiSparring,
  claimPrediction,
  getSummary,
  requireTokens,
  claimMilestone,
  checkProfileMilestones,
  getMilestoneList,
  get balance() { return lastKnownBalance; },
  get MILESTONES() { return MILESTONES; },
} as const;

export default tokens;

// ============================================================

// ============================================================
// AUTO-INIT (same pattern as .js IIFE)
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
