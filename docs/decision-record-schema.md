# DecisionRecord Schema

This document defines the required conditions and schema for DecisionRecord, which documents why a situation was selected.

## Purpose

DecisionRecord serves to:
1. Make the reasoning behind situation selection explicit
2. Provide a reference for future decisions
3. Enable learning from past decisions
4. Ensure decisions are fact-based rather than arbitrary

## Required Conditions

### Condition 1: Fact-Based Rationale

- **Requirement**: Every DecisionRecord must reference at least one fact from WorkState.
- **Rationale**: Decisions must be grounded in observable facts, not assumptions or feelings.
- **Validation**: The record must contain references to WorkState fact IDs.

### Condition 2: Situation Explanation

- **Requirement**: The record must explain why the selected situation was chosen over alternatives.
- **Rationale**: Makes the decision process transparent and reviewable.
- **Validation**: The record must contain text explaining the selection.

### Condition 3: Checklist Alignment

- **Requirement**: The record must indicate which facts from the selected situation's checklist are satisfied.
- **Rationale**: Ensures the selection is based on the defined criteria.
- **Validation**: The record must reference checklist items or indicate which required facts are true.

### Condition 4: Timestamp Requirement

- **Requirement**: Every DecisionRecord must have a timestamp indicating when the decision was made.
- **Rationale**: Enables tracking of decision history and context.
- **Validation**: The record must contain a valid timestamp.

### Condition 5: WorkState Snapshot

- **Requirement**: The record must include or reference the WorkState snapshot at the time of decision.
- **Rationale**: Preserves the context in which the decision was made, even if WorkState changes later.
- **Validation**: The record must contain WorkState data or a reference to it.

## Schema Definition

### Minimal Schema

```json
{
  "decision_id": "unique_identifier",
  "selected_situation": "SituationName",
  "decision_timestamp": "ISO8601_timestamp",
  "workstate_snapshot": {
    /* WorkState at time of decision */
  },
  "referenced_facts": [
    "FACT_ID_1",
    "FACT_ID_2",
    ...
  ],
  "rationale": "Text explanation of why this situation was selected",
  "checklist_satisfaction": {
    "required_fact_1": true,
    "required_fact_2": false,
    ...
  }
}
```

### Extended Schema (Optional)

```json
{
  "decision_id": "unique_identifier",
  "selected_situation": "SituationName",
  "decision_timestamp": "ISO8601_timestamp",
  "workstate_snapshot": {
    /* WorkState at time of decision */
  },
  "referenced_facts": [
    "FACT_ID_1",
    "FACT_ID_2",
    ...
  ],
  "rationale": "Text explanation of why this situation was selected",
  "checklist_satisfaction": {
    "required_fact_1": true,
    "required_fact_2": false,
    ...
  },
  "alternatives_considered": [
    {
      "situation": "AlternativeSituationName",
      "reason_rejected": "Why this was not selected"
    }
  ],
  "uncertainties": [
    "What is unclear or uncertain about this decision"
  ],
  "confidence_level": "high" | "medium" | "low"
}
```

## Field Definitions

### decision_id

- **Type**: String
- **Format**: Unique identifier (UUID recommended)
- **Required**: Yes
- **Purpose**: Uniquely identifies this decision record

### selected_situation

- **Type**: String
- **Format**: Situation name from `situations.md` or `"Undetermined"`
- **Required**: Yes
- **Purpose**: The situation that was selected

### decision_timestamp

- **Type**: String
- **Format**: ISO8601 timestamp
- **Required**: Yes
- **Purpose**: When the decision was made

### workstate_snapshot

- **Type**: Object
- **Format**: Complete WorkState structure (see `workstate-format.md`)
- **Required**: Yes
- **Purpose**: Preserves the WorkState context at decision time

### referenced_facts

- **Type**: Array of Strings
- **Format**: Array of fact IDs from `workstate-schema.md`
- **Required**: Yes (must have at least one)
- **Purpose**: Which WorkState facts were used in making this decision

### rationale

- **Type**: String
- **Format**: Free-form text
- **Required**: Yes
- **Purpose**: Human-readable explanation of the decision
- **Minimum Length**: One sentence explaining why this situation was selected

### checklist_satisfaction

- **Type**: Object
- **Format**: Map of checklist item descriptions to boolean values
- **Required**: Yes
- **Purpose**: Indicates which required facts from the situation's checklist are satisfied
- **Note**: This can reference the checklist items from `situation-checklist.md`

### alternatives_considered (Optional)

- **Type**: Array of Objects
- **Format**: Array of alternative situation considerations
- **Required**: No
- **Purpose**: Documents other situations that were considered but not selected

### uncertainties (Optional)

- **Type**: Array of Strings
- **Format**: Array of uncertainty descriptions
- **Required**: No
- **Purpose**: Documents what is unclear or uncertain about the decision

### confidence_level (Optional)

- **Type**: String
- **Format**: One of "high", "medium", "low"
- **Required**: No
- **Purpose**: Indicates confidence in the decision

## Validation Rules

### Rule 1: All Required Fields Present

A valid DecisionRecord must contain all required fields from the minimal schema.

### Rule 2: Referenced Facts Exist

All fact IDs in `referenced_facts` must exist in `workstate-schema.md`.

### Rule 3: Selected Situation Valid

The `selected_situation` must be a valid situation name from `situations.md` or `"Undetermined"`.

### Rule 4: Rationale Not Empty

The `rationale` field must contain at least one sentence explaining the decision.

### Rule 5: Checklist Alignment

The `checklist_satisfaction` object should reference facts from the selected situation's checklist in `situation-checklist.md`. However, it is acceptable if not all checklist items are included, as long as the rationale explains the selection.

## Example DecisionRecord

```json
{
  "decision_id": "dec-2026-01-28-001",
  "selected_situation": "ProblemSelected",
  "decision_timestamp": "2026-01-28T10:30:00Z",
  "workstate_snapshot": {
    "workstate": {
      "DOC_INTENT_EXISTS": true,
      "CLARITY_INTENT_CLEAR": true,
      "DOC_PROBLEM_STATEMENT_EXISTS": true,
      "SCOPE_PROBLEM_BOUNDARIES_DEFINED": true,
      "ACTION_PROBLEM_ACTIONABLE": true
    },
    "metadata": {
      "created_at": "2026-01-28T10:00:00Z",
      "updated_at": "2026-01-28T10:25:00Z",
      "version": "1.0"
    }
  },
  "referenced_facts": [
    "DOC_PROBLEM_STATEMENT_EXISTS",
    "SCOPE_PROBLEM_BOUNDARIES_DEFINED",
    "ACTION_PROBLEM_ACTIONABLE",
    "SCOPE_PROBLEM_DISTINCT_FROM_INTENT"
  ],
  "rationale": "I have a written problem statement that is distinct from the general intent, has clear boundaries, and is actionable. All required facts for ProblemSelected are satisfied.",
  "checklist_satisfaction": {
    "A specific problem statement exists in written form": true,
    "The problem is distinct from the general intent": true,
    "The problem has clear boundaries": true,
    "The problem is actionable": true
  }
}
```

## When DecisionRecord is Required

### Required Cases

- When a situation is explicitly selected (not `Undetermined`)
- When transitioning from one situation to another
- When overriding a system suggestion (if suggestions are implemented)

### Optional Cases

- When selecting `Undetermined` (may be helpful but not required)
- When no situation was previously selected (first selection)

### Not Required Cases

- When WorkState is updated but situation remains unchanged
- When reviewing past decisions (read-only operations)

## Relationship to SituationSelection

DecisionRecord is created whenever a SituationSelection is made. The relationship is:

```
SituationSelection → DecisionRecord
```

One SituationSelection can have multiple DecisionRecords over time (if the situation is reselected or the rationale is updated), but typically there is one DecisionRecord per selection event.
