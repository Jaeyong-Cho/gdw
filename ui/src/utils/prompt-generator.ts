/**
 * @fileoverview Utility for generating AI prompts from templates
 */

import { getIntentSummary, getAnswersBySituation } from '../data/db';
import { buildRelatedContext, formatRelatedContextForPrompt } from '../data/relationships';

/**
 * @brief Context data for prompt generation
 */
interface PromptContext {
  intent?: string | null;
  problem?: string | null;
  acceptanceCriteria?: string | null;
  design?: string | null;
  [key: string]: string | null | undefined;
}

/**
 * @brief Generate AI prompt from template with context
 * 
 * @param template - Prompt template string with variables like {{intent}}, {{problem}}
 * @param context - Context data to fill in template variables
 * @return Generated prompt with variables replaced
 * 
 * @pre template is provided
 * @post Returns prompt with all variables replaced with context data or empty string
 */
export function generatePrompt(template: string, context: PromptContext): string {
  let prompt = template;
  
  Object.keys(context).forEach(key => {
    const value = context[key] || '';
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    prompt = prompt.replace(regex, value);
  });
  
  return prompt;
}

/**
 * @brief Build context from database answers with relationships
 * 
 * @param situation - Current situation
 * @param selectedProblemId - Optional selected problem ID to filter acceptance criteria
 * @return Promise resolving to context object with relevant answers and relationships
 * 
 * @pre situation is provided
 * @post Returns context with intent, problem, and other relevant data including relationships
 */
export async function buildPromptContext(situation: string, selectedProblemId?: number | null): Promise<PromptContext> {
  const context: PromptContext = {};
  
  try {
    // Get related context using relationships
    const relatedContext = await buildRelatedContext(situation);
    
    // Add intent
    if (relatedContext.intent) {
      context.intent = relatedContext.intent;
    } else {
      const intentSummary = await getIntentSummary();
      if (intentSummary) {
        context.intent = intentSummary;
      }
    }
    
    // Add related data
    if (relatedContext.problems && relatedContext.problems.length > 0) {
      context.relatedProblems = relatedContext.problems.join('\n\n');
    }
    
    // If a specific problem is selected, use only that problem
    if (selectedProblemId !== undefined && selectedProblemId !== null) {
      console.log('[DEBUG] buildPromptContext: selectedProblemId provided:', selectedProblemId);
      const { getAnswersBySituation } = await import('../data/db');
      // Get the problem answer directly by ID (selectedProblemId is the answer ID, not problem_id)
      const allAnswers = await getAnswersBySituation('SelectingProblem');
      const problemAnswer = allAnswers.find(a => a.id === selectedProblemId && a.questionId === 'problem-boundaries-text');
      if (problemAnswer) {
        context.problem = problemAnswer.answer;
        console.log('[DEBUG] buildPromptContext: Set context.problem:', context.problem);
        
        // Get acceptance criteria related to this problem
        // selectedProblemId is the problem answer's id, so we need to find acceptance answers
        // that have problem_id = selectedProblemId
        const allAcceptanceAnswers = await getAnswersBySituation('DefiningAcceptance');
        const acceptanceAnswers = allAcceptanceAnswers.filter(a => 
          !['true', 'false'].includes(a.answer) && a.problemId === selectedProblemId
        );
        if (acceptanceAnswers.length > 0) {
          context.acceptanceCriteria = acceptanceAnswers.map(a => a.answer).join('\n\n');
          console.log('[DEBUG] buildPromptContext: Set acceptanceCriteria from problem_id:', selectedProblemId, 'count:', acceptanceAnswers.length);
        } else {
          console.log('[DEBUG] buildPromptContext: No acceptance criteria found with problem_id:', selectedProblemId);
        }
      } else {
        console.log('[DEBUG] buildPromptContext: No problem-boundaries-text found with id:', selectedProblemId);
      }
    } else {
      console.log('[DEBUG] buildPromptContext: No selectedProblemId provided');
    }
    
    if (relatedContext.design && relatedContext.design.length > 0) {
      context.design = relatedContext.design.join('\n\n');
    }
    
    // Acceptance criteria is already handled above when selectedProblemId is provided
    if (!(selectedProblemId !== undefined && selectedProblemId !== null)) {
      if (relatedContext.acceptance && relatedContext.acceptance.length > 0) {
        context.acceptanceCriteria = relatedContext.acceptance.join('\n\n');
      }
    }
    
    if (relatedContext.implementation && relatedContext.implementation.length > 0) {
      context.implementation = relatedContext.implementation.join('\n\n');
    }
    
    if (relatedContext.feedback && relatedContext.feedback.length > 0) {
      context.feedback = relatedContext.feedback.join('\n\n');
    }
    
    if (relatedContext.improvements && relatedContext.improvements.length > 0) {
      context.improvements = relatedContext.improvements.join('\n\n');
    }
    
    // Handle list answers for prompt context (especially for learned-feedback-issues-list)
    // This is handled in the main loop below, but we ensure list format is properly converted
    
    // Add formatted related context
    context.relatedContext = formatRelatedContextForPrompt(relatedContext);
    
    // Also populate from allRelated map
    if (relatedContext.allRelated) {
      relatedContext.allRelated.forEach((value, key) => {
        if (!context[key]) {
          context[key] = value;
        }
      });
    }
    
    // Fallback: Get all answers from current and related situations
    const situations = [
      'DefiningIntent',
      'SelectingProblem', 
      'DefiningAcceptance',
      'Designing',
      'Implementing',
      'Verifying',
      'Verified',
      'Releasing',
      'CollectingFeedback',
      'Learning',
      situation
    ];
    
    for (const sit of situations) {
      try {
        const answers = await getAnswersBySituation(sit);
        answers.forEach(a => {
          if (!['true', 'false'].includes(a.answer)) {
            // Use question ID as key
            if (!context[a.questionId]) {
              context[a.questionId] = a.answer;
            }
            
            // Also map common patterns to standard keys
            if (a.questionId.includes('intent') && !context.intent) {
              context.intent = a.answer;
            }
            // Only set problem if no specific problem is selected, or if it matches the selected problem
            if (a.questionId.includes('problem') && !context.problem) {
              // If a specific problem is selected, skip problem in fallback
              // (it's already handled above with getAnswersByProblem)
              if (selectedProblemId === undefined || selectedProblemId === null) {
                context.problem = a.answer;
              }
            }
            if (a.questionId.includes('design') && !context.design) {
              context.design = a.answer;
            }
            // Only add acceptance criteria if no specific problem is selected, or if it's related to the selected problem
            if (a.questionId.includes('acceptance') || a.questionId.includes('criteria')) {
              // If a specific problem is selected, skip acceptance criteria in fallback
              // (it's already handled above with getAnswersByProblem)
              if (selectedProblemId === undefined || selectedProblemId === null) {
                if (!context.acceptanceCriteria) {
                  context.acceptanceCriteria = a.answer;
                } else {
                  context.acceptanceCriteria += '\n\n' + a.answer;
                }
              }
            }
          }
        });
      } catch (error) {
        console.error(`Error fetching answers for ${sit}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error building prompt context:', error);
  }
  
  return context;
}
