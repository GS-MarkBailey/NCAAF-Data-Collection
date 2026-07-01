import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { featureFlagsApiPlugin } from './vite.featureFlagsApi'

export default defineConfig({
  plugins: [react(), tailwindcss(), featureFlagsApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
