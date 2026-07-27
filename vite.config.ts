import { defineConfig } from 'vite'

// The flat is built from data, not from files on disk. There are no binary
// assets in this project: geometry comes from Three.js primitives, textures are
// drawn to a canvas at runtime, and audio is synthesised with the Web Audio API.
// That is why publicDir is switched off.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    target: 'es2023',
    sourcemap: true,
    // Three is most of the bundle and it is a single-page game with no routes to
    // split along, so the default 500kB warning is noise here rather than signal.
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
  },
})
