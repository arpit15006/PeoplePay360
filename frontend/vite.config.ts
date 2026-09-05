import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // The API port differs per machine — macOS reserves 5000 for the AirPlay
  // receiver, so it is run on 5001. Set VITE_BACKEND_URL in
  // frontend/.env to override.
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:5001';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // __dirname is not defined in an ESM config ("type": "module").
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // One 2.5MB bundle meant the whole app had to parse before the login
          // screen could paint. Splitting the heavy, rarely-changing libraries
          // lets the browser cache them apart from application code.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            pdf: ['@react-pdf/renderer'],
            query: ['@tanstack/react-query', '@tanstack/react-table'],
          },
        },
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
