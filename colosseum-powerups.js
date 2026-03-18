/**
 * colosseum-powerups.js
 * Session 109 Phase 4 — Power-Up System
 *
 * Handles power-up shop, inventory, equipping, and in-debate activation.
 * Depends on: colosseum-auth.js, colosseum-tiers.js
 * Load order: after colosseum-staking.js, before colosseum-arena.js
 */

const ColosseumPowerUps = (() => {
  'use strict';

  // ── Static catalog (mirrors DB, used for instant UI) ──────
  const CATALOG = {
    multiplier_2x: { name: '2x Multiplier', icon: '⚡', cost: 15, desc: 'Double your staking payout if you win' },
    silence:       { name: 'Silence',        icon: '🤫', cost: 20, desc: 'Mute opponent for 10 seconds' },
    shield:        { name: 'Shield',         icon: '🛡️', cost: 25, desc: 'Block one reference challenge' },
    reveal:        { name: 'Reveal',         icon: '👁️', cost: 10, desc: 'See opponent\'s equipped power-ups' }
  };

  // ── Buy a power-up ────────────────────────────────────────
  async function buy(powerUpId, quantity = 1) {
    const result = await ColosseumAuth.safeRpc('buy_power_up', {
      p_power_up_id: powerUpId,
      p_quantity: quantity
    });
    if (result.error) return { success: false, error: result.error.message || 'Purchase failed' };
    return result.data || { success: false, error: 'No response' };
  }

  // ── Equip a power-up for a debate ─────────────────────────
  async function equip(debateId, powerUpId, slotNumber) {
    const result = await ColosseumAuth.safeRpc('equip_power_up', {
      p_debate_id: debateId,
      p_power_up_id: powerUpId,
      p_slot_number: slotNumber
    });
    if (result.error) return { success: false, error: result.error.message || 'Equip failed' };
    return result.data || { success: false, error: 'No response' };
  }

  // ── Get inventory + equipped ──────────────────────────────
  async function getMyPowerUps(debateId = null) {
    const params = {};
    if (debateId) params.p_debate_id = debateId;
    const result = await ColosseumAuth.safeRpc('get_my_power_ups', params);
    if (result.error) return { success: false, inventory: [], equipped: [], questions_answered: 0 };
    return result.data || { success: false, inventory: [], equipped: [], questions_answered: 0 };
  }

  // ── Render the power-up shop ──────────────────────────────
  // Returns HTML string. All data from CATALOG constant — no user input in HTML.
  function renderShop(tokenBalance) {
    const balance = tokenBalance || 0;
    const items = Object.entries(CATALOG).map(([id, pu]) => {
      const canAfford = balance >= pu.cost;
      return `
        <div class="powerup-shop-item" style="
          display:flex;align-items:center;gap:12px;
          padding:12px;background:#1a1a2e;border:1px solid #2a2a3e;
          border-radius:8px;margin-bottom:8px;
        ">
          <div style="font-size:28px;width:40px;text-align:center;">${pu.icon}</div>
          <div style="flex:1;">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:15px;
              font-weight:600;color:#fff;">${pu.name}</div>
            <div style="font-family:'Barlow',sans-serif;font-size:12px;color:#999;">
              ${pu.desc}
            </div>
          </div>
          <button class="powerup-buy-btn" data-id="${id}" data-cost="${pu.cost}"
            ${canAfford ? '' : 'disabled'} style="
            padding:8px 14px;border:none;border-radius:6px;
            background:${canAfford ? 'linear-gradient(135deg,#D4AF37,#B8860B)' : '#2a2a3e'};
            color:${canAfford ? '#0f0f1a' : '#666'};
            font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;
            cursor:${canAfford ? 'pointer' : 'default'};
            white-space:nowrap;
          ">${pu.cost} 🪙</button>
        </div>`;
    });

    return `
      <div class="powerup-shop" style="padding:4px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-family:'Oswald',sans-serif;font-size:14px;color:#D4AF37;
            letter-spacing:1px;text-transform:uppercase;">
            POWER-UP SHOP
          </div>
          <div style="font-family:'Barlow',sans-serif;font-size:12px;color:#999;">
            Balance: <span style="color:#D4AF37;font-weight:600;">${balance} 🪙</span>
          </div>
        </div>
        ${items.join('')}
      </div>`;
  }

  // ── Render equip loadout for pre-debate ───────────────────
  function renderLoadout(inventory, equipped, questionsAnswered, debateId) {
    const maxSlots = ColosseumTiers.getPowerUpSlots(questionsAnswered || 0);
    const tier = ColosseumTiers.getTier(questionsAnswered || 0);

    if (maxSlots === 0) {
      const next = ColosseumTiers.getNextTier(questionsAnswered || 0);
      const remaining = next ? next.questionsNeeded : 0;
      return `
        <div class="powerup-loadout" style="
          background:#1a1a2e;border:1px solid #2a2a3e;border-radius:10px;
          padding:16px;margin:12px 0;opacity:0.7;
        ">
          <div style="font-family:'Oswald',sans-serif;font-size:14px;color:#8a879a;
            letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">
            POWER-UPS 🔒
          </div>
          <div style="font-family:'Barlow',sans-serif;font-size:13px;color:#999;">
            Answer ${remaining} more questions to unlock power-up slots.
          </div>
        </div>`;
    }

    // Build equipped map
    const equippedMap = {};
    if (equipped && equipped.length) {
      equipped.forEach(e => { equippedMap[e.slot_number] = e; });
    }

    // Build slot HTML
    const slots = [];
    for (let i = 1; i <= maxSlots; i++) {
      const eq = equippedMap[i];
      if (eq) {
        const cat = CATALOG[eq.power_up_id] || {};
        slots.push(`
          <div class="powerup-slot filled" data-slot="${i}" style="
            flex:1;min-width:60px;padding:10px 8px;
            background:#D4AF3711;border:1px solid #D4AF3744;
            border-radius:8px;text-align:center;cursor:default;
          ">
            <div style="font-size:24px;">${eq.icon || cat.icon || '?'}</div>
            <div style="font-family:'Barlow',sans-serif;font-size:10px;color:#D4AF37;
              margin-top:4px;">${eq.name || cat.name || ''}</div>
          </div>`);
      } else {
        slots.push(`
          <div class="powerup-slot empty" data-slot="${i}" style="
            flex:1;min-width:60px;padding:10px 8px;
            background:#0f0f1a;border:1px dashed #2a2a3e;
            border-radius:8px;text-align:center;cursor:pointer;
          ">
            <div style="font-size:24px;opacity:0.3;">+</div>
            <div style="font-family:'Barlow',sans-serif;font-size:10px;color:#666;
              margin-top:4px;">Slot ${i}</div>
          </div>`);
      }
    }

    // Build inventory picker (hidden initially, shown when empty slot clicked)
    const invItems = (inventory || []).filter(item => item.quantity > 0).map(item => {
      const cat = CATALOG[item.power_up_id] || {};
      return `
        <div class="powerup-inv-item" data-id="${item.power_up_id}" style="
          display:flex;align-items:center;gap:8px;padding:8px;
          background:#0f0f1a;border:1px solid #2a2a3e;border-radius:6px;
          cursor:pointer;margin-bottom:4px;
        ">
          <span style="font-size:20px;">${item.icon || cat.icon || '?'}</span>
          <span style="font-family:'Barlow',sans-serif;font-size:13px;color:#fff;flex:1;">
            ${item.name || cat.name || ''}
          </span>
          <span style="font-family:'Barlow',sans-serif;font-size:11px;color:#999;">
            x${item.quantity}
          </span>
        </div>`;
    });

    return `
      <div class="powerup-loadout" style="
        background:#1a1a2e;border:1px solid #2a2a3e;border-radius:10px;
        padding:16px;margin:12px 0;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-family:'Oswald',sans-serif;font-size:14px;color:#D4AF37;
            letter-spacing:1px;text-transform:uppercase;">
            POWER-UPS
          </div>
          <div style="font-family:'Barlow',sans-serif;font-size:11px;color:#666;">
            ${tier.icon} ${tier.name} · ${maxSlots} slot${maxSlots !== 1 ? 's' : ''}
          </div>
        </div>
        <div class="powerup-slots" style="display:flex;gap:8px;margin-bottom:8px;">
          ${slots.join('')}
        </div>
        <div id="powerup-inventory-picker" style="display:none;margin-top:8px;">
          <div style="font-family:'Barlow',sans-serif;font-size:12px;color:#999;margin-bottom:6px;">
            Choose a power-up:
          </div>
          ${invItems.length > 0 ? invItems.join('') : '<div style="font-family:\'Barlow\',sans-serif;font-size:12px;color:#666;">No power-ups owned. <a href="#" class="powerup-open-shop" style="color:#D4AF37;text-decoration:none;">Buy some →</a></div>'}
        </div>
        <div id="powerup-equip-error" style="
          font-family:'Barlow',sans-serif;font-size:12px;color:#cc0000;
          margin-top:4px;display:none;
        "></div>
      </div>`;
  }

  // ── Wire loadout interactivity ────────────────────────────
  function wireLoadout(debateId, onEquipped) {
    let selectedSlot = null;

    // Empty slot click → show inventory picker
    document.querySelectorAll('.powerup-slot.empty').forEach(slot => {
      slot.addEventListener('click', () => {
        selectedSlot = parseInt(slot.dataset.slot, 10);
        const picker = document.getElementById('powerup-inventory-picker');
        if (picker) picker.style.display = 'block';

        // Highlight selected slot
        document.querySelectorAll('.powerup-slot').forEach(s => {
          s.style.borderColor = s === slot ? '#D4AF37' : (s.classList.contains('filled') ? '#D4AF3744' : '#2a2a3e');
        });
      });
    });

    // Inventory item click → equip
    document.querySelectorAll('.powerup-inv-item').forEach(item => {
      item.addEventListener('click', async () => {
        if (selectedSlot === null) return;

        const powerUpId = item.dataset.id;
        const errorEl = document.getElementById('powerup-equip-error');

        item.style.opacity = '0.5';
        item.style.pointerEvents = 'none';

        const result = await equip(debateId, powerUpId, selectedSlot);

        if (result.success) {
          if (errorEl) errorEl.style.display = 'none';
          if (typeof onEquipped === 'function') onEquipped(result);
        } else {
          item.style.opacity = '1';
          item.style.pointerEvents = 'auto';
          if (errorEl) {
            errorEl.textContent = result.error || 'Equip failed';
            errorEl.style.display = 'block';
          }
        }
      });
    });
  }

  // ── Activate a power-up during debate ─────────────────────
  async function activate(debateId, powerUpId) {
    const result = await ColosseumAuth.safeRpc('activate_power_up', {
      p_debate_id: debateId,
      p_power_up_id: powerUpId
    });
    if (result.error) return { success: false, error: result.error.message || 'Activation failed' };
    return result.data || { success: false, error: 'No response' };
  }

  // ── Reveal: fetch opponent's equipped power-ups ─────────
  async function getOpponentPowerUps(debateId) {
    const result = await ColosseumAuth.safeRpc('get_opponent_power_ups', {
      p_debate_id: debateId
    });
    if (result.error) return { success: false, equipped: [] };
    return result.data || { success: false, equipped: [] };
  }

  // ── Render in-debate activation bar ─────────────────────
  // Shows equipped power-ups as tappable buttons during the debate.
  // 2x Multiplier is passive (no tap needed) — shown as a gold badge.
  function renderActivationBar(equipped) {
    if (!equipped || equipped.length === 0) return '';

    const buttons = equipped.map(eq => {
      const cat = CATALOG[eq.power_up_id] || {};
      const isPassive = eq.power_up_id === 'multiplier_2x';
      return `
        <button class="powerup-activate-btn ${isPassive ? 'passive' : ''}"
          data-id="${eq.power_up_id}" data-slot="${eq.slot_number}"
          ${isPassive ? 'disabled title="Active — doubles staking payout"' : ''}
          style="
            display:flex;align-items:center;gap:6px;padding:8px 12px;
            border-radius:10px;border:1px solid ${isPassive ? '#D4AF3744' : '#D4AF3766'};
            background:${isPassive ? '#D4AF3711' : 'rgba(15,15,26,0.9)'};
            color:${isPassive ? '#D4AF37' : '#fff'};
            font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;
            cursor:${isPassive ? 'default' : 'pointer'};
            white-space:nowrap;transition:all 0.2s;
          ">
          <span style="font-size:18px;">${eq.icon || cat.icon || '?'}</span>
          <span>${isPassive ? 'ACTIVE' : 'USE'}</span>
        </button>`;
    });

    return `
      <div id="powerup-activation-bar" style="
        display:flex;gap:8px;padding:8px 16px;
        overflow-x:auto;flex-shrink:0;
        border-top:1px solid rgba(212,168,67,0.15);
        background:rgba(10,17,40,0.6);
      ">
        <div style="font-family:'Oswald',sans-serif;font-size:10px;color:#D4AF37;
          letter-spacing:1.5px;display:flex;align-items:center;margin-right:4px;
          text-transform:uppercase;white-space:nowrap;">
          POWER-UPS
        </div>
        ${buttons.join('')}
      </div>`;
  }

  // ── Wire activation bar click handlers ──────────────────
  // callbacks: { onSilence, onShield, onReveal }
  function wireActivationBar(debateId, callbacks) {
    document.querySelectorAll('.powerup-activate-btn:not(.passive):not(.used)').forEach(btn => {
      btn.addEventListener('click', async () => {
        const powerUpId = btn.dataset.id;

        // Disable immediately to prevent double-tap
        btn.disabled = true;
        btn.style.opacity = '0.5';

        // Call server to mark activated
        const result = await activate(debateId, powerUpId);

        if (!result.success) {
          btn.disabled = false;
          btn.style.opacity = '1';
          return;
        }

        // Mark as used visually
        btn.classList.add('used');
        btn.style.background = 'rgba(46,204,113,0.1)';
        btn.style.borderColor = 'rgba(46,204,113,0.3)';
        btn.querySelector('span:last-child').textContent = 'USED';

        // Trigger the effect
        if (powerUpId === 'silence' && callbacks?.onSilence) {
          callbacks.onSilence();
        } else if (powerUpId === 'shield' && callbacks?.onShield) {
          callbacks.onShield();
        } else if (powerUpId === 'reveal' && callbacks?.onReveal) {
          callbacks.onReveal();
        }
      });
    });
  }

  // ── Render Silence countdown overlay ────────────────────
  function renderSilenceOverlay(opponentName) {
    const overlay = document.createElement('div');
    overlay.id = 'powerup-silence-overlay';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;
      display:flex;align-items:center;justify-content:center;gap:10px;
      padding:12px 16px;
      background:linear-gradient(135deg,rgba(212,168,67,0.15),rgba(204,41,54,0.1));
      border-bottom:1px solid rgba(212,168,67,0.3);
      z-index:200;
      animation:arenaFadeIn 0.3s ease;
    `;
    overlay.innerHTML = `
      <span style="font-size:22px;">🤫</span>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:600;color:#D4AF37;letter-spacing:1px;">
        ${opponentName || 'Opponent'} SILENCED
      </span>
      <span id="silence-countdown" style="font-family:'Oswald',sans-serif;font-size:18px;color:#fff;min-width:30px;text-align:center;">10</span>
    `;
    document.body.appendChild(overlay);

    let remaining = 10;
    const timer = setInterval(() => {
      remaining--;
      const el = document.getElementById('silence-countdown');
      if (el) el.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(timer);
        overlay.remove();
      }
    }, 1000);

    return timer;
  }

  // ── Render Reveal popup ─────────────────────────────────
  function renderRevealPopup(equipped) {
    // Remove existing
    document.getElementById('powerup-reveal-popup')?.remove();

    const items = (equipped || []).map(eq => {
      const cat = CATALOG[eq.power_up_id] || {};
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px;
          background:#0f0f1a;border:1px solid #2a2a3e;border-radius:8px;">
          <span style="font-size:22px;">${eq.icon || cat.icon || '?'}</span>
          <span style="font-family:'Barlow',sans-serif;font-size:13px;color:#fff;">
            ${eq.name || cat.name || eq.power_up_id}
          </span>
        </div>`;
    });

    const popup = document.createElement('div');
    popup.id = 'powerup-reveal-popup';
    popup.style.cssText = `
      position:fixed;inset:0;z-index:300;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.6);
      animation:arenaFadeIn 0.3s ease;
    `;
    popup.innerHTML = `
      <div style="
        background:#12122a;border:1px solid #D4AF3744;border-radius:14px;
        padding:20px;max-width:280px;width:90%;
      ">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;color:#D4AF37;
          letter-spacing:2px;text-align:center;margin-bottom:12px;">
          👁️ OPPONENT'S LOADOUT
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${items.length > 0 ? items.join('') : '<div style="font-family:\'Barlow\',sans-serif;font-size:13px;color:#999;text-align:center;">No power-ups equipped</div>'}
        </div>
        <button id="reveal-close-btn" style="
          display:block;width:100%;margin-top:14px;padding:10px;
          border-radius:10px;border:1px solid rgba(255,255,255,0.1);
          background:none;color:#999;font-family:'Barlow',sans-serif;
          font-size:13px;cursor:pointer;
        ">DISMISS</button>
      </div>
    `;
    document.body.appendChild(popup);

    // Close handlers
    popup.addEventListener('click', (e) => {
      if (e.target === popup || e.target.id === 'reveal-close-btn') popup.remove();
    });

    // Auto-dismiss after 8s
    setTimeout(() => popup.remove(), 8000);
  }

  // ── Render Shield active indicator ──────────────────────
  function renderShieldIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'powerup-shield-indicator';
    indicator.style.cssText = `
      position:fixed;top:0;right:16px;
      padding:6px 12px;
      background:rgba(212,168,67,0.15);border:1px solid rgba(212,168,67,0.3);
      border-radius:0 0 8px 8px;
      font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;
      color:#D4AF37;letter-spacing:1px;z-index:100;
    `;
    indicator.textContent = '🛡️ SHIELD ACTIVE';
    document.body.appendChild(indicator);
    return indicator;
  }

  function removeShieldIndicator() {
    document.getElementById('powerup-shield-indicator')?.remove();
  }

  // ── Check if 2x multiplier is equipped ──────────────────
  function hasMultiplier(equipped) {
    return (equipped || []).some(eq => eq.power_up_id === 'multiplier_2x');
  }

  // ── Public API ────────────────────────────────────────────
  return {
    CATALOG,
    buy,
    equip,
    activate,
    getMyPowerUps,
    getOpponentPowerUps,
    renderShop,
    renderLoadout,
    wireLoadout,
    renderActivationBar,
    wireActivationBar,
    renderSilenceOverlay,
    renderRevealPopup,
    renderShieldIndicator,
    removeShieldIndicator,
    hasMultiplier
  };
})();

window.ColosseumPowerUps = ColosseumPowerUps;
