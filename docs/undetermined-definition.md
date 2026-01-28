# Undetermined State Definition

This document provides an explicit definition of the `Undetermined` state, which represents situations where the current development situation cannot be clearly determined.

## Definition

**Undetermined** is a valid, normal state that indicates the current development situation is ambiguous, unclear, or cannot be matched to any defined situation.

## When Undetermined is Appropriate

### Condition 1: No Situation Fully Matches

- **Scenario**: WorkState facts partially satisfy multiple situations' checklists, but no single situation's checklist is fully satisfied.
- **Example**: 
  - WorkState has `DOC_INTENT_EXISTS: true` and `CLARITY_INTENT_CLEAR: true` (satisfies IntentDefined partially)
  - WorkState also has `DOC_PROBLEM_STATEMENT_EXISTS: true` (satisfies ProblemSelected partially)
  - But neither situation's full checklist is satisfied
- **Decision**: Select `Undetermined`

### Condition 2: Insufficient Information

- **Scenario**: WorkState is empty or contains very few facts, making it impossible to determine which situation applies.
- **Example**: 
  - WorkState is empty or only has one or two facts
  - Not enough information to match any situation's checklist
- **Decision**: Select `Undetermined`

### Condition 3: Ambiguous or Conflicting Information

- **Scenario**: WorkState contains facts that conflict or create ambiguity about the current situation.
- **Example**: 
  - `CLARITY_INTENT_CLEAR: true` and `CLARITY_INTENT_AMBIGUOUS: true` both exist (conflict)
  - Multiple interpretations are possible
- **Decision**: Select `Undetermined`

### Condition 4: Transition Between Situations

- **Scenario**: Work is in progress between two defined situations, and the current state doesn't clearly match either.
- **Example**: 
  - Moving from `Implementing` to `Verifying`, but verification hasn't started yet
  - WorkState shows implementation complete but verification not started
- **Decision**: Select `Undetermined` (or the previous situation if still applicable)

### Condition 5: Situation Not Covered by Definitions

- **Scenario**: The current work state doesn't match any defined situation, even partially.
- **Example**: 
  - A new type of work that wasn't anticipated in the situation definitions
  - WorkState facts don't align with any situation's checklist
- **Decision**: Select `Undetermined`

## Undetermined is Not a Failure State

### Important Principles

1. **Undetermined is Normal**: It is a valid, legitimate state, not an error or failure condition.

2. **Undetermined is Informative**: Selecting `Undetermined` provides useful information - it indicates that the current state is unclear or in transition.

3. **Undetermined is Actionable**: When `Undetermined` is selected, it suggests that:
   - More information may be needed (update WorkState)
   - Situation definitions may need review
   - Work may be in a transition state

4. **Undetermined is Temporary**: While `Undetermined` is valid, the goal is usually to move to a defined situation as work progresses and more facts become available.

## Rules for Undetermined

### Rule 1: Undetermined Follows Same Selection Rules

- `Undetermined` follows all SituationSelection rules (single selection, manual selection, etc.)
- Selecting `Undetermined` is an explicit choice, just like selecting any other situation

### Rule 2: Undetermined Can Be Selected Explicitly

- Users can explicitly select `Undetermined` when they recognize their situation is ambiguous
- This is encouraged when the situation is unclear, rather than forcing a selection

### Rule 3: Undetermined is Default When No Selection

- When no situation is explicitly selected, the system treats it as `Undetermined`
- This makes `Undetermined` the default state for new or uninitialized work

### Rule 4: Undetermined Does Not Block Progress

- Being in `Undetermined` state does not prevent work from continuing
- Work can proceed even when the situation is unclear
- The goal is to clarify the situation over time, not to block work

## Checklist for Undetermined

From `situation-checklist.md`, the required facts for `Undetermined` are:

- [ ] Current situation does not match any defined situation's checklist
- [ ] Multiple situations partially match but none fully match
- [ ] Required information to determine situation is missing
- [ ] Situation is ambiguous or unclear

**Note**: This checklist is somewhat meta - it describes conditions about the matching process itself. In practice, `Undetermined` can be selected when:
- Any of the above conditions are true, OR
- No situation is explicitly selected (default)

## DecisionRecord for Undetermined

When `Undetermined` is selected, a DecisionRecord can still be created to document why:

```json
{
  "decision_id": "dec-2026-01-28-002",
  "selected_situation": "Undetermined",
  "decision_timestamp": "2026-01-28T11:00:00Z",
  "workstate_snapshot": { /* WorkState */ },
  "referenced_facts": [
    "DOC_INTENT_EXISTS",
    "DOC_PROBLEM_STATEMENT_EXISTS"
  ],
  "rationale": "WorkState has facts from multiple situations but no single situation's checklist is fully satisfied. Current state is ambiguous.",
  "checklist_satisfaction": {
    "Current situation does not match any defined situation's checklist": true,
    "Multiple situations partially match but none fully match": true
  }
}
```

## Transitioning from Undetermined

### Natural Transitions

When `Undetermined` is selected, the following actions can help transition to a defined situation:

1. **Update WorkState**: Add more facts to clarify the current state
2. **Review Situation Definitions**: Check if any situation's checklist can be satisfied with current or additional facts
3. **Wait for Progress**: As work progresses, more facts become available and a situation may become clear
4. **Clarify Intent**: If ambiguity stems from unclear intent, work on clarifying the intent first

### Transition Rules

- `Undetermined` can transition to any other situation when facts become clear
- There are no restrictions on transitioning from `Undetermined`
- The transition should be based on WorkState facts matching a situation's checklist

## Examples

### Example 1: Starting New Work

- **WorkState**: Empty
- **Situation**: `Undetermined`
- **Rationale**: No facts available yet to determine situation
- **Next Steps**: Begin work, start recording facts in WorkState

### Example 2: Partial Progress

- **WorkState**: 
  - `DOC_INTENT_EXISTS: true`
  - `CLARITY_INTENT_CLEAR: false`
  - `DOC_PROBLEM_STATEMENT_EXISTS: true`
- **Situation**: `Undetermined`
- **Rationale**: Intent exists but unclear, problem statement exists - matches multiple situations partially but none fully
- **Next Steps**: Clarify intent or focus on problem selection

### Example 3: Transition State

- **WorkState**:
  - `IMPL_COMPLETE: true`
  - `VERIFY_PROCESS_STARTED: false`
- **Situation**: `Undetermined`
- **Rationale**: Implementation complete but verification not started - between Implementing and Verifying
- **Next Steps**: Start verification process or remain in previous situation

## Summary

`Undetermined` is:
- ✅ A valid, normal state
- ✅ A default state when no situation is selected
- ✅ An informative state indicating ambiguity
- ✅ A temporary state that can transition to defined situations
- ✅ Not a failure or error condition
- ✅ Actionable (suggests next steps)

`Undetermined` is not:
- ❌ A failure state
- ❌ A blocking condition
- ❌ An error that needs fixing
- ❌ A permanent state (though it can persist)
