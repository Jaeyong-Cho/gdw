/**
 * @fileoverview ReadModel for workflow state queries
 * 
 * @brief Provides read-only access to workflow state and history
 * 
 * @pre Database is initialized and contains workflow data
 * @post Provides current state and state history information
 */

import { getAnswersBySituation, getCurrentIntentId } from './db';
import { Situation } from '../types';

/**
 * @brief State history entry
 */
export interface StateHistoryEntry {
  state: Situation;
  timestamp: string;
  questionId: string;
  answer: string;
}

/**
 * @brief ReadModel interface for workflow queries
 */
export interface IReadModel {
  getCurrentState(): Promise<Situation | null>;
  getStateHistory(): Promise<StateHistoryEntry[]>;
}

/**
 * @brief Implementation of ReadModel for workflow state queries
 * 
 * @pre Database connection exists
 * @post Provides accurate workflow state information
 */
export class WorkflowReadModel implements IReadModel {
  private readonly situations: Situation[] = [
    'DefiningIntent',
    'FailingIntent',
    'SelectingProblem',
    'DefiningAcceptance',
    'CheckingFeasibility',
    'Designing',
    'BreakingTasks',
    'Implementing',
    'Verifying',
    'Verified',
    'Releasing',
    'CollectingFeedback',
    'Learning'
  ];

  /**
   * @brief Get current workflow state
   * 
   * @return Current situation or null if no data exists
   * 
   * @pre Database is accessible
   * @post Returns the most recent situation with data
   */
  async getCurrentState(): Promise<Situation | null> {
    try {
      const intentId = await getCurrentIntentId();
      if (!intentId) {
        // Check all situations in reverse order
        for (let i = this.situations.length - 1; i >= 0; i--) {
          const answers = await getAnswersBySituation(this.situations[i]);
          if (answers.length > 0) {
            return this.situations[i];
          }
        }
        return null;
      }

      // Find latest situation with data
      for (let i = this.situations.length - 1; i >= 0; i--) {
        const answers = await getAnswersBySituation(this.situations[i]);
        if (answers.length > 0) {
          return this.situations[i];
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting current state:', error);
      return null;
    }
  }

  /**
   * @brief Get workflow state history
   * 
   * @return Array of state history entries sorted by timestamp
   * 
   * @pre Database is accessible
   * @post Returns chronologically ordered state history
   */
  async getStateHistory(): Promise<StateHistoryEntry[]> {
    try {
      const history: StateHistoryEntry[] = [];

      for (const situation of this.situations) {
        const answers = await getAnswersBySituation(situation);
        for (const answer of answers) {
          history.push({
            state: situation,
            timestamp: answer.answeredAt,
            questionId: answer.questionId,
            answer: answer.answer
          });
        }
      }

      // Sort by timestamp (ascending)
      return history.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error getting state history:', error);
      return [];
    }
  }

  /**
   * @brief Get state history for a specific situation
   * 
   * @param situation - Situation to get history for
   * @return Array of state history entries for the situation
   * 
   * @pre Database is accessible
   * @post Returns history entries for specified situation
   */
  async getStateHistoryForSituation(situation: Situation): Promise<StateHistoryEntry[]> {
    try {
      const answers = await getAnswersBySituation(situation);
      return answers.map(answer => ({
        state: situation,
        timestamp: answer.answeredAt,
        questionId: answer.questionId,
        answer: answer.answer
      }));
    } catch (error) {
      console.error(`Error getting history for ${situation}:`, error);
      return [];
    }
  }
}

/**
 * @brief Singleton instance of WorkflowReadModel
 */
export const workflowReadModel = new WorkflowReadModel();
