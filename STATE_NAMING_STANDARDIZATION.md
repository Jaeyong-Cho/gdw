# State Naming Standardization

## Overview

All state names have been standardized to use verb forms (gerund/present participle) for consistency. This aligns with the existing `Implementing` and `Verifying` states and creates a uniform naming convention throughout the workflow.

## Mapping: Old → New

| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `IntentDefined` | `DefiningIntent` | Verb form: actively defining intent |
| `IntentDefinedFail` | `FailingToDefineIntent` | Verb form: failing to define intent |
| `ProblemSelected` | `SelectingProblem` | Verb form: actively selecting problem |
| `AcceptanceDefined` | `DefiningAcceptance` | Verb form: actively defining acceptance criteria |
| `FeasibilityChecked` | `CheckingFeasibility` | Verb form: actively checking feasibility |
| `DesignReady` | `PreparingDesign` | Verb form: actively preparing design |
| `TaskBreakdown` | `BreakingDownTasks` | Verb form: actively breaking down tasks |
| `Implementing` | `Implementing` | No change (already verb form) |
| `Verifying` | `Verifying` | No change (already verb form) |
| `Verified` | `CompletingVerification` | Verb form: completing verification process |
| `Released` | `Releasing` | Verb form: actively releasing |
| `FeedbackCollected` | `CollectingFeedback` | Verb form: actively collecting feedback |
| `Learned` | `Learning` | Verb form: actively learning |

## Updated Files

### Core Type Definitions
- ✅ `ui/src/types.ts` - Situation type definition
- ✅ `ui/public/data/situation-flows.json` - All situation references
- ✅ `ui/src/data/situations.ts` - Situation definitions, node positions, transitions

### Guides and Documentation
- ✅ `ui/src/data/situation-guides.ts` - Situation guide keys and text references
- ✅ `ui/public/data/situation-guides.json` - Situation guide JSON

### Components
- ✅ `ui/src/components/InteractiveFlow.tsx` - Situation handling logic
- ✅ `ui/src/components/App.tsx` - Initial state
- ✅ `ui/src/components/WorkflowDataViewer.tsx` - Color mapping
- ✅ `ui/src/components/CytoscapeDiagram.tsx` - Layout roots and ordering

### Data Layer
- ✅ `ui/src/data/db.ts` - Database queries and situation checks
- ✅ `ui/src/data/relationships.ts` - Relationship building
- ✅ `ui/src/data/read-model.ts` - Read model situation list
- ✅ `ui/src/data/situation-flows.ts` - Flow definitions
- ✅ `ui/src/utils/prompt-generator.ts` - Prompt context building

### Test Files (Pending)
- ⚠️ `ui/src/data/__tests__/read-model.test.ts`
- ⚠️ `ui/src/data/__tests__/data-viewer.test.ts`
- ⚠️ `ui/src/data/__tests__/test-verifier.test.ts`
- ⚠️ `ui/src/data/__tests__/workflow-db-read.test.ts`

## Benefits

1. **Consistency**: All states now follow the same verb-based naming pattern
2. **Clarity**: Verb forms better convey the active nature of each workflow stage
3. **Readability**: Easier to understand what action is being performed
4. **Maintainability**: Uniform naming makes the codebase easier to navigate

## Database Migration Note

⚠️ **Important**: Existing databases may contain old state names. Consider:
- Adding a migration script to update existing data
- Or maintaining backward compatibility for reading old data
- New data will use the new verb-based names

## Testing

After this change:
1. Verify all workflow transitions work correctly
2. Check that existing database entries are handled properly
3. Ensure UI displays correctly with new state names
4. Update any external documentation or integrations
