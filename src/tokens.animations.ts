/**
 * THE MODERATOR — Token Animations
 * _injectCSS, _coinFlyUp, _tokenToast, _milestoneToast.
 */

import { escapeHTML, showToast } from './config.ts';

// LANDMINE [LM-TOK-001]: CSS injection hardcodes #b8942e (gold gradient end) and
// #2d5a8e (milestone toast blue) — no CSS var token equivalents exist yet.

let cssInjected = false;

export function _injectCSS(): void {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes tokenFlyUp {
      0%   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
      60%  { opacity:1; transform:translateX(-50%) translateY(-60px) scale(1.2); }
      100% { opacity:0; transform:translateX(-50%) translateY(-100px) scale(0.8); }
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
      background:linear-gradient(135deg, var(--mod-accent) 0%, #b8942e /* TODO: needs CSS var token */ 100%);
      color:var(--mod-bg-base); font-family:var(--mod-font-display); font-weight:700;
      padding:10px 20px; border-radius:8px; z-index:99999; font-size:15px;
      white-space:nowrap; box-shadow: 0 4px 12px var(--mod-accent-border);
    }
    .milestone-toast {
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:linear-gradient(135deg, var(--mod-bg-card) 0%, #2d5a8e /* TODO: needs CSS var token */ 100%);
      border:2px solid var(--mod-accent); color:var(--mod-text-heading);
      font-family:var(--mod-font-ui); font-weight:600;
      padding:14px 24px; border-radius:12px; z-index:99999; font-size:15px;
      text-align:center; max-width:320px;
      animation: milestoneSlide 3.5s ease-in-out forwards;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .milestone-toast .mt-icon   { font-size:28px; display:block; margin-bottom:4px; }
    .milestone-toast .mt-label  { color:var(--mod-accent); font-family:var(--mod-font-display); font-size:14px; letter-spacing:1px; }
    .milestone-toast .mt-reward { font-size:13px; margin-top:4px; color:var(--mod-text-sub); }
  `;
  document.head.appendChild(style);
}

export function _coinFlyUp(): void {
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

export function _tokenToast(tokens: number, label: string): void {
  if (!tokens || tokens <= 0) return;
  _injectCSS();
  _coinFlyUp();
  showToast(`+${tokens} 🪙 ${label}`, 'success');
}

export function _milestoneToast(icon: string, label: string, tokens: number, freezes: number): void {
  _injectCSS();
  const el = document.createElement('div');
  el.className = 'milestone-toast';
  let rewardText = '';
  if (tokens > 0)   rewardText = `+${Number(tokens)} 🪙 tokens`;
  if (freezes > 0)  rewardText = `+${Number(freezes)} ❄️ streak freeze${freezes > 1 ? 's' : ''}`;
  if (tokens > 0 && freezes > 0) rewardText = `+${Number(tokens)} 🪙 + ${Number(freezes)} ❄️`;
  el.innerHTML = `
    <span class="mt-icon">${escapeHTML(icon || '🏆')}</span>
    <span class="mt-label">MILESTONE UNLOCKED</span>
    <div style="font-size:16px;margin-top:2px;color:var(--mod-text-heading);">${escapeHTML(label)}</div>
    <div class="mt-reward">${escapeHTML(rewardText)}</div>
  `;
  document.body.appendChild(el);
  if (tokens > 0) _coinFlyUp();
  setTimeout(() => el.remove(), 3600);
}
