/**
 * @fileoverview Tests for TestVerifier functionality
 * 
 * @brief Test suite for expected state definition and verification
 * 
 * @pre Test environment exists
 * @post Expected state can be compared against actual DB state
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, saveAnswer, getAnswersBySituation } from '../db';

/**
 * @brief Expected state definition for test verification
 */
interface ExpectedState {
  situation: string;
  questionId?: string;
  answerExists?: boolean;
}

/**
 * @brief TestVerifier interface for state validation
 */
interface TestVerifier {
  defineExpectedState(state: ExpectedState): void;
  verifyState(): Promise<{
    passed: boolean;
    expected: ExpectedState;
    actual: string | null;
    message: string;
  }>;
}

/**
 * @brief Implementation of TestVerifier
 * 
 * @pre ReadModel can query current state (T4 completed)
 * @post Test results can be verified against DB data
 */
class WorkflowTestVerifier implements TestVerifier {
  private expectedState: ExpectedState | null = null;

  defineExpectedState(state: ExpectedState): void {
    this.expectedState = state;
  }

  async verifyState(): Promise<{
    passed: boolean;
    expected: ExpectedState;
    actual: string | null;
    message: string;
  }> {
    if (!this.expectedState) {
      throw new Error('Expected state not defined');
    }

    const actualState = await this.getCurrentState();
    const expected = this.expectedState;

    const passed = actualState === expected.situation;

    return {
      passed,
      expected,
      actual: actualState,
      message: passed
        ? `State matches: ${actualState}`
        : `State mismatch: expected ${expected.situation}, got ${actualState}`
    };
  }

  private async getCurrentState(): Promise<string | null> {
    const situations = [
      'Learned',
      'FeedbackCollected',
      'Released',
      'Verified',
      'Verifying',
      'Implementing',
      'TaskBreakdown',
      'DesignReady',
      'FeasibilityChecked',
      'AcceptanceDefined',
      'ProblemSelected',
      'IntentDefined'
    ];

    for (const situation of situations) {
      const answers = await getAnswersBySituation(situation);
      if (answers.length > 0) {
        return situation;
      }
    }

    return null;
  }
}

describe('T7: TestVerifier Expected State Definition', () => {
  /**
   * @brief Test expected state definition mechanism
   * 
   * @pre Test environment exists
   * @post Expected state can be explicitly defined
   */
  
  let verifier: TestVerifier;

  beforeAll(() => {
    verifier = new WorkflowTestVerifier();
  });

  it('should define expected state with explicit criteria', () => {
    const expectedState: ExpectedState = {
      situation: 'IntentDefined',
      questionId: 'intent-summary-text',
      answerExists: true
    };

    verifier.defineExpectedState(expectedState);
    
    // Verification: Can specify expected_state for 1 test case
    expect(expectedState).toHaveProperty('situation');
    expect(expectedState.situation).toBe('IntentDefined');
  });

  it('should support multiple expected state formats', () => {
    const minimalState: ExpectedState = {
      situation: 'ProblemSelected'
    };

    const detailedState: ExpectedState = {
      situation: 'AcceptanceDefined',
      questionId: 'criteria-text',
      answerExists: true
    };

    expect(minimalState).toHaveProperty('situation');
    expect(detailedState).toHaveProperty('situation');
    expect(detailedState).toHaveProperty('questionId');
    expect(detailedState).toHaveProperty('answerExists');
  });
});

describe('T8: TestVerifier State Comparison', () => {
  /**
   * @brief Test state comparison and verification logic
   * 
   * @pre ReadModel query available (T4), expected state defined (T7)
   * @post Test results can be verified based on DB data
   */
  
  let verifier: TestVerifier;

  beforeAll(async () => {
    await initDatabase();
    verifier = new WorkflowTestVerifier();
  });

  it('should pass when expected state matches actual state', async () => {
    // Setup: Insert data for IntentDefined
    await saveAnswer('intent-q1', 'intent answer', 'IntentDefined');

    // Define expected state
    verifier.defineExpectedState({
      situation: 'IntentDefined'
    });

    // Verify
    const result = await verifier.verifyState();

    expect(result.passed).toBe(true);
    expect(result.actual).toBe('IntentDefined');
    expect(result.expected.situation).toBe('IntentDefined');
  });

  it('should detect mismatch when states differ', async () => {
    // Setup: Clear and insert only ProblemSelected data
    await initDatabase();
    await saveAnswer('problem-q1', 'problem answer', 'ProblemSelected');

    // Define expected state (expecting IntentDefined but actual is ProblemSelected)
    verifier.defineExpectedState({
      situation: 'IntentDefined'
    });

    // Verify
    const result = await verifier.verifyState();

    // Verification (AC-4): Detects failure when expected vs DB state mismatch
    expect(result.passed).toBe(false);
    expect(result.expected.situation).toBe('IntentDefined');
    expect(result.actual).toBe('ProblemSelected');
    expect(result.message).toContain('mismatch');
  });

  it('should provide detailed failure information', async () => {
    await initDatabase();
    await saveAnswer('acc-q1', 'acceptance answer', 'AcceptanceDefined');

    verifier.defineExpectedState({
      situation: 'DesignReady'
    });

    const result = await verifier.verifyState();

    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('expected');
    expect(result).toHaveProperty('actual');
    expect(result).toHaveProperty('message');
    
    expect(result.passed).toBe(false);
    expect(result.message).toContain('expected DesignReady');
    expect(result.message).toContain('got AcceptanceDefined');
  });
});
