import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiUrl = process.env.AW_API_URL ?? 'http://127.0.0.1:8080';
const wsUrl = apiUrl.replace(/^http/, 'ws');
const proxy = {
  '/auth': apiUrl,
  '/games': apiUrl,
  '/observe': apiUrl,
  '/ws': { target: wsUrl, ws: true },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@aw/engine': fileURLToPath(new URL('../engine/src/index.ts', import.meta.url)),
    },
  },
  optimizeDeps: { exclude: ['@aw/engine'] },
  server: { host: '127.0.0.1', port: 5173, proxy },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy },
  build: { outDir: 'dist', sourcemap: true },
});
