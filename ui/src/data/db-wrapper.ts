/**
 * @fileoverview Wrapper functions for database operations
 * 
 * @brief Provides simplified interfaces for common database operations
 * 
 * @pre Database is initialized
 * @post Simplified API for tests and components
 */

import { saveAnswer as dbSaveAnswer } from './db';

/**
 * @brief Save answer with automatic timestamp
 * 
 * @param questionId - Question identifier
 * @param answer - Answer content
 * @param situation - Current situation
 * @return ID of saved answer
 * 
 * @pre Database is initialized
 * @post Answer is saved with current timestamp
 */
export async function saveAnswer(
  questionId: string,
  answer: string,
  situation: string
): Promise<number> {
  const answeredAt = new Date().toISOString();
  return await dbSaveAnswer(questionId, situation, answer, answeredAt);
}

export * from './db';
