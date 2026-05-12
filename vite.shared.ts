import { nodePolyfills } from 'vite-plugin-node-polyfills'

export const sharedResolve = {
  alias: {
    buffer: 'buffer',
    events: 'events',
    stream: 'stream-browserify',
    util: 'util'
  },
  dedupe: ['react', 'react-dom']
}

export const sharedPolyfills = nodePolyfills({
  globals: {
    Buffer: true,
    global: true,
    process: true
  },
  protocolImports: true
})
