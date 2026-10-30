/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png', 'apple-touch-icon-dark-180x180.png'],
      manifest: {
        name: 'Checko',
        short_name: 'Checko',
        description: 'Jede erledigte Aufgabe macht Plopp.',
        lang: 'de',
        start_url: '/',
        display: 'standalone',
        theme_color: '#EEF1F7',
        background_color: '#EEF1F7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Latin + Latin Extended cover German; the Vietnamese subset is never needed offline.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*latin*wdth-normal*.woff2'],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
})
