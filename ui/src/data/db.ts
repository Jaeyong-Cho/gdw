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
 * @brief Migrate existing database to add relationship columns
 * 
 * @param database - Database instance
 * @pre Database is initialized
 * @post Relationship columns are added if they don't exist
 */
async function migrateDatabase(database: Database): Promise<void> {
  try {
    // Check if columns exist
    const stmt = database.prepare('PRAGMA table_info(question_answers)');
    const columns: string[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      columns.push(row.name as string);
    }
    stmt.free();
    
    // Add missing columns
    if (!columns.includes('intent_id')) {
      console.log('Adding intent_id column...');
      database.run('ALTER TABLE question_answers ADD COLUMN intent_id INTEGER');
    }
    
    if (!columns.includes('problem_id')) {
      console.log('Adding problem_id column...');
      database.run('ALTER TABLE question_answers ADD COLUMN problem_id INTEGER');
    }
    
    if (!columns.includes('parent_id')) {
      console.log('Adding parent_id column...');
      database.run('ALTER TABLE question_answers ADD COLUMN parent_id INTEGER');
    }
    
    // Create indexes if they don't exist
    database.run('CREATE INDEX IF NOT EXISTS idx_intent_id ON question_answers(intent_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_problem_id ON question_answers(problem_id)');
    
    // Create workflow_states table if it doesn't exist
    database.run(`
      CREATE TABLE IF NOT EXISTS workflow_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        current_situation TEXT NOT NULL,
        saved_at TEXT NOT NULL,
        description TEXT,
        snapshot_data TEXT NOT NULL
      )
    `);
    database.run('CREATE INDEX IF NOT EXISTS idx_saved_at ON workflow_states(saved_at)');
    
    // Create transition_counters table if it doesn't exist
    database.run(`
      CREATE TABLE IF NOT EXISTS transition_counters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transition_key TEXT NOT NULL UNIQUE,
        count INTEGER NOT NULL DEFAULT 0,
        last_reset_at TEXT,
        updated_at TEXT NOT NULL
      )
    `);
    database.run('CREATE INDEX IF NOT EXISTS idx_transition_key ON transition_counters(transition_key)');
    
    // Create cycles table if it doesn't exist
    database.run(`
      CREATE TABLE IF NOT EXISTS cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_number INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        unconscious_entered_at TEXT,
        unconscious_exited_at TEXT
      )
    `);
    database.run('CREATE INDEX IF NOT EXISTS idx_cycle_number ON cycles(cycle_number)');
    database.run('CREATE INDEX IF NOT EXISTS idx_cycle_status ON cycles(status)');

    // Add unconscious time columns to cycles if they don't exist (for existing DBs)
    const cycleStmt = database.prepare('PRAGMA table_info(cycles)');
    const cycleColumns: string[] = [];
    while (cycleStmt.step()) {
      const row = cycleStmt.getAsObject();
      cycleColumns.push(row.name as string);
    }
    cycleStmt.free();
    if (!cycleColumns.includes('unconscious_entered_at')) {
      database.run('ALTER TABLE cycles ADD COLUMN unconscious_entered_at TEXT');
    }
    if (!cycleColumns.includes('unconscious_exited_at')) {
      database.run('ALTER TABLE cycles ADD COLUMN unconscious_exited_at TEXT');
    }
    
    // Add cycle_id column to question_answers if it doesn't exist
    if (!columns.includes('cycle_id')) {
      console.log('Adding cycle_id column...');
      database.run('ALTER TABLE question_answers ADD COLUMN cycle_id INTEGER');
      database.run('CREATE INDEX IF NOT EXISTS idx_cycle_id ON question_answers(cycle_id)');
    }
    
    console.log('Database migration completed');
    
    // Save migrated database
    await saveDatabase();
  } catch (error) {
    console.error('Database migration failed:', error);
    throw error;
  }
}

/**
 * @brief Load database from backend file or localStorage
 * 
 * @return Database binary data or null
 * 
 * @pre None
 * @post Returns database data from file if path configured, otherwise from localStorage
 */
async function loadDatabaseData(): Promise<Uint8Array | null> {
  const serverAvailable = await isServerAvailable();
  
  if (serverAvailable) {
    // Check if database path is configured
    try {
      const pathResponse = await fetch(`${SERVER_URL}/api/db/path`);
      if (pathResponse.ok) {
        const pathInfo = await pathResponse.json();
        if (pathInfo.path) {
          // Path is configured, try to load from file
          try {
            const response = await fetch(`${SERVER_URL}/api/db`);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const fileData = new Uint8Array(arrayBuffer);
              
              if (fileData.length > 0) {
                console.log('Database loaded from backend server file:', pathInfo.path);
                return fileData;
              } else {
                console.log('Database file exists but is empty:', pathInfo.path);
                // File exists but is empty, fall through to localStorage check
              }
            }
          } catch (error) {
            console.warn('Failed to load from backend file:', error);
            // Fall through to localStorage fallback
          }
        }
      }
    } catch (error) {
      console.warn('Error checking database path:', error);
      // Fall through to localStorage fallback
    }
  }

  // Fallback to localStorage only if file path is not configured or file doesn't exist
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
 * @post Database is saved (to backend if path configured, otherwise localStorage)
 */
async function saveDatabase(): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const data = db.export();
  const serverAvailable = await isServerAvailable();

  if (serverAvailable) {
    // Check if database path is configured
    try {
      const pathResponse = await fetch(`${SERVER_URL}/api/db/path`);
      if (pathResponse.ok) {
        const pathInfo = await pathResponse.json();
        if (pathInfo.path) {
          // Path is configured, save to backend file system
          try {
            const response = await fetch(`${SERVER_URL}/api/db`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: new Uint8Array(data)
            });

            if (response.ok) {
              console.log('Database saved to backend server file:', pathInfo.path);
              return;
            }
          } catch (error) {
            console.error('Error saving to backend:', error);
            // Fall through to localStorage fallback only if backend save fails
          }
        }
      }
    } catch (error) {
      console.warn('Error checking database path:', error);
      // Fall through to localStorage fallback
    }
  }

  // Fallback to localStorage only if backend is not available or path is not configured
  // Do not overwrite localStorage if path is configured (to preserve data)
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
      
      // Run migrations for existing database
      await migrateDatabase(db);
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
          situation TEXT,
          intent_id INTEGER,
          problem_id INTEGER,
          parent_id INTEGER,
          cycle_id INTEGER,
          FOREIGN KEY (intent_id) REFERENCES question_answers(id),
          FOREIGN KEY (problem_id) REFERENCES question_answers(id),
          FOREIGN KEY (parent_id) REFERENCES question_answers(id),
          FOREIGN KEY (cycle_id) REFERENCES cycles(id)
        )
      `);
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_question_id ON question_answers(question_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_situation ON question_answers(situation)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_intent_id ON question_answers(intent_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_problem_id ON question_answers(problem_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_cycle_id ON question_answers(cycle_id)`);
      
      // Create cycles table
      db.run(`
        CREATE TABLE IF NOT EXISTS cycles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cycle_number INTEGER NOT NULL,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          unconscious_entered_at TEXT,
          unconscious_exited_at TEXT
        )
      `);
      db.run(`CREATE INDEX IF NOT EXISTS idx_cycle_number ON cycles(cycle_number)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_cycle_status ON cycles(status)`);

      // Create workflow state table
      db.run(`
        CREATE TABLE IF NOT EXISTS workflow_states (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          current_situation TEXT NOT NULL,
          saved_at TEXT NOT NULL,
          description TEXT,
          snapshot_data TEXT NOT NULL
        )
      `);
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_saved_at ON workflow_states(saved_at)`);

      await saveDatabase();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * @brief Get current active intent ID
 * 
 * @return Intent answer ID or null
 */
export async function getCurrentIntentId(): Promise<number | null> {
  if (!db) return null;

  // Look for intent-related questions in DefiningIntent situation
  const stmt = db.prepare(`
    SELECT id FROM question_answers 
    WHERE situation = ? 
    AND (question_id LIKE ? OR question_id LIKE ? OR question_id LIKE ?)
    ORDER BY answered_at DESC LIMIT 1
  `);
  stmt.bind(['DefiningIntent', 'intent-summary%', 'intent-summarized%', 'intent-document%']);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.id as number;
  }
  
  stmt.free();
  return null;
}

/**
 * @brief Get current active problem ID
 * 
 * @return Problem answer ID or null
 */
export async function getCurrentProblemId(): Promise<number | null> {
  if (!db) return null;

  // Look for problem-related questions in SelectingProblem situation
  const stmt = db.prepare(`
    SELECT id FROM question_answers 
    WHERE situation = ? 
    AND (question_id LIKE ? OR question_id LIKE ? OR question_id LIKE ?)
    ORDER BY answered_at DESC LIMIT 1
  `);
  stmt.bind(['SelectingProblem', 'problem-%', 'problem-boundaries%', 'problem-distinct%']);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.id as number;
  }
  
  stmt.free();
  return null;
}

/**
 * @brief Get current active cycle ID
 * 
 * @return Cycle ID or null if no active cycle
 * 
 * @pre Database is initialized
 * @post Returns current active cycle ID or null
 */
export async function getCurrentCycleId(): Promise<number | null> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT id FROM cycles WHERE status = ? ORDER BY cycle_number DESC LIMIT 1');
  stmt.bind(['active']);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.id as number;
  }
  
  stmt.free();
  return null;
}

/**
 * @brief Save answer to database with relationship tracking
 * 
 * @param questionId - Question ID
 * @param situation - Situation name
 * @param answer - Answer value
 * @param answeredAt - ISO timestamp
 * @param options - Optional relationship IDs
 */
export async function saveAnswer(
  questionId: string,
  situation: string,
  answer: string | boolean,
  answeredAt: string,
  options?: {
    intentId?: number | null;
    problemId?: number | null;
    parentId?: number | null;
  }
): Promise<number> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const answerStr = typeof answer === 'boolean' ? String(answer) : answer;
  
  // Auto-link to current intent and problem if not specified
  let intentId = options?.intentId;
  let problemId = options?.problemId;
  const parentId = options?.parentId;
  
  // If this is an intent answer, don't link to other intent
  if (situation === 'DefiningIntent' && questionId.includes('intent-')) {
    intentId = null;
    problemId = null;
  }
  // If this is a problem answer, link to intent but not to another problem
  else if (situation === 'SelectingProblem' && questionId.includes('problem-')) {
    if (intentId === undefined) {
      intentId = await getCurrentIntentId();
    }
    problemId = null;
  }
  // For all other situations, link to both intent and problem
  else {
    if (intentId === undefined) {
      intentId = await getCurrentIntentId();
    }
    if (problemId === undefined) {
      problemId = await getCurrentProblemId();
    }
  }
  
  // Get current cycle ID
  const cycleId = await getCurrentCycleId();
  
  db.run(
    'INSERT INTO question_answers (question_id, situation, answer, answered_at, intent_id, problem_id, parent_id, cycle_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [questionId, situation, answerStr, answeredAt, intentId ?? null, problemId ?? null, parentId ?? null, cycleId]
  );

  // Get the inserted row ID
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const result = stmt.getAsObject();
  const insertedId = result.id as number;
  stmt.free();

  await saveDatabase();
  
  return insertedId;
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
 * @param cycleId - Optional cycle ID to filter answers
 * @return Array of answers
 * 
 * @pre Database is initialized
 * @post Returns answers filtered by situation and optionally by cycle
 */
export async function getAnswersBySituation(situation: string, cycleId?: number | null): Promise<Array<{ 
  id: number;
  questionId: string; 
  answer: string; 
  answeredAt: string;
  intentId: number | null;
  problemId: number | null;
  cycleId: number | null;
}>> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  let stmt;
  if (cycleId !== undefined && cycleId !== null) {
    stmt = db.prepare('SELECT id, question_id, answer, answered_at, intent_id, problem_id, cycle_id FROM question_answers WHERE situation = ? AND cycle_id = ? ORDER BY answered_at DESC');
    stmt.bind([situation, cycleId]);
  } else {
    stmt = db.prepare('SELECT id, question_id, answer, answered_at, intent_id, problem_id, cycle_id FROM question_answers WHERE situation = ? ORDER BY answered_at DESC');
    stmt.bind([situation]);
  }
  
  const answers: Array<{ 
    id: number;
    questionId: string; 
    answer: string; 
    answeredAt: string;
    intentId: number | null;
    problemId: number | null;
    cycleId: number | null;
  }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    answers.push({
      id: row.id as number,
      questionId: row.question_id as string,
      answer: row.answer as string,
      answeredAt: row.answered_at as string,
      intentId: (row.intent_id as number) || null,
      problemId: (row.problem_id as number) || null,
      cycleId: (row.cycle_id as number) || null,
    });
  }
  
  stmt.free();
  return answers;
}

/**
 * @brief Get all answers related to an intent
 * 
 * @param intentId - Intent answer ID
 * @return Array of related answers
 */
export async function getAnswersByIntent(intentId: number): Promise<Array<{ 
  id: number;
  questionId: string; 
  answer: string; 
  answeredAt: string;
  situation: string;
  problemId: number | null;
}>> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT id, question_id, answer, answered_at, situation, problem_id FROM question_answers WHERE intent_id = ? ORDER BY answered_at DESC');
  stmt.bind([intentId]);
  
  const answers: Array<{ 
    id: number;
    questionId: string; 
    answer: string; 
    answeredAt: string;
    situation: string;
    problemId: number | null;
  }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    answers.push({
      id: row.id as number,
      questionId: row.question_id as string,
      answer: row.answer as string,
      answeredAt: row.answered_at as string,
      situation: row.situation as string,
      problemId: (row.problem_id as number) || null,
    });
  }
  
  stmt.free();
  return answers;
}

/**
 * @brief Get all answers related to a problem
 * 
 * @param problemId - Problem answer ID
 * @return Array of related answers
 */
export async function getAnswersByProblem(problemId: number): Promise<Array<{ 
  id: number;
  questionId: string; 
  answer: string; 
  answeredAt: string;
  situation: string;
}>> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT id, question_id, answer, answered_at, situation FROM question_answers WHERE problem_id = ? ORDER BY answered_at DESC');
  stmt.bind([problemId]);
  
  const answers: Array<{ 
    id: number;
    questionId: string; 
    answer: string; 
    answeredAt: string;
    situation: string;
  }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    answers.push({
      id: row.id as number,
      questionId: row.question_id as string,
      answer: row.answer as string,
      answeredAt: row.answered_at as string,
      situation: row.situation as string,
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
  stmt.bind(['DefiningIntent', 'intent-summarized-text']);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.answer as string;
  }
  
  stmt.free();
  return null;
}

/**
 * @brief Get intent document from DefiningIntent situation
 * 
 * @return Intent document text or null
 */
export async function getIntentDocument(): Promise<string | null> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT answer FROM question_answers WHERE situation = ? AND question_id = ? ORDER BY answered_at DESC LIMIT 1');
  stmt.bind(['DefiningIntent', 'intent-document-text']);
  
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
 * 
 * @pre Backend server is available
 * @post Path is set, database is loaded from file if exists, or current db is saved to file
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
    // Set the path
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
    
    // Try to load database from the file
    try {
      const loadResponse = await fetch(`${SERVER_URL}/api/db`);
      if (loadResponse.ok) {
        const arrayBuffer = await loadResponse.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);
        
        if (fileData.length > 0) {
          // File exists and has data, load it
          const SQL = await initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
          });
          
          // Close existing database if any
          if (db) {
            db.close();
          }
          
          db = new SQL.Database(fileData);
          console.log('Database loaded from file:', filePath);
          
          // Run migrations
          await migrateDatabase(db);
          
          return result.path;
        }
      }
    } catch (loadError) {
      console.warn('File does not exist or could not be loaded, will save current database:', loadError);
    }
    
    // File doesn't exist or is empty, save current database to new location
    if (db) {
      await saveDatabase();
      console.log('Current database saved to file:', filePath);
    } else {
      // Initialize empty database if none exists
      await initDatabase();
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

/**
 * @brief Save current workflow state as a snapshot
 * 
 * @param currentSituation - Current situation
 * @param description - Optional description of the state
 * @return Snapshot ID
 */
export async function saveWorkflowState(
  currentSituation: string,
  description?: string
): Promise<number> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Get all current answers
  const stmt = db.prepare('SELECT * FROM question_answers ORDER BY answered_at');
  const answers: any[] = [];
  
  while (stmt.step()) {
    answers.push(stmt.getAsObject());
  }
  stmt.free();

  // Create snapshot
  const snapshot = {
    situation: currentSituation,
    answers: answers,
    savedAt: new Date().toISOString()
  };

  const snapshotData = JSON.stringify(snapshot);
  const savedAt = new Date().toISOString();

  db.run(
    'INSERT INTO workflow_states (current_situation, saved_at, description, snapshot_data) VALUES (?, ?, ?, ?)',
    [currentSituation, savedAt, description || null, snapshotData]
  );

  // Get inserted ID
  const idStmt = db.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const result = idStmt.getAsObject();
  const snapshotId = result.id as number;
  idStmt.free();

  await saveDatabase();
  
  console.log(`Workflow state saved: ID ${snapshotId}`);
  return snapshotId;
}

/**
 * @brief Restore workflow state from a snapshot
 * 
 * @param snapshotId - Snapshot ID to restore
 * @return Current situation after restore
 */
export async function restoreWorkflowState(snapshotId: number): Promise<string> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Get snapshot
  const stmt = db.prepare('SELECT snapshot_data FROM workflow_states WHERE id = ?');
  stmt.bind([snapshotId]);
  
  if (!stmt.step()) {
    stmt.free();
    throw new Error('Snapshot not found');
  }

  const result = stmt.getAsObject();
  const snapshotData = result.snapshot_data as string;
  stmt.free();

  const snapshot = JSON.parse(snapshotData);

  // Clear current answers
  db.run('DELETE FROM question_answers');

  // Restore answers
  for (const answer of snapshot.answers) {
    db.run(
      'INSERT INTO question_answers (id, question_id, situation, answer, answered_at, intent_id, problem_id, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        answer.id,
        answer.question_id,
        answer.situation,
        answer.answer,
        answer.answered_at,
        answer.intent_id ?? null,
        answer.problem_id ?? null,
        answer.parent_id ?? null
      ]
    );
  }

  await saveDatabase();
  
  console.log(`Workflow state restored: ${snapshot.situation}`);
  return snapshot.situation;
}

/**
 * @brief Get all saved workflow states
 * 
 * @return Array of saved states
 */
export async function getSavedWorkflowStates(): Promise<Array<{
  id: number;
  currentSituation: string;
  savedAt: string;
  description: string | null;
}>> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT id, current_situation, saved_at, description FROM workflow_states ORDER BY saved_at DESC');
  const states: Array<{
    id: number;
    currentSituation: string;
    savedAt: string;
    description: string | null;
  }> = [];
  
  while (stmt.step()) {
    const row = stmt.getAsObject();
    states.push({
      id: row.id as number,
      currentSituation: row.current_situation as string,
      savedAt: row.saved_at as string,
      description: (row.description as string) || null,
    });
  }
  
  stmt.free();
  return states;
}

/**
 * @brief Delete a workflow state snapshot
 * 
 * @param snapshotId - Snapshot ID to delete
 */
export async function deleteWorkflowState(snapshotId: number): Promise<void> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  db.run('DELETE FROM workflow_states WHERE id = ?', [snapshotId]);
  await saveDatabase();
  
  console.log(`Workflow state deleted: ID ${snapshotId}`);
}

/**
 * @brief Get workflow state details
 * 
 * @param snapshotId - Snapshot ID
 * @return Snapshot details including answer count
 */
export async function getWorkflowStateDetails(snapshotId: number): Promise<{
  id: number;
  currentSituation: string;
  savedAt: string;
  description: string | null;
  answerCount: number;
}> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT * FROM workflow_states WHERE id = ?');
  stmt.bind([snapshotId]);
  
  if (!stmt.step()) {
    stmt.free();
    throw new Error('Snapshot not found');
  }

  const result = stmt.getAsObject();
  stmt.free();

  const snapshot = JSON.parse(result.snapshot_data as string);

  return {
    id: result.id as number,
    currentSituation: result.current_situation as string,
    savedAt: result.saved_at as string,
    description: (result.description as string) || null,
    answerCount: snapshot.answers.length
  };
}

/**
 * @brief Get consecutive transition count for a specific transition
 * 
 * @param fromSituation - Source situation
 * @param toSituation - Target situation
 * @return Consecutive transition count
 * 
 * @pre Database is initialized
 * @post Returns current count (0 if not found)
 */
export async function getTransitionCount(
  fromSituation: string,
  toSituation: string
): Promise<number> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const transitionKey = `${fromSituation}->${toSituation}`;
  const stmt = db.prepare('SELECT count FROM transition_counters WHERE transition_key = ?');
  stmt.bind([transitionKey]);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.count as number;
  }
  
  stmt.free();
  return 0;
}

/**
 * @brief Increment consecutive transition count
 * 
 * @param fromSituation - Source situation
 * @param toSituation - Target situation
 * @return New count after increment
 * 
 * @pre Database is initialized
 * @post Transition count is incremented and saved
 */
export async function incrementTransitionCount(
  fromSituation: string,
  toSituation: string
): Promise<number> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const transitionKey = `${fromSituation}->${toSituation}`;
  const now = new Date().toISOString();
  
  // Try to update existing record
  const updateStmt = db.prepare(`
    UPDATE transition_counters 
    SET count = count + 1, updated_at = ?
    WHERE transition_key = ?
  `);
  updateStmt.bind([now, transitionKey]);
  updateStmt.step();
  const rowsAffected = updateStmt.getAsObject().changes as number;
  updateStmt.free();
  
  if (rowsAffected === 0) {
    // Insert new record
    db.run(
      'INSERT INTO transition_counters (transition_key, count, updated_at) VALUES (?, 1, ?)',
      [transitionKey, now]
    );
    await saveDatabase();
    return 1;
  }
  
  // Get updated count
  const selectStmt = db.prepare('SELECT count FROM transition_counters WHERE transition_key = ?');
  selectStmt.bind([transitionKey]);
  selectStmt.step();
  const result = selectStmt.getAsObject();
  const newCount = result.count as number;
  selectStmt.free();
  
  await saveDatabase();
  return newCount;
}

/**
 * @brief Reset transition count for a specific transition
 * 
 * @param fromSituation - Source situation
 * @param toSituation - Target situation
 * 
 * @pre Database is initialized
 * @post Transition count is reset to 0
 */
export async function resetTransitionCount(
  fromSituation: string,
  toSituation: string
): Promise<void> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const transitionKey = `${fromSituation}->${toSituation}`;
  const now = new Date().toISOString();
  
  db.run(
    'UPDATE transition_counters SET count = 0, last_reset_at = ?, updated_at = ? WHERE transition_key = ?',
    [now, now, transitionKey]
  );
  
  await saveDatabase();
}

/**
 * @brief Create a new cycle
 * 
 * @return Cycle ID
 * 
 * @pre Database is initialized
 * @post New cycle is created and returned
 */
export async function createCycle(): Promise<number> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Get the next cycle number
  const maxStmt = db.prepare('SELECT MAX(cycle_number) as max_num FROM cycles');
  maxStmt.step();
  const result = maxStmt.getAsObject();
  const nextCycleNumber = (result.max_num as number || 0) + 1;
  maxStmt.free();

  const startedAt = new Date().toISOString();
  
  db.run(
    'INSERT INTO cycles (cycle_number, started_at, status) VALUES (?, ?, ?)',
    [nextCycleNumber, startedAt, 'active']
  );

  const idStmt = db.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const cycleId = idStmt.getAsObject().id as number;
  idStmt.free();

  await saveDatabase();
  
  console.log(`Cycle ${nextCycleNumber} created: ID ${cycleId}`);
  return cycleId;
}

/**
 * @brief Complete a cycle
 * 
 * @param cycleId - Cycle ID to complete
 * 
 * @pre Database is initialized, cycleId exists
 * @post Cycle status is set to 'completed'
 */
export async function completeCycle(cycleId: number): Promise<void> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const completedAt = new Date().toISOString();
  
  db.run(
    'UPDATE cycles SET status = ?, completed_at = ? WHERE id = ?',
    ['completed', completedAt, cycleId]
  );
  
  await saveDatabase();
  
  console.log(`Cycle ${cycleId} completed`);
}

/**
 * @brief Activate a cycle (set as active and deactivate other active cycles)
 * 
 * @param cycleId - Cycle ID to activate
 * 
 * @pre Database is initialized, cycleId exists
 * @post Cycle is set to active, other active cycles are set to completed
 */
export async function activateCycle(cycleId: number): Promise<void> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  // First, complete any other active cycles
  const activeStmt = db.prepare('SELECT id FROM cycles WHERE status = ? AND id != ?');
  activeStmt.bind(['active', cycleId]);
  
  const activeCycles: number[] = [];
  while (activeStmt.step()) {
    const row = activeStmt.getAsObject();
    activeCycles.push(row.id as number);
  }
  activeStmt.free();
  
  // Complete other active cycles
  for (const activeCycleId of activeCycles) {
    await completeCycle(activeCycleId);
  }
  
  // Activate the selected cycle
  // If it was completed, clear completed_at
  db.run(
    'UPDATE cycles SET status = ?, completed_at = NULL WHERE id = ?',
    ['active', cycleId]
  );
  
  await saveDatabase();
  
  console.log(`Cycle ${cycleId} activated`);
}

/**
 * @brief Record the time when the user entered the Unconscious state for a cycle
 *
 * @param cycleId - Cycle ID to update
 *
 * @pre Database is initialized, cycleId exists
 * @post unconscious_entered_at is set to current ISO timestamp for the cycle
 */
export async function recordUnconsciousEntry(cycleId: number): Promise<void> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  const enteredAt = new Date().toISOString();
  db.run(
    'UPDATE cycles SET unconscious_entered_at = ? WHERE id = ?',
    [enteredAt, cycleId]
  );
  await saveDatabase();
}

/**
 * @brief Record the time when the user left the Unconscious state (started new cycle)
 *
 * @param cycleId - Cycle ID to update
 *
 * @pre Database is initialized, cycleId exists
 * @post unconscious_exited_at is set to current ISO timestamp for the cycle
 */
export async function recordUnconsciousExit(cycleId: number): Promise<void> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  const exitedAt = new Date().toISOString();
  db.run(
    'UPDATE cycles SET unconscious_exited_at = ? WHERE id = ?',
    [exitedAt, cycleId]
  );
  await saveDatabase();
}

/**
 * @brief Get cycle data for a specific cycle
 * 
 * @param cycleId - Cycle ID
 * @return Cycle data with all answers
 * 
 * @pre Database is initialized
 * @post Returns cycle data including all answers
 */
export async function getCycleData(cycleId: number): Promise<{
  id: number;
  cycleNumber: number;
  startedAt: string;
  completedAt: string | null;
  status: string;
  unconsciousEnteredAt: string | null;
  unconsciousExitedAt: string | null;
  answers: Array<{
    id: number;
    questionId: string;
    answer: string;
    answeredAt: string;
    situation: string;
  }>;
}> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Get cycle info
  const cycleStmt = db.prepare('SELECT * FROM cycles WHERE id = ?');
  cycleStmt.bind([cycleId]);
  
  if (!cycleStmt.step()) {
    cycleStmt.free();
    throw new Error('Cycle not found');
  }
  
  const cycleRow = cycleStmt.getAsObject();
  cycleStmt.free();

  // Get all answers for this cycle
  const answersStmt = db.prepare(`
    SELECT id, question_id, answer, answered_at, situation 
    FROM question_answers 
    WHERE cycle_id = ? 
    ORDER BY answered_at
  `);
  answersStmt.bind([cycleId]);
  
  const answers: Array<{
    id: number;
    questionId: string;
    answer: string;
    answeredAt: string;
    situation: string;
  }> = [];
  
  while (answersStmt.step()) {
    const row = answersStmt.getAsObject();
    answers.push({
      id: row.id as number,
      questionId: row.question_id as string,
      answer: row.answer as string,
      answeredAt: row.answered_at as string,
      situation: row.situation as string,
    });
  }
  
  answersStmt.free();

  return {
    id: cycleRow.id as number,
    cycleNumber: cycleRow.cycle_number as number,
    startedAt: cycleRow.started_at as string,
    completedAt: (cycleRow.completed_at as string) || null,
    status: cycleRow.status as string,
    unconsciousEnteredAt: (cycleRow.unconscious_entered_at as string) || null,
    unconsciousExitedAt: (cycleRow.unconscious_exited_at as string) || null,
    answers,
  };
}

/**
 * @brief Get previous cycle data (most recent completed cycle)
 * 
 * @return Previous cycle data or null
 * 
 * @pre Database is initialized
 * @post Returns most recent completed cycle data or null
 */
export async function getPreviousCycleData(): Promise<{
  id: number;
  cycleNumber: number;
  startedAt: string;
  completedAt: string | null;
  answers: Array<{
    questionId: string;
    answer: string;
    situation: string;
  }>;
} | null> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare(`
    SELECT id FROM cycles 
    WHERE status = ? 
    ORDER BY cycle_number DESC 
    LIMIT 1
  `);
  stmt.bind(['completed']);
  
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  
  const result = stmt.getAsObject();
  const cycleId = result.id as number;
  stmt.free();

  const cycleData = await getCycleData(cycleId);
  
  return {
    id: cycleData.id,
    cycleNumber: cycleData.cycleNumber,
    startedAt: cycleData.startedAt,
    completedAt: cycleData.completedAt,
    answers: cycleData.answers.map((a) => ({
      questionId: a.questionId,
      answer: a.answer,
      situation: a.situation,
    })),
  };
}

/**
 * @brief Get all cycles
 * 
 * @return Array of cycle summaries
 * 
 * @pre Database is initialized
 * @post Returns all cycles ordered by cycle number descending
 */
export async function getAllCycles(): Promise<Array<{
  id: number;
  cycleNumber: number;
  startedAt: string;
  completedAt: string | null;
  status: string;
  unconsciousEnteredAt: string | null;
  unconsciousExitedAt: string | null;
}>> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare(`
    SELECT id, cycle_number, started_at, completed_at, status,
           unconscious_entered_at, unconscious_exited_at
    FROM cycles 
    ORDER BY cycle_number DESC
  `);
  
  const cycles: Array<{
    id: number;
    cycleNumber: number;
    startedAt: string;
    completedAt: string | null;
    status: string;
    unconsciousEnteredAt: string | null;
    unconsciousExitedAt: string | null;
  }> = [];
  
  while (stmt.step()) {
    const row = stmt.getAsObject();
    cycles.push({
      id: row.id as number,
      cycleNumber: row.cycle_number as number,
      startedAt: row.started_at as string,
      completedAt: (row.completed_at as string) || null,
      status: row.status as string,
      unconsciousEnteredAt: (row.unconscious_entered_at as string) || null,
      unconsciousExitedAt: (row.unconscious_exited_at as string) || null,
    });
  }
  
  stmt.free();
  
  return cycles;
}
