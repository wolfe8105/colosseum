/**
 * Integration tests — seam #271
 * src/pages/settings.save.ts → settings.helpers
 *
 * Tests: saveSettings() — validation, localStorage write, RPC delegation.
 * Mock boundary: @supabase/supabase-js only — all source modules run real
 * EXCEPT auth.ts and config.ts which are doMocked so we can control
 * isAnyPlaceholder and track updateProfile / safeRpc calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted top-level mock — @supabase/supabase-js ───────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  refreshSession: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: mockAuth,
  })),
}));

// ── Module-level refs (re-assigned each beforeEach) ───────────────────────────

let saveSettings: typeof import('../../src/pages/settings.save.ts').saveSettings;
let mockUpdateProfile: ReturnType<typeof vi.fn>;
let mockSafeRpc: ReturnType<typeof vi.fn>;

// ── DOM helpers ───────────────────────────────────────────────────────────────

function buildDOM(overrides: {
  username?: string;
  displayName?: string;
  bio?: string;
  saveBtnDisabled?: boolean;
} = {}) {
  document.body.innerHTML = `
    <button id="save-btn"${overrides.saveBtnDisabled ? ' disabled' : ''}>💾 SAVE CHANGES</button>
    <input id="set-display-name" value="${overrides.displayName ?? 'Alice'}" />
    <input id="set-username" value="${overrides.username ?? 'alice_99'}" />
    <textarea id="set-bio">${overrides.bio ?? 'Hello world'}</textarea>
    <span id="set-email-display">alice@example.com</span>
    <select id="set-language"><option value="en" selected>English</option></select>
    <input type="checkbox" id="set-notif-challenge" checked />
    <input type="checkbox" id="set-notif-debate" />
    <input type="checkbox" id="set-notif-follow" checked />
    <input type="checkbox" id="set-notif-reactions" />
    <input type="checkbox" id="set-notif-rivals" />
    <input type="checkbox" id="set-notif-economy" checked />
    <input type="checkbox" id="set-audio-sfx" checked />
    <input type="checkbox" id="set-audio-mute" />
    <input type="checkbox" id="set-privacy-public" checked />
    <input type="checkbox" id="set-privacy-online" />
    <input type="checkbox" id="set-privacy-challenges" />
    <div id="toast"></div>
  `;
}

// ── beforeEach — reset modules, re-import with fresh doMocks ─────────────────

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();
  mockRpc.mockReset();
  mockAuth.getSession.mockReset();
  mockAuth.refreshSession.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.refreshSession.mockResolvedValue({ error: null });

  localStorage.clear();

  mockUpdateProfile = vi.fn().mockResolvedValue({ success: true });
  mockSafeRpc = vi.fn().mockResolvedValue({ data: null, error: null });

  vi.doMock('../../src/auth.ts', () => ({
    updateProfile: mockUpdateProfile,
    safeRpc: mockSafeRpc,
  }));

  vi.doMock('../../src/config.ts', () => ({
    isAnyPlaceholder: false,
  }));

  const mod = await import('../../src/pages/settings.save.ts');
  saveSettings = mod.saveSettings;

  buildDOM();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

// ── ARCH check ────────────────────────────────────────────────────────────────

it('ARCH: settings.save.ts only imports from expected modules', () => {
  const source = readFileSync(
    resolve(__dirname, '../../src/pages/settings.save.ts'),
    'utf-8',
  );
  const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
  const allowed = [
    '../auth',
    '../config',
    './settings.helpers',
  ];
  for (const line of importLines) {
    const match = line.match(/from\s+['"](.*?)['"]/);
    if (!match) continue;
    const origin = match[1];
    expect(allowed.some(a => origin.includes(a))).toBe(true);
  }
});

// ── TC1: username too short (< 3 chars) ──────────────────────────────────────

describe('TC1 — username too short triggers validation toast and re-enables save-btn', () => {
  it('calls toast with username error, does not call updateProfile or safeRpc', async () => {
    buildDOM({ username: 'ab' });

    const promise = saveSettings();
    await vi.runAllTimersAsync();
    await promise;

    const toast = document.getElementById('toast');
    expect(toast?.textContent).toContain('Username: 3-20 chars');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(mockSafeRpc).not.toHaveBeenCalled();

    const btn = document.getElementById('save-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain('SAVE CHANGES');
  });
});

// ── TC2: username with invalid chars ─────────────────────────────────────────

describe('TC2 — username with invalid characters triggers validation toast', () => {
  it('rejects username containing spaces, no RPC fired', async () => {
    buildDOM({ username: 'bad user!' });

    const promise = saveSettings();
    await vi.runAllTimersAsync();
    await promise;

    const toast = document.getElementById('toast');
    expect(toast?.textContent).toContain('Username: 3-20 chars');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC3: displayName > 30 chars ───────────────────────────────────────────────

describe('TC3 — displayName exceeding 30 chars triggers validation toast', () => {
  it('calls toast with display name error, does not call any RPC', async () => {
    buildDOM({ displayName: 'A'.repeat(31) });

    const promise = saveSettings();
    await vi.runAllTimersAsync();
    await promise;

    const toast = document.getElementById('toast');
    expect(toast?.textContent).toContain('Display name: max 30 characters');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(mockSafeRpc).not.toHaveBeenCalled();

    const btn = document.getElementById('save-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ── TC4: bio > 160 chars ──────────────────────────────────────────────────────

describe('TC4 — bio exceeding 160 chars triggers validation toast', () => {
  it('calls toast with bio error and does not call any RPC', async () => {
    buildDOM({ bio: 'x'.repeat(161) });

    const promise = saveSettings();
    await vi.runAllTimersAsync();
    await promise;

    const toast = document.getElementById('toast');
    expect(toast?.textContent).toContain('Bio: max 160 characters');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(mockSafeRpc).not.toHaveBeenCalled();

    const btn = document.getElementById('save-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ── TC5: valid inputs write to localStorage ───────────────────────────────────

describe('TC5 — valid inputs write settings to localStorage', () => {
  it('stores colosseum_settings in localStorage with correct fields', async () => {
    buildDOM({ username: 'alice99', displayName: 'Alice', bio: 'Short bio' });

    const promise = saveSettings();
    await vi.runAllTimersAsync();
    await promise;

    const raw = localStorage.getItem('colosseum_settings');
    expect(raw).not.toBeNull();
    const data = JSON.parse(raw!);
    expect(data.username).toBe('alice99');
    expect(data.display_name).toBe('Alice');
    expect(data.bio).toBe('Short bio');
    expect(data.preferred_language).toBe('en');
    expect(typeof data.notif_challenge).toBe('boolean');
  });
});

// ── TC6: calls updateProfile with correct profile fields ─────────────────────

describe('TC6 — calls updateProfile with display_name, username, bio, preferred_language, is_private', () => {
  it('passes correct fields to updateProfile when isPlaceholder is false', async () => {
    buildDOM({ username: 'alice99', displayName: 'Alice', bio: 'Short bio' });

    const promise = saveSettings();
    await vi.runAllTimersAsync();
    await promise;

    expect(mockUpdateProfile).toHaveBeenCalledOnce();
    const [profileArgs] = mockUpdateProfile.mock.calls[0];
    expect(profileArgs.display_name).toBe('Alice');
    expect(profileArgs.username).toBe('alice99');
    expect(profileArgs.bio).toBe('Short bio');
    expect(profileArgs.preferred_language).toBe('en');
    // privacy_public=true → is_private=false
    expect(profileArgs.is_private).toBe(false);
  });
});

// ── TC7: calls safeRpc('save_user_settings') with all notification/audio/privacy flags ──

describe('TC7 — calls safeRpc save_user_settings with all boolean flags', () => {
  it('passes p_notif_challenge, p_audio_sfx, p_privacy_public etc. to save_user_settings', async () => {
    buildDOM({ username: 'alice99', displayName: 'Alice', bio: 'Short bio' });

    const promise = saveSettings();
    await vi.runAllTimersAsync();
    await promise;

    expect(mockSafeRpc).toHaveBeenCalledWith('save_user_settings', expect.objectContaining({
      p_notif_challenge: true,   // checkbox checked
      p_notif_debate: false,
      p_notif_follow: true,
      p_notif_reactions: false,
      p_notif_rivals: false,
      p_notif_economy: true,
      p_audio_sfx: true,
      p_audio_mute: false,
      p_privacy_public: true,
      p_privacy_online: false,
      p_privacy_challenges: false,
    }));

    const toast = document.getElementById('toast');
    expect(toast?.textContent).toContain('✅ Settings saved');

    const btn = document.getElementById('save-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain('SAVE CHANGES');
  });
});
