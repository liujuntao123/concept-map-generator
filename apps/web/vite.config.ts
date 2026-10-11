import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  // @concept-map/core 是 file: 软链包：强制 react 系列从本应用解析，避免双份 React
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
  },
  server: {
    fs: {
      // 允许访问仓库根（core 源码在 ../../packages/core）
      allow: ['../..'],
    },
  },
})