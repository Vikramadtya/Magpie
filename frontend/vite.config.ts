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
        description: 'Personal budget and expense tracker',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png'
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
