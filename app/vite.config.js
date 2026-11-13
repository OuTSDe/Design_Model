import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// The UI runs on 5174; /api and /files go to the local engine server on 4317.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5174, strictPort: true, open: true, proxy: { '/api': 'http://localhost:4317', '/files': 'http://localhost:4317' } },
  build: { outDir: 'dist', emptyOutDir: true }
})
