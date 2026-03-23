import { defineConfig } from 'vite';
import { resolve } from 'path';

// All HTML entry points — one per page
// During migration, Vite processes these and their <script> tags
const htmlEntries = {
  main: resolve(__dirname, 'index.html'),
  login: resolve(__dirname, 'moderator-login.html'),
  plinko: resolve(__dirname, 'moderator-plinko.html'),
  settings: resolve(__dirname, 'moderator-settings.html'),
  profileDepth: resolve(__dirname, 'moderator-profile-depth.html'),
  groups: resolve(__dirname, 'moderator-groups.html'),
  spectate: resolve(__dirname, 'moderator-spectate.html'),
  autoDebate: resolve(__dirname, 'moderator-auto-debate.html'),
  debateLanding: resolve(__dirname, 'moderator-debate-landing.html'),
  terms: resolve(__dirname, 'moderator-terms.html'),
  privacy: resolve(__dirname, 'moderator-privacy.html'),
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
