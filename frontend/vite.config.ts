import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { navigateFallbackDenylist: [/^\/api/, /^\/oauth/, /^\/health/] },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Keeper',
        short_name: 'Keeper',
        description: 'Your money, calmly.',
        theme_color: '#4A5BF0',
        background_color: '#F6F6F3',
        display: 'standalone',
        start_url: '/dashboard',
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('node_modules/react') || id.includes('react-router')) return 'react';
          return undefined;
        },
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    // Same-origin in dev too, so the HttpOnly refresh cookie behaves exactly like production.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: false, xfwd: true },
      '/oauth': { target: 'http://localhost:8080', changeOrigin: false, xfwd: true },
      '/health': { target: 'http://localhost:8080', changeOrigin: false, xfwd: true },
    }
  }
})
