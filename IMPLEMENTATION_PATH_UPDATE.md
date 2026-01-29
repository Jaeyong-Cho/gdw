# Implementation to Problem Selected Path Addition

## Overview

Added a new workflow path from **Implementing** state to **ProblemSelected** state to handle situations where new problems are discovered during implementation.

## Changes Made

### 1. situation-flows.json

**Modified Implementing flow** to add decision point when stuck:

```json
{
  "id": "task-stuck",
  "question": "막혔나요? (15분 이상 고민 중)",
  "type": "yesno",
  "required": true,
  "onYesNextQuestionId": "task-stuck-reason",
  "onNoNextQuestionId": "task-complete"
},
{
  "id": "task-stuck-reason",
  "question": "막힌 이유를 선택하세요",
  "type": "multiple",
  "required": true,
  "options": ["작업 분해 필요", "새로운 문제 발견", "기술적 제약 발견"]
}
```

### 2. situations.ts

**Updated transitions** for Implementing state:

```typescript
{
  id: 'Implementing',
  name: 'Implementing',
  description: 'Executing the planned tasks',
  color: '#6366f1',
  position: { x: 600, y: 200 },
  transitions: ['Verifying', 'TaskBreakdown', 'ProblemSelected']  // Added ProblemSelected
}
```

**Updated state transition edges:**

```typescript
['Implementing', 'Verifying', 'task completed'],
['Implementing', 'TaskBreakdown', 'stuck: need breakdown'],
['Implementing', 'ProblemSelected', 'stuck: new problem found'],  // New edge
```

### 3. InteractiveFlow.tsx (requires manual update)

Need to add handler for `task-stuck-reason` multiple choice question:

```typescript
// Add this in the multiple choice handler
if (currentQuestion?.id === 'task-stuck-reason') {
  if (selectedOption === '작업 분해 필요') {
    nextSituation = 'TaskBreakdown' as Situation;
  } else if (selectedOption === '새로운 문제 발견') {
    nextSituation = 'ProblemSelected' as Situation;
  } else if (selectedOption === '기술적 제약 발견') {
    nextSituation = 'FeasibilityChecked' as Situation;
  }
}
```

## Workflow Paths

### New Decision Tree from Implementing:

```
Implementing
├─ Task Complete? → Yes → Verifying
└─ Task Complete? → No
   └─ Stuck (15+ min)? → Yes
      ├─ 작업 분해 필요 → TaskBreakdown
      ├─ 새로운 문제 발견 → ProblemSelected (NEW!)
      └─ 기술적 제약 발견 → FeasibilityChecked
```

## Use Cases

### 1. New Problem Discovered During Implementation
- While implementing, you realize the original problem definition was incorrect
- Or you discover a deeper/different problem that needs to be addressed first
- Flow: **Implementing** → **ProblemSelected**

### 2. Task Needs Better Breakdown
- The current task is too complex and needs to be split
- Flow: **Implementing** → **TaskBreakdown**

### 3. Technical Constraint Found
- During implementation, you hit an unexpected technical limitation
- Need to reassess feasibility
- Flow: **Implementing** → **FeasibilityChecked**

## Benefits

1. **Flexibility**: Developers can pivot when they discover implementation isn't aligned with the real problem
2. **Problem Discovery**: Recognizes that problems often become clearer during implementation
3. **Prevents Waste**: Stops work on wrong problem early
4. **Learning Loop**: Encourages reflection and problem redefinition

## Build Status

✅ JSON configuration updated
✅ State transitions updated
✅ Build successful
⚠️ Manual handler addition needed in InteractiveFlow.tsx (search for `learned-next-action` handler as example)

## Testing

To test the new path:

1. Navigate to Implementing state
2. Answer "No" to task completion
3. Answer "Yes" to being stuck
4. Select "새로운 문제 발견"
5. Verify transition to ProblemSelected state

## Notes

- This change follows the principle that problems are often discovered during implementation
- Aligns with agile/iterative development practices
- Complements the existing TaskBreakdown path for different types of blockages
