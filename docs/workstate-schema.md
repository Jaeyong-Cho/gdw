# WorkState Fact Items

This document defines all fact items that can be recorded in WorkState. Each fact is a boolean (true/false) statement about the current work state.

## Document and Artifact Facts

### DOC_INTENT_EXISTS
- **Description**: A written document or note exists describing the development intent
- **Type**: Boolean
- **Example**: true if `INTENT.md` exists with content

### DOC_PROBLEM_STATEMENT_EXISTS
- **Description**: A specific problem statement exists in written form
- **Type**: Boolean
- **Example**: true if problem is documented in a file or note

### DOC_ACCEPTANCE_CRITERIA_EXIST
- **Description**: Acceptance criteria exist in written form
- **Type**: Boolean
- **Example**: true if acceptance criteria are documented

### DOC_DESIGN_EXISTS
- **Description**: A design document or diagram exists
- **Type**: Boolean
- **Example**: true if design.md or design diagram exists

### DOC_FEEDBACK_EXISTS
- **Description**: Feedback is documented (written notes or records)
- **Type**: Boolean
- **Example**: true if feedback notes exist

### DOC_LEARNING_OUTCOMES_EXIST
- **Description**: Learning outcomes are documented
- **Type**: Boolean
- **Example**: true if lessons learned are written down

### ARTIFACT_RELEASE_EXISTS
- **Description**: Release artifacts exist (deployment, PR, package, etc.)
- **Type**: Boolean
- **Example**: true if deployment, PR, or package exists

## Clarity and Quality Facts

### CLARITY_INTENT_CLEAR
- **Description**: The intent statement is clear and unambiguous
- **Type**: Boolean
- **Example**: true if intent can be explained in one sentence without confusion

### CLARITY_INTENT_AMBIGUOUS
- **Description**: The intent remains unclear or ambiguous after attempt
- **Type**: Boolean
- **Example**: true if intent has multiple interpretations

### CLARITY_INTENT_SINGLE_STATEMENT
- **Description**: The intent can be expressed in a single, clear statement
- **Type**: Boolean
- **Example**: true if intent fits in one clear sentence

### CLARITY_PROBLEM_BOUNDARIES_DEFINED
- **Description**: The problem has clear boundaries (what is in scope, what is out)
- **Type**: Boolean
- **Example**: true if scope is explicitly defined

### CLARITY_CRITERIA_MEASURABLE
- **Description**: Each acceptance criterion is measurable (can be verified as true/false)
- **Type**: Boolean
- **Example**: true if all criteria can be objectively verified

## Review and Confirmation Facts

### REVIEW_INTENT_CONFIRMED
- **Description**: The intent has been reviewed and confirmed (by self or team)
- **Type**: Boolean
- **Example**: true if intent was reviewed and approved

### REVIEW_INTENT_ATTEMPTED
- **Description**: An attempt was made to define intent
- **Type**: Boolean
- **Example**: true if any attempt to define intent was made

## Scope and Boundaries Facts

### SCOPE_INTENT_BOUNDED
- **Description**: The scope of the intent is bounded (not infinite)
- **Type**: Boolean
- **Example**: true if intent has limits and boundaries

### SCOPE_PROBLEM_DISTINCT_FROM_INTENT
- **Description**: The problem is distinct from the general intent
- **Type**: Boolean
- **Example**: true if problem is a specific instance of intent

## Actionability Facts

### ACTION_PROBLEM_ACTIONABLE
- **Description**: The problem is actionable (not just a wish or abstract goal)
- **Type**: Boolean
- **Example**: true if problem can be solved with concrete steps

### ACTION_TASK_SELECTED
- **Description**: A specific task has been selected for implementation
- **Type**: Boolean
- **Example**: true if a task is chosen to work on

### ACTION_NEXT_ACTIONS_IDENTIFIED
- **Description**: Next actions based on learning have been identified
- **Type**: Boolean
- **Example**: true if next steps are known

## Linkage and Relationship Facts

### LINK_CRITERIA_TO_PROBLEM
- **Description**: Acceptance criteria are linked to a specific problem
- **Type**: Boolean
- **Example**: true if criteria reference the problem

### LINK_DESIGN_TO_CRITERIA
- **Description**: The design addresses the acceptance criteria
- **Type**: Boolean
- **Example**: true if design covers all criteria

### LINK_FEEDBACK_TO_RELEASE
- **Description**: Feedback relates to the released work
- **Type**: Boolean
- **Example**: true if feedback is about the release

## Assessment and Decision Facts

### ASSESS_FEASIBILITY_PERFORMED
- **Description**: A feasibility assessment has been performed
- **Type**: Boolean
- **Example**: true if feasibility was evaluated

### ASSESS_CONSTRAINTS_IDENTIFIED
- **Description**: Technical constraints have been identified
- **Type**: Boolean
- **Example**: true if constraints are known

### ASSESS_RESOURCES_ESTIMATED
- **Description**: Resource requirements have been estimated
- **Type**: Boolean
- **Example**: true if time/resources were estimated

### DECISION_FEASIBILITY_MADE
- **Description**: A decision has been made: feasible, too hard, or problem too big
- **Type**: Boolean
- **Example**: true if feasibility decision exists

## Design Specification Facts

### DESIGN_STATE_TRANSITIONS_DEFINED
- **Description**: State transitions (if applicable) are defined
- **Type**: Boolean
- **Example**: true if state diagram or transitions documented

### DESIGN_COMPONENT_INTERACTIONS_SPECIFIED
- **Description**: Component interactions are specified
- **Type**: Boolean
- **Example**: true if how components interact is defined

## Task Decomposition Facts

### TASK_DECOMPOSITION_DONE
- **Description**: Tasks have been decomposed from the design
- **Type**: Boolean
- **Example**: true if tasks are broken down

### TASK_INDEPENDENTLY_EXECUTABLE
- **Description**: Each task is independently executable (has clear inputs/outputs)
- **Type**: Boolean
- **Example**: true if tasks can be done separately

### TASK_DEPENDENCIES_IDENTIFIED
- **Description**: Task dependencies are identified
- **Type**: Boolean
- **Example**: true if task order is known

### TASK_SESSION_SIZED
- **Description**: Each task can be completed in a single work session (90 minutes or less)
- **Type**: Boolean
- **Example**: true if tasks fit in one session

## Implementation Status Facts

### IMPL_STARTED
- **Description**: Implementation has started (code/files have been created or modified)
- **Type**: Boolean
- **Example**: true if code was written or files changed

### IMPL_COMPLETE
- **Description**: Implementation for a task is complete (code written)
- **Type**: Boolean
- **Example**: true if code is finished

### IMPL_TASK_INCOMPLETE
- **Description**: The task is not yet complete
- **Type**: Boolean
- **Example**: true if task still has work remaining

## Verification Facts

### VERIFY_PROCESS_STARTED
- **Description**: Verification process has started
- **Type**: Boolean
- **Example**: true if testing/verification began

### VERIFY_PROCESS_COMPLETE
- **Description**: Verification process has been completed
- **Type**: Boolean
- **Example**: true if verification finished

### VERIFY_CRITERIA_CHECKED
- **Description**: Acceptance criteria are being checked against implementation
- **Type**: Boolean
- **Example**: true if criteria verification in progress

### VERIFY_RESULT_UNDETERMINED
- **Description**: Verification result is not yet determined
- **Type**: Boolean
- **Example**: true if verification outcome unknown

### VERIFY_CRITERIA_MET
- **Description**: All acceptance criteria for the task are met
- **Type**: Boolean
- **Example**: true if all criteria pass

### VERIFY_NO_BLOCKING_BUGS
- **Description**: No blocking bugs remain
- **Type**: Boolean
- **Example**: true if no critical bugs exist

### VERIFY_READY_FOR_NEXT_STEP
- **Description**: The implementation is ready for the next step (release or integration)
- **Type**: Boolean
- **Example**: true if ready to proceed

### VERIFY_NOT_PERFORMED
- **Description**: No verification has been performed yet
- **Type**: Boolean
- **Example**: true if verification hasn't started

## Release Facts

### RELEASE_DELIVERED
- **Description**: The work has been delivered (deployed, merged, or shared)
- **Type**: Boolean
- **Example**: true if deployed/merged/shared

### RELEASE_ACCESSIBLE
- **Description**: The delivery is accessible to intended users/stakeholders
- **Type**: Boolean
- **Example**: true if users can access it

### RELEASE_ANNOUNCED
- **Description**: Release has been announced or made visible
- **Type**: Boolean
- **Example**: true if release was communicated

## Feedback Facts

### FEEDBACK_SOUGHT_OR_RECEIVED
- **Description**: Feedback has been actively sought or received
- **Type**: Boolean
- **Example**: true if feedback was requested or given

### FEEDBACK_COLLECTION_COMPLETE
- **Description**: Feedback collection process is complete
- **Type**: Boolean
- **Example**: true if feedback gathering finished

### FEEDBACK_ANALYZED
- **Description**: Feedback has been analyzed
- **Type**: Boolean
- **Example**: true if feedback was reviewed

## Learning Facts

### LEARNING_INSIGHTS_EXTRACTED
- **Description**: Insights or lessons have been extracted
- **Type**: Boolean
- **Example**: true if lessons were identified

## Completion Definition Facts

### COMPLETE_CRITERIA_DEFINE_DONE
- **Description**: The criteria define "done" for the problem
- **Type**: Boolean
- **Example**: true if criteria specify completion

## Conflict Facts

### CONFLICT_MULTIPLE_INTERPRETATIONS
- **Description**: Multiple conflicting interpretations of the intent exist
- **Type**: Boolean
- **Example**: true if intent has conflicting views

## Situation Matching Facts

### MATCH_NO_SITUATION_FULLY_MATCHES
- **Description**: Current situation does not match any defined situation's checklist
- **Type**: Boolean
- **Example**: true if no situation fits

### MATCH_PARTIAL_MULTIPLE_MATCHES
- **Description**: Multiple situations partially match but none fully match
- **Type**: Boolean
- **Example**: true if several situations partially fit

### MATCH_INFO_MISSING
- **Description**: Required information to determine situation is missing
- **Type**: Boolean
- **Example**: true if facts are unknown

### MATCH_SITUATION_AMBIGUOUS
- **Description**: Situation is ambiguous or unclear
- **Type**: Boolean
- **Example**: true if situation cannot be determined
