import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: false,
    environment: 'jsdom',
    // Node 22.11 + jsdom@29 + @exodus/bytes (ESM-only) incompatibility.
    // html-encoding-sniffer CJS-requires @exodus/bytes which is ESM-only.
    // --experimental-require-module enables require() of ES modules in Node 22.
    poolOptions: {
      forks: {
        execArgv: ['--experimental-require-module'],
      },
    },
  },
});
