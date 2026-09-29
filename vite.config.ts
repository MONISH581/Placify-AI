import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    // The server bundle is written to dist/server.cjs; the client lives in its own folder so the
    // production static handler never exposes server code.
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  server: {
    watch: {
      ignored: ['**/prisma/*.db', '**/prisma/*.db-journal', '**/ml_service/**', '**/dist/**'],
    },
  },
});
