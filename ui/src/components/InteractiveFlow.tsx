/**
 * @fileoverview Interactive question flow component
 */

import React, { useState, useEffect } from 'react';
import { Situation, QuestionAnswer, SituationFlow } from '../types';
import { getSituationFlows } from '../data/data-loader';

/**
 * @brief Props for InteractiveFlow component
 */
interface InteractiveFlowProps {
  situation: Situation;
  onComplete: (nextSituation: Situation | null) => void;
  onAnswerSave: (answer: QuestionAnswer) => void;
}

/**
 * @brief Interactive flow component that guides users through questions
 * 
 * @param situation - Current situation
 * @param onComplete - Callback when flow completes
 * @param onAnswerSave - Callback to save answers
 * @return React component showing interactive questions
 * 
 * @pre situation must be a valid Situation
 * @post Questions are displayed and answers are collected
 */
export const InteractiveFlow: React.FC<InteractiveFlowProps> = ({
  situation,
  onComplete,
  onAnswerSave,
}) => {
  const [flow, setFlow] = useState<SituationFlow | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadFlow = async () => {
      setLoading(true);
      try {
        const flows = await getSituationFlows();
        const situationFlow = flows[situation];
        if (situationFlow) {
          setFlow(situationFlow);
          setCurrentQuestionId(situationFlow.startQuestionId);
          setAnswers({});
          setTextAnswer('');
          setQuestionHistory([situationFlow.startQuestionId]);
        }
      } catch (error) {
        console.error('Error loading flow:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFlow();
  }, [situation]);

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: '#6b7280',
      }}>
        질문 로딩 중...
      </div>
    );
  }

  if (!flow || !currentQuestionId) {
    return null;
  }

  const currentQuestion = flow.questions.find(q => q.id === currentQuestionId);

  if (!currentQuestion) {
    return null;
  }

  const handleAnswer = (answer: string | boolean) => {
    const answerRecord: QuestionAnswer = {
      questionId: currentQuestion.id,
      answer,
      answeredAt: new Date().toISOString(),
    };

    setAnswers({ ...answers, [currentQuestion.id]: answer });
    onAnswerSave(answerRecord);

    let nextQuestionId: string | undefined;
    let nextSituation: Situation | undefined;

    if (currentQuestion.type === 'yesno') {
      if (answer === true && currentQuestion.onYesNextQuestionId) {
        nextQuestionId = currentQuestion.onYesNextQuestionId;
      } else if (answer === true && currentQuestion.onYesNextSituation) {
        nextSituation = currentQuestion.onYesNextSituation;
      } else if (answer === false && currentQuestion.onNoNextQuestionId) {
        nextQuestionId = currentQuestion.onNoNextQuestionId;
      } else if (answer === false && currentQuestion.onNoNextSituation) {
        nextSituation = currentQuestion.onNoNextSituation;
      }
    } else if (currentQuestion.onAnswerNextSituation) {
      nextSituation = currentQuestion.onAnswerNextSituation;
    } else if (currentQuestion.nextQuestionId) {
      nextQuestionId = currentQuestion.nextQuestionId;
    }

    if (nextSituation) {
      setTimeout(() => {
        onComplete(nextSituation);
      }, 300);
    } else if (nextQuestionId) {
      setQuestionHistory([...questionHistory, nextQuestionId]);
      setCurrentQuestionId(nextQuestionId);
      setTextAnswer('');
    } else {
      onComplete(null);
    }
  };

  const handleGoBack = () => {
    if (questionHistory.length > 1) {
      const newHistory = [...questionHistory];
      newHistory.pop();
      const previousQuestionId = newHistory[newHistory.length - 1];
      setQuestionHistory(newHistory);
      setCurrentQuestionId(previousQuestionId);
      setTextAnswer('');
      
      const previousAnswer = answers[previousQuestionId];
      if (previousAnswer && typeof previousAnswer === 'string') {
        setTextAnswer(previousAnswer);
      }
    }
  };

  const canGoBack = questionHistory.length > 1;

  const handleTextSubmit = () => {
    if (textAnswer.trim()) {
      handleAnswer(textAnswer);
    }
  };

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'yesno':
        return (
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              onClick={() => handleAnswer(true)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              예
            </button>
            <button
              onClick={() => handleAnswer(false)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              아니오
            </button>
          </div>
        );

      case 'text':
        return (
          <div style={{ marginTop: '16px' }}>
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="답변을 입력하세요..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textAnswer.trim()}
              style={{
                marginTop: '12px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: textAnswer.trim() ? '#3b82f6' : '#9ca3af',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: textAnswer.trim() ? 'pointer' : 'not-allowed',
                width: '100%',
              }}
            >
              저장하고 다음
            </button>
          </div>
        );

      case 'multiple':
        return (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQuestion.options?.map((option, index) => {
              let nextSituation: Situation | undefined;
              if (option === '새로운 문제 선택') {
                nextSituation = 'ProblemSelected';
              } else if (option === '같은 문제 심화') {
                nextSituation = 'AcceptanceDefined';
              } else if (option === 'Intent 조정') {
                nextSituation = 'IntentDefined';
              }
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (nextSituation) {
                      setTimeout(() => {
                        onComplete(nextSituation!);
                      }, 300);
                    } else {
                      handleAnswer(option);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    textAlign: 'left',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginTop: '24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h3 style={{
          margin: 0,
          color: '#1f2937',
          fontSize: '18px',
          fontWeight: '600',
        }}>
          질문 {flow.questions.findIndex(q => q.id === currentQuestionId) + 1} / {flow.questions.length}
        </h3>
        {canGoBack && (
          <button
            onClick={handleGoBack}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            <span>←</span>
            뒤로
          </button>
        )}
      </div>
      <p style={{
        color: '#4b5563',
        fontSize: '16px',
        lineHeight: '1.6',
        marginBottom: '8px',
      }}>
        {currentQuestion.question}
      </p>
      {renderQuestion()}
    </div>
  );
};
