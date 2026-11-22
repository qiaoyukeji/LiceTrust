import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// PC 管理端构建配置：dev 端口 5173，/api 与 /uploads 代理到后端 3000
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true }
    }
  },
  build: {
    chunkSizeWarningLimit: 1500
  }
})
