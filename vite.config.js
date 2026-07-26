import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true  // Enable PWA in dev mode for testing
      },
      workbox: {
        // Cache all app shell assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2}'],
        // Cache Supabase API calls for offline use
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/kowymzmrtowdesokhbcv\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7  // 7 days
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365  // 1 year
              }
            }
          }
        ],
        // Don't precache Supabase API calls
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//]
      },
      manifest: {
        name: 'محل المهندس - نظام الكاشير',
        short_name: 'المهندس POS',
        description: 'نظام إدارة مبيعات وتلفونات وإكسسوارات وفودافون كاش - محل المهندس للاتصالات والتكنولوجيا',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0f19',
        theme_color: '#f59e0b',
        orientation: 'portrait-primary',
        lang: 'ar',
        dir: 'rtl',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
