import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const resolvePackage = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VectorHub OSS',
        short_name: 'VectorHub',
        description: '无登录、开源、本地优先、首页即编辑器的在线 SVG 编辑器。',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        start_url: '/',
        lang: 'zh-CN',
      },
    }),
  ],
  resolve: {
    alias: {
      '@vectorhub/editor-core': resolvePackage('../../packages/editor-core/src/index.ts'),
      '@vectorhub/svg-model': resolvePackage('../../packages/svg-model/src/index.ts'),
      '@vectorhub/codegen': resolvePackage('../../packages/codegen/src/index.ts'),
      '@vectorhub/local-store': resolvePackage('../../packages/local-store/src/index.ts'),
      '@vectorhub/share-url': resolvePackage('../../packages/share-url/src/index.ts'),
      '@vectorhub/plugin-api': resolvePackage('../../packages/plugin-api/src/index.ts'),
    },
  },
})
