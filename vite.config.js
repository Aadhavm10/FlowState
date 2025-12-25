import vitePluginString from 'vite-plugin-string';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vitePluginString()
  ],
  server: {
    port: 5175,
    proxy: {
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