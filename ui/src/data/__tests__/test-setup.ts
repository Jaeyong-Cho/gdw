/**
 * @fileoverview Test setup utilities
 * 
 * @brief Provides SQL.js configuration for test environment
 * 
 * @pre sql.js package is installed
 * @post SQL.js is configured with proper wasm path for tests
 */

import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * @brief Initialize SQL.js with wasm file for tests
 * 
 * @return Initialized SQL.js module
 * 
 * @pre sql-wasm.wasm file exists in node_modules
 * @post SQL.js is ready for database operations
 */
export async function initSqlJsForTests() {
  const wasmPath = path.join(
    process.cwd(),
    'node_modules/sql.js/dist/sql-wasm.wasm'
  );
  
  const wasmBinary = fs.readFileSync(wasmPath);
  
  return await initSqlJs({
    wasmBinary,
  });
}
