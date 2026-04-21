/**
 * THE MODERATOR — Leaderboard Elo Explainer
 * showEloExplainer — the Elo rating explainer modal.
 */

export function showEloExplainer(): void {
  document.getElementById('elo-explainer-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'elo-explainer-modal';
  modal.style.cssText =
    'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:flex-end;justify-content:center;animation:coloFadeIn 0.2s ease;';

  modal.innerHTML = `
    <div style="
      background:linear-gradient(180deg,var(--mod-bg-card) 0%,var(--mod-bg-card) 100%);
      border:1px solid var(--mod-accent-border);border-radius:16px 16px 0 0;
      padding:24px 20px 32px;max-width:420px;width:100%;
      max-height:70vh;overflow-y:auto;animation:coloSlideUp 0.25s ease;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-family:var(--mod-font-display);font-size:18px;color:var(--mod-accent);font-weight:700;letter-spacing:2px;">⚔️ ELO RATING</div>
        <button data-action="close-elo-explainer" style="background:none;border:none;color:var(--mod-text-sub);font-size:22px;cursor:pointer;padding:4px 8px;line-height:1;">&times;</button>
      </div>
      <div style="color:var(--mod-text-heading); font-family:var(--mod-font-ui);font-size:15px;line-height:1.6;">
        <p style="margin-bottom:14px;">
          Your Elo is a <strong style="color:var(--mod-accent);">skill number</strong> that goes up when you win and down when you lose.
          Everyone starts at <strong style="color:var(--mod-accent);">1200</strong>.
        </p>
        <div style="background:var(--mod-bg-subtle);border-radius:8px;padding:14px;margin-bottom:14px;">
          <div style="font-weight:700;color:var(--mod-accent);margin-bottom:8px;font-size:13px;letter-spacing:1px;">HOW IT MOVES</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:var(--mod-cyan);font-size:18px;">▲</span>
              <span>Beat someone ranked <em>higher</em> than you = <strong style="color:var(--mod-cyan);">big gain</strong></span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:var(--mod-cyan);font-size:18px;">▲</span>
              <span>Beat someone ranked <em>lower</em> than you = <strong style="color:var(--mod-text-sub);">small gain</strong></span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:var(--mod-magenta);font-size:18px;">▼</span>
              <span>Lose to someone ranked <em>lower</em> = <strong style="color:var(--mod-magenta);">big drop</strong></span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:var(--mod-magenta);font-size:18px;">▼</span>
              <span>Lose to someone ranked <em>higher</em> = <strong style="color:var(--mod-text-sub);">small drop</strong></span>
            </div>
          </div>
        </div>
        <div style="background:var(--mod-bg-subtle);border-radius:8px;padding:14px;margin-bottom:14px;">
          <div style="font-weight:700;color:var(--mod-accent);margin-bottom:8px;font-size:13px;letter-spacing:1px;">WHAT THE NUMBERS MEAN</div>
          <div style="display:flex;flex-direction:column;gap:4px;font-size:14px;">
            <div><span style="color:var(--mod-text-sub);">1000–1199</span> — Getting started</div>
            <div><span style="color:var(--mod-cyan);">1200–1399</span> — Solid debater</div>
            <div><span style="color:var(--mod-side-b);">1400–1599</span> — Sharp mind</div>
            <div><span style="color:var(--mod-magenta);">1600–1799</span> — Heavy hitter</div>
            <div><span style="color:var(--mod-accent);">1800+</span> — Gladiator elite</div>
          </div>
        </div>
        <p style="color:var(--mod-text-sub);font-size:13px;">
          Elo only moves in <strong>Ranked</strong> debates. Casual mode keeps your rating safe.
        </p>
      </div>
    </div>
  `;

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}
