/**
 * @fileoverview SQLite database module for storing and retrieving question answers
 */

import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

/**
 * @brief Database instance
 */
let db: Database | null = null;

/**
 * @brief Initialize SQLite database
 * 
 * @pre None
 * @post Database is initialized with schema if not exists
 * @return Promise that resolves when database is ready
 * 
 * @throws Error if database initialization fails
 */
export async function initDatabase(): Promise<void> {
  if (db) {
    return;
  }

  try {
    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          return `https://sql.js.org/dist/${file}`;
        }
        return file;
      },
    });

    const savedDb = localStorage.getItem('gdw-db');
    if (savedDb) {
      try {
        const buffer = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
        db = new SQL.Database(buffer);
      } catch (e) {
        console.warn('Failed to load saved database, creating new one:', e);
        db = new SQL.Database();
        createSchema();
        saveDatabase();
      }
    } else {
      db = new SQL.Database();
      createSchema();
      saveDatabase();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * @brief Create database schema
 * 
 * @pre Database instance exists
 * @post Tables are created if they don't exist
 */
function createSchema(): void {
  if (!db) {
    throw new Error('Database not initialized');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS question_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT NOT NULL,
      situation TEXT NOT NULL,
      answer TEXT NOT NULL,
      answered_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_question_id ON question_answers(question_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_situation ON question_answers(situation)
  `);
}

/**
 * @brief Save database to localStorage
 * 
 * @pre Database instance exists
 * @post Database is saved to localStorage
 */
function saveDatabase(): void {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const data = db.export();
  const uint8Array = new Uint8Array(data);
  const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
  const base64 = btoa(binaryString);
  localStorage.setItem('gdw-db', base64);
}

/**
 * @brief Save a question answer to database
 * 
 * @param questionId - ID of the question
 * @param situation - Current situation
 * @param answer - Answer value (string or boolean)
 * @param answeredAt - ISO timestamp of when answer was given
 * 
 * @pre Database is initialized, all parameters are provided
 * @post Answer is saved to database
 * 
 * @throws Error if database operation fails
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

  saveDatabase();
}

/**
 * @brief Get answer for a specific question ID
 * 
 * @param questionId - ID of the question to retrieve answer for
 * @return Promise resolving to the most recent answer, or null if not found
 * 
 * @pre Database is initialized, questionId is provided
 * @post Returns the most recent answer for the question or null
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
 * @brief Get all answers for a specific question ID
 * 
 * @param questionId - ID of the question to retrieve answers for
 * @return Promise resolving to array of answers (most recent first)
 * 
 * @pre Database is initialized, questionId is provided
 * @post Returns array of all answers for the question
 */
export async function getAllAnswersByQuestionId(questionId: string): Promise<string[]> {
  await initDatabase();
  
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare('SELECT answer FROM question_answers WHERE question_id = ? ORDER BY answered_at DESC');
  stmt.bind([questionId]);
  
  const answers: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    answers.push(row.answer as string);
  }
  
  stmt.free();
  return answers;
}

/**
 * @brief Get answers by situation
 * 
 * @param situation - Situation to retrieve answers for
 * @return Promise resolving to array of answers with question IDs
 * 
 * @pre Database is initialized, situation is provided
 * @post Returns array of answers for the situation
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
 * @return Promise resolving to the intent summary text, or null if not found
 * 
 * @pre Database is initialized
 * @post Returns the most recent intent summary or null
 */
export async function getIntentSummary(): Promise<string | null> {
  return await getAnswerByQuestionId('intent-summary-text');
}

/**
 * @brief Get intent document from IntentDefined situation
 * 
 * @return Promise resolving to the intent document text, or null if not found
 * 
 * @pre Database is initialized
 * @post Returns the most recent intent document or null
 */
export async function getIntentDocument(): Promise<string | null> {
  const answers = await getAnswersBySituation('IntentDefined');
  
  const intentSummary = answers.find(a => a.questionId === 'intent-summary-text');
  if (intentSummary) {
    return intentSummary.answer;
  }
  
  return null;
}
