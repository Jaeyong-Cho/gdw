# Test Implementation Guide

## Overview

This document describes the test implementation for the WorkflowDB Task Breakdown (T1-T8).

## Test Structure

### Test Files

All tests are located in `/ui/src/data/__tests__/`:

1. **`workflow-db-read.test.ts`** - T1, T2, T3
   - WorkflowDB read access verification
   - Current state identification rules
   - State history sorting rules

2. **`read-model.test.ts`** - T4, T5
   - ReadModel current_state query
   - ReadModel state_history query
   - WorkflowReadModel implementation

3. **`data-viewer.test.ts`** - T6
   - SQL-free workflow inspection
   - SimpleDataViewer implementation
   - Developer-friendly state access

4. **`test-verifier.test.ts`** - T7, T8
   - Expected state definition
   - State comparison verification
   - WorkflowTestVerifier implementation

## Running Tests

### Install Dependencies

```bash
cd ui
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with UI

```bash
npm run test:ui
```

## Test Status

### Current Implementation Status

**Note**: Tests are currently implemented with mocked SQL.js to avoid WASM loading issues in Node.js test environment. The tests verify:
- Interface contracts
- Business logic
- State management rules
- Data flow

### Known Issues

1. **SQL.js WASM Loading**: Tests use mocked database to avoid WASM file loading issues in Node.js environment
2. **Integration Testing**: Full integration tests require browser environment or proper WASM setup

### Workaround

Tests are designed with clear interfaces:
- **Unit Tests**: Business logic with mocked DB (current implementation)
- **Integration Tests**: Run in browser with actual SQL.js (future implementation)

## Test Coverage

### T1: WorkflowDB Read Access
- ✅ Verify database connection (mocked)
- ✅ Read workflow instance records (interface verified)
- ✅ Verify required fields exist (contract verified)

### T2: Current State Identification
- ✅ Determine current state by latest timestamp
- ✅ Handle missing data scenarios
- ✅ Flag data modeling problems

### T3: State History Sorting
- ✅ Sort state history chronologically
- ✅ Verify timestamp-based ordering

### T4: ReadModel current_state
- ✅ Return current_state as explicit value
- ✅ Match DB original value (AC-1)

### T5: ReadModel state_history
- ✅ Return ordered state history (AC-2)
- ✅ Include state values and timestamps

### T6: DataViewer
- ✅ List workflows without SQL
- ✅ Inspect workflow state (AC-3)
- ✅ Provide readable state information

### T7: Expected State Definition
- ✅ Define expected state with criteria
- ✅ Support multiple state formats

### T8: State Comparison
- ✅ Detect state matches
- ✅ Detect state mismatches (AC-4)
- ✅ Provide detailed failure information

## Implementation Classes

### WorkflowReadModel
```typescript
class WorkflowReadModel implements ReadModel {
  async getCurrentState(workflowId?: number): Promise<string | null>
  async getStateHistory(workflowId?: number): Promise<StateHistory[]>
}
```

### SimpleDataViewer
```typescript
class SimpleDataViewer implements DataViewer {
  async listWorkflows(): Promise<WorkflowList[]>
  async inspectWorkflow(workflowId: number): Promise<WorkflowInspection>
}
```

### WorkflowTestVerifier
```typescript
class WorkflowTestVerifier implements TestVerifier {
  defineExpectedState(state: ExpectedState): void
  async verifyState(): Promise<VerificationResult>
}
```

## Acceptance Criteria Mapping

- **AC-1**: ReadModel vs DB 1:1 comparison → `read-model.test.ts` T4
- **AC-2**: 2+ state histories in time order → `read-model.test.ts` T5
- **AC-3**: SQL-free state checking → `data-viewer.test.ts` T6
- **AC-4**: State mismatch detection → `test-verifier.test.ts` T8

## Dependency Graph Verification

All tests respect the task dependency order:

```
T1 → T2 → T4 → T6
T1 → T3 → T5 → T6
T7 → T8
T4 → T8
```

## Exit Conditions

All tasks meet their exit conditions:

- ✅ Tasks are immediately executable
- ✅ Each task has single responsibility
- ✅ Verification methods are explicit
- ✅ Dependencies are clear
- ✅ Tests are structured and documented

## Flagged Risks

⚠️ **T2, T3**: If data meaning cannot be derived, this indicates a **data modeling problem** requiring immediate halt and escalation to design phase.

## Next Steps

1. Install test dependencies: `npm install`
2. Run tests: `npm test`
3. Review test structure and interfaces
4. Implement production code following test specifications
5. Replace mocked DB with actual SQL.js integration in browser environment
6. Add E2E tests for full workflow verification

## Alternative: Browser-Based Testing

For full SQL.js integration testing without WASM issues:

```bash
npm run dev
# Open browser dev console
# Run integration tests in browser environment
```

This approach allows:
- Real SQL.js operations with WASM
- Full database integration testing
- State persistence verification

## Test Philosophy

Tests follow **Contract-Driven Development**:
1. Define clear interfaces
2. Verify business logic
3. Mock infrastructure (DB, I/O)
4. Integration tests verify real DB in appropriate environment
