import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [
        visualizer({
          template: 'treemap',
          open: true,
          filename: 'stats.html',
          gzipSize: true,
          brotliSize: true,
        }),
      ],
    },
  },
})
