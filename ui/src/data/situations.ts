/**
 * @fileoverview Situation definitions and graph layout data
 */

import { Situation, SituationDefinition, NodePosition } from '../types';
import { situationGuides } from './situation-guides';

/**
 * @brief Situation definitions with descriptions
 * @return Map of situation names to their definitions
 */
export const situationDefinitions: Record<Situation, SituationDefinition> = {
  IntentDefined: {
    name: 'IntentDefined',
    description: 'The development intent has been clearly defined',
    required_facts: [
      { description: 'A written document or note exists describing the development intent' },
      { description: 'The intent statement is clear and unambiguous' },
      { description: 'The intent has been reviewed and confirmed (by self or team)' },
      { description: 'The scope of the intent is bounded (not infinite)' },
    ],
    guide: situationGuides.IntentDefined,
  },
  IntentDefinedFail: {
    name: 'IntentDefinedFail',
    description: 'The intent is unclear and needs clarification',
    required_facts: [
      { description: 'An attempt was made to define intent' },
      { description: 'The intent remains unclear or ambiguous after the attempt' },
      { description: 'Multiple conflicting interpretations of the intent exist' },
      { description: 'The intent cannot be expressed in a single, clear statement' },
    ],
    guide: situationGuides.IntentDefinedFail,
  },
  ProblemSelected: {
    name: 'ProblemSelected',
    description: 'A specific problem has been selected to work on',
    required_facts: [
      { description: 'A specific problem statement exists in written form' },
      { description: 'The problem is distinct from the general intent' },
      { description: 'The problem has clear boundaries (what is in scope, what is out)' },
      { description: 'The problem is actionable (not just a wish or abstract goal)' },
    ],
    guide: situationGuides.ProblemSelected,
  },
  AcceptanceDefined: {
    name: 'AcceptanceDefined',
    description: 'Acceptance criteria have been defined for the problem',
    required_facts: [
      { description: 'Acceptance criteria exist in written form' },
      { description: 'Each criterion is measurable (can be verified as true/false)' },
      { description: 'Acceptance criteria are linked to a specific problem' },
      { description: 'The criteria define "done" for the problem' },
    ],
    guide: situationGuides.AcceptanceDefined,
  },
  FeasibilityChecked: {
    name: 'FeasibilityChecked',
    description: 'Feasibility of the solution has been checked',
    required_facts: [
      { description: 'A feasibility assessment has been performed' },
      { description: 'Technical constraints have been identified' },
      { description: 'Resource requirements have been estimated' },
      { description: 'A decision has been made: feasible, too hard, or problem too big' },
    ],
    guide: situationGuides.FeasibilityChecked,
  },
  DesignReady: {
    name: 'DesignReady',
    description: 'Design with state transitions has been completed',
    required_facts: [
      { description: 'A design document or diagram exists' },
      { description: 'State transitions (if applicable) are defined' },
      { description: 'Component interactions are specified' },
      { description: 'The design addresses the acceptance criteria' },
    ],
    guide: situationGuides.DesignReady,
  },
  TaskBreakdown: {
    name: 'TaskBreakdown',
    description: 'Tasks have been broken down into executable units',
    required_facts: [
      { description: 'Tasks have been decomposed from the design' },
      { description: 'Each task is independently executable (has clear inputs/outputs)' },
      { description: 'Task dependencies are identified' },
      { description: 'Each task can be completed in a single work session (90 minutes or less)' },
    ],
    guide: situationGuides.TaskBreakdown,
  },
  Implementing: {
    name: 'Implementing',
    description: 'Currently implementing a task',
    required_facts: [
      { description: 'A specific task has been selected for implementation' },
      { description: 'Implementation has started (code/files have been created or modified)' },
      { description: 'The task is not yet complete' },
      { description: 'No verification has been performed yet' },
    ],
    guide: situationGuides.Implementing,
  },
  Verifying: {
    name: 'Verifying',
    description: 'Verifying that the implementation meets acceptance criteria',
    required_facts: [
      { description: 'Implementation for a task is complete (code written)' },
      { description: 'Verification process has started' },
      { description: 'Acceptance criteria are being checked against implementation' },
      { description: 'Verification result is not yet determined' },
    ],
    guide: situationGuides.Verifying,
  },
  Verified: {
    name: 'Verified',
    description: 'Implementation has been verified to meet acceptance criteria',
    required_facts: [
      { description: 'Verification process has been completed' },
      { description: 'All acceptance criteria for the task are met' },
      { description: 'No blocking bugs remain' },
      { description: 'The implementation is ready for the next step (release or integration)' },
    ],
    guide: situationGuides.Verified,
  },
  Released: {
    name: 'Released',
    description: 'The work has been released/delivered',
    required_facts: [
      { description: 'The work has been delivered (deployed, merged, or shared)' },
      { description: 'The delivery is accessible to intended users/stakeholders' },
      { description: 'Release artifacts exist (deployment, PR, package, etc.)' },
      { description: 'Release has been announced or made visible' },
    ],
    guide: situationGuides.Released,
  },
  FeedbackCollected: {
    name: 'FeedbackCollected',
    description: 'Feedback has been collected after release',
    required_facts: [
      { description: 'Feedback has been actively sought or received' },
      { description: 'Feedback is documented (written notes or records)' },
      { description: 'Feedback relates to the released work' },
      { description: 'Feedback collection process is complete' },
    ],
    guide: situationGuides.FeedbackCollected,
  },
  Learned: {
    name: 'Learned',
    description: 'Learning from feedback has been completed',
    required_facts: [
      { description: 'Feedback has been analyzed' },
      { description: 'Insights or lessons have been extracted' },
      { description: 'Learning outcomes are documented' },
      { description: 'Next actions based on learning have been identified' },
    ],
    guide: situationGuides.Learned,
  },
};

/**
 * @brief Node positions for the state diagram layout
 * @return Map of situation names to their positions
 * 
 * Layout follows left-to-right workflow structure with wider spacing:
 * - Column spacing: 400px (x-axis)
 * - Row spacing: 150px (y-axis)
 * - Main flow at y=300
 * - Alternative paths above/below with 150px spacing
 */
export const nodePositions: Record<Situation, NodePosition> = {
  // Column 0: Start (x=200)
  IntentDefined: { x: 200, y: 300 },
  IntentDefinedFail: { x: 200, y: 150 },
  
  // Column 1: Problem (x=600)
  ProblemSelected: { x: 600, y: 300 },
  
  // Column 2: Acceptance (x=1000)
  AcceptanceDefined: { x: 1000, y: 300 },
  
  // Column 3: Feasibility (x=1400)
  FeasibilityChecked: { x: 1400, y: 300 },
  
  // Column 4: Design (x=1800)
  DesignReady: { x: 1800, y: 300 },
  
  // Column 5: Task Breakdown (x=2200)
  TaskBreakdown: { x: 2200, y: 300 },
  
  // Column 6: Implementation (x=2600)
  Implementing: { x: 2600, y: 300 },
  
  // Column 7: Verification (x=3000)
  Verifying: { x: 3000, y: 300 },
  
  // Column 8: Verified (x=3400)
  Verified: { x: 3400, y: 300 },
  
  // Column 9: Release and Feedback (x=3800)
  Released: { x: 3800, y: 200 },
  FeedbackCollected: { x: 3800, y: 300 },
  Learned: { x: 3800, y: 400 },
};

/**
 * @brief State transitions from the original mermaid diagram
 * @return Array of transitions: [from, to, label]
 */
export const stateTransitions: Array<[Situation, Situation, string]> = [
  ['IntentDefined', 'ProblemSelected', 'intent clear'],
  ['IntentDefined', 'IntentDefinedFail', 'intent unclear'],
  ['IntentDefinedFail', 'IntentDefined', ''],
  ['ProblemSelected', 'AcceptanceDefined', 'problem focused'],
  ['ProblemSelected', 'IntentDefined', 'problem drifting'],
  ['AcceptanceDefined', 'FeasibilityChecked', 'criteria measurable'],
  ['AcceptanceDefined', 'ProblemSelected', 'criteria vague'],
  ['FeasibilityChecked', 'DesignReady', 'feasible'],
  ['FeasibilityChecked', 'AcceptanceDefined', 'too hard'],
  ['FeasibilityChecked', 'ProblemSelected', 'problem too big'],
  ['DesignReady', 'TaskBreakdown', 'state transitions defined'],
  ['DesignReady', 'AcceptanceDefined', 'design complex'],
  ['TaskBreakdown', 'Implementing', 'tasks executable'],
  ['TaskBreakdown', 'DesignReady', 'tasks unclear'],
  ['Implementing', 'Verifying', 'task completed'],
  ['Implementing', 'TaskBreakdown', 'stuck'],
  ['Verifying', 'Verified', 'acceptance met'],
  ['Verifying', 'Implementing', 'bug'],
  ['Verifying', 'AcceptanceDefined', 'test invalid'],
  ['Verified', 'Released', 'ready for release'],
  ['Verified', 'AcceptanceDefined', 'criteria issue'],
  ['Released', 'FeedbackCollected', 'delivered'],
  ['Released', 'Verified', 'issues found'],
  ['FeedbackCollected', 'Learned', 'feedback collected'],
  ['Learned', 'ProblemSelected', 'same intent, new problem'],
  ['Learned', 'AcceptanceDefined', 'deepen same problem'],
  ['Learned', 'IntentDefined', 'adjust intent'],
];
