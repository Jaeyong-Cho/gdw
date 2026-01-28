# 데이터 관계 연결 시스템

## 개요

데이터 간의 관계를 추적하여 AI prompt 생성 시 연관된 모든 정보를 자동으로 포함합니다.

## 관계 구조

```
Intent (최상위)
  ├─ Problem 1
  │   ├─ Design
  │   ├─ Acceptance Criteria
  │   ├─ Implementation
  │   ├─ Verification
  │   ├─ Release
  │   ├─ Feedback
  │   └─ Improvements
  │
  ├─ Problem 2
  │   ├─ Design
  │   └─ ...
  │
  └─ Problem 3
      └─ ...
```

## 데이터베이스 스키마

### question_answers 테이블

```sql
CREATE TABLE question_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  answered_at TEXT NOT NULL,
  situation TEXT,
  
  -- 관계 컬럼
  intent_id INTEGER,      -- 최상위 Intent 참조
  problem_id INTEGER,     -- 관련 Problem 참조
  parent_id INTEGER,      -- 직접적인 부모 참조
  
  FOREIGN KEY (intent_id) REFERENCES question_answers(id),
  FOREIGN KEY (problem_id) REFERENCES question_answers(id),
  FOREIGN KEY (parent_id) REFERENCES question_answers(id)
)
```

## 자동 연결 규칙

### 1. Intent 정의 시
- `intent_id = NULL` (자신이 루트)
- `problem_id = NULL`
- 이후 모든 작업이 이 Intent에 연결됨

### 2. Problem 선택 시
- `intent_id = [현재 활성 Intent ID]`
- `problem_id = NULL` (자신이 Problem)
- 이후 이 Problem과 관련된 모든 작업이 연결됨

### 3. 기타 모든 단계
- `intent_id = [현재 활성 Intent ID]`
- `problem_id = [현재 활성 Problem ID]`
- 자동으로 Intent와 Problem에 연결됨

## API 함수

### 관계 조회

```typescript
// 현재 활성 Intent ID 가져오기
const intentId = await getCurrentIntentId();

// 현재 활성 Problem ID 가져오기
const problemId = await getCurrentProblemId();

// Intent와 관련된 모든 답변 조회
const intentAnswers = await getAnswersByIntent(intentId);

// Problem과 관련된 모든 답변 조회
const problemAnswers = await getAnswersByProblem(problemId);
```

### 컨텍스트 생성

```typescript
import { buildRelatedContext, formatRelatedContextForPrompt } from './data/relationships';

// 관련된 모든 데이터 가져오기
const context = await buildRelatedContext('ProblemSelected');

// 결과:
// {
//   intent: "사용자 인증 시스템 구축",
//   problems: ["로그인 속도 개선", "비밀번호 보안 강화"],
//   design: ["JWT 토큰 사용", "Redis 캐시 적용"],
//   acceptance: ["로그인 응답시간 < 500ms"],
//   feedback: ["비밀번호 찾기 기능 추가 필요"],
//   improvements: ["2FA 구현 검토"]
// }

// AI prompt용 포맷팅
const formattedContext = formatRelatedContextForPrompt(context);
```

### 답변 저장 (자동 연결)

```typescript
// 기본 사용 (자동 연결)
await saveAnswer(
  'problem-boundaries-text',
  'ProblemSelected',
  '사용자가 1초 이내에 로그인할 수 있어야 함',
  new Date().toISOString()
);
// → 자동으로 현재 Intent와 연결됨

// 수동 연결 (옵션)
await saveAnswer(
  'design-text',
  'DesignReady',
  'JWT 토큰 방식 사용',
  new Date().toISOString(),
  {
    intentId: 123,    // 특정 Intent 지정
    problemId: 456,   // 특정 Problem 지정
    parentId: null
  }
);
```

## AI Prompt 생성 활용

### 자동 컨텍스트 포함

```typescript
import { buildPromptContext } from './utils/prompt-generator';

const context = await buildPromptContext('DesignReady');

// context에는 자동으로 포함:
// - intent: 현재 Intent
// - relatedProblems: 관련된 모든 Problem들
// - design: 이전 Design 결정들
// - acceptance: Acceptance Criteria들
// - feedback: 관련 Feedback들
// - improvements: 개선사항들
// - relatedContext: 포맷팅된 전체 컨텍스트
```

### Prompt Template 예시

```typescript
const template = `
# Design Support

## Current Intent
{{intent}}

## Related Problems
{{relatedProblems}}

## Previous Designs
{{design}}

## Acceptance Criteria
{{acceptanceCriteria}}

## Recent Feedback
{{feedback}}

## Improvements to Consider
{{improvements}}

---

Based on the above context, please help with the design.
`;

const prompt = generatePrompt(template, context);
```

## 관계 요약 조회

```typescript
import { getRelationshipSummary } from './data/relationships';

const summary = await getRelationshipSummary();

// 결과:
// {
//   hasIntent: true,
//   hasProblem: true,
//   intentId: 123,
//   problemId: 456,
//   relatedCount: 15  // 연결된 답변 총 개수
// }
```

## 사용 예시

### 1. Intent 정의
```typescript
// IntentDefined 단계에서 Intent 정의
const intentId = await saveAnswer(
  'intent-summarized-text',
  'IntentDefined',
  '사용자 인증 시스템 개선',
  new Date().toISOString()
);
// → intentId가 123이라고 가정
```

### 2. Problem 선택
```typescript
// ProblemSelected 단계에서 Problem 정의
const problemId = await saveAnswer(
  'problem-boundaries-text',
  'ProblemSelected',
  '로그인 속도가 느림 (현재 3초 → 목표 500ms)',
  new Date().toISOString()
);
// → 자동으로 intent_id = 123으로 연결됨
// → problemId가 456이라고 가정
```

### 3. Design 작성
```typescript
// DesignReady 단계에서 Design 작성
await saveAnswer(
  'design-text',
  'DesignReady',
  'JWT 토큰 + Redis 캐시 방식 사용',
  new Date().toISOString()
);
// → 자동으로 intent_id = 123, problem_id = 456으로 연결됨
```

### 4. AI Prompt 생성
```typescript
// DesignReady 단계에서 AI prompt 생성 시
const context = await buildPromptContext('DesignReady');

// context에는 자동으로 포함:
// - intent: "사용자 인증 시스템 개선"
// - relatedProblems: ["로그인 속도가 느림..."]
// - design: ["JWT 토큰 + Redis 캐시 방식 사용"]
// - 기타 이전 단계의 모든 연관 데이터
```

## 장점

1. **자동 연결**: 수동으로 관계를 지정할 필요 없음
2. **컨텍스트 추적**: AI prompt 생성 시 모든 관련 정보가 자동으로 포함
3. **데이터 일관성**: Intent → Problem → 기타 단계의 명확한 계층 구조
4. **쉬운 조회**: Intent나 Problem 기준으로 모든 관련 데이터를 한 번에 조회 가능
5. **AI 성능 향상**: 더 많은 컨텍스트를 제공하여 더 정확한 AI 응답 생성

## 마이그레이션

기존 데이터베이스가 있는 경우:

```sql
-- 새 컬럼 추가
ALTER TABLE question_answers ADD COLUMN intent_id INTEGER;
ALTER TABLE question_answers ADD COLUMN problem_id INTEGER;
ALTER TABLE question_answers ADD COLUMN parent_id INTEGER;

-- 인덱스 생성
CREATE INDEX idx_intent_id ON question_answers(intent_id);
CREATE INDEX idx_problem_id ON question_answers(problem_id);
```

기존 데이터는 `intent_id`, `problem_id`가 NULL로 유지되며, 새로운 데이터부터 자동으로 연결됩니다.
