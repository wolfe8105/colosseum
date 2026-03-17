import { defineConfig } from 'vite';
import { resolve } from 'path';

// All HTML entry points — one per page
// During migration, Vite processes these and their <script> tags
const htmlEntries = {
  main: resolve(__dirname, 'index.html'),
  login: resolve(__dirname, 'colosseum-login.html'),
  plinko: resolve(__dirname, 'colosseum-plinko.html'),
  settings: resolve(__dirname, 'colosseum-settings.html'),
  profileDepth: resolve(__dirname, 'colosseum-profile-depth.html'),
  groups: resolve(__dirname, 'colosseum-groups.html'),
  spectate: resolve(__dirname, 'colosseum-spectate.html'),
  autoDebate: resolve(__dirname, 'colosseum-auto-debate.html'),
  debateLanding: resolve(__dirname, 'colosseum-debate-landing.html'),
  terms: resolve(__dirname, 'colosseum-terms.html'),
  privacy: resolve(__dirname, 'colosseum-privacy.html'),
};

export default defineConfig({
  root: '.',
  publicDir: false, // No separate public dir — everything is in root

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: htmlEntries,
    },
  },

  server: {
    port: 3000,
    open: '/index.html',
  },
});
