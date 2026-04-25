// ============================================================
// INTRO MUSIC SAVE — tests/intro-music-save.test.ts
// Source: src/intro-music-save.ts
//
// CLASSIFICATION:
//   saveIntroMusic() — Storage upload + RPC → Integration test
//
// IMPORTS:
//   { safeRpc, getCurrentProfile, getSupabaseClient } from './auth.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => null));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
  getSupabaseClient: mockGetSupabaseClient,
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

import { saveIntroMusic } from '../src/intro-music-save.ts';

const makeClient = () => ({
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null }),
    }),
  },
});

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetCurrentProfile.mockReturnValue(null);
  mockGetSupabaseClient.mockReturnValue(null);
});

// ── saveIntroMusic ────────────────────────────────────────────

describe('TC1 — saveIntroMusic: non-custom track calls safeRpc directly', () => {
  it('calls safeRpc with track_id and null custom_url for non-custom track', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    await saveIntroMusic('epic-drums', null, null);

    expect(mockSafeRpc).toHaveBeenCalledWith('save_intro_music', {
      p_track_id: 'epic-drums',
      p_custom_url: null,
    });
  });
});

describe('TC2 — saveIntroMusic: custom track with existingUrl uses that URL', () => {
  it('calls safeRpc with existing URL when no file is provided', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    await saveIntroMusic('custom', null, 'https://cdn.example.com/track.mp3');

    expect(mockSafeRpc).toHaveBeenCalledWith('save_intro_music', {
      p_track_id: 'custom',
      p_custom_url: 'https://cdn.example.com/track.mp3',
    });
  });
});

describe('TC3 — saveIntroMusic: custom track with no file and no URL throws', () => {
  it('throws "No file selected" for custom track without file or existingUrl', async () => {
    await expect(saveIntroMusic('custom', null, null)).rejects.toThrow('No file selected');
  });
});

describe('TC4 — saveIntroMusic: no Supabase client throws when uploading file', () => {
  it('throws "Not connected" when client is null and file is provided', async () => {
    mockGetSupabaseClient.mockReturnValue(null);
    const file = new File(['data'], 'track.mp3', { type: 'audio/mpeg' });

    await expect(saveIntroMusic('custom', file, null)).rejects.toThrow('Not connected');
  });
});

describe('TC5 — saveIntroMusic: no profile throws when uploading file', () => {
  it('throws "Not signed in" when profile is null and file is provided', async () => {
    mockGetSupabaseClient.mockReturnValue(makeClient());
    mockGetCurrentProfile.mockReturnValue(null);
    const file = new File(['data'], 'track.mp3', { type: 'audio/mpeg' });

    await expect(saveIntroMusic('custom', file, null)).rejects.toThrow('Not signed in');
  });
});

describe('TC6 — saveIntroMusic: RPC error throws', () => {
  it('throws when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });

    await expect(saveIntroMusic('epic-drums', null, null)).rejects.toThrow('Permission denied');
  });
});

describe('TC7 — saveIntroMusic: successful upload calls safeRpc with signed URL', () => {
  it('uploads file and calls safeRpc with the signed URL', async () => {
    const client = makeClient();
    mockGetSupabaseClient.mockReturnValue(client);
    mockGetCurrentProfile.mockReturnValue({ id: 'user-1' });
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const file = new File(['data'], 'track.mp3', { type: 'audio/mpeg' });

    await saveIntroMusic('custom', file, null);

    expect(mockSafeRpc).toHaveBeenCalledWith('save_intro_music', {
      p_track_id: 'custom',
      p_custom_url: 'https://example.com/signed',
    });
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/intro-music-save.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/intro-music-save.ts'),
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
