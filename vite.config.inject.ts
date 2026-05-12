import path from 'node:path'

import { defineConfig } from 'vite'

import { sharedPolyfills, sharedResolve } from './vite.shared'

export default defineConfig({
  plugins: [sharedPolyfills],
  resolve: sharedResolve,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        inject: path.resolve(__dirname, 'src/inject/index.ts')
      },
      output: {
        format: 'iife',
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
