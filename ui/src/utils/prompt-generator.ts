/**
 * @fileoverview Utility for generating AI prompts from templates
 */

import { getIntentSummary, getAnswersBySituation, getCurrentCycleId, getPreviousCycleData, getCycleContext } from '../data/db';
import { buildRelatedContext, formatRelatedContextForPrompt } from '../data/relationships';

/**
 * @brief Context data for prompt generation
 */
interface PromptContext {
  intent?: string | null;
  problem?: string | null;
  acceptanceCriteria?: string | null;
  design?: string | null;
  selectedContext?: string | null;
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
 * @param selectedCycleId - Optional selected cycle ID to use instead of current cycle
 * @return Promise resolving to context object with relevant answers and relationships
 * 
 * @pre situation is provided
 * @post Returns context with intent, problem, and other relevant data including relationships from current cycle and previous cycle
 */
export async function buildPromptContext(situation: string, selectedProblemId?: number | null, selectedCycleId?: number | null): Promise<PromptContext> {
  const context: PromptContext = {};
  
  try {
    // Get current cycle ID
    const currentCycleId = await getCurrentCycleId();
    console.log('[DEBUG] buildPromptContext - currentCycleId:', currentCycleId);
    
    // Get selected context from previous cycles for current cycle
    if (currentCycleId !== null) {
      const cycleContexts = await getCycleContext(currentCycleId);
      console.log('[DEBUG] buildPromptContext - cycleContexts count:', cycleContexts.length);
      console.log('[DEBUG] buildPromptContext - cycleContexts:', cycleContexts);
      if (cycleContexts.length > 0) {
        const formattedContext = cycleContexts.map(ctx => 
          `[${ctx.situation}] ${ctx.answerText}`
        ).join('\n\n');
        context.selectedContext = formattedContext;
        console.log('[DEBUG] buildPromptContext - selectedContext set:', context.selectedContext);
      }
    }
    
    // Get previous cycle data for context
    const previousCycleData = await getPreviousCycleData();
    
    // If a specific cycle is selected, use it as the effective cycle
    let effectiveCycleId: number | null = selectedCycleId || currentCycleId;
    
    // If no selected cycle and current cycle has no data, check if we should use previous cycle
    if (!selectedCycleId) {
      // Check if current cycle has any answers (check all situations, not just current)
      let currentCycleHasData = false;
      if (currentCycleId !== null) {
        // Check a few key situations to determine if cycle has data
        const checkSituations = ['Dumping', 'WhatToDo', 'DefiningIntent', 'SelectingProblem', situation];
        for (const sit of checkSituations) {
          const answers = await getAnswersBySituation(sit, currentCycleId);
          if (answers.length > 0) {
            currentCycleHasData = true;
            break;
          }
        }
      }
      
      // If current cycle has no data but previous cycle exists, use previous cycle data as current
      if (!currentCycleHasData && previousCycleData && previousCycleData.answers.length > 0) {
        // Current cycle is empty, use previous cycle data as current cycle data
        effectiveCycleId = previousCycleData.id;
        console.log('[DEBUG] buildPromptContext: Current cycle has no data, using previous cycle data as current cycle');
      }
    } else {
      console.log('[DEBUG] buildPromptContext: Using selected cycle ID:', selectedCycleId);
    }
    
    // Add previous cycle data to context with prefix to distinguish from current cycle
    // Only add if it's different from the effective cycle
    if (previousCycleData && previousCycleData.answers.length > 0 && previousCycleData.id !== effectiveCycleId) {
      previousCycleData.answers.forEach(answer => {
        if (!['true', 'false'].includes(answer.answer)) {
          const key = `previous-cycle-${answer.questionId}`;
          context[key] = answer.answer;
        }
      });
    }
    
    // Get related context using relationships (from effective cycle)
    const relatedContext = await buildRelatedContext(situation, effectiveCycleId);
    
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
      // Get the problem answer directly by ID (selectedProblemId is the answer ID, not problem_id)
      // From effective cycle (current cycle if it has data, otherwise previous cycle)
      const allAnswers = await getAnswersBySituation('SelectingProblem', effectiveCycleId);
      const problemAnswer = allAnswers.find(a => a.id === selectedProblemId && a.questionId === 'problem-boundaries-text');
      if (problemAnswer) {
        context.problem = problemAnswer.answer;
        console.log('[DEBUG] buildPromptContext: Set context.problem:', context.problem);
        
        // Get acceptance criteria related to this problem
        // selectedProblemId is the problem answer's id, so we need to find acceptance answers
        // that have problem_id = selectedProblemId (from effective cycle)
        const allAcceptanceAnswers = await getAnswersBySituation('DefiningAcceptance', effectiveCycleId);
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
    
    // Get all answers from current cycle only
    const situations = [
      'Dumping',
      'WhatToDo',
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
        // Get answers from effective cycle (current cycle if it has data, otherwise previous cycle)
        const answers = await getAnswersBySituation(sit, effectiveCycleId);
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
