// int-powerups.activation.test.ts
// Seam #350 — src/powerups.activation.ts → powerups.rpc
// Tests: wireActivationBar activate RPC dispatch, success button state,
//        onSilence/onShield callback routing, failure re-enables button, ARCH check.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ----------------------------------------------------------------
// ARCH
// ----------------------------------------------------------------
describe('Seam #350 ARCH — powerups.activation.ts imports activate from powerups.rpc', () => {
  it('imports activate from ./powerups.rpc.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.activation.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const rpcLine = lines.find(
      (l: string) => l.includes('powerups.rpc') && l.includes('activate')
    );
    expect(rpcLine).toBeTruthy();
  });
});

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function buildActivationBarDOM(powerUpIds: string[], include: { passive?: boolean } = {}): void {
  const buttons = powerUpIds.map(id => {
    const isPassive = include.passive && id === 'multiplier_2x';
    return `<button class="powerup-activate-btn${isPassive ? ' passive' : ''}" data-id="${id}" ${isPassive ? 'disabled' : ''}>
      <span>icon</span><span>${isPassive ? 'ACTIVE' : 'USE'}</span>
    </button>`;
  });
  document.body.innerHTML = `<div id="powerup-activation-bar">${buttons.join('')}</div>`;
}

// ----------------------------------------------------------------
// TC 1 — activate RPC called with correct params
// ----------------------------------------------------------------
describe('Seam #350 TC1 — activate RPC fired with correct params', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('calls activate_power_up RPC with p_debate_id and p_power_up_id', async () => {
    buildActivationBarDOM(['silence']);

    const supabaseMod = await import('@supabase/supabase-js');
    const rpcMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(supabaseMod.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn(),
    } as ReturnType<typeof supabaseMod.createClient>);

    const { wireActivationBar } = await import('../../src/powerups.activation.ts');
    wireActivationBar('debate-xyz', {});

    (document.querySelector('.powerup-activate-btn') as HTMLButtonElement).click();

    await vi.advanceTimersByTimeAsync(0);

    const activateCall = rpcMock.mock.calls.find(c => c[0] === 'activate_power_up');
    expect(activateCall).toBeTruthy();
    expect(activateCall![1]).toMatchObject({
      p_debate_id: 'debate-xyz',
      p_power_up_id: 'silence',
    });
  });
});

// ----------------------------------------------------------------
// TC 2 — Button gets .used class and label changes to USED on success
// ----------------------------------------------------------------
describe('Seam #350 TC2 — button marked .used on successful activation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('adds .used class and sets label to USED after success', async () => {
    buildActivationBarDOM(['shield']);

    const supabaseMod = await import('@supabase/supabase-js');
    const rpcMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(supabaseMod.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn(),
    } as ReturnType<typeof supabaseMod.createClient>);

    const { wireActivationBar } = await import('../../src/powerups.activation.ts');
    wireActivationBar('debate-abc', {});

    const btn = document.querySelector('.powerup-activate-btn') as HTMLButtonElement;
    btn.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(btn.classList.contains('used')).toBe(true);
    const label = btn.querySelector('span:last-child');
    expect(label?.textContent).toBe('USED');
  });
});

// ----------------------------------------------------------------
// TC 3 — onSilence callback fired when powerUpId is 'silence'
// ----------------------------------------------------------------
describe('Seam #350 TC3 — onSilence callback dispatched for silence power-up', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('calls callbacks.onSilence when silence power-up is activated successfully', async () => {
    buildActivationBarDOM(['silence']);

    const supabaseMod = await import('@supabase/supabase-js');
    const rpcMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(supabaseMod.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn(),
    } as ReturnType<typeof supabaseMod.createClient>);

    const onSilence = vi.fn();
    const { wireActivationBar } = await import('../../src/powerups.activation.ts');
    wireActivationBar('debate-s', { onSilence });

    (document.querySelector('.powerup-activate-btn') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);

    expect(onSilence).toHaveBeenCalledOnce();
  });
});

// ----------------------------------------------------------------
// TC 4 — onShield callback fired when powerUpId is 'shield'
// ----------------------------------------------------------------
describe('Seam #350 TC4 — onShield callback dispatched for shield power-up', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('calls callbacks.onShield when shield power-up is activated successfully', async () => {
    buildActivationBarDOM(['shield']);

    const supabaseMod = await import('@supabase/supabase-js');
    const rpcMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(supabaseMod.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn(),
    } as ReturnType<typeof supabaseMod.createClient>);

    const onShield = vi.fn();
    const { wireActivationBar } = await import('../../src/powerups.activation.ts');
    wireActivationBar('debate-sh', { onShield });

    (document.querySelector('.powerup-activate-btn') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);

    expect(onShield).toHaveBeenCalledOnce();
  });
});

// ----------------------------------------------------------------
// TC 5 — On RPC failure, button is re-enabled and NOT marked .used
// ----------------------------------------------------------------
describe('Seam #350 TC5 — button re-enabled when activation fails', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('does NOT add .used and re-enables button when activate returns success:false', async () => {
    buildActivationBarDOM(['reveal']);

    const supabaseMod = await import('@supabase/supabase-js');
    const rpcMock = vi.fn().mockResolvedValue({
      data: { success: false, error: 'Not equipped' },
      error: null,
    });
    vi.mocked(supabaseMod.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn(),
    } as ReturnType<typeof supabaseMod.createClient>);

    const { wireActivationBar } = await import('../../src/powerups.activation.ts');
    wireActivationBar('debate-fail', {});

    const btn = document.querySelector('.powerup-activate-btn') as HTMLButtonElement;
    btn.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(btn.classList.contains('used')).toBe(false);
    expect(btn.disabled).toBe(false);
    expect(btn.style.opacity).toBe('1');
  });
});
