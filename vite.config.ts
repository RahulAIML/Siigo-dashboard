import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },

  server: {
    port: 5175,
    proxy: {
      '/siigo/bridge': {
        target: 'https://rolplay.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/siigo\/bridge/, '/ajax'),
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT ?? '4175'),
    allowedHosts: ['siigo-dashboard.onrender.com'],
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':  ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-ai':     ['@google/generative-ai'],
          'vendor-pdf':    ['jspdf'],
          'vendor-icons':  ['lucide-react'],
        },
      },
    },
  },
})
