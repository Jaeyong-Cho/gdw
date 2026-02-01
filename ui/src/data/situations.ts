/**
 * @fileoverview Situation definitions and graph layout data
 */

import { Situation, SituationDefinition, NodePosition } from '../types';

/**
 * @brief Situation definitions with descriptions
 * @return Map of situation names to their definitions
 */
export const situationDefinitions: Record<Situation, SituationDefinition> = {
  Dumping: {
    name: 'Dumping',
    description: 'Dumping thoughts freely to organize ideas',
    required_facts: [
      { description: 'Thoughts have been written down freely' },
      { description: 'Key themes and patterns have been identified' },
      { description: 'Actionable insights have been extracted' },
      { description: 'Thought organization is complete' },
    ],
  },
  WhatToDo: {
    name: 'WhatToDo',
    description: 'Defining what action or task to do based on dumped thoughts',
    required_facts: [
      { description: 'What action or task to do has been written down' },
      { description: 'The motivation behind it is identified' },
      { description: 'Assumptions about the action are extracted' },
      { description: 'What to do is clear' },
    ],
  },
  DefiningIntent: {
    name: 'DefiningIntent',
    description: 'The development intent has been clearly defined',
    required_facts: [
      { description: 'A written document or note exists describing the development intent' },
      { description: 'The intent statement is clear and unambiguous' },
      { description: 'The intent has been reviewed and confirmed (by self or team)' },
      { description: 'The scope of the intent is bounded (not infinite)' },
    ],
  },
  FailingIntent: {
    name: 'FailingIntent',
    description: 'The intent is unclear and needs clarification',
    required_facts: [
      { description: 'An attempt was made to define intent' },
      { description: 'The intent remains unclear or ambiguous after the attempt' },
      { description: 'Multiple conflicting interpretations of the intent exist' },
      { description: 'The intent cannot be expressed in a single, clear statement' },
    ],
  },
  GatheringFacts: {
    name: 'GatheringFacts',
    description: 'Gathering observable facts about the current situation before problem selection',
    required_facts: [
      { description: 'Facts about the current situation have been listed' },
      { description: 'Each item is an observable, measurable, or verified fact' },
      { description: 'Opinions and assumptions are separated from facts' },
      { description: 'Sufficient facts exist to inform problem selection' },
    ],
  },
  SelectingProblem: {
    name: 'SelectingProblem',
    description: 'A specific problem has been selected to work on',
    required_facts: [
      { description: 'A specific problem statement exists in written form' },
      { description: 'The problem is distinct from the general intent' },
      { description: 'The problem has clear boundaries (what is in scope, what is out)' },
      { description: 'The problem is actionable (not just a wish or abstract goal)' },
    ],
  },
  ExploringSolution: {
    name: 'ExploringSolution',
    description: 'Exploring how the selected problem can be solved before defining acceptance criteria',
    required_facts: [
      { description: 'At least one solution direction or approach has been explored' },
      { description: 'Exploration is documented (notes or options written)' },
      { description: 'Ready to define acceptance criteria based on the exploration' },
    ],
  },
  DefiningAcceptance: {
    name: 'DefiningAcceptance',
    description: 'Acceptance criteria have been defined for the problem',
    required_facts: [
      { description: 'Acceptance criteria exist in written form' },
      { description: 'Each criterion is measurable (can be verified as true/false)' },
      { description: 'Acceptance criteria are linked to a specific problem' },
      { description: 'The criteria define "done" for the problem' },
    ],
  },
  CheckingFeasibility: {
    name: 'CheckingFeasibility',
    description: 'Feasibility of the solution has been checked',
    required_facts: [
      { description: 'A feasibility assessment has been performed' },
      { description: 'Technical constraints have been identified' },
      { description: 'Resource requirements have been estimated' },
      { description: 'A decision has been made: feasible, too hard, or problem too big' },
    ],
  },
  Designing: {
    name: 'Designing',
    description: 'Design with state transitions has been completed',
    required_facts: [
      { description: 'A design document or diagram exists' },
      { description: 'State transitions (if applicable) are defined' },
      { description: 'Component interactions are specified' },
      { description: 'The design addresses the acceptance criteria' },
    ],
  },
  BreakingTasks: {
    name: 'BreakingTasks',
    description: 'Tasks have been broken down into executable units',
    required_facts: [
      { description: 'Tasks have been decomposed from the design' },
      { description: 'Each task is independently executable (has clear inputs/outputs)' },
      { description: 'Task dependencies are identified' },
      { description: 'Each task can be completed in a single work session (90 minutes or less)' },
    ],
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
  },
  Releasing: {
    name: 'Releasing',
    description: 'The work has been released/delivered',
    required_facts: [
      { description: 'The work has been delivered (deployed, merged, or shared)' },
      { description: 'The delivery is accessible to intended users/stakeholders' },
      { description: 'Release artifacts exist (deployment, PR, package, etc.)' },
      { description: 'Release has been announced or made visible' },
    ],
  },
  CollectingFeedback: {
    name: 'CollectingFeedback',
    description: 'Feedback has been collected after release',
    required_facts: [
      { description: 'Feedback has been actively sought or received' },
      { description: 'Feedback is documented (written notes or records)' },
      { description: 'Feedback relates to the released work' },
      { description: 'Feedback collection process is complete' },
    ],
  },
  Learning: {
    name: 'Learning',
    description: 'Learning from feedback has been completed',
    required_facts: [
      { description: 'Feedback has been analyzed' },
      { description: 'Insights or lessons have been extracted' },
      { description: 'Learning outcomes are documented' },
      { description: 'Next actions based on learning have been identified' },
    ],
  },
  Ending: {
    name: 'Ending',
    description: 'The development cycle has been completed',
    required_facts: [
      { description: 'All work has been completed and delivered' },
      { description: 'Feedback has been collected and analyzed' },
      { description: 'Learning has been documented' },
      { description: 'The cycle is finished' },
    ],
  },
  Unconscious: {
    name: 'Unconscious',
    description: 'State of fast thinking and judgment, ideal for familiar tasks; rest period between cycles',
    required_facts: [
      { description: 'Cycle has been completed' },
      { description: 'User has entered unconscious rest period' },
      { description: 'Unconscious period start time is recorded' },
      { description: 'Unconscious period end time is recorded when starting next cycle' },
      { description: 'User is in a state of rapid thinking and judgment' },
      { description: 'State is suitable for handling familiar tasks efficiently' },
    ],
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
  // Top Center: Cycle Start
  Dumping: { x: 1800, y: 0 },
  WhatToDo: { x: 1800, y: 150 },
  
  // Column 0: Start (x=200)
  DefiningIntent: { x: 200, y: 300 },
  FailingIntent: { x: 200, y: 150 },
  
  // Column 0.5: Facts (x=400)
  GatheringFacts: { x: 400, y: 300 },
  
  // Column 1: Problem (x=600)
  SelectingProblem: { x: 600, y: 300 },
  
  // Column 1.5: Solution exploration (x=800)
  ExploringSolution: { x: 800, y: 300 },
  
  // Column 2: Acceptance (x=1000)
  DefiningAcceptance: { x: 1000, y: 300 },
  
  // Column 3: Feasibility (x=1400)
  CheckingFeasibility: { x: 1400, y: 300 },
  
  // Column 4: Design (x=1800)
  Designing: { x: 1800, y: 300 },
  
  // Column 5: Task Breakdown (x=2200)
  BreakingTasks: { x: 2200, y: 300 },
  
  // Column 6: Implementation (x=2600)
  Implementing: { x: 2600, y: 300 },
  
  // Column 7: Verification (x=3000)
  Verifying: { x: 3000, y: 300 },
  
  // Column 8: Verified (x=3400)
  Verified: { x: 3400, y: 300 },
  
  // Column 9: Release and Feedback (x=3800)
  Releasing: { x: 3800, y: 200 },
  CollectingFeedback: { x: 3800, y: 300 },
  Learning: { x: 3800, y: 400 },
  
  // Column 10: Ending (x=4200)
  Ending: { x: 4200, y: 300 },
  // Column 11: Unconscious (after Ending)
  Unconscious: { x: 4600, y: 300 },
};

/**
 * @brief State transitions from the original mermaid diagram
 * @return Array of transitions: [from, to, label]
 */
export const stateTransitions: Array<[Situation, Situation, string]> = [
  ['Dumping', 'WhatToDo', 'thoughts organized'],
  ['WhatToDo', 'Dumping', 'context insufficient'],
  ['WhatToDo', 'DefiningIntent', 'action intent clear'],
  ['DefiningIntent', 'GatheringFacts', 'intent clear'],
  ['DefiningIntent', 'FailingIntent', 'intent unclear'],
  ['FailingIntent', 'DefiningIntent', ''],
  ['GatheringFacts', 'SelectingProblem', 'facts gathered'],
  ['SelectingProblem', 'GatheringFacts', 'need more facts'],
  ['SelectingProblem', 'ExploringSolution', 'problem focused'],
  ['SelectingProblem', 'DefiningIntent', 'problem drifting'],
  ['ExploringSolution', 'DefiningAcceptance', 'solution explored'],
  ['ExploringSolution', 'SelectingProblem', 're-select problem'],
  ['DefiningAcceptance', 'CheckingFeasibility', 'criteria measurable'],
  ['DefiningAcceptance', 'SelectingProblem', 'criteria vague'],
  ['DefiningAcceptance', 'ExploringSolution', 'criteria vague'],
  ['CheckingFeasibility', 'Designing', 'feasible'],
  ['CheckingFeasibility', 'DefiningAcceptance', 'too hard'],
  ['CheckingFeasibility', 'SelectingProblem', 'problem too big'],
  ['Designing', 'BreakingTasks', 'state transitions defined'],
  ['Designing', 'DefiningAcceptance', 'design complex'],
  ['BreakingTasks', 'Implementing', 'tasks executable'],
  ['BreakingTasks', 'Designing', 'tasks unclear'],
  ['Implementing', 'Verifying', 'task completed'],
  ['Implementing', 'BreakingTasks', 'stuck: need breakdown'],
  ['Implementing', 'SelectingProblem', 'stuck: new problem found'],
  ['Verifying', 'Verified', 'acceptance met'],
  ['Verifying', 'Implementing', 'bug'],
  ['Verifying', 'DefiningAcceptance', 'test invalid'],
  ['Verified', 'Releasing', 'ready for release'],
  ['Verified', 'DefiningAcceptance', 'criteria issue'],
  ['Releasing', 'CollectingFeedback', 'delivered'],
  ['Releasing', 'Verified', 'issues found'],
  ['CollectingFeedback', 'Learning', 'feedback collected'],
  ['Learning', 'SelectingProblem', 'same intent, new problem'],
  ['Learning', 'DefiningAcceptance', 'deepen same problem'],
  ['Learning', 'DefiningIntent', 'adjust intent'],
  ['Learning', 'Implementing', 'clear implementation task'],
  ['Learning', 'Ending', 'cycle complete'],
  ['Ending', 'Unconscious', 'yes'],
  ['Unconscious', 'Dumping', 'start new cycle'],
];

/**
 * @brief Situations that can be transitioned to from the given situation (go-back targets)
 * @param situation - Current situation
 * @return Array of situations that have a transition whose destination is the current situation
 * @pre situation is a valid Situation
 * @post Returns unique situations; empty if none (e.g. Dumping has no incoming back-target in flow)
 */
export function getGoBackTargets(situation: Situation): Situation[] {
  const seen = new Set<Situation>();
  const result: Situation[] = [];
  for (const [from, to] of stateTransitions) {
    if (to === situation && !seen.has(from)) {
      seen.add(from);
      result.push(from);
    }
  }
  return result;
}
