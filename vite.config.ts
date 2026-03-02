import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Research D-002 + D-009: COOP/COEP headers required for Rapier WASM SharedArrayBuffer.
// @react-three/rapier uses SharedArrayBuffer internally; without these headers the
// WASM module will fail to initialise at runtime in all modern browsers.
// Note: Vitest test configuration lives in vitest.config.ts (mergeConfig pattern)
// to avoid the type conflict between vite's Plugin<any> and vitest's bundled vite copy.
export default defineConfig({
  plugins: [react()],

  server: {
    headers: {
      // Required for Rapier WASM (SharedArrayBuffer security restriction)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  optimizeDeps: {
    // Exclude Rapier from Vite pre-bundling — it ships its own WASM loader
    // that must run as-is; pre-bundling breaks the WASM initialisation path.
    exclude: ['@react-three/rapier'],
  },
});
