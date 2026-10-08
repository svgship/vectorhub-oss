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
      workbox: {
        // Monaco 的 chunk 约 3.3MB（gzip 856KB），超过 workbox 默认 2MiB 的预缓存上限。
        // 代码面板是 PRD §7.3 的 P0 且默认可见，必须能离线打开，所以放宽到 4MiB。
        // 它是懒加载 chunk，不参与首屏，只在 Service Worker 安装时后台下载。
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
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
