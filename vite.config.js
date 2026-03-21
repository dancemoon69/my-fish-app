import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 💡 必須是 /你的專案名/
  base: '/my-fish-app/', 
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '台灣全球魚類圖鑑',
        short_name: '魚圖鑑',
        theme_color: '#0077be',
        icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }]
      }
    })
  ]
})