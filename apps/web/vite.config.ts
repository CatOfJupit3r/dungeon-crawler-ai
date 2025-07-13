import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tanstackRouter({
      routesDirectory: path.resolve(__dirname, './src/routes'),
      generatedRouteTree: path.resolve(__dirname, './src/routeTree.gen.ts'),
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@dungeon-crawler-ai:web': path.resolve(__dirname, './src'),
    },
  },
});
