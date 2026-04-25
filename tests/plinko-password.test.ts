/**
 * Tests for src/pages/plinko-password.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { validatePasswordComplexity, checkHIBP } from '../src/pages/plinko-password.ts';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validatePasswordComplexity — rejects short passwords', () => {
  it('TC1: returns error for password under 8 chars', () => {
    expect(validatePasswordComplexity('Ab1!')).toBe('Password must be at least 8 characters.');
  });
});

describe('validatePasswordComplexity — rejects no lowercase', () => {
  it('TC2: returns error when no lowercase letter', () => {
    expect(validatePasswordComplexity('ABCDE123!')).toContain('lowercase');
  });
});

describe('validatePasswordComplexity — rejects no uppercase', () => {
  it('TC3: returns error when no uppercase letter', () => {
    expect(validatePasswordComplexity('abcde123!')).toContain('uppercase');
  });
});

describe('validatePasswordComplexity — rejects no digit', () => {
  it('TC4: returns error when no digit', () => {
    expect(validatePasswordComplexity('Abcdefg!')).toContain('digit');
  });
});

describe('validatePasswordComplexity — rejects no symbol', () => {
  it('TC5: returns error when no symbol', () => {
    expect(validatePasswordComplexity('Abcde123')).toContain('symbol');
  });
});

describe('validatePasswordComplexity — accepts valid password', () => {
  it('TC6: returns null for valid password', () => {
    expect(validatePasswordComplexity('Abcde12!')).toBeNull();
  });
});

describe('checkHIBP — returns false on network failure', () => {
  it('TC7: returns false when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
    const result = await checkHIBP('mypassword');
    expect(result).toBe(false);
    vi.restoreAllMocks();
  });
});

describe('checkHIBP — returns false on non-ok response', () => {
  it('TC8: returns false when API returns HTTP 500', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '',
    } as Response);
    const result = await checkHIBP('mypassword');
    expect(result).toBe(false);
    vi.restoreAllMocks();
  });
});

describe('checkHIBP — returns false when hash not in response', () => {
  it('TC9: returns false when pwned list does not contain the hash suffix', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'AAAAA:5\nBBBBB:3\n',
    } as Response);
    const result = await checkHIBP('uniquenotpwnedpassword123!X');
    expect(result).toBe(false);
    vi.restoreAllMocks();
  });
});

describe('ARCH — src/pages/plinko-password.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/plinko-password.ts'),
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
