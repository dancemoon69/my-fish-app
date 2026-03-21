import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/my-fish-app/', // 注意：這要跟你的 GitHub 專案名稱一樣
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '台灣全球魚類圖鑑',
        short_name: '魚圖鑑',
        theme_color: '#0077be',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192.png', // 等下要準備這張圖
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});