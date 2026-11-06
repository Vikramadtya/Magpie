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
    rolldownOptions: {
      output: {
        // React is named first, with a higher priority, so the chart library (large, needed only on
        // Analytics) never becomes a dependency of the first screen.
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|clsx|next-themes)[\\/]/, priority: 30 },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|es-toolkit|immer|redux|react-redux|@reduxjs|reselect|decimal\.js-light|eventemitter3|internmap|tiny-invariant)[\\/]/, priority: 20 },
          ],
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
