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
        content: path.resolve(__dirname, 'src/content/index.ts'),
        'inject-shim': path.resolve(__dirname, 'src/content/inject-shim.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
