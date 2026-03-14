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
    const result = await safeRpc('buy_power_up', {
      p_power_up_id: powerUpId,
      p_quantity: quantity
    });
    if (result.error) return { success: false, error: result.error.message || 'Purchase failed' };
    return result.data || { success: false, error: 'No response' };
  }

  // ── Equip a power-up for a debate ─────────────────────────
  async function equip(debateId, powerUpId, slotNumber) {
    const result = await safeRpc('equip_power_up', {
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
    const result = await safeRpc('get_my_power_ups', params);
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
      const remaining = next ? next.minQuestions - (questionsAnswered || 0) : 0;
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

  // ── Public API ────────────────────────────────────────────
  return {
    CATALOG,
    buy,
    equip,
    getMyPowerUps,
    renderShop,
    renderLoadout,
    wireLoadout
  };
})();

window.ColosseumPowerUps = ColosseumPowerUps;
