/**
 * groups.members.modal.html.ts — Member Actions Modal DOM Builder
 *
 * Pure DOM construction only — no business logic, no event wiring.
 * Event listeners are wired in groups.members.modal.ts inside
 * openMemberActionsModal() on first call.
 *
 * Extracted from groups.members.modal.ts (Session 254 track).
 */

export function _injectMemberActionsModal(): void {
  if (document.getElementById('member-actions-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'member-actions-modal';
  modal.style.cssText = [
    'display:none',
    'position:fixed',
    'inset:0',
    'z-index:1000',
    'background:rgba(0,0,0,0.75)',
    'backdrop-filter:blur(4px)',
    'align-items:center',
    'justify-content:center',
  ].join(';');

  modal.innerHTML = `
    <div style="
      background:rgba(13,22,40,0.98);
      border:1px solid var(--mod-accent-border);
      border-radius:14px;
      padding:24px;
      width:min(360px,90vw);
      font-family:var(--mod-font-ui);
    ">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <div id="mam-avatar" style="font-size:28px;">⚔️</div>
        <div>
          <div id="mam-name" style="color:var(--mod-text-heading);font-size:17px;font-weight:700;line-height:1.2;"></div>
          <div id="mam-role-label" style="color:var(--mod-text-sub);font-size:13px;margin-top:2px;"></div>
        </div>
      </div>

      <div id="mam-promote-section" style="margin-bottom:16px;">
        <div style="color:var(--mod-text-sub);font-size:11px;letter-spacing:1px;margin-bottom:8px;">CHANGE ROLE</div>
        <div style="display:flex;gap:8px;">
          <select id="mam-promote-select" style="
            flex:1;
            background:var(--mod-bg-subtle);
            border:1px solid var(--mod-border-primary);
            border-radius:8px;
            color:var(--mod-text-heading);
            font-family:var(--mod-font-ui);
            font-size:14px;
            padding:8px 10px;
            cursor:pointer;
          "></select>
          <button id="mam-promote-btn" style="
            background:var(--mod-accent-muted);
            color:var(--mod-accent);
            border:1px solid var(--mod-accent-border);
            border-radius:8px;
            padding:8px 16px;
            font-family:var(--mod-font-ui);
            font-size:14px;
            letter-spacing:1px;
            cursor:pointer;
            white-space:nowrap;
          ">SET ROLE</button>
        </div>
      </div>

      <div style="border-top:1px solid var(--mod-border-secondary);margin:16px 0;"></div>

      <div id="mam-kick-section" style="margin-bottom:12px;">
        <button id="mam-kick-btn" style="
          width:100%;
          background:rgba(255,165,0,0.1);
          color:#ffa500; /* TODO: needs CSS var token */
          border:1px solid rgba(255,165,0,0.3);
          border-radius:8px;
          padding:10px;
          font-family:var(--mod-font-ui);
          font-size:15px;
          letter-spacing:1px;
          cursor:pointer;
        ">⚡ KICK MEMBER</button>
      </div>

      <div id="mam-ban-section" style="margin-bottom:20px;">
        <div style="color:var(--mod-text-sub);font-size:11px;letter-spacing:1px;margin-bottom:6px;">BAN REASON (optional)</div>
        <textarea id="mam-ban-reason" maxlength="280" placeholder="Reason for ban…" style="
          width:100%;
          min-height:56px;
          resize:vertical;
          background:var(--mod-bg-subtle);
          border:1px solid var(--mod-border-primary);
          border-radius:8px;
          color:var(--mod-text-heading);
          font-family:var(--mod-font-ui);
          font-size:13px;
          padding:8px 10px;
          line-height:1.4;
          margin-bottom:8px;
          box-sizing:border-box;
        "></textarea>
        <button id="mam-ban-btn" style="
          width:100%;
          background:var(--mod-accent-muted);
          color:var(--mod-magenta);
          border:1px solid var(--mod-accent-border);
          border-radius:8px;
          padding:10px;
          font-family:var(--mod-font-ui);
          font-size:15px;
          letter-spacing:1px;
          cursor:pointer;
        ">🚫 BAN MEMBER</button>
      </div>

      <div id="mam-error" style="display:none;color:var(--mod-magenta);font-size:13px;margin-bottom:12px;"></div>

      <button id="mam-cancel-btn" style="
        width:100%;
        background:var(--mod-bg-subtle);
        color:var(--mod-text-sub);
        border:1px solid var(--mod-border-primary);
        border-radius:8px;
        padding:10px;
        font-family:var(--mod-font-ui);
        font-size:14px;
        letter-spacing:1px;
        cursor:pointer;
      ">CANCEL</button>
    </div>
  `;

  document.body.appendChild(modal);
}
