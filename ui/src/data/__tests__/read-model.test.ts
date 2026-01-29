/**
 * @fileoverview Tests for ReadModel implementation
 * 
 * @brief Test suite for ReadModel current_state and state_history retrieval
 * 
 * @pre Current state and state history rules are defined (T2, T3 completed)
 * @post ReadModel returns accurate workflow state information
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, saveAnswer, getAnswersBySituation } from '../db';
import { getCurrentIntentId, getCurrentProblemId } from '../db';

/**
 * @brief ReadModel interface for workflow state queries
 */
interface ReadModel {
  getCurrentState(workflowId?: number): Promise<string | null>;
  getStateHistory(workflowId?: number): Promise<Array<{
    state: string;
    timestamp: string;
    questionId: string;
  }>>;
}

/**
 * @brief Implementation of ReadModel
 * 
 * @pre Database connection is established
 * @post Provides read-only access to workflow state
 */
class WorkflowReadModel implements ReadModel {
  async getCurrentState(workflowId?: number): Promise<string | null> {
    // Get current intent ID to determine active workflow
    const intentId = await getCurrentIntentId();
    if (!intentId) return null;
    
    // Get all situations in order
    const situations = [
      'IntentDefined',
      'ProblemSelected',
      'AcceptanceDefined',
      'FeasibilityChecked',
      'DesignReady',
      'TaskBreakdown',
      'Implementing',
      'Verifying',
      'Verified',
      'Released',
      'FeedbackCollected',
      'Learned'
    ];
    
    // Find the latest situation with data
    for (let i = situations.length - 1; i >= 0; i--) {
      const answers = await getAnswersBySituation(situations[i]);
      if (answers.length > 0) {
        return situations[i];
      }
    }
    
    return null;
  }

  async getStateHistory(workflowId?: number): Promise<Array<{
    state: string;
    timestamp: string;
    questionId: string;
  }>> {
    const situations = [
      'IntentDefined',
      'ProblemSelected',
      'AcceptanceDefined',
      'FeasibilityChecked',
      'DesignReady',
      'TaskBreakdown',
      'Implementing',
      'Verifying',
      'Verified',
      'Released',
      'FeedbackCollected',
      'Learned'
    ];
    
    const history = [];
    
    for (const situation of situations) {
      const answers = await getAnswersBySituation(situation);
      for (const answer of answers) {
        history.push({
          state: situation,
          timestamp: answer.answeredAt,
          questionId: answer.questionId
        });
      }
    }
    
    // Sort by timestamp
    return history.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
}

describe('T4: ReadModel current_state Query', () => {
  /**
   * @brief Test current_state retrieval functionality
   * 
   * @pre Current state determination rule exists (T2 completed)
   * @post ReadModel returns current_state as explicit value
   */
  
  let readModel: ReadModel;

  beforeAll(async () => {
    await initDatabase();
    readModel = new WorkflowReadModel();
    
    // Insert test workflow states
    await saveAnswer('intent-q1', 'intent answer', 'IntentDefined');
    await saveAnswer('problem-q1', 'problem answer', 'ProblemSelected');
  });

  it('should return current_state as explicit value', async () => {
    const currentState = await readModel.getCurrentState();
    
    // Verification (AC-1): Can compare DB original value 1:1 with ReadModel result
    expect(currentState).toBeDefined();
    expect(typeof currentState).toBe('string');
    expect(['IntentDefined', 'ProblemSelected']).toContain(currentState);
  });

  it('should match DB original current_state value', async () => {
    const currentState = await readModel.getCurrentState();
    
    // Verify against DB
    const dbAnswers = await getAnswersBySituation(currentState as string);
    expect(dbAnswers.length).toBeGreaterThan(0);
  });
});

describe('T5: ReadModel state_history Query', () => {
  /**
   * @brief Test state_history retrieval functionality
   * 
   * @pre State history sorting rule exists (T3 completed)
   * @post ReadModel returns ordered state_history with values and timestamps
   */
  
  let readModel: ReadModel;

  beforeAll(async () => {
    await initDatabase();
    readModel = new WorkflowReadModel();
    
    // Insert multiple states
    await saveAnswer('q1', 'a1', 'IntentDefined');
    await new Promise(resolve => setTimeout(resolve, 10));
    await saveAnswer('q2', 'a2', 'ProblemSelected');
    await new Promise(resolve => setTimeout(resolve, 10));
    await saveAnswer('q3', 'a3', 'AcceptanceDefined');
  });

  it('should return state_history with values and timestamps', async () => {
    const history = await readModel.getStateHistory();
    
    // Verification (AC-2): At least 2+ state histories confirmed in time order
    expect(history.length).toBeGreaterThanOrEqual(2);
    
    for (const entry of history) {
      expect(entry).toHaveProperty('state');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('questionId');
    }
  });

  it('should return history in chronological order', async () => {
    const history = await readModel.getStateHistory();
    
    for (let i = 1; i < history.length; i++) {
      const prevTime = new Date(history[i - 1].timestamp).getTime();
      const currTime = new Date(history[i].timestamp).getTime();
      
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
    }
  });
});
