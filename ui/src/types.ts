/**
 * @fileoverview Type definitions for the Development Workflow Tracker
 */

/**
 * All possible development situations
 */
export type Situation =
  | 'Dumping'
  | 'WhatToDo'
  | 'DefiningIntent'
  | 'FailingIntent'
  | 'GatheringFacts'
  | 'SelectingProblem'
  | 'ListingActions'
  | 'ExploringSolution'
  | 'DefiningAcceptance'
  | 'CheckingFeasibility'
  | 'Designing'
  | 'BreakingTasks'
  | 'Implementing'
  | 'Verifying'
  | 'Verified'
  | 'Releasing'
  | 'CollectingFeedback'
  | 'Learning'
  | 'Ending'
  | 'Unconscious';

/**
 * Layout algorithm types for cytoscape
 */
export type LayoutType =
  | 'dagre'
  | 'breadthfirst'
  | 'grid'
  | 'circle'
  | 'concentric'
  | 'cose'
  | 'random'
  | 'preset';

/**
 * WorkState fact identifier
 */
export type FactId = string;

/**
 * WorkState structure
 */
export interface WorkState {
  workstate: Record<FactId, boolean>;
  metadata: {
    created_at: string;
    updated_at: string;
    version: string;
  };
}

/**
 * Situation selection state
 */
export interface SituationSelection {
  selected_situation: Situation | null;
  selected_at: string;
  workstate_snapshot: WorkState;
}

/**
 * Required fact for a situation
 */
export interface RequiredFact {
  description: string;
  fact_id?: FactId;
}

/**
 * Situation guide section with content
 */
export interface SituationGuideSection {
  title: string;
  content: string | string[];
}

/**
 * Quick check item
 */
export interface QuickCheckItem {
  question: string;
}

/**
 * Situation guide with all sections
 */
export interface SituationGuide {
  whatToDo: string;
  conditionsToProceed: string[];
  failure: string[];
  goBackTo: string;
  /** When present, describes the explicit path to go back (e.g. Dumping) when AI result does not match user context. */
  feedbackPath?: string;
  warning: string;
  tip: string;
  aiUsage: string;
  whenToExit?: string;
  quickCheck: {
    items: QuickCheckItem[];
    nextStep: string;
  };
}

/**
 * Situation definition with checklist and guide
 */
export interface SituationDefinition {
  name: Situation;
  description: string;
  required_facts: RequiredFact[];
  guide?: SituationGuide;
}

/**
 * Node position in the graph
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Graph node data
 */
export interface SituationNodeData {
  situation: Situation;
  description: string;
  isSelected: boolean;
  isTerminal?: boolean;
}

/**
 * Question type for interactive flow
 */
export type QuestionType = 'text' | 'yesno' | 'multiple';

/**
 * Data display configuration for a question
 */
export interface QuestionDataDisplay {
  type: 'intent-summary' | 'intent-document' | 'answer' | 'custom' | 'previous-cycle' | 'dump-thoughts' | 'action-intent' | 'why-action';
  label: string;
  source: 'getIntentSummary' | 'getIntentDocument' | 'getAnswerByQuestionId' | 'getAnswersBySituation' | 'getPreviousCycleData';
  sourceParam?: string;
}

/**
 * Input field for AI prompt
 */
export interface AIPromptInputField {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * Selectable previous answers configuration
 */
export interface SelectableAnswers {
  questionId: string;
  label: string;
  variableName: string;
}

/**
 * AI prompt template for questions
 */
export interface AIPromptTemplate {
  template: string;
  variables?: string[];
  inputFields?: AIPromptInputField[];
  selectableAnswers?: SelectableAnswers;
}

/**
 * Question in the interactive flow
 */
export interface Question {
  id: string;
  question: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
  allowMultiple?: boolean;
  nextQuestionId?: string;
  nextSituation?: Situation;
  onYesNextQuestionId?: string;
  onNoNextQuestionId?: string;
  onAnswerNextSituation?: Situation;
  onYesNextSituation?: Situation;
  onNoNextSituation?: Situation;
  showData?: QuestionDataDisplay;
  aiPromptTemplate?: AIPromptTemplate;
}

/**
 * Interactive flow for a situation
 */
export interface SituationFlow {
  situation: Situation;
  questions: Question[];
  startQuestionId: string;
}

/**
 * User answer to a question
 */
export interface QuestionAnswer {
  questionId: string;
  answer: string | boolean;
  answeredAt: string;
}
