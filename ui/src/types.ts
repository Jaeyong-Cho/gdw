/**
 * @fileoverview Type definitions for the Development Workflow Tracker
 */

/**
 * All possible development situations
 */
export type Situation =
  | 'IntentDefined'
  | 'IntentDefinedFail'
  | 'ProblemSelected'
  | 'AcceptanceDefined'
  | 'FeasibilityChecked'
  | 'DesignReady'
  | 'TaskBreakdown'
  | 'Implementing'
  | 'Verifying'
  | 'Verified'
  | 'Released'
  | 'FeedbackCollected'
  | 'Learned';

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
  warning: string;
  tip: string;
  aiUsage: string;
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
