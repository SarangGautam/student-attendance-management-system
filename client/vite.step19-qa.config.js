import { defineConfig, mergeConfig } from 'vite'
import baseConfig from './vite.config.js'

export default mergeConfig(baseConfig, defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5174,
    proxy: { '/api': 'http://127.0.0.1:5001' },
  },
}))
