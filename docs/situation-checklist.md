# Situation Checklist

This document defines the required facts checklist for each development situation. A situation can only be selected if all facts in its checklist are true.

## IntentDefined

**Required Facts:**
- [ ] A written document or note exists describing the development intent
- [ ] The intent statement is clear and unambiguous
- [ ] The intent has been reviewed and confirmed (by self or team)
- [ ] The scope of the intent is bounded (not infinite)

## IntentDefinedFail

**Required Facts:**
- [ ] An attempt was made to define intent
- [ ] The intent remains unclear or ambiguous after the attempt
- [ ] Multiple conflicting interpretations of the intent exist
- [ ] The intent cannot be expressed in a single, clear statement

## ProblemSelected

**Required Facts:**
- [ ] A specific problem statement exists in written form
- [ ] The problem is distinct from the general intent
- [ ] The problem has clear boundaries (what is in scope, what is out)
- [ ] The problem is actionable (not just a wish or abstract goal)

## AcceptanceDefined

**Required Facts:**
- [ ] Acceptance criteria exist in written form
- [ ] Each criterion is measurable (can be verified as true/false)
- [ ] Acceptance criteria are linked to a specific problem
- [ ] The criteria define "done" for the problem

## FeasibilityChecked

**Required Facts:**
- [ ] A feasibility assessment has been performed
- [ ] Technical constraints have been identified
- [ ] Resource requirements have been estimated
- [ ] A decision has been made: feasible, too hard, or problem too big

## DesignReady

**Required Facts:**
- [ ] A design document or diagram exists
- [ ] State transitions (if applicable) are defined
- [ ] Component interactions are specified
- [ ] The design addresses the acceptance criteria

## TaskBreakdown

**Required Facts:**
- [ ] Tasks have been decomposed from the design
- [ ] Each task is independently executable (has clear inputs/outputs)
- [ ] Task dependencies are identified
- [ ] Each task can be completed in a single work session (90 minutes or less)

## Implementing

**Required Facts:**
- [ ] A specific task has been selected for implementation
- [ ] Implementation has started (code/files have been created or modified)
- [ ] The task is not yet complete
- [ ] No verification has been performed yet

## Verifying

**Required Facts:**
- [ ] Implementation for a task is complete (code written)
- [ ] Verification process has started
- [ ] Acceptance criteria are being checked against implementation
- [ ] Verification result is not yet determined

## Verified

**Required Facts:**
- [ ] Verification process has been completed
- [ ] All acceptance criteria for the task are met
- [ ] No blocking bugs remain
- [ ] The implementation is ready for the next step (release or integration)

## Released

**Required Facts:**
- [ ] The work has been delivered (deployed, merged, or shared)
- [ ] The delivery is accessible to intended users/stakeholders
- [ ] Release artifacts exist (deployment, PR, package, etc.)
- [ ] Release has been announced or made visible

## FeedbackCollected

**Required Facts:**
- [ ] Feedback has been actively sought or received
- [ ] Feedback is documented (written notes or records)
- [ ] Feedback relates to the released work
- [ ] Feedback collection process is complete

## Learned

**Required Facts:**
- [ ] Feedback has been analyzed
- [ ] Insights or lessons have been extracted
- [ ] Learning outcomes are documented
- [ ] Next actions based on learning have been identified

## Undetermined

**Required Facts:**
- [ ] Current situation does not match any defined situation's checklist
- [ ] Multiple situations partially match but none fully match
- [ ] Required information to determine situation is missing
- [ ] Situation is ambiguous or unclear
