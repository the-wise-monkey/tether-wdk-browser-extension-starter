import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { sharedPolyfills, sharedResolve } from './vite.shared'

export default defineConfig({
  plugins: [react(), sharedPolyfills],
  resolve: sharedResolve,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        action: path.resolve(__dirname, 'index.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
