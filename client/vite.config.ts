import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4174,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});
