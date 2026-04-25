import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-mod-refs.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena-mod-refs-form.ts',
      './arena-mod-refs-ruling.ts',
      './arena-mod-refs-ai.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-refs.ts'),
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

  it('re-exports symbols from all three sub-files', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-refs.ts'),
      'utf-8'
    );
    expect(source).toContain('assignSelectedMod');
    expect(source).toContain('startReferencePoll');
    expect(source).toContain('stopReferencePoll');
    expect(source).toContain('requestAIModRuling');
  });
});
