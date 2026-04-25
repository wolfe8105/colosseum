import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

import { wireInviteScreen } from '../src/pages/home.invite-wiring.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildStats(overrides: Record<string, unknown> = {}) {
  return {
    invite_url: 'https://themoderator.app/i/abc123',
    total_converts: 3,
    total_signups: 5,
    total_clicks: 20,
    next_milestone: 5,
    unclaimed_rewards: [],
    activity: [],
    ...overrides,
  } as never;
}

function mountInvite(hasClaimBtn = false) {
  document.body.innerHTML = `
    <div id="container">
      <button id="invite-copy-btn">Copy</button>
      <button id="invite-native-share">Share</button>
      ${hasClaimBtn ? `
        <button class="invite-claim-btn"
                data-reward-id="reward-1"
                data-reward-type="legendary_powerup">CLAIM</button>
        <button class="invite-claim-btn"
                data-reward-id="reward-disabled"
                data-reward-type="mythic_powerup"
                disabled>PENDING</button>
      ` : ''}
    </div>`;
  return document.getElementById('container') as HTMLElement;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockShowToast.mockReset();
  document.body.innerHTML = '';
});

// ── wireInviteScreen ───────────────────────────────────────────

describe('TC1 — copy button calls clipboard.writeText on click', () => {
  it('navigator.clipboard.writeText called with invite_url', async () => {
    const container = mountInvite();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    wireInviteScreen(container, buildStats(), vi.fn());
    (container.querySelector('#invite-copy-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('https://themoderator.app/i/abc123'));
  });
});

describe('TC2 — copy button shows "Copied!" text on success', () => {
  it('button text changes to Copied! after successful copy', async () => {
    const container = mountInvite();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    vi.useFakeTimers();

    wireInviteScreen(container, buildStats(), vi.fn());
    (container.querySelector('#invite-copy-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect((container.querySelector('#invite-copy-btn') as HTMLButtonElement).textContent).toBe('Copied!');
    });
    vi.useRealTimers();
  });
});

describe('TC3 — copy failure shows toast', () => {
  it('showToast called when clipboard.writeText rejects', async () => {
    const container = mountInvite();
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });

    wireInviteScreen(container, buildStats(), vi.fn());
    (container.querySelector('#invite-copy-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(mockShowToast).toHaveBeenCalled());
  });
});

describe('TC4 — copy button is not wired when no invite_url', () => {
  it('click does not call clipboard when invite_url is null', () => {
    const container = mountInvite();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    wireInviteScreen(container, buildStats({ invite_url: null }), vi.fn());
    (container.querySelector('#invite-copy-btn') as HTMLButtonElement).click();

    expect(writeText).not.toHaveBeenCalled();
  });
});

describe('TC5 — native share button calls navigator.share', () => {
  it('navigator.share called when share button is clicked', async () => {
    const container = mountInvite();
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    wireInviteScreen(container, buildStats(), vi.fn());
    (container.querySelector('#invite-native-share') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://themoderator.app/i/abc123' })
    ));
  });
});

describe('TC6 — claim button click calls onClaim with rewardId and rewardType', () => {
  it('onClaim called with correct args on claim button click', () => {
    const container = mountInvite(true);
    const onClaim = vi.fn();

    wireInviteScreen(container, buildStats(), onClaim);
    (container.querySelector('.invite-claim-btn:not([disabled])') as HTMLButtonElement).click();

    expect(onClaim).toHaveBeenCalledWith('reward-1', 'legendary_powerup');
  });
});

describe('TC7 — disabled claim button does not call onClaim', () => {
  it('onClaim not called for disabled claim button', () => {
    const container = mountInvite(true);
    const onClaim = vi.fn();

    wireInviteScreen(container, buildStats(), onClaim);
    // disabled buttons don't fire click events in jsdom
    const disabledBtn = container.querySelector('.invite-claim-btn[disabled]') as HTMLButtonElement;
    disabledBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClaim).not.toHaveBeenCalledWith('reward-disabled', expect.anything());
  });
});

describe('TC8 — wireInviteScreen is safe when no buttons in DOM', () => {
  it('does not throw when container has no invite buttons', () => {
    const container = document.createElement('div');
    expect(() => wireInviteScreen(container, buildStats(), vi.fn())).not.toThrow();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — home.invite-wiring.ts only imports from allowed modules', () => {
  it('has no non-type imports outside allowed list', () => {
    const allowed = ['../config.ts', './home.invite-types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.invite-wiring.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
