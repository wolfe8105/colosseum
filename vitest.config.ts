import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // @peermetrics/webrtc-stats is not installed (package removed).
      // Alias it to a no-op stub so Vite transform does not fail on import.
      '@peermetrics/webrtc-stats': resolve(__dirname, 'tests/stubs/peermetrics-webrtc-stats.ts'),
    },
  },
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
