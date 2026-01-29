import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      host: env.VITE_HOST || 'localhost',
      port: parseInt(env.VITE_PORT || '5173', 10),
    },
    preview: {
      host: env.VITE_HOST || 'localhost',
      port: parseInt(env.VITE_PORT || '5173', 10),
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      include: ['elkjs/lib/elk.bundled.js'],
    },
  }
})
