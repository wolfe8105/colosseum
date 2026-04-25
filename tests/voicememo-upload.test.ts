import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

const mockGetSupabaseClient = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getSupabaseClient: mockGetSupabaseClient,
  getCurrentUser: mockGetCurrentUser,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
}));

import { uploadVoiceMemo, revokeAllFallbackURLs } from '../src/voicememo.upload.ts';

// ── Setup ──────────────────────────────────────────────────────

const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  mockShowToast.mockReset();
  mockGetSupabaseClient.mockReset();
  mockGetCurrentUser.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockCreateObjectURL.mockReturnValue('blob:fake-url');
  mockRevokeObjectURL.mockReset();
  (global as never as Record<string, unknown>).URL = {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  };
});

function makeBlob(sizeBytes = 100, type = 'audio/webm') {
  return { size: sizeBytes, type } as Blob;
}

function makeSupabase(uploadError: unknown = null) {
  return {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: uploadError }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/path.webm' } }),
      }),
    },
  };
}

// ── uploadVoiceMemo — size guard ───────────────────────────────

describe('TC1 — uploadVoiceMemo shows toast and returns local URL when blob exceeds 5MB', () => {
  it('returns local-fallback path for oversized blob', async () => {
    const bigBlob = makeBlob(6 * 1024 * 1024);

    const result = await uploadVoiceMemo(bigBlob, null);

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('too large'));
    expect(result.path).toBe('local-fallback');
    expect(result.url).toBe('blob:fake-url');
  });
});

// ── uploadVoiceMemo — placeholder mode ────────────────────────

describe('TC2 — uploadVoiceMemo returns local URL in placeholder mode', () => {
  it('falls back to createObjectURL when getIsPlaceholderMode returns true', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    mockGetSupabaseClient.mockReturnValue({});
    const blob = makeBlob();

    const result = await uploadVoiceMemo(blob, 'debate-1');

    expect(result.url).toBe('blob:fake-url');
    expect(result.path).toContain('placeholder/');
  });
});

describe('TC3 — uploadVoiceMemo returns local URL when no supabase client', () => {
  it('falls back to createObjectURL when getSupabaseClient returns null', async () => {
    mockGetSupabaseClient.mockReturnValue(null);

    const result = await uploadVoiceMemo(makeBlob(), 'debate-1');

    expect(result.url).toBe('blob:fake-url');
    expect(result.path).toContain('placeholder/');
  });
});

// ── uploadVoiceMemo — successful upload ───────────────────────

describe('TC4 — uploadVoiceMemo calls supabase storage upload on success path', () => {
  it('calls storage.from("debate-audio").upload with the path and blob', async () => {
    const supabase = makeSupabase(null);
    mockGetSupabaseClient.mockReturnValue(supabase);
    mockGetCurrentUser.mockReturnValue({ id: 'user-abc' });

    await uploadVoiceMemo(makeBlob(), 'debate-1');

    const fromMock = supabase.storage.from as ReturnType<typeof vi.fn>;
    expect(fromMock).toHaveBeenCalledWith('debate-audio');
  });
});

describe('TC5 — uploadVoiceMemo returns publicUrl on success', () => {
  it('returns the public URL from getPublicUrl', async () => {
    const supabase = makeSupabase(null);
    mockGetSupabaseClient.mockReturnValue(supabase);
    mockGetCurrentUser.mockReturnValue({ id: 'user-abc' });

    const result = await uploadVoiceMemo(makeBlob(), 'debate-1');

    expect(result.url).toBe('https://cdn.example.com/path.webm');
  });
});

describe('TC6 — uploadVoiceMemo path includes userId and debateId', () => {
  it('upload path contains userId and debateId', async () => {
    const supabase = makeSupabase(null);
    mockGetSupabaseClient.mockReturnValue(supabase);
    mockGetCurrentUser.mockReturnValue({ id: 'user-xyz' });

    const result = await uploadVoiceMemo(makeBlob(), 'debate-99');

    expect(result.path).toContain('user-xyz');
    expect(result.path).toContain('debate-99');
  });
});

// ── uploadVoiceMemo — upload failure ──────────────────────────

describe('TC7 — uploadVoiceMemo falls back to local URL on upload error', () => {
  it('returns local-fallback path when supabase upload returns error', async () => {
    const supabase = makeSupabase({ message: 'Upload failed' });
    mockGetSupabaseClient.mockReturnValue(supabase);
    mockGetCurrentUser.mockReturnValue({ id: 'user-abc' });

    const result = await uploadVoiceMemo(makeBlob(), 'debate-1');

    expect(result.path).toBe('local-fallback');
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Upload failed'));
  });
});

// ── uploadVoiceMemo — extension detection ─────────────────────

describe('TC8 — uploadVoiceMemo uses mp4 extension for mp4 blobs', () => {
  it('upload path ends in .mp4 when blob.type contains mp4', async () => {
    const supabase = makeSupabase(null);
    mockGetSupabaseClient.mockReturnValue(supabase);
    mockGetCurrentUser.mockReturnValue({ id: 'user-abc' });

    const result = await uploadVoiceMemo(makeBlob(100, 'audio/mp4'), 'debate-1');

    expect(result.path).toContain('.mp4');
  });
});

describe('TC9 — uploadVoiceMemo uses webm extension by default', () => {
  it('upload path ends in .webm for non-mp4 blobs', async () => {
    const supabase = makeSupabase(null);
    mockGetSupabaseClient.mockReturnValue(supabase);
    mockGetCurrentUser.mockReturnValue({ id: 'user-abc' });

    const result = await uploadVoiceMemo(makeBlob(100, 'audio/webm'), 'debate-1');

    expect(result.path).toContain('.webm');
  });
});

// ── revokeAllFallbackURLs ──────────────────────────────────────

describe('TC10 — revokeAllFallbackURLs calls revokeObjectURL for each fallback URL', () => {
  it('revokeObjectURL is called after a blob is stored as fallback', async () => {
    mockGetSupabaseClient.mockReturnValue(null);
    await uploadVoiceMemo(makeBlob(), 'debate-1');

    revokeAllFallbackURLs();

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});

describe('TC11 — revokeAllFallbackURLs is a no-op when no fallback URLs stored', () => {
  it('does not throw when fallback list is empty', () => {
    expect(() => revokeAllFallbackURLs()).not.toThrow();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — voicememo.upload.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/voicememo.upload.ts'),
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
