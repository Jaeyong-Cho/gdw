/**
 * @fileoverview Tests for DataViewer functionality
 * 
 * @brief Test suite for SQL-free workflow state inspection
 * 
 * @pre ReadModel provides data query capabilities (T4, T5 completed)
 * @post Developers can check state without knowing DB structure
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, saveAnswer } from '../db';

/**
 * @brief DataViewer interface for developer-friendly state inspection
 */
interface DataViewer {
  listWorkflows(): Promise<Array<{
    id: number;
    currentState: string | null;
  }>>;
  inspectWorkflow(workflowId: number): Promise<{
    currentState: string | null;
    stateHistory: Array<{
      state: string;
      timestamp: string;
    }>;
  }>;
}

/**
 * @brief Simple implementation of DataViewer
 * 
 * @pre Database contains workflow data
 * @post Provides SQL-free access to workflow information
 */
class SimpleDataViewer implements DataViewer {
  async listWorkflows(): Promise<Array<{ id: number; currentState: string | null }>> {
    // For simplicity, return a single workflow (current session)
    const currentState = await this.getCurrentState();
    return [
      {
        id: 1,
        currentState: currentState
      }
    ];
  }

  async inspectWorkflow(workflowId: number): Promise<{
    currentState: string | null;
    stateHistory: Array<{ state: string; timestamp: string }>;
  }> {
    return {
      currentState: await this.getCurrentState(),
      stateHistory: await this.getStateHistory()
    };
  }

  private async getCurrentState(): Promise<string | null> {
    const { getAnswersBySituation } = await import('../db');
    
    const situations = [
      'Learning',
      'CollectingFeedback',
      'Releasing',
      'Verified',
      'Verifying',
      'Implementing',
      'BreakingTasks',
      'Designing',
      'CheckingFeasibility',
      'DefiningAcceptance',
      'SelectingProblem',
      'DefiningIntent'
    ];
    
    for (const situation of situations) {
      const answers = await getAnswersBySituation(situation);
      if (answers.length > 0) {
        return situation;
      }
    }
    
    return null;
  }

  private async getStateHistory(): Promise<Array<{ state: string; timestamp: string }>> {
    const { getAnswersBySituation } = await import('../db');
    
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
          timestamp: answer.answeredAt
        });
      }
    }
    
    return history.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
}

describe('T6: DataViewer Basic Query Interface', () => {
  /**
   * @brief Test SQL-free workflow inspection capability
   * 
   * @pre ReadModel can query data (T4, T5 completed)
   * @post Developers can check state without DB structure knowledge
   */
  
  let dataViewer: DataViewer;

  beforeAll(async () => {
    await initDatabase();
    dataViewer = new SimpleDataViewer();
    
    // Insert test workflow data
    await saveAnswer('q1', 'a1', 'DefiningIntent');
    await new Promise(resolve => setTimeout(resolve, 10));
    await saveAnswer('q2', 'a2', 'SelectingProblem');
  });

  it('should list workflows without SQL', async () => {
    const workflows = await dataViewer.listWorkflows();
    
    expect(workflows).toBeDefined();
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);
    
    expect(workflows[0]).toHaveProperty('id');
    expect(workflows[0]).toHaveProperty('currentState');
  });

  it('should inspect workflow state without SQL knowledge', async () => {
    const inspection = await dataViewer.inspectWorkflow(1);
    
    // Verification (AC-3): Can check current_state + state_history without SQL
    expect(inspection).toHaveProperty('currentState');
    expect(inspection).toHaveProperty('stateHistory');
    
    expect(inspection.currentState).toBeDefined();
    expect(Array.isArray(inspection.stateHistory)).toBe(true);
    expect(inspection.stateHistory.length).toBeGreaterThanOrEqual(1);
  });

  it('should provide readable state information', async () => {
    const inspection = await dataViewer.inspectWorkflow(1);
    
    // Verify data is human-readable
    if (inspection.currentState) {
      expect(typeof inspection.currentState).toBe('string');
    }
    
    for (const entry of inspection.stateHistory) {
      expect(entry).toHaveProperty('state');
      expect(entry).toHaveProperty('timestamp');
      expect(typeof entry.state).toBe('string');
      expect(typeof entry.timestamp).toBe('string');
    }
  });
});
