import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' keeps the build portable: works at a domain root or a sub-path (e.g. GitHub Pages /blackjack-trainer/).
const native = process.env.VITE_NATIVE === 'true'; // native (Capacitor) build: no service worker

export default defineConfig({
  base: './',
  plugins: [
    react(),
    ...(native ? [] : [VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'Blackjack Trainer',
        short_name: 'BJ Trainer',
        description: 'Basic strategy trainer: learn the chart, drill, and play with a coach.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0f14',
        theme_color: '#0b0f14',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        navigateFallback: 'index.html'
      }
    })])
  ],
  test: { include: ['tests/**/*.test.ts'] }
} as any);
