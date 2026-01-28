/**
 * @fileoverview Situation guide data extracted from situation-checklist.md
 */

import { SituationGuide } from '../types';

/**
 * @brief Guide data for all situations
 * @return Map of situation names to their guides
 */
export const situationGuides: Record<string, SituationGuide> = {
  IntentDefined: {
    whatToDo: '누가, 왜, 무엇을 해결할지 5-10줄로 작성. 기능이나 기술 언급은 금지. 예상 소요 시간: 5-15분.',
    conditionsToProceed: [
      'Intent를 한 문장으로 요약 가능',
      '설명이 흔들리지 않음 (일관성 유지)',
      '문서로 작성되어 있음',
      '범위가 제한되어 있음 (무한하지 않음)',
    ],
    failure: [
      '목표가 흔들림 (설명할 때마다 다름)',
      '기능/기술 이야기를 포함함',
      '한 문장으로 요약 불가능',
      '여러 해석이 가능함',
    ],
    goBackTo: 'Intent 다시 작성 (IntentDefinedFail 상태에서 돌아옴)',
    warning: '구현 가능성은 고려하지 말 것. Intent는 "무엇을"에 집중, "어떻게"는 나중 단계.',
    tip: 'Intent는 살아 있는 기준점. 나중에 변경될 수 있지만, 지금은 명확해야 함. "사용자가 X를 할 수 있게 하기 위해 Y 문제를 해결한다" 형식이 도움됨.',
    aiUsage: '초안 생성 요청, 취약한 가정 지적 요청, 한 문장 요약 강제 요청. "이 Intent를 한 문장으로 요약해줘"로 검증.',
    quickCheck: {
      items: [
        { question: 'Intent를 한 문장으로 말할 수 있나요?' },
        { question: '누가, 왜, 무엇을 해결하는지 명확한가요?' },
        { question: '기능이나 기술을 언급하지 않았나요?' },
        { question: '설명할 때마다 내용이 일관되나요?' },
      ],
      nextStep: '모두 "예"면 ProblemSelected로 진행 가능',
    },
  },
  IntentDefinedFail: {
    whatToDo: 'Intent 정의를 시도했지만 불명확한 상태. 무엇이 불명확한지 구체적으로 파악하고, 모호한 부분을 명확히 하기 위한 질문 작성. 예상 소요 시간: 3-10분.',
    conditionsToProceed: [
      '불명확한 부분이 구체적으로 식별됨',
      '명확히 하기 위한 질문이 작성됨',
      'Intent를 다시 작성할 준비가 됨',
    ],
    failure: [
      '불명확함을 그대로 방치',
      '모호한 부분을 구체화하지 않음',
      '여러 해석이 여전히 존재함',
    ],
    goBackTo: 'IntentDefined (명확한 Intent 작성 후)',
    warning: '이 상태에서 오래 머물지 말 것. 빠르게 문제를 파악하고 IntentDefined로 돌아가야 함.',
    tip: '"누가", "왜", "무엇을" 중 어느 부분이 불명확한지 먼저 파악. AI에게 "이 Intent의 모호한 부분을 지적해줘" 요청.',
    aiUsage: '모호한 부분 지적 요청, 명확화를 위한 질문 생성 요청, 여러 해석 비교 분석 요청.',
    quickCheck: {
      items: [
        { question: '무엇이 불명확한지 구체적으로 알 수 있나요?' },
        { question: '명확히 하기 위한 질문이 있나요?' },
        { question: 'Intent를 다시 작성할 준비가 되었나요?' },
      ],
      nextStep: '모두 "예"면 IntentDefined로 돌아가서 재작성',
    },
  },
  ProblemSelected: {
    whatToDo: 'Intent에서 구체적인 문제 하나를 선택하여 작성. 문제는 Intent와 구별되어야 하며, 범위가 명확하고 실행 가능해야 함. 예상 소요 시간: 5-15분.',
    conditionsToProceed: [
      '문제 진술이 문서로 작성되어 있음',
      'Intent와 구별됨 (Intent는 큰 그림, 문제는 구체적)',
      '문제의 경계가 명확함 (무엇이 포함되고 제외되는지)',
      '실행 가능함 (추상적 희망이 아닌 구체적 문제)',
    ],
    failure: [
      '문제가 Intent와 구별되지 않음 (너무 추상적)',
      '경계가 불명확함',
      '실행 불가능함 (너무 추상적이거나 희망사항)',
      '문제가 Intent에서 벗어남 (drift)',
    ],
    goBackTo: 'IntentDefined (문제가 Intent에서 벗어났을 때) 또는 ProblemSelected 재작성',
    warning: '하나의 문제만 선택. 여러 문제를 동시에 다루지 말 것. 문제는 "현재 상태"와 "원하는 상태"의 차이로 표현.',
    tip: '"사용자는 X를 할 수 없어서 Y를 못하고 있다" 형식이 도움됨. 문제는 측정 가능해야 함 (문제가 해결되었는지 알 수 있어야 함).',
    aiUsage: 'Intent에서 문제 추출 요청, 문제 범위 검증 요청, 문제가 실행 가능한지 확인 요청. "이 문제를 해결했는지 어떻게 알 수 있나요?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '문제가 Intent와 구별되나요? (Intent는 큰 그림, 문제는 구체적)' },
        { question: '문제의 경계가 명확한가요? (무엇이 포함되고 제외되는지)' },
        { question: '문제를 해결했는지 알 수 있나요? (측정 가능한가요?)' },
        { question: '하나의 문제만 선택했나요?' },
      ],
      nextStep: '모두 "예"면 AcceptanceDefined로 진행 가능',
    },
  },
  AcceptanceDefined: {
    whatToDo: '선택한 문제에 대한 완료 기준을 작성. 각 기준은 측정 가능해야 하며, 문제와 연결되어야 함. 예상 소요 시간: 10-20분.',
    conditionsToProceed: [
      '완료 기준이 문서로 작성되어 있음',
      '각 기준이 측정 가능함 (true/false로 검증 가능)',
      '문제와 연결되어 있음',
      '기준이 "완료"를 정의함',
    ],
    failure: [
      '기준이 모호함 (측정 불가능)',
      '문제와 연결되지 않음',
      '완료를 정의하지 못함',
      '기준이 너무 많거나 적음',
    ],
    goBackTo: 'ProblemSelected (기준이 모호할 때) 또는 AcceptanceDefined 재작성',
    warning: '기준은 구현 방법이 아닌 결과에 집중. "사용자가 X를 할 수 있다"가 "Y 기능이 구현되어 있다"보다 좋음.',
    tip: '"Given-When-Then" 형식이 도움됨. 각 기준은 독립적으로 검증 가능해야 함. 3-7개의 기준이 적절함.',
    aiUsage: '문제에서 완료 기준 생성 요청, 기준의 측정 가능성 검증 요청, 기준이 완료를 정의하는지 확인 요청. "이 기준으로 완료를 알 수 있나요?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '각 기준을 true/false로 확인할 수 있나요?' },
        { question: '기준이 문제와 연결되어 있나요?' },
        { question: '기준으로 "완료"를 알 수 있나요?' },
        { question: '기준이 3-7개 정도인가요?' },
      ],
      nextStep: '모두 "예"면 FeasibilityChecked로 진행 가능',
    },
  },
  FeasibilityChecked: {
    whatToDo: '기술적 제약사항 식별, 리소스 요구사항 추정, 실행 가능성 판단 (feasible/too hard/problem too big). 예상 소요 시간: 15-30분.',
    conditionsToProceed: [
      '실행 가능성 평가가 수행됨',
      '기술적 제약사항이 식별됨',
      '리소스 요구사항이 추정됨 (시간, 인력 등)',
      '결정이 내려짐: feasible, too hard, 또는 problem too big',
    ],
    failure: [
      '제약사항을 식별하지 않음',
      '리소스 추정이 없음',
      '결정을 내리지 않음',
      '과도하게 낙관적이거나 비관적',
    ],
    goBackTo: 'AcceptanceDefined (too hard일 때), ProblemSelected (problem too big일 때)',
    warning: '구현 방법을 설계하지 말 것. 실행 가능성만 판단. "할 수 있는가?"에 집중, "어떻게 할 것인가?"는 다음 단계.',
    tip: '명확하지 않으면 "feasible"로 가정하고 진행. 과도한 분석은 시간 낭비. 30분 이상 걸리면 "feasible"로 가정하고 Design 단계로.',
    aiUsage: '기술적 제약사항 식별 요청, 리소스 추정 도움 요청, 실행 가능성 판단 지원 요청. "이 문제를 해결하는 데 필요한 기술적 제약사항은?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '기술적 제약사항을 식별했나요?' },
        { question: '리소스 요구사항을 추정했나요? (시간, 인력 등)' },
        { question: '결정을 내렸나요? (feasible/too hard/problem too big)' },
        { question: '30분 이상 걸렸나요? → 그럼 "feasible"로 가정하고 진행' },
      ],
      nextStep: '"feasible"이면 DesignReady로 진행 가능',
    },
  },
  DesignReady: {
    whatToDo: '상태 전이(있는 경우) 정의, 컴포넌트 상호작용 명시, 완료 기준을 다루는 설계 문서 작성. 예상 소요 시간: 30-60분.',
    conditionsToProceed: [
      '설계 문서나 다이어그램이 존재함',
      '상태 전이가 정의됨 (해당되는 경우)',
      '컴포넌트 상호작용이 명시됨',
      '설계가 완료 기준을 다룸',
    ],
    failure: [
      '설계가 복잡함 (단순화 필요)',
      '상태 전이가 불명확함',
      '컴포넌트 상호작용이 명시되지 않음',
      '완료 기준을 다루지 않음',
    ],
    goBackTo: 'AcceptanceDefined (설계가 복잡할 때) 또는 DesignReady 재작성',
    warning: '완벽한 설계를 만들지 말 것. 구현을 시작할 수 있을 정도면 충분. 과도한 설계는 시간 낭비.',
    tip: '간단한 다이어그램이나 텍스트로 충분. 상태 전이는 상태 머신이나 플로우차트로 표현. 각 컴포넌트의 책임을 명확히.',
    aiUsage: '설계 초안 생성 요청, 상태 전이 다이어그램 생성 요청, 설계 복잡도 검증 요청. "이 설계를 더 단순화할 수 있나요?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '설계 문서나 다이어그램이 있나요?' },
        { question: '상태 전이가 정의되었나요? (해당되는 경우)' },
        { question: '컴포넌트 상호작용이 명시되었나요?' },
        { question: '설계가 완료 기준을 다루나요?' },
        { question: '구현을 시작할 수 있을 정도인가요?' },
      ],
      nextStep: '모두 "예"면 TaskBreakdown으로 진행 가능',
    },
  },
  TaskBreakdown: {
    whatToDo: '설계에서 작업을 분해하여 각 작업이 독립적으로 실행 가능하고, 의존성이 식별되며, 한 세션(90분 이하)에 완료 가능하도록 작성. 예상 소요 시간: 15-30분.',
    conditionsToProceed: [
      '작업이 설계에서 분해됨',
      '각 작업이 독립적으로 실행 가능함 (명확한 입력/출력)',
      '작업 의존성이 식별됨',
      '각 작업이 한 세션(90분 이하)에 완료 가능함',
    ],
    failure: [
      '작업이 불명확함',
      '작업이 너무 크거나 작음',
      '의존성이 식별되지 않음',
      '작업이 독립적으로 실행 불가능함',
    ],
    goBackTo: 'DesignReady (작업이 불명확할 때) 또는 TaskBreakdown 재작성',
    warning: '작업은 구현 방법이 아닌 결과에 집중. "X 기능 구현"보다 "사용자가 Y를 할 수 있게 함"이 더 나음.',
    tip: '작업은 동사로 시작. "구현", "추가", "수정" 등. 각 작업은 하나의 결과만 가져야 함. 의존성 그래프를 그려보면 도움됨.',
    aiUsage: '설계에서 작업 분해 요청, 작업 크기 검증 요청, 의존성 식별 요청. "이 작업을 90분 안에 완료할 수 있나요?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '각 작업을 90분 안에 완료할 수 있나요?' },
        { question: '각 작업이 독립적으로 실행 가능한가요? (명확한 입력/출력)' },
        { question: '작업 의존성이 식별되었나요?' },
        { question: '작업이 설계에서 분해되었나요?' },
      ],
      nextStep: '모두 "예"면 Implementing으로 진행 가능',
    },
  },
  Implementing: {
    whatToDo: '선택한 작업을 구현하기 시작. 코드나 파일을 생성하거나 수정. 예상 소요 시간: 작업당 30-90분.',
    conditionsToProceed: [
      '특정 작업이 선택됨',
      '구현이 시작됨 (코드/파일 생성 또는 수정)',
      '작업이 아직 완료되지 않음',
      '검증이 아직 수행되지 않음',
    ],
    failure: [
      '작업 선택 없이 시작함',
      '구현이 진행되지 않음 (막힘)',
      '작업 범위를 벗어남',
      '완료 기준을 잊음',
    ],
    goBackTo: 'TaskBreakdown (막혔을 때) 또는 Implementing 계속',
    warning: '완료 기준을 잊지 말 것. 구현 중에도 기준을 확인. 완벽한 코드를 만들지 말 것. 동작하는 코드가 먼저.',
    tip: '작은 단위로 커밋. 테스트를 작성하면서 구현 (TDD). 막히면 15분 이상 고민하지 말고 TaskBreakdown으로 돌아가 작업을 더 작게 분해.',
    aiUsage: '구현 초안 생성 요청, 막힌 부분 해결 요청, 코드 리뷰 요청. "이 작업의 완료 기준을 만족하나요?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '특정 작업을 선택했나요?' },
        { question: '코드나 파일을 생성/수정했나요?' },
        { question: '작업이 완료되었나요?' },
        { question: '막혔나요? → 15분 이상 고민했다면 TaskBreakdown으로 돌아가기' },
      ],
      nextStep: '작업 완료 시 Verifying으로 진행 가능',
    },
  },
  Verifying: {
    whatToDo: '구현이 완료되었으므로 완료 기준을 확인하는 검증 프로세스 시작. 예상 소요 시간: 10-30분.',
    conditionsToProceed: [
      '작업 구현이 완료됨 (코드 작성됨)',
      '검증 프로세스가 시작됨',
      '완료 기준이 구현과 대조되어 확인됨',
      '검증 결과가 아직 결정되지 않음',
    ],
    failure: [
      '검증을 건너뜀',
      '완료 기준을 확인하지 않음',
      '버그를 무시함',
      '검증 방법이 잘못됨',
    ],
    goBackTo: 'Implementing (버그 발견 시), AcceptanceDefined (검증 방법이 잘못되었을 때)',
    warning: '검증은 완료 기준에 집중. 완료 기준을 만족하는지 확인. 추가 기능은 나중에.',
    tip: '자동화된 테스트가 있으면 실행. 수동 테스트도 필요. 각 완료 기준을 하나씩 확인. 버그는 즉시 기록.',
    aiUsage: '테스트 케이스 생성 요청, 검증 방법 제안 요청, 버그 분석 요청. "이 구현이 완료 기준을 만족하나요?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '구현이 완료되었나요? (코드 작성됨)' },
        { question: '검증을 시작했나요?' },
        { question: '완료 기준을 확인하고 있나요?' },
        { question: '모든 기준이 만족되었나요?' },
      ],
      nextStep: '모두 "예"면 Verified로 진행 가능',
    },
  },
  Verified: {
    whatToDo: '검증이 완료되었고 모든 완료 기준이 만족되었으며, 차단 버그가 없고 다음 단계(릴리스 또는 통합) 준비가 되었음. 예상 소요 시간: 즉시 (상태 확인).',
    conditionsToProceed: [
      '검증 프로세스가 완료됨',
      '모든 완료 기준이 만족됨',
      '차단 버그가 없음',
      '다음 단계 준비가 됨',
    ],
    failure: [
      '완료 기준이 만족되지 않음',
      '차단 버그가 남아있음',
      '다음 단계 준비가 안 됨',
      '검증이 불완전함',
    ],
    goBackTo: 'Verifying (검증 재수행), Implementing (버그 수정), AcceptanceDefined (기준 문제)',
    warning: '완벽을 추구하지 말 것. 차단 버그만 없으면 됨. 작은 버그는 나중에 수정 가능.',
    tip: '릴리스 노트 작성. 변경사항 문서화. 다음 단계 준비 확인.',
    aiUsage: '검증 결과 요약 요청, 릴리스 노트 생성 요청, 다음 단계 준비 확인 요청. "다음 단계로 진행할 준비가 되었나요?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '검증이 완료되었나요?' },
        { question: '모든 완료 기준이 만족되었나요?' },
        { question: '차단 버그가 없나요?' },
        { question: '다음 단계 준비가 되었나요?' },
      ],
      nextStep: '모두 "예"면 Released로 진행 가능',
    },
  },
  Released: {
    whatToDo: '작업을 배포, 병합, 또는 공유하여 의도한 사용자/이해관계자가 접근 가능하게 함. 예상 소요 시간: 5-30분 (배포 방법에 따라 다름).',
    conditionsToProceed: [
      '작업이 배포/병합/공유됨',
      '의도한 사용자/이해관계자가 접근 가능함',
      '릴리스 아티팩트가 존재함 (배포, PR, 패키지 등)',
      '릴리스가 공지되거나 가시화됨',
    ],
    failure: [
      '배포/병합/공유되지 않음',
      '접근 불가능함',
      '릴리스 아티팩트가 없음',
      '공지되지 않음',
    ],
    goBackTo: 'Verified (문제 발견 시) 또는 Released 재시도',
    warning: '완벽한 릴리스를 기다리지 말 것. 작동하는 버전을 먼저 릴리스. 피드백을 받기 위해 빠르게 릴리스.',
    tip: '작은 변경사항도 릴리스. 피드백을 빠르게 받는 것이 중요. 릴리스 노트 작성.',
    aiUsage: '릴리스 노트 생성 요청, 배포 체크리스트 확인 요청, 릴리스 준비 확인 요청. "릴리스 준비가 되었나요?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '작업이 배포/병합/공유되었나요?' },
        { question: '사용자/이해관계자가 접근 가능한가요?' },
        { question: '릴리스 아티팩트가 있나요? (배포, PR, 패키지 등)' },
        { question: '릴리스가 공지되었나요?' },
      ],
      nextStep: '모두 "예"면 FeedbackCollected로 진행 가능',
    },
  },
  FeedbackCollected: {
    whatToDo: '릴리스된 작업에 대한 피드백을 적극적으로 수집하거나 받고, 문서화. 예상 소요 시간: 1-7일 (피드백 수집 기간).',
    conditionsToProceed: [
      '피드백이 적극적으로 수집되거나 받아짐',
      '피드백이 문서화됨 (작성된 노트나 기록)',
      '피드백이 릴리스된 작업과 관련됨',
      '피드백 수집 프로세스가 완료됨',
    ],
    failure: [
      '피드백을 수집하지 않음',
      '피드백이 문서화되지 않음',
      '피드백이 작업과 무관함',
      '수집 프로세스가 완료되지 않음',
    ],
    goBackTo: 'Released (피드백 수집 재시도) 또는 FeedbackCollected 계속',
    warning: '피드백을 기다리지 말 것. 적극적으로 요청. 부정적 피드백도 가치 있음.',
    tip: '피드백 요청 질문 준비. 사용자 관찰. 정량적 데이터 수집. 피드백을 즉시 기록.',
    aiUsage: '피드백 요청 질문 생성 요청, 피드백 분석 요청, 피드백 요약 요청. "수집한 피드백을 요약해줘" 요청으로 검증.',
    quickCheck: {
      items: [
        { question: '피드백을 수집했거나 받았나요?' },
        { question: '피드백이 문서화되었나요?' },
        { question: '피드백이 릴리스된 작업과 관련이 있나요?' },
        { question: '수집 프로세스가 완료되었나요?' },
      ],
      nextStep: '모두 "예"면 Learned로 진행 가능',
    },
  },
  Learned: {
    whatToDo: '피드백을 분석하고, 통찰이나 교훈을 추출하고, 학습 결과를 문서화하고, 학습 기반 다음 행동을 식별. 예상 소요 시간: 30-60분.',
    conditionsToProceed: [
      '피드백이 분석됨',
      '통찰이나 교훈이 추출됨',
      '학습 결과가 문서화됨',
      '학습 기반 다음 행동이 식별됨',
    ],
    failure: [
      '피드백을 분석하지 않음',
      '통찰을 추출하지 않음',
      '학습 결과가 문서화되지 않음',
      '다음 행동이 식별되지 않음',
    ],
    goBackTo: 'FeedbackCollected (피드백 재분석), ProblemSelected (새 문제), AcceptanceDefined (같은 문제 심화), IntentDefined (Intent 조정)',
    warning: '학습을 건너뛰지 말 것. 피드백에서 배우는 것이 중요. 다음 행동을 명확히 해야 함.',
    tip: '"무엇이 잘 되었나?", "무엇을 개선할 수 있나?", "다음에 무엇을 할까?" 질문에 답. 학습 결과를 팀과 공유. 바로 구현할 수 있는 명확한 작업이 떠오르면 Implementing으로 바로 진행 가능.',
    aiUsage: '피드백 분석 요청, 통찰 추출 요청, 다음 행동 제안 요청. "이 피드백에서 무엇을 배웠나요?" 질문으로 검증.',
    quickCheck: {
      items: [
        { question: '피드백을 분석했나요?' },
        { question: '통찰이나 교훈을 추출했나요?' },
        { question: '학습 결과가 문서화되었나요?' },
        { question: '다음 행동이 식별되었나요?' },
        { question: '바로 구현할 수 있는 명확한 작업이 떠오르나요?' },
      ],
      nextStep: '모두 "예"면 다음 행동에 따라 ProblemSelected/AcceptanceDefined/IntentDefined/Implementing으로 진행 (명확한 구현 작업이 있으면 Implementing으로 바로 진행)',
    },
  },
  Undetermined: {
    whatToDo: '현재 상황이 어떤 정의된 상황의 체크리스트와도 일치하지 않거나, 여러 상황이 부분적으로 일치하지만 완전히 일치하는 것이 없거나, 상황을 결정하는 데 필요한 정보가 누락되었거나, 상황이 모호하거나 불명확함. 예상 소요 시간: 즉시 (상태 확인).',
    conditionsToProceed: [
      '현재 상황이 정의된 상황의 체크리스트와 일치하지 않음',
      '여러 상황이 부분적으로 일치하지만 완전히 일치하는 것이 없음',
      '상황을 결정하는 데 필요한 정보가 누락됨',
      '상황이 모호하거나 불명확함',
    ],
    failure: [
      '이 상태에서 오래 머무름',
      '필요한 정보를 수집하지 않음',
      '상황을 명확히 하지 않음',
    ],
    goBackTo: '적절한 상황으로 이동 (정보 수집 후)',
    warning: '이 상태는 일시적이어야 함. 빠르게 필요한 정보를 수집하고 적절한 상황으로 이동해야 함.',
    tip: '어떤 정보가 누락되었는지 파악. 가장 가까운 상황을 선택하고 진행. 완벽한 매칭을 기다리지 말 것.',
    aiUsage: '현재 상태 분석 요청, 필요한 정보 식별 요청, 적절한 상황 제안 요청. "현재 상태를 분석하고 필요한 정보를 알려줘" 요청으로 검증.',
    quickCheck: {
      items: [
        { question: '어떤 정보가 누락되었나요?' },
        { question: '가장 가까운 상황이 무엇인가요?' },
        { question: '필요한 정보를 수집할 수 있나요?' },
      ],
      nextStep: '정보 수집 후 적절한 상황으로 이동',
    },
  },
};
