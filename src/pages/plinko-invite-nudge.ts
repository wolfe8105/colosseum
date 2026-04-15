/**
 * plinko-invite-nudge.ts — F-59 invite link nudge appended to step-5.
 */

export async function injectInviteNudge(): Promise<void> {
  const step5 = document.getElementById('step-5');
  if (!step5 || document.getElementById('plinko-invite-nudge')) return;

  let inviteUrl: string | null = null;
  try {
    const { safeRpc } = await import('../auth.ts');
    const result = await safeRpc('get_my_invite_link', {});
    const data = result.data as { url?: string } | null;
    inviteUrl = data?.url ?? null;
  } catch { /* non-blocking */ }

  if (!inviteUrl) return;

  const nudgeEl = document.createElement('div');
  nudgeEl.id = 'plinko-invite-nudge';
  nudgeEl.style.cssText = 'margin-top:20px;padding:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;text-align:center;';
  nudgeEl.innerHTML = `
    <div style="font-size:22px;margin-bottom:6px;">🎁</div>
    <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:var(--mod-text-heading);margin-bottom:4px;">BRING YOUR FRIENDS</div>
    <div style="font-size:12px;color:var(--mod-text-muted);margin-bottom:12px;text-transform:none;">Invite 1 friend who debates → earn a Legendary Power-Up. Invite 5 → Mythic Power-Up.</div>
    <button id="plinko-invite-copy" style="width:100%;padding:11px;background:var(--mod-accent-muted);border:1px solid var(--mod-accent-border);border-radius:8px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1.5px;color:var(--mod-accent-text);cursor:pointer;">📋 COPY INVITE LINK</button>
  `;
  step5.appendChild(nudgeEl);

  nudgeEl.querySelector('#plinko-invite-copy')?.addEventListener('click', async () => {
    const btn = nudgeEl.querySelector('#plinko-invite-copy') as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(inviteUrl!);
      btn.textContent = '✓ COPIED!';
      setTimeout(() => { btn.textContent = '📋 COPY INVITE LINK'; }, 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteUrl!;
      ta.style.cssText = 'position:fixed;left:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      btn.textContent = '✓ COPIED!';
      setTimeout(() => { btn.textContent = '📋 COPY INVITE LINK'; }, 2500);
    }
  });
}
