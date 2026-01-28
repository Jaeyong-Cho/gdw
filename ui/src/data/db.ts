/**
 * @fileoverview SQLite database module using backend server for file system access
 */

import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

/**
 * @brief Database instance
 */
let db: Database | null = null;

/**
 * @brief Backend server URL
 */
const SERVER_URL = 'http://localhost:3001';

/**
 * @brief LocalStorage key for database fallback
 */
const DB_KEY = 'gdw-db';

/**
 * @brief Check if backend server is available
 * 
 * @return True if server is reachable
 */
async function isServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * @brief Load database from backend or localStorage
 * 
 * @return Database binary data or null
 */
async function loadDatabaseData(): Promise<Uint8Array | null> {
  const serverAvailable = await isServerAvailable();
  
  if (serverAvailable) {
    try {
      const response = await fetch(`${SERVER_URL}/api/db`);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        console.log('Database loaded from backend server');
        return new Uint8Array(arrayBuffer);
      }
    } catch (error) {
      console.warn('Failed to load from backend:', error);
    }
  }

  // Fallback to localStorage
  const savedDb = localStorage.getItem(DB_KEY);
  if (savedDb) {
    const binaryString = atob(savedDb);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log('Database loaded from localStorage (fallback)');
    return bytes;
  }

  return null;
}

/**
 * @brief Save database to backend or localStorage
 * 
 * @pre Database is initialized
 * @post Database is saved
 */
async function saveDatabase(): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const data = db.export();
  const serverAvailable = await isServerAvailable();

  if (serverAvailable) {
    try {
      const response = await fetch(`${SERVER_URL}/api/db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Uint8Array(data)
      });

      if (response.ok) {
        console.log('Database saved to backend server');
        return;
      }
    } catch (error) {
      console.error('Error saving to backend:', error);
    }
  }

  // Fallback to localStorage
  try {
    const base64 = btoa(String.fromCharCode(...data));
    localStorage.setItem(DB_KEY, base64);
    console.log('Database saved to localStorage (fallback)');
  } catch (error) {
    console.error('Failed to save database:', error);
    throw error;
  }
}

/**
 * @brief Initialize database
 * 
 * @pre sql.js is available
 * @post Database is initialized with schema
 */
export async function initDatabase(): Promise<void> {
  if (db) {
    return;
  }

  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });

    const existingData = await loadDatabaseData();

    if (existingData) {
      db = new SQL.Database(existingData);
      console.log('Database initialized with existing data');
    } else {
      db = new SQL.Database();
      console.log('Database initialized (empty)');
      
      // Create schema
      db.run(`
        CREATE TABLE IF NOT EXISTS question_answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id TEXT NOT NULL,
          answer TEXT NOT NULL,
          answered_at TEXT NOT NULL,
          situation TEXT
        )
      `);
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_question_id ON question_answers(question_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_situation ON question_answers(situation)`);

      await saveDatabase();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * @brief Save answer to database
 * 
 * @param questionId - Question ID
 * @param situation - Situation name
 * @param answer - Answer value
 * @param answeredAt - ISO timestamp
 */
export async function saveAnswer(
  questionId: string,
  situation: string,
  answer: string | boolean,
  answeredAt: string
): Promise<void> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const answerStr = typeof answer === 'boolean' ? String(answer) : answer;
  
  db.run(
    'INSERT INTO question_answers (question_id, situation, answer, answered_at) VALUES (?, ?, ?, ?)',
    [questionId, situation, answerStr, answeredAt]
  );

  await saveDatabase();
}

/**
 * @brief Get most recent answer by question ID
 * 
 * @param questionId - Question ID
 * @return Answer string or null
 */
export async function getAnswerByQuestionId(questionId: string): Promise<string | null> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT answer FROM question_answers WHERE question_id = ? ORDER BY answered_at DESC LIMIT 1');
  stmt.bind([questionId]);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.answer as string;
  }
  
  stmt.free();
  return null;
}

/**
 * @brief Get all answers by question ID
 * 
 * @param questionId - Question ID
 * @return Array of answers with timestamps
 */
export async function getAllAnswersByQuestionId(questionId: string): Promise<Array<{ answer: string; answeredAt: string }>> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT answer, answered_at FROM question_answers WHERE question_id = ? ORDER BY answered_at DESC');
  stmt.bind([questionId]);
  
  const answers: Array<{ answer: string; answeredAt: string }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    answers.push({
      answer: row.answer as string,
      answeredAt: row.answered_at as string
    });
  }
  
  stmt.free();
  return answers;
}

/**
 * @brief Get answers by situation
 * 
 * @param situation - Situation name
 * @return Array of answers
 */
export async function getAnswersBySituation(situation: string): Promise<Array<{ questionId: string; answer: string; answeredAt: string }>> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT question_id, answer, answered_at FROM question_answers WHERE situation = ? ORDER BY answered_at DESC');
  stmt.bind([situation]);
  
  const answers: Array<{ questionId: string; answer: string; answeredAt: string }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    answers.push({
      questionId: row.question_id as string,
      answer: row.answer as string,
      answeredAt: row.answered_at as string,
    });
  }
  
  stmt.free();
  return answers;
}

/**
 * @brief Get intent summary from IntentDefined situation
 * 
 * @return Intent summary text or null
 */
export async function getIntentSummary(): Promise<string | null> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT answer FROM question_answers WHERE situation = ? AND question_id = ? ORDER BY answered_at DESC LIMIT 1');
  stmt.bind(['IntentDefined', 'intent-summarized-text']);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.answer as string;
  }
  
  stmt.free();
  return null;
}

/**
 * @brief Get intent document from IntentDefined situation
 * 
 * @return Intent document text or null
 */
export async function getIntentDocument(): Promise<string | null> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT answer FROM question_answers WHERE situation = ? AND question_id = ? ORDER BY answered_at DESC LIMIT 1');
  stmt.bind(['IntentDefined', 'intent-document-text']);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.answer as string;
  }
  
  stmt.free();
  return null;
}

/**
 * @brief Set database file path on backend
 * 
 * @param filePath - Full file path
 * @return Configured path
 */
export async function setDatabaseLocationWithPath(filePath: string): Promise<string> {
  if (!filePath || filePath.trim() === '') {
    throw new Error('File path is required');
  }

  const serverAvailable = await isServerAvailable();
  if (!serverAvailable) {
    throw new Error('Backend server is not available');
  }

  try {
    const response = await fetch(`${SERVER_URL}/api/db/path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to set path');
    }

    const result = await response.json();
    
    // Save current database to new location
    if (db) {
      await saveDatabase();
    }
    
    return result.path;
  } catch (error) {
    console.error('Error setting path:', error);
    throw error;
  }
}

/**
 * @brief Get database file path from backend
 * 
 * @return File path or null
 */
export async function getDatabasePath(): Promise<string | null> {
  const serverAvailable = await isServerAvailable();
  if (!serverAvailable) {
    return null;
  }

  try {
    const response = await fetch(`${SERVER_URL}/api/db/path`);
    const result = await response.json();
    return result.path;
  } catch (error) {
    return null;
  }
}

/**
 * @brief Check if database location is configured
 * 
 * @return True if configured
 */
export async function isDatabaseLocationConfigured(): Promise<boolean> {
  const path = await getDatabasePath();
  return path !== null;
}

/**
 * @brief Clear database location on backend
 */
export async function clearDatabaseLocation(): Promise<void> {
  const serverAvailable = await isServerAvailable();
  if (!serverAvailable) {
    return;
  }

  try {
    await fetch(`${SERVER_URL}/api/db/path`, { method: 'DELETE' });
    console.log('Database location cleared');
  } catch (error) {
    console.error('Error clearing location:', error);
    throw error;
  }
}

/**
 * @brief Get database information
 * 
 * @return Database info object
 */
export async function getDatabaseInfo(): Promise<{
  storageType: string;
  storageLocation: string;
  sizeBytes: number;
  sizeFormatted: string;
  recordCount: number;
  hasFileSystemAccess: boolean;
}> {
  await initDatabase();

  let recordCount = 0;
  if (db) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM question_answers');
    if (stmt.step()) {
      const result = stmt.getAsObject();
      recordCount = result.count as number;
    }
    stmt.free();
  }

  const data = db ? db.export() : new Uint8Array();
  const sizeBytes = data.length;
  const sizeFormatted = sizeBytes < 1024 ? `${sizeBytes} B` :
                        sizeBytes < 1024 * 1024 ? `${(sizeBytes / 1024).toFixed(2)} KB` :
                        `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;

  let storageType = 'Backend Server';
  let storageLocation = 'Not configured';
  let hasFileSystemAccess = false;

  const serverAvailable = await isServerAvailable();
  
  if (serverAvailable) {
    try {
      const response = await fetch(`${SERVER_URL}/api/db/info`);
      const info = await response.json();
      
      if (info.configured) {
        storageType = 'Backend Server (File System)';
        storageLocation = info.path;
        hasFileSystemAccess = true;
      } else {
        storageType = 'Backend Server (Not Configured)';
        storageLocation = 'Path not set';
      }
    } catch (error) {
      storageType = 'Backend Server Error';
      storageLocation = 'Failed to communicate';
    }
  } else {
    storageType = 'LocalStorage (Server Offline)';
    storageLocation = 'localStorage (key: gdw-db)';
  }

  return {
    storageType,
    storageLocation,
    sizeBytes,
    sizeFormatted,
    recordCount,
    hasFileSystemAccess
  };
}

/**
 * @brief Export database
 * 
 * @return Database binary data
 */
export async function exportDatabase(): Promise<Uint8Array> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const data = db.export();
  
  // Also save to backend if configured
  const serverAvailable = await isServerAvailable();
  if (serverAvailable) {
    try {
      await saveDatabase();
    } catch (error) {
      console.warn('Failed to save during export:', error);
    }
  }

  return data;
}

/**
 * @brief Import database
 * 
 * @param data - Database binary data
 */
export async function importDatabase(data: Uint8Array): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`
  });

  db = new SQL.Database(data);
  await saveDatabase();
  console.log('Database imported');
}

/**
 * @brief Clear all database data
 */
export async function clearDatabase(): Promise<void> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  db.run('DELETE FROM question_answers');
  await saveDatabase();
}

/**
 * @brief Check if backend server is available
 * 
 * @return True if server is reachable
 */
export async function isBackendServerAvailable(): Promise<boolean> {
  return await isServerAvailable();
}
