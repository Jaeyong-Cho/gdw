/**
 * @fileoverview Utility for generating AI prompts from templates
 */

import { getIntentSummary, getAnswersBySituation, getCurrentCycleId, getPreviousCycleData, getCycleContext, getCurrentProblemId } from '../data/db';
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
  console.log('[DEBUG] generatePrompt - context keys:', Object.keys(context));
  console.log('[DEBUG] generatePrompt - dump-thoughts-text in context:', context['dump-thoughts-text']);
  
  let prompt = template;
  
  Object.keys(context).forEach(key => {
    const value = context[key] || '';
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    prompt = prompt.replace(regex, value);
  });
  
  // Check if any template variables remain unreplaced
  const remainingVars = prompt.match(/\{\{[^}]+\}\}/g);
  if (remainingVars) {
    console.log('[DEBUG] generatePrompt - Unreplaced template variables:', remainingVars);
  }
  
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
    
    // Get selected context from previous cycles for current cycle (for AI prompt use)
    if (currentCycleId !== null) {
      const cycleContexts = await getCycleContext(currentCycleId);
      console.log('[DEBUG] buildPromptContext - cycleContexts count:', cycleContexts.length);
      if (cycleContexts.length > 0) {
        context.selectedContext = cycleContexts
          .map((ctx) => `[${ctx.situation}] ${ctx.answerText}`)
          .join('\n\n');
      } else {
        context.selectedContext = '';
      }
    } else {
      context.selectedContext = '';
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
    // If no selectedProblemId provided, try to get current problem ID
    let effectiveProblemId = selectedProblemId;
    if (effectiveProblemId === undefined || effectiveProblemId === null) {
      effectiveProblemId = await getCurrentProblemId();
      console.log('[DEBUG] buildPromptContext: No selectedProblemId provided, using getCurrentProblemId:', effectiveProblemId);
    }
    
    if (effectiveProblemId !== undefined && effectiveProblemId !== null) {
      console.log('[DEBUG] buildPromptContext: effectiveProblemId:', effectiveProblemId);
      // Get the problem answer directly by ID (effectiveProblemId is the answer ID, not problem_id)
      // From effective cycle (current cycle if it has data, otherwise previous cycle)
      const allAnswers = await getAnswersBySituation('SelectingProblem', effectiveCycleId);
      const problemAnswer = allAnswers.find(a => a.id === effectiveProblemId && a.questionId === 'problem-boundaries-text');
      if (problemAnswer) {
        context.problem = problemAnswer.answer;
        console.log('[DEBUG] buildPromptContext: Set context.problem:', context.problem);
        
        // Get acceptance criteria related to this problem
        // effectiveProblemId is the problem answer's id, so we need to find acceptance answers
        // that have problem_id = effectiveProblemId (from effective cycle)
        const allAcceptanceAnswers = await getAnswersBySituation('DefiningAcceptance', effectiveCycleId);
        console.log('[DEBUG] buildPromptContext: allAcceptanceAnswers count:', allAcceptanceAnswers.length);
        console.log('[DEBUG] buildPromptContext: allAcceptanceAnswers:', allAcceptanceAnswers.map(a => ({ questionId: a.questionId, problemId: a.problemId, answer: a.answer?.substring(0, 50) })));
        
        // Filter to only criteria-text answers (not yesno responses)
        const criteriaAnswers = allAcceptanceAnswers.filter(a => 
          a.questionId === 'criteria-text' && !['true', 'false'].includes(a.answer)
        );
        console.log('[DEBUG] buildPromptContext: criteriaAnswers (criteria-text only) count:', criteriaAnswers.length);
        
        // First try to filter by problemId
        let acceptanceAnswers = criteriaAnswers.filter(a => a.problemId === effectiveProblemId);
        
        // If no answers found with problemId filter, get all acceptance criteria from the cycle
        if (acceptanceAnswers.length === 0) {
          console.log('[DEBUG] buildPromptContext: No acceptance criteria with problemId, getting all from cycle');
          acceptanceAnswers = criteriaAnswers;
        }
        
        if (acceptanceAnswers.length > 0) {
          // Format each acceptance criterion with numbering
          context.acceptanceCriteria = acceptanceAnswers.map((a, index) => 
            `${index + 1}. ${a.answer}`
          ).join('\n\n');
          console.log('[DEBUG] buildPromptContext: Set acceptanceCriteria, count:', acceptanceAnswers.length);
        } else {
          console.log('[DEBUG] buildPromptContext: No acceptance criteria found');
        }
      } else {
        console.log('[DEBUG] buildPromptContext: No problem-boundaries-text found with id:', effectiveProblemId);
      }
    } else {
      console.log('[DEBUG] buildPromptContext: No effectiveProblemId available');
      
      // If no problem ID, still try to get acceptance criteria from the cycle
      const allAcceptanceAnswers = await getAnswersBySituation('DefiningAcceptance', effectiveCycleId);
      const acceptanceAnswers = allAcceptanceAnswers.filter(a => 
        a.questionId === 'criteria-text' && !['true', 'false'].includes(a.answer)
      );
      if (acceptanceAnswers.length > 0) {
        context.acceptanceCriteria = acceptanceAnswers.map((a, index) => 
          `${index + 1}. ${a.answer}`
        ).join('\n\n');
        console.log('[DEBUG] buildPromptContext: Set acceptanceCriteria without problemId, count:', acceptanceAnswers.length);
      }
    }
    
    if (relatedContext.design && relatedContext.design.length > 0) {
      context.design = relatedContext.design.join('\n\n');
    }
    
    // Acceptance criteria is already handled above when effectiveProblemId is available
    // Only fall back to relatedContext.acceptance if no acceptance criteria was found
    if (!context.acceptanceCriteria) {
      if (relatedContext.acceptance && relatedContext.acceptance.length > 0) {
        // Format with numbering for multiple criteria
        context.acceptanceCriteria = relatedContext.acceptance.map((a, index) => 
          `${index + 1}. ${a}`
        ).join('\n\n');
        console.log('[DEBUG] buildPromptContext: Set acceptanceCriteria from relatedContext.acceptance');
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
      'GatheringFacts',
      'SelectingProblem',
      'ExploringSolution',
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
    
    console.log('[DEBUG] buildPromptContext - effectiveCycleId:', effectiveCycleId);
    console.log('[DEBUG] buildPromptContext - currentCycleId:', currentCycleId);
    
    // Collect all answers by questionId to handle multiple answers
    const answersByQuestionId: Map<string, string[]> = new Map();
    
    for (const sit of situations) {
      try {
        // Get answers from effective cycle (current cycle if it has data, otherwise previous cycle)
        const answers = await getAnswersBySituation(sit, effectiveCycleId);
        console.log(`[DEBUG] buildPromptContext - ${sit} answers:`, answers.length, answers.map(a => ({ questionId: a.questionId, answer: a.answer?.substring(0, 50) })));
        
        // Sort by answeredAt ASC to maintain order
        const sortedAnswers = [...answers].sort((a, b) => 
          new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime()
        );
        
        sortedAnswers.forEach(a => {
          if (!['true', 'false'].includes(a.answer)) {
            // Collect all answers for the same questionId
            if (!answersByQuestionId.has(a.questionId)) {
              answersByQuestionId.set(a.questionId, []);
            }
            answersByQuestionId.get(a.questionId)!.push(a.answer);
          }
        });
      } catch (error) {
        console.error(`Error fetching answers for ${sit}:`, error);
      }
    }
    
    // Now populate context with formatted answers
    // This should OVERWRITE any previously set values from relatedContext
    // because this collection has ALL answers properly aggregated
    answersByQuestionId.forEach((answers, questionId) => {
      // Format multiple answers with numbering
      let formattedAnswer: string;
      if (answers.length === 1) {
        formattedAnswer = answers[0];
      } else {
        formattedAnswer = answers.map((a, index) => `${index + 1}. ${a}`).join('\n\n');
      }
      
      // Always overwrite - this aggregated data takes priority
      context[questionId] = formattedAnswer;
      console.log(`[DEBUG] buildPromptContext - Set context: ${questionId} = ${answers.length} answers`);
      
      // Also map common patterns to standard keys
      if (questionId.includes('intent') && !context.intent) {
        context.intent = formattedAnswer;
      }
      // Only set problem if no problem was already set
      if (questionId.includes('problem') && !context.problem) {
        context.problem = formattedAnswer;
      }
      if (questionId.includes('design') && !context.design) {
        context.design = formattedAnswer;
      }
      // Only add acceptance criteria if not already set
      if (questionId.includes('acceptance') || questionId.includes('criteria')) {
        if (!context.acceptanceCriteria) {
          context.acceptanceCriteria = formattedAnswer;
        }
      }
    });
    
  } catch (error) {
    console.error('Error building prompt context:', error);
  }
  
  return context;
}
