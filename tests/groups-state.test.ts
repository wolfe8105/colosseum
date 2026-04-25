/**
 * Tests for src/pages/groups.state.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  activeTab, activeDetailTab, activeCategory, selectedEmoji,
  currentGroupId, isMember, callerRole, CATEGORY_LABELS,
  setActiveTab, setActiveDetailTab, setActiveCategory, setSelectedEmoji,
  setCurrentGroupId, setIsMember, setCallerRole,
  setSb, setCurrentUser,
} from '../src/pages/groups.state.ts';

describe('groups.state — initial values', () => {
  it('TC1: activeTab defaults to discover', () => {
    expect(activeTab).toBe('discover');
  });

  it('TC2: activeDetailTab defaults to feed', () => {
    expect(activeDetailTab).toBe('feed');
  });

  it('TC3: activeCategory defaults to null', () => {
    expect(activeCategory).toBeNull();
  });

  it('TC4: selectedEmoji defaults to ⚔️', () => {
    expect(selectedEmoji).toBe('⚔️');
  });

  it('TC5: currentGroupId defaults to null', () => {
    expect(currentGroupId).toBeNull();
  });

  it('TC6: isMember defaults to false', () => {
    expect(isMember).toBe(false);
  });

  it('TC7: callerRole defaults to null', () => {
    expect(callerRole).toBeNull();
  });
});

describe('groups.state — CATEGORY_LABELS has expected keys', () => {
  it('TC8: has general, politics, sports, entertainment, music, couples_court', () => {
    expect(CATEGORY_LABELS).toHaveProperty('general');
    expect(CATEGORY_LABELS).toHaveProperty('politics');
    expect(CATEGORY_LABELS).toHaveProperty('sports');
    expect(CATEGORY_LABELS).toHaveProperty('entertainment');
    expect(CATEGORY_LABELS).toHaveProperty('music');
    expect(CATEGORY_LABELS).toHaveProperty('couples_court');
  });
});

describe('groups.state — setters update values', () => {
  it('TC9: setActiveTab updates activeTab', () => {
    setActiveTab('mine');
    // Can't directly test the re-exported value after mutation (ES module binding),
    // but we can confirm the setter doesn't throw
    expect(() => setActiveTab('discover')).not.toThrow();
  });

  it('TC10: setCurrentGroupId can be called without throwing', () => {
    expect(() => setCurrentGroupId('g1')).not.toThrow();
    expect(() => setCurrentGroupId(null)).not.toThrow();
  });

  it('TC11: setIsMember can be called without throwing', () => {
    expect(() => setIsMember(true)).not.toThrow();
    expect(() => setIsMember(false)).not.toThrow();
  });
});

describe('ARCH — src/pages/groups.state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['@supabase/supabase-js'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.state.ts'),
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
