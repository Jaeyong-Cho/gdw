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
 * @return Context object with all related data
 */
export async function buildRelatedContext(currentSituation: string): Promise<{
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
    // Get current intent and problem IDs
    const intentId = await getCurrentIntentId();
    const problemId = await getCurrentProblemId();

    const allRelated = new Map<string, string>();

    // If we have an intent, get all related data
    if (intentId) {
      const intentRelated = await getAnswersByIntent(intentId);
      
      // Get the intent itself
      const intentAnswers = intentRelated.filter(a => 
        a.situation === 'DefiningIntent' && a.questionId.includes('intent-')
      );
      if (intentAnswers.length > 0) {
        context.intent = intentAnswers[0].answer;
        allRelated.set('intent', intentAnswers[0].answer);
      }

      // Get all problems under this intent
      const problemAnswers = intentRelated.filter(a => 
        a.situation === 'SelectingProblem' && a.questionId.includes('problem-')
      );
      if (problemAnswers.length > 0) {
        context.problems = problemAnswers.map(a => a.answer);
      }

      // Get designs
      const designAnswers = intentRelated.filter(a => 
        a.situation === 'Designing' && !['true', 'false'].includes(a.answer)
      );
      if (designAnswers.length > 0) {
        context.design = designAnswers.map(a => a.answer);
      }

      // Get acceptance criteria
      const acceptanceAnswers = intentRelated.filter(a => 
        a.situation === 'DefiningAcceptance' && !['true', 'false'].includes(a.answer)
      );
      if (acceptanceAnswers.length > 0) {
        context.acceptance = acceptanceAnswers.map(a => a.answer);
      }

      // Get implementation details
      const implementAnswers = intentRelated.filter(a => 
        a.situation === 'Implementing' && !['true', 'false'].includes(a.answer)
      );
      if (implementAnswers.length > 0) {
        context.implementation = implementAnswers.map(a => a.answer);
      }

      // Get feedback
      const feedbackAnswers = intentRelated.filter(a => 
        a.situation === 'CollectingFeedback' && !['true', 'false'].includes(a.answer)
      );
      if (feedbackAnswers.length > 0) {
        context.feedback = feedbackAnswers.map(a => a.answer);
      }

      // Get improvements
      const improvementAnswers = intentRelated.filter(a => 
        a.situation === 'Learning' && a.questionId.includes('improvements')
      );
      if (improvementAnswers.length > 0) {
        context.improvements = improvementAnswers.map(a => a.answer);
      }

      // Store all in map
      intentRelated.forEach(a => {
        if (!['true', 'false'].includes(a.answer)) {
          allRelated.set(a.questionId, a.answer);
        }
      });
    }

    // If we have a problem, get problem-specific data
    if (problemId) {
      const problemRelated = await getAnswersByProblem(problemId);
      
      problemRelated.forEach(a => {
        if (!['true', 'false'].includes(a.answer)) {
          allRelated.set(a.questionId, a.answer);
        }
      });
    }

    // Also get current situation answers
    const currentAnswers = await getAnswersBySituation(currentSituation);
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
