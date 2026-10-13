import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ mode }) => {
const env = loadEnv(mode, fileURLToPath(new URL('../..', import.meta.url)), '');
return {
  plugins: [react()],
  envDir: '../..',
  server: { port: Number(env.VITE_WEB_PORT || 5173), strictPort: true, headers: { 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "frame-ancestors 'none'" }, proxy: { '/api': `http://127.0.0.1:${env.RELAYER_PORT || 3001}` } },
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
    if (id.includes('@category-labs/mera') || id.includes('@scure/') || id.includes('@noble/') || id.includes('node_modules/viem') || id.includes('node_modules/ox/')) return 'identity';
  } } } },
}; });
