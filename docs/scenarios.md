# Usage Scenarios

This document provides example scenarios demonstrating the complete workflow from WorkState recording through situation selection to decision recording.

## Scenario 1: Starting a New Feature Development

### Initial State

- **WorkState**: Empty
- **SituationSelection**: None (defaults to `Undetermined`)

### Step 1: Define Intent

**Action**: Developer writes down the development intent.

**WorkState Update**:
```json
{
  "workstate": {
    "DOC_INTENT_EXISTS": true,
    "CLARITY_INTENT_CLEAR": true,
    "REVIEW_INTENT_CONFIRMED": true,
    "SCOPE_INTENT_BOUNDED": true
  },
  "metadata": {
    "created_at": "2026-01-28T09:00:00Z",
    "updated_at": "2026-01-28T09:15:00Z",
    "version": "1.0"
  }
}
```

**Situation Selection**: 
- Review `situation-checklist.md` for IntentDefined guidance
- Check "다음 단계 조건" (conditions to proceed):
  - ✅ A written document or note exists describing the development intent
  - ✅ The intent statement is clear and unambiguous
  - ✅ The intent has been reviewed and confirmed
  - ✅ The scope of the intent is bounded
- **Selection**: `IntentDefined`

**DecisionRecord**:
```json
{
  "decision_id": "dec-2026-01-28-001",
  "selected_situation": "IntentDefined",
  "decision_timestamp": "2026-01-28T09:20:00Z",
  "workstate_snapshot": {
    "workstate": {
      "DOC_INTENT_EXISTS": true,
      "CLARITY_INTENT_CLEAR": true,
      "REVIEW_INTENT_CONFIRMED": true,
      "SCOPE_INTENT_BOUNDED": true
    },
    "metadata": {
      "created_at": "2026-01-28T09:00:00Z",
      "updated_at": "2026-01-28T09:15:00Z",
      "version": "1.0"
    }
  },
  "referenced_facts": [
    "DOC_INTENT_EXISTS",
    "CLARITY_INTENT_CLEAR",
    "REVIEW_INTENT_CONFIRMED",
    "SCOPE_INTENT_BOUNDED"
  ],
  "rationale": "All required facts for IntentDefined are satisfied. I have a clear, reviewed, and bounded intent documented.",
  "checklist_satisfaction": {
    "A written document or note exists describing the development intent": true,
    "The intent statement is clear and unambiguous": true,
    "The intent has been reviewed and confirmed": true,
    "The scope of the intent is bounded": true
  }
}
```

### Step 2: Select Problem

**Action**: Developer identifies a specific problem to solve.

**WorkState Update**:
```json
{
  "workstate": {
    "DOC_INTENT_EXISTS": true,
    "CLARITY_INTENT_CLEAR": true,
    "REVIEW_INTENT_CONFIRMED": true,
    "SCOPE_INTENT_BOUNDED": true,
    "DOC_PROBLEM_STATEMENT_EXISTS": true,
    "SCOPE_PROBLEM_DISTINCT_FROM_INTENT": true,
    "CLARITY_PROBLEM_BOUNDARIES_DEFINED": true,
    "ACTION_PROBLEM_ACTIONABLE": true
  },
  "metadata": {
    "created_at": "2026-01-28T09:00:00Z",
    "updated_at": "2026-01-28T09:45:00Z",
    "version": "1.0"
  }
}
```

**Situation Selection**:
- Previous selection: `IntentDefined`
- Review `situation-checklist.md` for ProblemSelected guidance
- Check "다음 단계 조건" (conditions to proceed):
  - ✅ A specific problem statement exists in written form
  - ✅ The problem is distinct from the general intent
  - ✅ The problem has clear boundaries
  - ✅ The problem is actionable
- **Selection**: `ProblemSelected` (explicitly change from `IntentDefined`)

**DecisionRecord**:
```json
{
  "decision_id": "dec-2026-01-28-002",
  "selected_situation": "ProblemSelected",
  "decision_timestamp": "2026-01-28T09:50:00Z",
  "workstate_snapshot": {
    "workstate": {
      "DOC_PROBLEM_STATEMENT_EXISTS": true,
      "SCOPE_PROBLEM_DISTINCT_FROM_INTENT": true,
      "CLARITY_PROBLEM_BOUNDARIES_DEFINED": true,
      "ACTION_PROBLEM_ACTIONABLE": true
    },
    "metadata": {
      "created_at": "2026-01-28T09:00:00Z",
      "updated_at": "2026-01-28T09:45:00Z",
      "version": "1.0"
    }
  },
  "referenced_facts": [
    "DOC_PROBLEM_STATEMENT_EXISTS",
    "SCOPE_PROBLEM_DISTINCT_FROM_INTENT",
    "CLARITY_PROBLEM_BOUNDARIES_DEFINED",
    "ACTION_PROBLEM_ACTIONABLE"
  ],
  "rationale": "I have a written problem statement that is distinct from intent, has clear boundaries, and is actionable. Moving from IntentDefined to ProblemSelected.",
  "checklist_satisfaction": {
    "A specific problem statement exists in written form": true,
    "The problem is distinct from the general intent": true,
    "The problem has clear boundaries": true,
    "The problem is actionable": true
  }
}
```

### Step 3: Define Acceptance Criteria

**Action**: Developer writes acceptance criteria.

**WorkState Update**:
```json
{
  "workstate": {
    "DOC_INTENT_EXISTS": true,
    "CLARITY_INTENT_CLEAR": true,
    "REVIEW_INTENT_CONFIRMED": true,
    "SCOPE_INTENT_BOUNDED": true,
    "DOC_PROBLEM_STATEMENT_EXISTS": true,
    "SCOPE_PROBLEM_DISTINCT_FROM_INTENT": true,
    "CLARITY_PROBLEM_BOUNDARIES_DEFINED": true,
    "ACTION_PROBLEM_ACTIONABLE": true,
    "DOC_ACCEPTANCE_CRITERIA_EXIST": true,
    "CLARITY_CRITERIA_MEASURABLE": true,
    "LINK_CRITERIA_TO_PROBLEM": true,
    "COMPLETE_CRITERIA_DEFINE_DONE": true
  },
  "metadata": {
    "created_at": "2026-01-28T09:00:00Z",
    "updated_at": "2026-01-28T10:15:00Z",
    "version": "1.0"
  }
}
```

**Situation Selection**:
- Previous selection: `ProblemSelected`
- Review `situation-checklist.md` for AcceptanceDefined guidance
- Check "다음 단계 조건" (conditions to proceed):
  - ✅ Acceptance criteria exist in written form
  - ✅ Each criterion is measurable
  - ✅ Acceptance criteria are linked to a specific problem
  - ✅ The criteria define "done" for the problem
- **Selection**: `AcceptanceDefined`

**DecisionRecord**: (Similar structure, documenting transition to AcceptanceDefined)

## Scenario 2: Ambiguous State (Undetermined)

### State

**WorkState**:
```json
{
  "workstate": {
    "DOC_INTENT_EXISTS": true,
    "CLARITY_INTENT_CLEAR": false,
    "DOC_PROBLEM_STATEMENT_EXISTS": true,
    "CLARITY_PROBLEM_BOUNDARIES_DEFINED": false
  },
  "metadata": {
    "created_at": "2026-01-28T11:00:00Z",
    "updated_at": "2026-01-28T11:30:00Z",
    "version": "1.0"
  }
}
```

### Situation Selection Process

1. **Review IntentDefined guidance** (from `situation-checklist.md`):
   - ✅ A written document exists
   - ❌ The intent statement is clear (false - `CLARITY_INTENT_CLEAR: false`)
   - ❌ The intent has been reviewed and confirmed (unknown)
   - ❌ The scope is bounded (unknown)
   - **Result**: Not fully satisfied

2. **Review ProblemSelected guidance** (from `situation-checklist.md`):
   - ✅ A specific problem statement exists
   - ✅ The problem is distinct from intent (unknown, but likely)
   - ❌ The problem has clear boundaries (false - `CLARITY_PROBLEM_BOUNDARIES_DEFINED: false`)
   - ❌ The problem is actionable (unknown)
   - **Result**: Not fully satisfied

3. **Review other situations**: None match

4. **Decision**: Select `Undetermined`

**DecisionRecord**:
```json
{
  "decision_id": "dec-2026-01-28-003",
  "selected_situation": "Undetermined",
  "decision_timestamp": "2026-01-28T11:35:00Z",
  "workstate_snapshot": {
    "workstate": {
      "DOC_INTENT_EXISTS": true,
      "CLARITY_INTENT_CLEAR": false,
      "DOC_PROBLEM_STATEMENT_EXISTS": true,
      "CLARITY_PROBLEM_BOUNDARIES_DEFINED": false
    },
    "metadata": {
      "created_at": "2026-01-28T11:00:00Z",
      "updated_at": "2026-01-28T11:30:00Z",
      "version": "1.0"
    }
  },
  "referenced_facts": [
    "DOC_INTENT_EXISTS",
    "CLARITY_INTENT_CLEAR",
    "DOC_PROBLEM_STATEMENT_EXISTS",
    "CLARITY_PROBLEM_BOUNDARIES_DEFINED"
  ],
  "rationale": "WorkState has facts from both IntentDefined and ProblemSelected, but neither situation's checklist is fully satisfied. Intent is unclear and problem boundaries are not defined. Current state is ambiguous.",
  "checklist_satisfaction": {
    "Current situation does not match any defined situation's checklist": true,
    "Multiple situations partially match but none fully match": true,
    "Required information to determine situation is missing": true,
    "Situation is ambiguous or unclear": true
  },
  "alternatives_considered": [
    {
      "situation": "IntentDefined",
      "reason_rejected": "Intent is not clear (CLARITY_INTENT_CLEAR: false)"
    },
    {
      "situation": "ProblemSelected",
      "reason_rejected": "Problem boundaries not defined (CLARITY_PROBLEM_BOUNDARIES_DEFINED: false)"
    }
  ]
}
```

## Scenario 3: WorkState Changes but Situation Unchanged

### Initial State

- **WorkState**: Has facts for `Implementing`
- **SituationSelection**: `Implementing`
- **DecisionRecord**: Exists

### WorkState Update

**Action**: Developer continues implementing, updates WorkState with progress.

**WorkState Update**:
```json
{
  "workstate": {
    "ACTION_TASK_SELECTED": true,
    "IMPL_STARTED": true,
    "IMPL_TASK_INCOMPLETE": true,
    "VERIFY_NOT_PERFORMED": true,
    "IMPL_COMPLETE": false  // New fact added
  },
  "metadata": {
    "created_at": "2026-01-28T12:00:00Z",
    "updated_at": "2026-01-28T12:45:00Z",  // Updated
    "version": "1.0"
  }
}
```

**Situation Selection**:
- Previous selection: `Implementing`
- Review `situation-checklist.md` for Implementing guidance
- Check "다음 단계 조건" (conditions to proceed):
  - ✅ A specific task has been selected
  - ✅ Implementation has started
  - ✅ The task is not yet complete (`IMPL_COMPLETE: false` confirms `IMPL_TASK_INCOMPLETE: true`)
  - ✅ No verification has been performed yet
- **Selection**: `Implementing` (unchanged - no need to change selection)

**DecisionRecord**: 
- No new DecisionRecord required (situation unchanged)
- Optionally, can record progress note, but not required

## Scenario 4: Complete Workflow - From Intent to Release

### Summary Flow

1. **Start**: Empty WorkState → `Undetermined`
2. **IntentDefined**: Document intent → Select `IntentDefined`
3. **ProblemSelected**: Define problem → Select `ProblemSelected`
4. **AcceptanceDefined**: Write criteria → Select `AcceptanceDefined`
5. **FeasibilityChecked**: Assess feasibility → Select `FeasibilityChecked`
6. **DesignReady**: Create design → Select `DesignReady`
7. **TaskBreakdown**: Break down tasks → Select `TaskBreakdown`
8. **Implementing**: Start coding → Select `Implementing`
9. **Verifying**: Test implementation → Select `Verifying`
10. **Verified**: All tests pass → Select `Verified`
11. **Released**: Deploy/merge → Select `Released`
12. **FeedbackCollected**: Gather feedback → Select `FeedbackCollected`
13. **Learned**: Analyze and learn → Select `Learned`

### Key Points

- Each transition requires:
  1. WorkState update with new facts
  2. Manual situation selection based on checklist comparison
  3. DecisionRecord creation (when situation changes)
- WorkState can be updated without changing situation
- Situation selection is always manual and explicit
- All rules from `rules.md` are followed throughout

## Validation

All scenarios above satisfy:

✅ **Rule 1**: Single selection only  
✅ **Rule 2**: Selection is optional (Undetermined is default)  
✅ **Rule 3**: No automatic changes  
✅ **Rule 4**: Manual selection required  
✅ **Rule 5**: Selection is reversible  

✅ **DecisionRecord Conditions**: All required conditions met  
✅ **WorkState Format**: Valid format used  
✅ **Situation Validity**: All situations from `situations.md`  
✅ **Fact Validity**: All facts from `workstate-schema.md`  

## Conclusion

These scenarios demonstrate that the complete workflow is:
- **Deterministic**: Same WorkState + same selection = same result
- **Traceable**: Every decision is documented
- **Flexible**: Can handle ambiguous states
- **Non-blocking**: Work can continue even when situation is unclear
- **User-controlled**: All decisions are manual and explicit
