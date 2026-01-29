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
        unconscious_exited_at TEXT,
        unconscious_entry_reason TEXT
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
    if (!cycleColumns.includes('unconscious_entry_reason')) {
      database.run('ALTER TABLE cycles ADD COLUMN unconscious_entry_reason TEXT');
    }
    
    // Add cycle_id column to question_answers if it doesn't exist
    if (!columns.includes('cycle_id')) {
      console.log('Adding cycle_id column...');
      database.run('ALTER TABLE question_answers ADD COLUMN cycle_id INTEGER');
      database.run('CREATE INDEX IF NOT EXISTS idx_cycle_id ON question_answers(cycle_id)');
    }
    
    // Create state_transitions table if it doesn't exist
    database.run(`
      CREATE TABLE IF NOT EXISTS state_transitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id INTEGER,
        situation TEXT NOT NULL,
        entered_at TEXT NOT NULL,
        exited_at TEXT,
        FOREIGN KEY (cycle_id) REFERENCES cycles(id)
      )
    `);
    database.run('CREATE INDEX IF NOT EXISTS idx_state_transitions_cycle ON state_transitions(cycle_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_state_transitions_situation ON state_transitions(situation)');
    database.run('CREATE INDEX IF NOT EXISTS idx_state_transitions_entered_at ON state_transitions(entered_at)');
    
    // Create unconscious_periods table for tracking unconscious time separately
    database.run(`
      CREATE TABLE IF NOT EXISTS unconscious_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        entry_reason TEXT,
        exit_reason TEXT,
        previous_cycle_id INTEGER,
        next_cycle_id INTEGER,
        FOREIGN KEY (previous_cycle_id) REFERENCES cycles(id),
        FOREIGN KEY (next_cycle_id) REFERENCES cycles(id)
      )
    `);
    database.run('CREATE INDEX IF NOT EXISTS idx_unconscious_started_at ON unconscious_periods(started_at)');
    database.run('CREATE INDEX IF NOT EXISTS idx_unconscious_ended_at ON unconscious_periods(ended_at)');
    
    // Create cycle_context table for storing selected previous cycle answers as context
    database.run(`
      CREATE TABLE IF NOT EXISTS cycle_context (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id INTEGER NOT NULL,
        source_cycle_id INTEGER NOT NULL,
        source_answer_id INTEGER NOT NULL,
        question_id TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        situation TEXT NOT NULL,
        added_at TEXT NOT NULL,
        FOREIGN KEY (cycle_id) REFERENCES cycles(id),
        FOREIGN KEY (source_cycle_id) REFERENCES cycles(id),
        FOREIGN KEY (source_answer_id) REFERENCES question_answers(id)
      )
    `);
    database.run('CREATE INDEX IF NOT EXISTS idx_cycle_context_cycle ON cycle_context(cycle_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_cycle_context_source ON cycle_context(source_cycle_id)');
    
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
          unconscious_exited_at TEXT,
          unconscious_entry_reason TEXT
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

      // Create state_transitions table
      db.run(`
        CREATE TABLE IF NOT EXISTS state_transitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cycle_id INTEGER,
          situation TEXT NOT NULL,
          entered_at TEXT NOT NULL,
          exited_at TEXT,
          FOREIGN KEY (cycle_id) REFERENCES cycles(id)
        )
      `);
      db.run('CREATE INDEX IF NOT EXISTS idx_state_transitions_cycle ON state_transitions(cycle_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_state_transitions_situation ON state_transitions(situation)');
      db.run('CREATE INDEX IF NOT EXISTS idx_state_transitions_entered_at ON state_transitions(entered_at)');

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
 * @brief Start a new unconscious period
 *
 * @param previousCycleId - The cycle that was active before entering unconscious (optional)
 * @param reason - Optional reason for entering unconscious state
 * @return The ID of the created unconscious period
 *
 * @pre Database is initialized
 * @post New unconscious period is created with started_at timestamp
 */
export async function startUnconsciousPeriod(previousCycleId?: number | null, reason?: string | null): Promise<number> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  const startedAt = new Date().toISOString();
  
  db.run(
    'INSERT INTO unconscious_periods (started_at, entry_reason, previous_cycle_id) VALUES (?, ?, ?)',
    [startedAt, reason ?? null, previousCycleId ?? null]
  );
  
  const result = db.exec('SELECT last_insert_rowid() as id');
  const periodId = result[0]?.values[0]?.[0] as number;
  
  await saveDatabase();
  
  console.log(`Unconscious period ${periodId} started`);
  return periodId;
}

/**
 * @brief End the current unconscious period
 *
 * @param periodId - The unconscious period ID to end
 * @param nextCycleId - The cycle that starts after exiting unconscious (optional)
 * @param exitReason - Optional reason for exiting unconscious state
 *
 * @pre Database is initialized, periodId exists
 * @post Unconscious period ended_at is set, next_cycle_id and exit_reason updated
 */
export async function endUnconsciousPeriod(periodId: number, nextCycleId?: number | null, exitReason?: string | null): Promise<void> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  const endedAt = new Date().toISOString();
  
  db.run(
    'UPDATE unconscious_periods SET ended_at = ?, next_cycle_id = ?, exit_reason = ? WHERE id = ?',
    [endedAt, nextCycleId ?? null, exitReason ?? null, periodId]
  );
  
  await saveDatabase();
  
  console.log(`Unconscious period ${periodId} ended`);
}

/**
 * @brief Get the current active unconscious period (if any)
 *
 * @return The active unconscious period or null
 *
 * @pre Database is initialized
 * @post Returns the unconscious period that has no ended_at
 */
export async function getCurrentUnconsciousPeriod(): Promise<{
  id: number;
  startedAt: string;
  entryReason: string | null;
  previousCycleId: number | null;
} | null> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT * FROM unconscious_periods WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1');
  
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  
  const row = stmt.getAsObject();
  stmt.free();
  
  return {
    id: row.id as number,
    startedAt: row.started_at as string,
    entryReason: row.entry_reason as string | null,
    previousCycleId: row.previous_cycle_id as number | null,
  };
}

/**
 * @brief Get all unconscious periods
 *
 * @return Array of all unconscious periods
 *
 * @pre Database is initialized
 * @post Returns all unconscious periods ordered by started_at desc
 */
export async function getAllUnconsciousPeriods(): Promise<Array<{
  id: number;
  startedAt: string;
  endedAt: string | null;
  entryReason: string | null;
  exitReason: string | null;
  previousCycleId: number | null;
  nextCycleId: number | null;
  durationMs: number | null;
}>> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT * FROM unconscious_periods ORDER BY started_at DESC');
  const periods: Array<{
    id: number;
    startedAt: string;
    endedAt: string | null;
    entryReason: string | null;
    exitReason: string | null;
    previousCycleId: number | null;
    nextCycleId: number | null;
    durationMs: number | null;
  }> = [];
  
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const startedAt = row.started_at as string;
    const endedAt = row.ended_at as string | null;
    
    let durationMs: number | null = null;
    if (endedAt) {
      durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    }
    
    periods.push({
      id: row.id as number,
      startedAt,
      endedAt,
      entryReason: row.entry_reason as string | null,
      exitReason: row.exit_reason as string | null,
      previousCycleId: row.previous_cycle_id as number | null,
      nextCycleId: row.next_cycle_id as number | null,
      durationMs,
    });
  }
  stmt.free();
  
  return periods;
}

/**
 * @brief Get unconscious statistics
 *
 * @return Statistics about unconscious periods
 *
 * @pre Database is initialized
 * @post Returns aggregated statistics for unconscious periods
 */
export async function getUnconsciousStatistics(): Promise<{
  totalPeriods: number;
  completedPeriods: number;
  activePeriod: boolean;
  totalDurationMs: number;
  averageDurationMs: number;
  longestDurationMs: number;
  shortestDurationMs: number;
}> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  const periods = await getAllUnconsciousPeriods();
  const completedPeriods = periods.filter(p => p.endedAt !== null);
  const durations = completedPeriods.map(p => p.durationMs!).filter(d => d !== null);
  
  const totalDurationMs = durations.reduce((sum, d) => sum + d, 0);
  const averageDurationMs = durations.length > 0 ? totalDurationMs / durations.length : 0;
  const longestDurationMs = durations.length > 0 ? Math.max(...durations) : 0;
  const shortestDurationMs = durations.length > 0 ? Math.min(...durations) : 0;
  
  return {
    totalPeriods: periods.length,
    completedPeriods: completedPeriods.length,
    activePeriod: periods.some(p => p.endedAt === null),
    totalDurationMs,
    averageDurationMs,
    longestDurationMs,
    shortestDurationMs,
  };
}

/**
 * @brief Record the time and optional reason when the user entered the Unconscious state for a cycle
 * @deprecated Use startUnconsciousPeriod instead for separate tracking
 *
 * @param cycleId - Cycle ID to update
 * @param reason - Optional reason for entering Unconscious (e.g. from manual button)
 *
 * @pre Database is initialized, cycleId exists
 * @post unconscious_entered_at and optional unconscious_entry_reason are set for the cycle
 */
export async function recordUnconsciousEntry(cycleId: number, reason?: string | null): Promise<void> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  const enteredAt = new Date().toISOString();
  db.run(
    'UPDATE cycles SET unconscious_entered_at = ?, unconscious_entry_reason = ? WHERE id = ?',
    [enteredAt, reason ?? null, cycleId]
  );
  await saveDatabase();
}

/**
 * @brief Record the time when the user left the Unconscious state (started new cycle)
 * @deprecated Use endUnconsciousPeriod instead for separate tracking
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
  unconsciousEntryReason: string | null;
  lastSituation: string;
  lastQuestionId: string | null;
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

  // Get all answers for this cycle ordered by answered_at
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

  // Determine last situation from the most recent answer
  // The last answer's situation tells us where the user was working last
  // We use the situation but start from the beginning of that situation's flow
  // (not from the specific question) since the user may want to review or re-answer
  const lastAnswer = answers.length > 0 ? answers[answers.length - 1] : null;
  const lastSituation = lastAnswer ? lastAnswer.situation : 'Dumping';
  // Set lastQuestionId to null to start from the beginning of the situation
  // This ensures the user sees the full context of that situation
  const lastQuestionId: string | null = null;

  return {
    id: cycleRow.id as number,
    cycleNumber: cycleRow.cycle_number as number,
    startedAt: cycleRow.started_at as string,
    completedAt: (cycleRow.completed_at as string) || null,
    status: cycleRow.status as string,
    unconsciousEnteredAt: (cycleRow.unconscious_entered_at as string) || null,
    unconsciousExitedAt: (cycleRow.unconscious_exited_at as string) || null,
    unconsciousEntryReason: (cycleRow.unconscious_entry_reason as string) || null,
    lastSituation,
    lastQuestionId,
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
  unconsciousEntryReason: string | null;
}>> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare(`
    SELECT id, cycle_number, started_at, completed_at, status,
           unconscious_entered_at, unconscious_exited_at, unconscious_entry_reason
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
    unconsciousEntryReason: string | null;
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
      unconsciousEntryReason: (row.unconscious_entry_reason as string) || null,
    });
  }
  
  stmt.free();
  
  return cycles;
}

/**
 * @brief Record entry into a state (conscious state)
 *
 * @param situation - Situation name
 * @param cycleId - Cycle ID (optional)
 *
 * @pre Database is initialized
 * @post State entry is recorded with current timestamp
 */
export async function recordStateEntry(situation: string, cycleId: number | null = null): Promise<number> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  // Close any open transition for the same cycle (if transitioning from another state)
  if (cycleId !== null) {
    const now = new Date().toISOString();
    db.run(`
      UPDATE state_transitions 
      SET exited_at = ? 
      WHERE id = (
        SELECT id FROM state_transitions 
        WHERE cycle_id = ? AND exited_at IS NULL 
        ORDER BY entered_at DESC LIMIT 1
      )
    `, [now, cycleId]);
  }

  // Get cycle ID if not provided
  let effectiveCycleId = cycleId;
  if (effectiveCycleId === null) {
    effectiveCycleId = await getCurrentCycleId();
  }

  const enteredAt = new Date().toISOString();
  db.run(
    'INSERT INTO state_transitions (cycle_id, situation, entered_at) VALUES (?, ?, ?)',
    [effectiveCycleId, situation, enteredAt]
  );

  const idStmt = db.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const transitionId = idStmt.getAsObject().id as number;
  idStmt.free();

  await saveDatabase();
  return transitionId;
}

/**
 * @brief Record exit from a state (when transitioning to another state)
 *
 * @param situation - Situation name to exit from
 * @param cycleId - Cycle ID (optional)
 *
 * @pre Database is initialized
 * @post State exit is recorded with current timestamp
 */
export async function recordStateExit(situation: string, cycleId: number | null = null): Promise<void> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  // Get cycle ID if not provided
  let effectiveCycleId = cycleId;
  if (effectiveCycleId === null) {
    effectiveCycleId = await getCurrentCycleId();
  }

  const exitedAt = new Date().toISOString();
  db.run(`
    UPDATE state_transitions 
    SET exited_at = ? 
    WHERE id = (
      SELECT id FROM state_transitions 
      WHERE cycle_id = ? AND situation = ? AND exited_at IS NULL 
      ORDER BY entered_at DESC LIMIT 1
    )
  `, [exitedAt, effectiveCycleId, situation]);

  await saveDatabase();
}

/**
 * @brief Get daily statistics for conscious and unconscious time
 *
 * @param startDate - Start date (ISO string, optional)
 * @param endDate - End date (ISO string, optional)
 * @return Array of daily statistics
 *
 * @pre Database is initialized
 * @post Returns daily statistics with conscious and unconscious time in minutes
 */
export async function getDailyStatistics(
  startDate?: string,
  endDate?: string
): Promise<Array<{
  date: string;
  consciousMinutes: number;
  unconsciousMinutes: number;
}>> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  // Get conscious time from state_transitions (all states except Unconscious)
  let consciousQuery = `
    SELECT 
      DATE(entered_at) as date,
      SUM(CASE 
        WHEN exited_at IS NOT NULL 
        THEN (julianday(exited_at) - julianday(entered_at)) * 24 * 60
        ELSE 0
      END) as minutes
    FROM state_transitions
    WHERE situation != 'Unconscious'
  `;
  
  const consciousParams: any[] = [];
  if (startDate) {
    consciousQuery += ' AND DATE(entered_at) >= DATE(?)';
    consciousParams.push(startDate);
  }
  if (endDate) {
    consciousQuery += ' AND DATE(entered_at) <= DATE(?)';
    consciousParams.push(endDate);
  }
  consciousQuery += ' GROUP BY DATE(entered_at)';

  const consciousStmt = db.prepare(consciousQuery);
  consciousStmt.bind(consciousParams);
  
  const consciousData: Record<string, number> = {};
  while (consciousStmt.step()) {
    const row = consciousStmt.getAsObject();
    const date = row.date as string;
    const minutes = Math.round((row.minutes as number) || 0);
    consciousData[date] = minutes;
  }
  consciousStmt.free();

  // Get unconscious time from cycles
  let unconsciousQuery = `
    SELECT 
      DATE(unconscious_entered_at) as date,
      SUM((julianday(unconscious_exited_at) - julianday(unconscious_entered_at)) * 24 * 60) as minutes
    FROM cycles
    WHERE unconscious_entered_at IS NOT NULL 
      AND unconscious_exited_at IS NOT NULL
  `;
  
  const unconsciousParams: any[] = [];
  if (startDate) {
    unconsciousQuery += ' AND DATE(unconscious_entered_at) >= DATE(?)';
    unconsciousParams.push(startDate);
  }
  if (endDate) {
    unconsciousQuery += ' AND DATE(unconscious_entered_at) <= DATE(?)';
    unconsciousParams.push(endDate);
  }
  unconsciousQuery += ' GROUP BY DATE(unconscious_entered_at)';

  const unconsciousStmt = db.prepare(unconsciousQuery);
  unconsciousStmt.bind(unconsciousParams);
  
  const unconsciousData: Record<string, number> = {};
  while (unconsciousStmt.step()) {
    const row = unconsciousStmt.getAsObject();
    const date = row.date as string;
    const minutes = Math.round((row.minutes as number) || 0);
    unconsciousData[date] = minutes;
  }
  unconsciousStmt.free();

  // Combine dates
  const allDates = new Set([
    ...Object.keys(consciousData),
    ...Object.keys(unconsciousData)
  ]);

  const result = Array.from(allDates)
    .sort()
    .map(date => ({
      date,
      consciousMinutes: consciousData[date] || 0,
      unconsciousMinutes: unconsciousData[date] || 0,
    }));

  return result;
}

/**
 * @brief State time statistics structure
 */
export interface StateTimeStats {
  situation: string;
  totalMinutes: number;
  averageMinutes: number;
  count: number;
  minMinutes: number;
  maxMinutes: number;
}

/**
 * @brief Get time statistics for each state
 *
 * @param startDate - Start date filter (optional)
 * @param endDate - End date filter (optional)
 * @param cycleId - Filter by cycle ID (optional)
 * @return Array of state time statistics
 *
 * @pre Database is initialized
 * @post Returns statistics grouped by state
 */
export async function getStateTimeStatistics(
  startDate?: string,
  endDate?: string,
  cycleId?: number
): Promise<StateTimeStats[]> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  let query = `
    SELECT 
      situation,
      COUNT(*) as count,
      SUM(CASE 
        WHEN exited_at IS NOT NULL 
        THEN (julianday(exited_at) - julianday(entered_at)) * 24 * 60
        ELSE 0
      END) as total_minutes,
      AVG(CASE 
        WHEN exited_at IS NOT NULL 
        THEN (julianday(exited_at) - julianday(entered_at)) * 24 * 60
        ELSE NULL
      END) as avg_minutes,
      MIN(CASE 
        WHEN exited_at IS NOT NULL 
        THEN (julianday(exited_at) - julianday(entered_at)) * 24 * 60
        ELSE NULL
      END) as min_minutes,
      MAX(CASE 
        WHEN exited_at IS NOT NULL 
        THEN (julianday(exited_at) - julianday(entered_at)) * 24 * 60
        ELSE NULL
      END) as max_minutes
    FROM state_transitions
    WHERE 1=1
  `;

  const params: any[] = [];
  
  if (startDate) {
    query += ' AND DATE(entered_at) >= DATE(?)';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND DATE(entered_at) <= DATE(?)';
    params.push(endDate);
  }
  if (cycleId !== undefined) {
    query += ' AND cycle_id = ?';
    params.push(cycleId);
  }

  query += ' GROUP BY situation ORDER BY total_minutes DESC';

  const stmt = db.prepare(query);
  stmt.bind(params);

  const results: StateTimeStats[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      situation: row.situation as string,
      totalMinutes: Math.round((row.total_minutes as number) || 0),
      averageMinutes: Math.round((row.avg_minutes as number) || 0),
      count: row.count as number,
      minMinutes: Math.round((row.min_minutes as number) || 0),
      maxMinutes: Math.round((row.max_minutes as number) || 0),
    });
  }
  stmt.free();

  return results;
}

/**
 * @brief State transition record structure
 */
export interface StateTransitionRecord {
  id: number;
  cycleId: number | null;
  situation: string;
  enteredAt: string;
  exitedAt: string | null;
  durationMinutes: number | null;
}

/**
 * @brief Get state transition history
 *
 * @param limit - Maximum records to return (default 100)
 * @param cycleId - Filter by cycle ID (optional)
 * @return Array of state transition records
 *
 * @pre Database is initialized
 * @post Returns state transition history
 */
export async function getStateTransitionHistory(
  limit: number = 100,
  cycleId?: number
): Promise<StateTransitionRecord[]> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  let query = `
    SELECT 
      id,
      cycle_id,
      situation,
      entered_at,
      exited_at,
      CASE 
        WHEN exited_at IS NOT NULL 
        THEN (julianday(exited_at) - julianday(entered_at)) * 24 * 60
        ELSE NULL
      END as duration_minutes
    FROM state_transitions
    WHERE 1=1
  `;

  const params: any[] = [];
  
  if (cycleId !== undefined) {
    query += ' AND cycle_id = ?';
    params.push(cycleId);
  }

  query += ' ORDER BY entered_at DESC LIMIT ?';
  params.push(limit);

  const stmt = db.prepare(query);
  stmt.bind(params);

  const results: StateTransitionRecord[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id as number,
      cycleId: row.cycle_id as number | null,
      situation: row.situation as string,
      enteredAt: row.entered_at as string,
      exitedAt: row.exited_at as string | null,
      durationMinutes: row.duration_minutes !== null 
        ? Math.round(row.duration_minutes as number) 
        : null,
    });
  }
  stmt.free();

  return results;
}

/**
 * @brief Daily state time statistics structure
 */
export interface DailyStateStats {
  date: string;
  stateMinutes: Record<string, number>;
}

/**
 * @brief Get daily time statistics broken down by state
 *
 * @param startDate - Start date filter (optional)
 * @param endDate - End date filter (optional)
 * @return Array of daily state time statistics
 *
 * @pre Database is initialized
 * @post Returns daily statistics with time per state
 */
export async function getDailyStateStatistics(
  startDate?: string,
  endDate?: string
): Promise<DailyStateStats[]> {
  await initDatabase();

  if (!db) {
    throw new Error('Database not initialized');
  }

  let query = `
    SELECT 
      DATE(entered_at) as date,
      situation,
      SUM(CASE 
        WHEN exited_at IS NOT NULL 
        THEN (julianday(exited_at) - julianday(entered_at)) * 24 * 60
        ELSE 0
      END) as minutes
    FROM state_transitions
    WHERE 1=1
  `;

  const params: any[] = [];
  
  if (startDate) {
    query += ' AND DATE(entered_at) >= DATE(?)';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND DATE(entered_at) <= DATE(?)';
    params.push(endDate);
  }

  query += ' GROUP BY DATE(entered_at), situation ORDER BY date, situation';

  const stmt = db.prepare(query);
  stmt.bind(params);

  const dataByDate: Record<string, Record<string, number>> = {};
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const date = row.date as string;
    const situation = row.situation as string;
    const minutes = Math.round((row.minutes as number) || 0);
    
    if (!dataByDate[date]) {
      dataByDate[date] = {};
    }
    dataByDate[date][situation] = minutes;
  }
  stmt.free();

  const results: DailyStateStats[] = Object.entries(dataByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stateMinutes]) => ({
      date,
      stateMinutes,
    }));

  return results;
}

// ============================================================================
// Cycle Context Functions
// ============================================================================

/**
 * @brief Context answer from previous cycle
 */
interface ContextAnswer {
  id: number;
  cycleId: number;
  sourceCycleId: number;
  sourceAnswerId: number;
  questionId: string;
  answerText: string;
  situation: string;
  addedAt: string;
}

/**
 * @brief Add a previous cycle answer as context for current cycle
 * 
 * @param cycleId - Current cycle ID
 * @param sourceCycleId - Source cycle ID where the answer came from
 * @param sourceAnswerId - Answer ID in the source cycle
 * @param questionId - Question ID
 * @param answerText - Answer text content
 * @param situation - Situation where answer was given
 * @return Created context ID
 * 
 * @pre Database is initialized
 * @post Context is stored in cycle_context table
 */
export async function addCycleContext(
  cycleId: number,
  sourceCycleId: number,
  sourceAnswerId: number,
  questionId: string,
  answerText: string,
  situation: string
): Promise<number> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  console.log('[DEBUG] addCycleContext - cycleId:', cycleId, 'sourceAnswerId:', sourceAnswerId);

  // Check if this context already exists
  const checkStmt = db.prepare(`
    SELECT id FROM cycle_context 
    WHERE cycle_id = ? AND source_answer_id = ?
  `);
  checkStmt.bind([cycleId, sourceAnswerId]);
  
  if (checkStmt.step()) {
    const existing = checkStmt.getAsObject();
    checkStmt.free();
    console.log('[DEBUG] addCycleContext - already exists with id:', existing.id);
    return existing.id as number;
  }
  checkStmt.free();

  const stmt = db.prepare(`
    INSERT INTO cycle_context (cycle_id, source_cycle_id, source_answer_id, question_id, answer_text, situation, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.bind([cycleId, sourceCycleId, sourceAnswerId, questionId, answerText, situation, new Date().toISOString()]);
  stmt.step();
  stmt.free();

  const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
  
  console.log('[DEBUG] addCycleContext - inserted new context with id:', id);
  
  await saveDatabase();
  
  return id;
}

/**
 * @brief Remove a context from current cycle
 * 
 * @param contextId - Context ID to remove
 * 
 * @pre Database is initialized
 * @post Context is removed from cycle_context table
 */
export async function removeCycleContext(contextId: number): Promise<void> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('DELETE FROM cycle_context WHERE id = ?');
  stmt.bind([contextId]);
  stmt.step();
  stmt.free();

  await saveDatabase();
}

/**
 * @brief Get all context for a cycle
 * 
 * @param cycleId - Cycle ID
 * @return Array of context answers
 * 
 * @pre Database is initialized
 * @post Returns all context answers for the cycle
 */
export async function getCycleContext(cycleId: number): Promise<ContextAnswer[]> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  console.log('[DEBUG] getCycleContext - cycleId:', cycleId);

  try {
    const stmt = db.prepare(`
      SELECT id, cycle_id, source_cycle_id, source_answer_id, question_id, answer_text, situation, added_at
      FROM cycle_context
      WHERE cycle_id = ?
      ORDER BY added_at DESC
    `);
    stmt.bind([cycleId]);

    const contexts: ContextAnswer[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      contexts.push({
        id: row.id as number,
        cycleId: row.cycle_id as number,
        sourceCycleId: row.source_cycle_id as number,
        sourceAnswerId: row.source_answer_id as number,
        questionId: row.question_id as string,
        answerText: row.answer_text as string,
        situation: row.situation as string,
        addedAt: row.added_at as string,
      });
    }
    stmt.free();

    console.log('[DEBUG] getCycleContext - found contexts:', contexts.length);
    return contexts;
  } catch (error) {
    console.error('[DEBUG] getCycleContext - error:', error);
    return [];
  }
}

/**
 * @brief Get answers from all previous cycles (excluding current)
 * 
 * @param currentCycleId - Current cycle ID to exclude
 * @return Array of answers grouped by cycle
 * 
 * @pre Database is initialized
 * @post Returns all answers from previous cycles
 */
export async function getPreviousCyclesAnswers(currentCycleId: number | null): Promise<Array<{
  cycleId: number;
  cycleNumber: number;
  startedAt: string;
  completedAt: string | null;
  answers: Array<{
    id: number;
    questionId: string;
    answer: string;
    situation: string;
    answeredAt: string;
  }>;
}>> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Get all cycles except current
  let cycleQuery = `
    SELECT id, cycle_number, started_at, completed_at
    FROM cycles
    WHERE status IN ('completed', 'active')
  `;
  
  if (currentCycleId !== null) {
    cycleQuery += ` AND id != ${currentCycleId}`;
  }
  
  cycleQuery += ' ORDER BY cycle_number DESC';

  const cycleStmt = db.prepare(cycleQuery);
  
  const results: Array<{
    cycleId: number;
    cycleNumber: number;
    startedAt: string;
    completedAt: string | null;
    answers: Array<{
      id: number;
      questionId: string;
      answer: string;
      situation: string;
      answeredAt: string;
    }>;
  }> = [];

  while (cycleStmt.step()) {
    const cycleRow = cycleStmt.getAsObject();
    const cycleId = cycleRow.id as number;
    
    // Get answers for this cycle
    const answerStmt = db.prepare(`
      SELECT id, question_id, answer, situation, answered_at
      FROM question_answers
      WHERE cycle_id = ? AND answer NOT IN ('true', 'false')
      ORDER BY answered_at DESC
    `);
    answerStmt.bind([cycleId]);
    
    const answers: Array<{
      id: number;
      questionId: string;
      answer: string;
      situation: string;
      answeredAt: string;
    }> = [];
    
    while (answerStmt.step()) {
      const ansRow = answerStmt.getAsObject();
      answers.push({
        id: ansRow.id as number,
        questionId: ansRow.question_id as string,
        answer: ansRow.answer as string,
        situation: ansRow.situation as string,
        answeredAt: ansRow.answered_at as string,
      });
    }
    answerStmt.free();
    
    if (answers.length > 0) {
      results.push({
        cycleId,
        cycleNumber: cycleRow.cycle_number as number,
        startedAt: cycleRow.started_at as string,
        completedAt: (cycleRow.completed_at as string) || null,
        answers,
      });
    }
  }
  cycleStmt.free();

  return results;
}

