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
      content: path.resolve(__dirname, './src/content'),
      map: path.resolve(__dirname, './src/map'),
      shared: path.resolve(__dirname, './src/shared'),
      shell: path.resolve(__dirname, './src/shell'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});
