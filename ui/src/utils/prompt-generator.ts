/**
 * @fileoverview Utility for generating AI prompts from templates
 */

import { getIntentSummary, getAnswersBySituation, getAnswersBySituation as getAllAnswersBySituation } from '../data/db';

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
 * @brief Build context from database answers
 * 
 * @param situation - Current situation
 * @return Promise resolving to context object with relevant answers
 * 
 * @pre situation is provided
 * @post Returns context with intent, problem, and other relevant data
 */
export async function buildPromptContext(situation: string): Promise<PromptContext> {
  const context: PromptContext = {};
  
  try {
    const intentSummary = await getIntentSummary();
    if (intentSummary) {
      context.intent = intentSummary;
    }
    
    const allAnswers = await getAnswersBySituation('IntentDefined');
    const problemAnswers = await getAnswersBySituation('ProblemSelected');
    const acceptanceAnswers = await getAnswersBySituation('AcceptanceDefined');
    const designAnswers = await getAnswersBySituation('DesignReady');
    const implementingAnswers = await getAnswersBySituation('Implementing');
    const verifyingAnswers = await getAnswersBySituation('Verifying');
    const verifiedAnswers = await getAnswersBySituation('Verified');
    const releasedAnswers = await getAnswersBySituation('Released');
    const feedbackAnswers = await getAnswersBySituation('FeedbackCollected');
    const learnedAnswers = await getAnswersBySituation('Learned');
    const currentAnswers = await getAnswersBySituation(situation);
    
    const allAnswerMap = new Map<string, string>();
    
    [...allAnswers, ...problemAnswers, ...acceptanceAnswers, ...designAnswers, 
     ...implementingAnswers, ...verifyingAnswers, ...verifiedAnswers, 
     ...releasedAnswers, ...feedbackAnswers, ...learnedAnswers, ...currentAnswers].forEach(a => {
      if (!allAnswerMap.has(a.questionId)) {
        allAnswerMap.set(a.questionId, a.answer);
      }
    });
    
    if (allAnswerMap.has('problem-boundaries-text')) {
      context.problem = allAnswerMap.get('problem-boundaries-text') || null;
    }
    
    if (allAnswerMap.has('criteria-text')) {
      context.acceptanceCriteria = allAnswerMap.get('criteria-text') || null;
    } else {
      const criteriaAnswers = [...acceptanceAnswers, ...currentAnswers].filter(a => 
        a.questionId.includes('criteria') && a.answer !== 'true' && a.answer !== 'false'
      );
      if (criteriaAnswers.length > 0) {
        context.acceptanceCriteria = criteriaAnswers.map(a => a.answer).join('\n');
      }
    }
    
    if (allAnswerMap.has('design-text')) {
      context.design = allAnswerMap.get('design-text') || null;
    } else {
      const designAnswersText = [...designAnswers, ...currentAnswers].filter(a =>
        a.questionId.includes('design') && a.answer !== 'true' && a.answer !== 'false'
      );
      if (designAnswersText.length > 0) {
        context.design = designAnswersText.map(a => a.answer).join('\n');
      }
    }
    
    if (allAnswerMap.has('tasks-text')) {
      context.task = allAnswerMap.get('tasks-text') || null;
    }
    
    if (allAnswerMap.has('task-implementation-text')) {
      context['task-implementation-text'] = allAnswerMap.get('task-implementation-text') || null;
    }
    
    if (allAnswerMap.has('verification-test-text')) {
      context['verification-test-text'] = allAnswerMap.get('verification-test-text') || null;
    }
    
    if (allAnswerMap.has('verification-decision-text')) {
      context['verification-decision-text'] = allAnswerMap.get('verification-decision-text') || null;
    }
    
    if (allAnswerMap.has('release-note-text')) {
      context['release-note-text'] = allAnswerMap.get('release-note-text') || null;
    }
    
    if (allAnswerMap.has('feedback-documented-text')) {
      context['feedback-documented-text'] = allAnswerMap.get('feedback-documented-text') || null;
    }
    
    if (allAnswerMap.has('learned-new-facts-text')) {
      context['learned-new-facts-text'] = allAnswerMap.get('learned-new-facts-text') || null;
    }
    
    if (allAnswerMap.has('learned-improvements-text')) {
      context['learned-improvements-text'] = allAnswerMap.get('learned-improvements-text') || null;
    }
    
    if (allAnswerMap.has('constraints-text')) {
      context['constraints-text'] = allAnswerMap.get('constraints-text') || null;
    }
    
    allAnswerMap.forEach((value, key) => {
      if (value !== 'true' && value !== 'false' && !context[key]) {
        context[key] = value;
      }
    });
  } catch (error) {
    console.error('Error building prompt context:', error);
  }
  
  return context;
}
