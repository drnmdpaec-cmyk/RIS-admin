import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      // No installable PWA manifest — admin portal is a standard web app
      manifest: false,
      injectManifest: {
        // No precaching — admin staff always need live, accurate data
        globPatterns: [],
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  base: '/admin/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
          if (id.includes('@tanstack')) return 'tanstack';
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'forms';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('papaparse') || id.includes('xlsx')) return 'export';
          if (id.includes('react-pdf')) return 'pdf';
        },
      },
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
