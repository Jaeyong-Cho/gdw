/**
 * @fileoverview Interactive question flows for each situation
 */

import { SituationFlow } from '../types';

/**
 * @brief Interactive flow for Learned situation
 * @return Question flow definition
 */
export const learnedFlow: SituationFlow = {
  situation: 'Learned',
  startQuestionId: 'learned-new-facts',
  questions: [
    {
      id: 'learned-new-facts',
      question: '새롭게 알아낸 사실이 있나요?',
      type: 'yesno',
      required: true,
      onYesNextQuestionId: 'learned-new-facts-text',
      onNoNextQuestionId: 'learned-improvements',
    },
    {
      id: 'learned-new-facts-text',
      question: '어떤 사실을 새롭게 알아냈나요?',
      type: 'text',
      required: true,
      nextQuestionId: 'learned-improvements',
    },
    {
      id: 'learned-improvements',
      question: '개선할 점을 찾았나요?',
      type: 'yesno',
      required: true,
      onYesNextQuestionId: 'learned-improvements-text',
      onNoNextQuestionId: 'learned-clear-implementation',
    },
    {
      id: 'learned-improvements-text',
      question: '어떤 점을 개선할 수 있나요?',
      type: 'text',
      required: true,
      nextQuestionId: 'learned-clear-implementation',
    },
    {
      id: 'learned-clear-implementation',
      question: '바로 어떻게 개선해야할지 떠오르나요?',
      type: 'yesno',
      required: true,
      onYesNextSituation: 'Implementing',
      onNoNextQuestionId: 'learned-next-action',
    },
    {
      id: 'learned-next-action',
      question: '다음 행동을 선택하세요',
      type: 'multiple',
      required: true,
      options: ['새로운 문제 선택', '같은 문제 심화', 'Intent 조정'],
    },
  ],
};

/**
 * @brief Map of situation flows
 * @return Map of situation names to their flows
 */
export const situationFlows: Record<string, SituationFlow> = {
  Learned: learnedFlow,
};
