import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '';
});

// ARCH: verify paywall.ts imports from navigation.ts
describe('ARCH — paywall.ts imports navigateTo from navigation.ts', () => {
  it('imports navigateTo from ./navigation.ts', () => {
    const src = readFileSync(resolve('src/paywall.ts'), 'utf8');
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(imports.some(l => l.includes('navigateTo') && l.includes('./navigation'))).toBe(true);
  });
});

// TC1: gate() returns true when getCurrentProfile returns null (no blocking without profile)
describe('TC1 — gate returns true when profile is null', () => {
  it('returns true and does not render paywall-modal', async () => {
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue(null);

    const { gate } = await import('../../src/paywall.ts');
    const result = gate('private_rooms', 'contender');

    expect(result).toBe(true);
    expect(document.getElementById('paywall-modal')).toBeNull();
  });
});

// TC2: gate() returns true when user tier meets required tier
describe('TC2 — gate returns true when user tier meets required tier', () => {
  it('contender user allowed past contender gate — no modal shown', async () => {
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      subscription_tier: 'contender',
    } as any);

    const { gate } = await import('../../src/paywall.ts');
    const result = gate('private_rooms', 'contender');

    expect(result).toBe(true);
    expect(document.getElementById('paywall-modal')).toBeNull();
  });
});

// TC3: gate() returns false and shows modal when tier is too low
describe('TC3 — gate returns false and shows paywall when tier is insufficient', () => {
  it('free user blocked from contender feature — modal appended to body', async () => {
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      subscription_tier: 'free',
    } as any);

    const { gate } = await import('../../src/paywall.ts');
    const result = gate('private_rooms', 'contender');

    expect(result).toBe(false);
    const modal = document.getElementById('paywall-modal');
    expect(modal).not.toBeNull();
  });
});

// TC4: show() appends #paywall-modal with correct variant title
describe('TC4 — show() renders modal with correct variant title', () => {
  it('show("shop") renders UNLOCK EXCLUSIVE GEAR title', async () => {
    const { show } = await import('../../src/paywall.ts');
    show('shop');

    const modal = document.getElementById('paywall-modal');
    expect(modal).not.toBeNull();
    expect(modal?.innerHTML).toContain('UNLOCK EXCLUSIVE GEAR');
  });

  it('show("leaderboard") renders SEE YOUR FULL STATS title', async () => {
    const { show } = await import('../../src/paywall.ts');
    show('leaderboard');

    const modal = document.getElementById('paywall-modal');
    expect(modal).not.toBeNull();
    expect(modal?.innerHTML).toContain('SEE YOUR FULL STATS');
  });
});

// TC5: dismiss button click removes #paywall-modal
describe('TC5 — dismiss button click removes #paywall-modal', () => {
  it('clicking #paywall-dismiss-btn removes the modal', async () => {
    const { show } = await import('../../src/paywall.ts');
    show('general');

    const dismissBtn = document.getElementById('paywall-dismiss-btn') as HTMLButtonElement | null;
    expect(dismissBtn).not.toBeNull();

    dismissBtn?.click();

    expect(document.getElementById('paywall-modal')).toBeNull();
  });
});

// TC6: CTA button click calls navigateTo('shop') and removes modal
describe('TC6 — CTA button click calls navigateTo("shop") and removes modal', () => {
  it('clicking #paywall-cta-btn navigates to shop and removes modal', async () => {
    const navMod = await import('../../src/navigation.ts');
    const navSpy = vi.spyOn(navMod, 'navigateTo');

    const { show } = await import('../../src/paywall.ts');
    show('general');

    const ctaBtn = document.getElementById('paywall-cta-btn') as HTMLButtonElement | null;
    expect(ctaBtn).not.toBeNull();

    ctaBtn?.click();

    expect(navSpy).toHaveBeenCalledWith('shop');
    expect(document.getElementById('paywall-modal')).toBeNull();
  });
});

// TC7: dismiss() removes modal after 300ms setTimeout
describe('TC7 — dismiss() removes modal after 300ms', () => {
  it('dismiss() removes modal after setTimeout(300)', async () => {
    const { show, dismiss } = await import('../../src/paywall.ts');
    show('general');

    expect(document.getElementById('paywall-modal')).not.toBeNull();

    dismiss();

    // Modal still present before timer fires
    expect(document.getElementById('paywall-modal')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(300);

    expect(document.getElementById('paywall-modal')).toBeNull();
  });
});
