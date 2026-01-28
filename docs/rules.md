# SituationSelection Rules

This document defines the rules for selecting and managing the current development situation.

## Core Rules

### Rule 1: Single Selection Only

- **Statement**: At any given time, at most one situation can be selected.
- **Implication**: Selecting a new situation automatically deselects any previously selected situation.
- **Exception**: `Undetermined` is considered a valid selection and follows the same single-selection rule.

### Rule 2: Selection is Optional

- **Statement**: Not selecting any situation is allowed and is equivalent to selecting `Undetermined`.
- **Implication**: The system must support the state where no explicit situation is selected.
- **Behavior**: When no situation is selected, the system treats it as `Undetermined`.

### Rule 3: No Automatic Changes

- **Statement**: The selected situation never changes automatically based on WorkState changes.
- **Implication**: 
  - When WorkState facts change, the selected situation remains unchanged unless explicitly changed by the user.
  - The system may warn or suggest that the current selection may no longer be appropriate, but it must not change the selection automatically.
- **Rationale**: The user is the sole decision-maker for situation selection.

### Rule 4: Manual Selection Required

- **Statement**: Situation selection must be an explicit, manual action by the user.
- **Implication**: 
  - No automatic matching or suggestion algorithms are allowed.
  - The system may present information (WorkState facts, situation checklists) to aid decision-making, but the final selection is always manual.
- **Rationale**: Ensures the user actively considers their current situation.

### Rule 5: Selection is Reversible

- **Statement**: A selected situation can be deselected or changed at any time.
- **Implication**: 
  - There are no restrictions on when a situation can be changed.
  - Previous selections do not constrain future selections.
- **Rationale**: Allows flexibility as work progresses.

## Selection Process

### Step 1: Review WorkState

Before selecting a situation, the user should review the current WorkState to understand what facts are known.

### Step 2: Review Situation Checklists

The user should review the checklists in `situation-checklist.md` to understand what facts are required for each situation.

### Step 3: Compare WorkState to Checklists

The user compares their WorkState facts against each situation's required facts checklist. This comparison is manual - the system does not perform automatic matching.

### Step 4: Make Selection

Based on the comparison, the user selects:
- A situation if their WorkState matches that situation's checklist
- `Undetermined` if no situation matches or if the situation is ambiguous

### Step 5: Record Decision (if DecisionRecord is required)

If a situation is selected (including `Undetermined`), the user may be required to record the rationale in a DecisionRecord (see `decision-record-schema.md`).

## Edge Cases

### Case 1: Multiple Situations Partially Match

- **Scenario**: WorkState facts partially satisfy multiple situations' checklists, but no situation is fully satisfied.
- **Rule**: Select `Undetermined`.
- **Rationale**: If no situation fully matches, the current state is ambiguous.

### Case 2: All Facts Unknown

- **Scenario**: WorkState is empty or contains very few facts.
- **Rule**: Select `Undetermined`.
- **Rationale**: Without sufficient information, situation cannot be determined.

### Case 3: Situation Selected but Facts Change

- **Scenario**: A situation is selected, then WorkState facts change such that the selected situation's checklist is no longer satisfied.
- **Rule**: The selected situation remains unchanged (Rule 3). The user may choose to update the selection, but it is not required.
- **Rationale**: The user may be in transition or may have additional context not captured in WorkState.

### Case 4: Situation Selected but Checklist Not Fully Satisfied

- **Scenario**: User selects a situation even though not all required facts in the checklist are true.
- **Rule**: This is allowed. The system may warn, but selection is valid.
- **Rationale**: The user may have knowledge or context not captured in WorkState facts.

## Validation

### Selection Validation

A valid situation selection must:
- Reference a situation that exists in `situations.md`
- Be a single selection (or `Undetermined`)
- Be explicitly made by the user (not automatic)

### Consistency Validation (Informational Only)

The system may provide informational feedback about:
- Whether the selected situation's checklist is satisfied by current WorkState
- Whether other situations might be more appropriate based on WorkState
- Whether WorkState facts have changed since the last selection

This feedback is informational only and does not prevent or force any selection.

## Implementation Notes

### Data Structure

SituationSelection can be represented as:

```json
{
  "selected_situation": "SituationName" | "Undetermined" | null,
  "selected_at": "ISO8601_timestamp",
  "workstate_snapshot": { /* WorkState at time of selection */ }
}
```

Where:
- `selected_situation` is the name of the situation from `situations.md`, `"Undetermined"`, or `null` (equivalent to `Undetermined`)
- `selected_at` is when the selection was made
- `workstate_snapshot` is a copy of WorkState at the time of selection (for reference)

### State Transitions

```
[No Selection] → [Situation Selected]
[No Selection] → [Undetermined Selected]
[Situation Selected] → [Different Situation Selected]
[Situation Selected] → [Undetermined Selected]
[Situation Selected] → [No Selection]
[Undetermined Selected] → [Situation Selected]
[Undetermined Selected] → [No Selection]
```

All transitions are user-initiated. No automatic transitions occur.
