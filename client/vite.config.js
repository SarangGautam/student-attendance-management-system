import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: [process.cwd()] },
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  optimizeDeps: {
    noDiscovery: true,
    include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'lucide-react', 'xlsx'],
  },
})
