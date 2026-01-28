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
 * @return Promise resolving to context object with relevant answers and relationships
 * 
 * @pre situation is provided
 * @post Returns context with intent, problem, and other relevant data including relationships
 */
export async function buildPromptContext(situation: string): Promise<PromptContext> {
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
    
    if (relatedContext.design && relatedContext.design.length > 0) {
      context.design = relatedContext.design.join('\n\n');
    }
    
    if (relatedContext.acceptance && relatedContext.acceptance.length > 0) {
      context.acceptanceCriteria = relatedContext.acceptance.join('\n\n');
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
      'IntentDefined',
      'ProblemSelected', 
      'AcceptanceDefined',
      'DesignReady',
      'Implementing',
      'Verifying',
      'Verified',
      'Released',
      'FeedbackCollected',
      'Learned',
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
            if (a.questionId.includes('problem') && !context.problem) {
              context.problem = a.answer;
            }
            if (a.questionId.includes('design') && !context.design) {
              context.design = a.answer;
            }
            if (a.questionId.includes('acceptance') || a.questionId.includes('criteria')) {
              if (!context.acceptanceCriteria) {
                context.acceptanceCriteria = a.answer;
              } else {
                context.acceptanceCriteria += '\n\n' + a.answer;
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
