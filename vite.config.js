import vitePluginString from 'vite-plugin-string';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vitePluginString()
  ],
  server: {
    port: 5175,
    proxy: {
      // YouTube search - proxy to Vercel production
      // UPDATE THIS with your actual Vercel domain (check Vercel dashboard)
      // Or run `vercel dev` on port 3000 and it will use the localhost fallback below
      '/api/youtube-search': {
        target: process.env.VITE_VERCEL_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      // Fallback for other /api calls (Vercel dev server)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});