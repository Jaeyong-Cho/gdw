/**
 * @fileoverview Data relationship utilities for building contextual AI prompts
 */

import { 
  getCurrentIntentId, 
  getCurrentProblemId,
  getAnswersByIntent, 
  getAnswersByProblem,
  getAnswersBySituation 
} from './db';

/**
 * @brief Build comprehensive context for AI prompts with relationships
 * 
 * @param currentSituation - Current situation
 * @param cycleId - Optional cycle ID to filter answers (current cycle)
 * @return Context object with all related data
 * 
 * @pre currentSituation is provided
 * @post Returns context with relationships filtered by cycle if provided
 */
export async function buildRelatedContext(currentSituation: string, cycleId?: number | null): Promise<{
  intent?: string;
  problems?: string[];
  design?: string[];
  acceptance?: string[];
  implementation?: string[];
  feedback?: string[];
  improvements?: string[];
  allRelated?: Map<string, string>;
}> {
  const context: {
    intent?: string;
    problems?: string[];
    design?: string[];
    acceptance?: string[];
    implementation?: string[];
    feedback?: string[];
    improvements?: string[];
    allRelated?: Map<string, string>;
  } = {};

  try {
    // Get current intent and problem IDs (these are from current cycle by design)
    const intentId = await getCurrentIntentId();
    const problemId = await getCurrentProblemId();

    const allRelated = new Map<string, string>();

    // If we have an intent, get all related data
    // Note: getAnswersByIntent returns answers linked to this intent
    // Since intentId comes from getCurrentIntentId which gets the most recent intent,
    // and answers are linked by intent_id, they should already be from the current cycle
    // But we'll filter by cycle if provided for safety
    if (intentId) {
      const intentRelated = await getAnswersByIntent(intentId);
      
      // Filter by cycle if provided
      // Since getAnswersByIntent doesn't return cycle_id, we check each answer
      let filteredIntentRelated = intentRelated;
      if (cycleId !== undefined && cycleId !== null) {
        filteredIntentRelated = [];
        for (const answer of intentRelated) {
          const cycleAnswers = await getAnswersBySituation(answer.situation, cycleId);
          const cycleAnswer = cycleAnswers.find(a => a.id === answer.id);
          if (cycleAnswer) {
            filteredIntentRelated.push(answer);
          }
        }
      }
      
      // Get the intent itself
      const intentAnswers = filteredIntentRelated.filter(a => 
        a.situation === 'DefiningIntent' && a.questionId.includes('intent-')
      );
      if (intentAnswers.length > 0) {
        context.intent = intentAnswers[0].answer;
        allRelated.set('intent', intentAnswers[0].answer);
      }

      // Get all problems under this intent
      const problemAnswers = filteredIntentRelated.filter(a => 
        a.situation === 'SelectingProblem' && a.questionId.includes('problem-')
      );
      if (problemAnswers.length > 0) {
        context.problems = problemAnswers.map(a => a.answer);
      }

      // Get designs
      const designAnswers = filteredIntentRelated.filter(a => 
        a.situation === 'Designing' && !['true', 'false'].includes(a.answer)
      );
      if (designAnswers.length > 0) {
        context.design = designAnswers.map(a => a.answer);
      }

      // Get acceptance criteria
      const acceptanceAnswers = filteredIntentRelated.filter(a => 
        a.situation === 'DefiningAcceptance' && !['true', 'false'].includes(a.answer)
      );
      if (acceptanceAnswers.length > 0) {
        context.acceptance = acceptanceAnswers.map(a => a.answer);
      }

      // Get implementation details
      const implementAnswers = filteredIntentRelated.filter(a => 
        a.situation === 'Implementing' && !['true', 'false'].includes(a.answer)
      );
      if (implementAnswers.length > 0) {
        context.implementation = implementAnswers.map(a => a.answer);
      }

      // Get feedback
      const feedbackAnswers = filteredIntentRelated.filter(a => 
        a.situation === 'CollectingFeedback' && !['true', 'false'].includes(a.answer)
      );
      if (feedbackAnswers.length > 0) {
        context.feedback = feedbackAnswers.map(a => a.answer);
      }

      // Get improvements
      const improvementAnswers = filteredIntentRelated.filter(a => 
        a.situation === 'Learning' && a.questionId.includes('improvements')
      );
      if (improvementAnswers.length > 0) {
        context.improvements = improvementAnswers.map(a => a.answer);
      }

      // Store all in map
      filteredIntentRelated.forEach(a => {
        if (!['true', 'false'].includes(a.answer)) {
          allRelated.set(a.questionId, a.answer);
        }
      });
    }

    // If we have a problem, get problem-specific data
    // Note: getAnswersByProblem returns answers linked to this problem
    // Since problemId comes from getCurrentProblemId which gets the most recent problem,
    // and answers are linked by problem_id, they should already be from the current cycle
    // But we'll filter by cycle if provided for safety
    if (problemId) {
      const problemRelated = await getAnswersByProblem(problemId);
      
      // Filter by cycle if provided
      // Since getAnswersByProblem doesn't return cycle_id, we check each answer
      let filteredProblemRelated = problemRelated;
      if (cycleId !== undefined && cycleId !== null) {
        filteredProblemRelated = [];
        for (const answer of problemRelated) {
          const cycleAnswers = await getAnswersBySituation(answer.situation, cycleId);
          const cycleAnswer = cycleAnswers.find(a => a.id === answer.id);
          if (cycleAnswer) {
            filteredProblemRelated.push(answer);
          }
        }
      }
      
      filteredProblemRelated.forEach(a => {
        if (!['true', 'false'].includes(a.answer)) {
          allRelated.set(a.questionId, a.answer);
        }
      });
    }

    // Also get current situation answers (from current cycle)
    const currentAnswers = await getAnswersBySituation(currentSituation, cycleId);
    currentAnswers.forEach(a => {
      if (!['true', 'false'].includes(a.answer)) {
        allRelated.set(a.questionId, a.answer);
      }
    });

    context.allRelated = allRelated;

  } catch (error) {
    console.error('Error building related context:', error);
  }

  return context;
}

/**
 * @brief Format related context for AI prompt
 * 
 * @param context - Context from buildRelatedContext
 * @return Formatted string for AI prompt
 */
export function formatRelatedContextForPrompt(context: Awaited<ReturnType<typeof buildRelatedContext>>): string {
  const sections: string[] = [];

  if (context.intent) {
    sections.push(`## Intent\n${context.intent}`);
  }

  if (context.problems && context.problems.length > 0) {
    sections.push(`## Related Problems\n${context.problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
  }

  if (context.design && context.design.length > 0) {
    sections.push(`## Design Decisions\n${context.design.map((d, i) => `${i + 1}. ${d}`).join('\n')}`);
  }

  if (context.acceptance && context.acceptance.length > 0) {
    sections.push(`## Acceptance Criteria\n${context.acceptance.map((a, i) => `${i + 1}. ${a}`).join('\n')}`);
  }

  if (context.implementation && context.implementation.length > 0) {
    sections.push(`## Implementation Notes\n${context.implementation.map((impl, i) => `${i + 1}. ${impl}`).join('\n')}`);
  }

  if (context.feedback && context.feedback.length > 0) {
    sections.push(`## Feedback\n${context.feedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
  }

  if (context.improvements && context.improvements.length > 0) {
    sections.push(`## Improvements to Consider\n${context.improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * @brief Get relationship summary for display
 * 
 * @return Summary of current relationships
 */
export async function getRelationshipSummary(): Promise<{
  hasIntent: boolean;
  hasProblem: boolean;
  intentId: number | null;
  problemId: number | null;
  relatedCount: number;
}> {
  const intentId = await getCurrentIntentId();
  const problemId = await getCurrentProblemId();
  
  let relatedCount = 0;
  
  if (intentId) {
    const related = await getAnswersByIntent(intentId);
    relatedCount += related.length;
  }
  
  if (problemId) {
    const related = await getAnswersByProblem(problemId);
    relatedCount += related.length;
  }

  return {
    hasIntent: intentId !== null,
    hasProblem: problemId !== null,
    intentId,
    problemId,
    relatedCount
  };
}
