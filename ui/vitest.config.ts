/**
 * @fileoverview Vitest configuration
 * 
 * @brief Configuration for running tests with Vitest
 * 
 * @pre Vitest is installed as dev dependency
 * @post Tests can be executed with proper environment setup
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/main.tsx',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      'sql.js': path.resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.js'),
    },
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
});
