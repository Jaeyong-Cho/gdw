/**
 * @fileoverview Backend server for GDW database file management
 * Provides REST API for reading/writing SQLite database files to arbitrary paths
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const HOST = process.env.SERVER_HOST || '0.0.0.0';
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// Store current database path
let currentDbPath = null;

/**
 * @brief Validate and normalize file path
 * 
 * @param filePath - File path to validate
 * @return Normalized absolute path
 * @throws Error if path is invalid
 */
function validatePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }
  
  const normalized = path.resolve(filePath);
  return normalized;
}

/**
 * @brief Ensure directory exists
 * 
 * @param filePath - File path to check
 */
async function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * @brief GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    dbPath: currentDbPath
  });
});

/**
 * @brief GET /api/db/path
 * Get current database file path
 */
app.get('/api/db/path', (req, res) => {
  res.json({ 
    path: currentDbPath,
    exists: currentDbPath ? true : false
  });
});

/**
 * @brief POST /api/db/path
 * Set database file path
 * 
 * Body: { path: string }
 */
app.post('/api/db/path', async (req, res) => {
  try {
    const { path: dbPath } = req.body;
    
    if (!dbPath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    const normalized = validatePath(dbPath);
    currentDbPath = normalized;
    
    console.log(`Database path set to: ${normalized}`);
    
    res.json({ 
      success: true, 
      path: normalized 
    });
  } catch (error) {
    console.error('Error setting path:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @brief GET /api/db
 * Read database file from configured path
 */
app.get('/api/db', async (req, res) => {
  try {
    if (!currentDbPath) {
      return res.status(400).json({ 
        error: 'Database path not configured' 
      });
    }
    
    const data = await fs.readFile(currentDbPath);
    
    res.set('Content-Type', 'application/octet-stream');
    res.send(data);
    
    console.log(`Database read from: ${currentDbPath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ 
        error: 'Database file not found',
        path: currentDbPath
      });
    } else {
      console.error('Error reading database:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @brief POST /api/db
 * Write database file to configured path
 * 
 * Body: Binary data (application/octet-stream)
 */
app.post('/api/db', async (req, res) => {
  try {
    if (!currentDbPath) {
      return res.status(400).json({ 
        error: 'Database path not configured' 
      });
    }
    
    await ensureDirectory(currentDbPath);
    
    const data = req.body;
    await fs.writeFile(currentDbPath, data);
    
    const stats = await fs.stat(currentDbPath);
    
    console.log(`Database written to: ${currentDbPath} (${stats.size} bytes)`);
    
    res.json({ 
      success: true, 
      path: currentDbPath,
      size: stats.size
    });
  } catch (error) {
    console.error('Error writing database:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @brief DELETE /api/db/path
 * Clear database file path configuration
 */
app.delete('/api/db/path', (req, res) => {
  currentDbPath = null;
  console.log('Database path cleared');
  res.json({ success: true });
});

/**
 * @brief GET /api/db/info
 * Get database file information
 */
app.get('/api/db/info', async (req, res) => {
  try {
    if (!currentDbPath) {
      return res.json({
        configured: false,
        path: null,
        exists: false
      });
    }
    
    try {
      const stats = await fs.stat(currentDbPath);
      res.json({
        configured: true,
        path: currentDbPath,
        exists: true,
        size: stats.size,
        modified: stats.mtime.toISOString()
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({
          configured: true,
          path: currentDbPath,
          exists: false
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting database info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`GDW Server running on http://${HOST}:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/db/path`);
  console.log(`  POST /api/db/path`);
  console.log(`  GET  /api/db`);
  console.log(`  POST /api/db`);
  console.log(`  GET  /api/db/info`);
  console.log(`  DELETE /api/db/path`);
});
