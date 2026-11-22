import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 移动端 H5 构建配置：dev 端口 5174，/api 与 /uploads 代理到本地后端
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
