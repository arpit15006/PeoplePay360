import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // The API port differs per machine — macOS reserves 5000 for the AirPlay
  // receiver, so it is commonly run on 5001 there. Set VITE_BACKEND_URL in
  // frontend/.env rather than editing this file.
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // __dirname is not defined in an ESM config ("type": "module").
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5174,
      host: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendUrl,
          ws: true,
        },
      },
    },
  };
});
