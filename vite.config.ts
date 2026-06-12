import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes every asset URL relative, so the same build works at
// https://<user>.github.io/<repo>/ (GitHub Pages) and at the domain root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
