/**
 * @fileoverview Interactive question flow component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Situation, QuestionAnswer, SituationFlow, QuestionDataDisplay } from '../types';
import { getSituationFlows } from '../data/data-loader';
import { generatePrompt, buildPromptContext } from '../utils/prompt-generator';
import { getTransitionCount, incrementTransitionCount, resetTransitionCount, getCurrentCycleId, completeCycle } from '../data/db';

/**
 * @brief Props for InteractiveFlow component
 */
interface InteractiveFlowProps {
  situation: Situation;
  initialQuestionId?: string | null;
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
  initialQuestionId,
  onComplete,
  onAnswerSave,
}) => {
  const [flow, setFlow] = useState<SituationFlow | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayData, setDisplayData] = useState<string | null>(null);
  const [displayDataLabel, setDisplayDataLabel] = useState<string>('');
  const [showAIPrompt, setShowAIPrompt] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [showAIPromptInputs, setShowAIPromptInputs] = useState<boolean>(false);
  const [aiPromptInputs, setAiPromptInputs] = useState<Record<string, string>>({});
  const [selectableAnswers, setSelectableAnswers] = useState<Array<{id: string, text: string, timestamp: string, dbId?: number}>>([]);
  const [selectedAnswerIds, setSelectedAnswerIds] = useState<string[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verificationTransitionCount, setVerificationTransitionCount] = useState<number>(0);
  
  const currentQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadFlow = async () => {
      setLoading(true);
      try {
        const flows = await getSituationFlows();
        const situationFlow = flows[situation];
        if (situationFlow) {
          // Use initialQuestionId if provided and exists in flow, otherwise use startQuestionId
          let startQuestionId = situationFlow.startQuestionId;
          if (initialQuestionId) {
            const questionExists = situationFlow.questions.some(q => q.id === initialQuestionId);
            if (questionExists) {
              startQuestionId = initialQuestionId;
            }
          }
          
          setFlow(situationFlow);
          setAnswers({});
          setTextAnswer('');
          setQuestionHistory([startQuestionId]);
          currentQuestionIdRef.current = startQuestionId;
          setCurrentQuestionId(startQuestionId);
          
          const startQuestion = situationFlow.questions.find(q => q.id === startQuestionId);
          if (startQuestion?.showData) {
            const db = await import('../data/db');
            let data: string | null = null;

            switch (startQuestion.showData.source) {
              case 'getIntentSummary':
                data = await db.getIntentSummary();
                break;
              case 'getIntentDocument':
                data = await db.getIntentDocument();
                break;
              case 'getAnswerByQuestionId':
                if (startQuestion.showData.sourceParam) {
                  data = await db.getAnswerByQuestionId(startQuestion.showData.sourceParam);
                }
                break;
              default:
                data = null;
            }

            if (currentQuestionIdRef.current === startQuestionId) {
              setDisplayData(data);
              setDisplayDataLabel(startQuestion.showData.label);
            }
          }
        }
      } catch (error) {
        console.error('Error loading flow:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFlow();
  }, [situation, initialQuestionId]);

  /**
   * @brief Load display data based on question configuration
   * 
   * @param showData - Data display configuration
   * @pre showData is provided
   * @post Display data is loaded and stored in state
   */
  const loadDisplayData = useCallback(async (showData: QuestionDataDisplay): Promise<void> => {
    try {
      const db = await import('../data/db');
      let data: string | null = null;

      switch (showData.source) {
        case 'getIntentSummary':
          data = await db.getIntentSummary();
          break;
        case 'getIntentDocument':
          data = await db.getIntentDocument();
          break;
        case 'getAnswerByQuestionId':
          if (showData.sourceParam) {
            data = await db.getAnswerByQuestionId(showData.sourceParam);
          }
          break;
        case 'getPreviousCycleData':
          const { getPreviousCycleData } = await import('../data/db');
          const previousCycle = await getPreviousCycleData();
          if (previousCycle) {
            const cycleSummary = `Cycle #${previousCycle.cycleNumber}\n시작: ${new Date(previousCycle.startedAt).toLocaleString('ko-KR')}\n완료: ${previousCycle.completedAt ? new Date(previousCycle.completedAt).toLocaleString('ko-KR') : '미완료'}\n\n답변 내용:\n${previousCycle.answers.map((a: { questionId: string; answer: string; situation: string }) => `[${a.situation}] ${a.questionId}: ${a.answer}`).join('\n\n')}`;
            data = cycleSummary;
          } else {
            data = '이전 Cycle 데이터가 없습니다.';
          }
          break;
        default:
          data = null;
      }

      setDisplayData(data);
      setDisplayDataLabel(showData.label);
    } catch (error) {
      console.error('Error loading display data:', error);
      setDisplayData(null);
      setDisplayDataLabel('');
    }
  }, []);

  /**
   * @brief Generate AI prompt from template with user inputs
   * 
   * @pre currentQuestion has aiPromptTemplate
   * @post AI prompt is generated and displayed
   */
  const handleGenerateAIPrompt = useCallback(async (userInputs?: Record<string, string>) => {
    if (!flow || !currentQuestionId) {
      return;
    }
    
    const question = flow.questions.find(q => q.id === currentQuestionId);
    if (!question?.aiPromptTemplate) {
      return;
    }

    try {
      // For problem-select question, use selected problem ID
      let selectedProblemIdForPrompt: number | null = null;
      if (question.id === 'problem-select' && selectedAnswerIds.length > 0) {
        const selectedAnswer = selectableAnswers.find(ans => selectedAnswerIds.includes(ans.id));
        if (selectedAnswer?.dbId) {
          selectedProblemIdForPrompt = selectedAnswer.dbId;
          setSelectedProblemId(selectedAnswer.dbId);
        }
      } else if (selectedProblemId) {
        selectedProblemIdForPrompt = selectedProblemId;
      }
      
      console.log('[DEBUG] Generating prompt for question:', question.id);
      console.log('[DEBUG] selectedProblemId state:', selectedProblemId);
      console.log('[DEBUG] selectedProblemIdForPrompt:', selectedProblemIdForPrompt);
      
      const context = await buildPromptContext(situation, selectedProblemIdForPrompt);
      
      console.log('[DEBUG] Context problem:', context.problem);
      console.log('[DEBUG] Context acceptanceCriteria:', context.acceptanceCriteria);
      
      if (userInputs) {
        Object.keys(userInputs).forEach(key => {
          context[key] = userInputs[key] || null;
        });
      }
      
      if (question.aiPromptTemplate.selectableAnswers && selectedAnswerIds.length > 0) {
        const selectedTexts = selectableAnswers
          .filter(ans => selectedAnswerIds.includes(ans.id))
          .map(ans => `- ${ans.text}`)
          .join('\n');
        context[question.aiPromptTemplate.selectableAnswers.variableName] = selectedTexts || null;
      } else if (question.aiPromptTemplate.selectableAnswers) {
        context[question.aiPromptTemplate.selectableAnswers.variableName] = null;
      }
      
      const prompt = generatePrompt(question.aiPromptTemplate.template, context);
      setAiPrompt(prompt);
      setShowAIPrompt(true);
      setShowAIPromptInputs(false);
    } catch (error) {
      console.error('Error generating AI prompt:', error);
    }
  }, [flow, currentQuestionId, situation, selectableAnswers, selectedAnswerIds, selectedProblemId]);

  /**
   * @brief Show AI prompt input form
   * 
   * @pre currentQuestion has aiPromptTemplate
   * @post Input form is displayed
   */
  const handleShowAIPromptInputs = useCallback(async () => {
    if (!flow || !currentQuestionId) {
      return;
    }
    
    const question = flow.questions.find(q => q.id === currentQuestionId);
    if (!question?.aiPromptTemplate) {
      return;
    }

    const hasInputFields = question.aiPromptTemplate.inputFields && question.aiPromptTemplate.inputFields.length > 0;
    const hasSelectableAnswers = question.aiPromptTemplate.selectableAnswers !== undefined;

    if (hasInputFields || hasSelectableAnswers) {
      setShowAIPromptInputs(true);
      setShowAIPrompt(false);
      
      if (hasInputFields) {
        const initialInputs: Record<string, string> = {};
        question.aiPromptTemplate.inputFields!.forEach(field => {
          initialInputs[field.id] = '';
        });
        setAiPromptInputs(initialInputs);
      }
      
      if (hasSelectableAnswers && question.aiPromptTemplate.selectableAnswers) {
        try {
          // For problem selection, get answers with IDs from SelectingProblem situation
          if (question.id === 'problem-select' && question.aiPromptTemplate.selectableAnswers.questionId === 'problem-boundaries-text') {
            const { getAnswersBySituation } = await import('../data/db');
            const answers = await getAnswersBySituation('SelectingProblem');
            const problemAnswers = answers.filter(a => a.questionId === 'problem-boundaries-text');
            const formattedAnswers = problemAnswers.map((ans, idx) => ({
              id: `${ans.id}-${idx}`,
              text: ans.answer,
              timestamp: ans.answeredAt,
              dbId: ans.id
            }));
            setSelectableAnswers(formattedAnswers);
            setSelectedAnswerIds([]);
            setSelectedProblemId(null);
          } else {
            // For other selectable answers, use the existing method
            const { getAllAnswersByQuestionId } = await import('../data/db');
            const answers = await getAllAnswersByQuestionId(question.aiPromptTemplate.selectableAnswers.questionId);
            const formattedAnswers = answers.map((ans, idx) => ({
              id: `${ans.answeredAt}-${idx}`,
              text: ans.answer,
              timestamp: ans.answeredAt
            }));
            setSelectableAnswers(formattedAnswers);
            setSelectedAnswerIds([]);
          }
        } catch (error) {
          console.error('Error loading selectable answers:', error);
          setSelectableAnswers([]);
        }
      }
    } else {
      handleGenerateAIPrompt();
    }
  }, [flow, currentQuestionId, handleGenerateAIPrompt]);

  /**
   * @brief Copy prompt to clipboard with fallback for cross-platform compatibility
   * 
   * @pre aiPrompt is set
   * @post Prompt is copied to clipboard
   */
  const handleCopyPrompt = useCallback(async () => {
    try {
      // Try modern Clipboard API first (works on HTTPS/localhost)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(aiPrompt);
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 1500);
        return;
      }
      
      // Fallback: Use execCommand for older browsers and cross-platform compatibility
      const textArea = document.createElement('textarea');
      textArea.value = aiPrompt;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 1500);
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (error) {
      console.error('Error copying prompt:', error);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 1500);
    }
  }, [aiPrompt]);

  useEffect(() => {
    if (!flow || !currentQuestionId) {
      return;
    }
    
    const question = flow.questions.find(q => q.id === currentQuestionId);
    
    currentQuestionIdRef.current = currentQuestionId;
    
    setShowAIPrompt(false);
    setAiPrompt('');
    setShowAIPromptInputs(false);
    setAiPromptInputs({});
    
    // For problem-select question, load problems automatically
    if (question?.id === 'problem-select' && question.aiPromptTemplate?.selectableAnswers) {
      const loadProblems = async () => {
        try {
          const { getAnswersBySituation } = await import('../data/db');
          const answers = await getAnswersBySituation('SelectingProblem');
          const problemAnswers = answers.filter(a => a.questionId === 'problem-boundaries-text');
          const formattedAnswers = problemAnswers.map((ans, idx) => ({
            id: `${ans.id}-${idx}`,
            text: ans.answer,
            timestamp: ans.answeredAt,
            dbId: ans.id
          }));
          setSelectableAnswers(formattedAnswers);
          setSelectedAnswerIds([]);
          // Don't reset selectedProblemId here - keep it if it was already set
        } catch (error) {
          console.error('Error loading problems:', error);
          setSelectableAnswers([]);
        }
      };
      loadProblems();
    } else {
      setSelectableAnswers([]);
      setSelectedAnswerIds([]);
      // Don't reset selectedProblemId when moving to other questions - keep it for prompt generation
    }
    
    // Load transition count for verification-go-to-implementation question
    if (question?.id === 'verification-go-to-implementation') {
      const loadTransitionCount = async () => {
        try {
          const count = await getTransitionCount('Verifying', 'Implementing');
          setVerificationTransitionCount(count);
        } catch (error) {
          console.error('Error loading transition count:', error);
          setVerificationTransitionCount(0);
        }
      };
      loadTransitionCount();
    }
    
    setTextAnswer('');
    
    if (question?.showData) {
      loadDisplayData(question.showData);
    } else {
      setDisplayData(null);
      setDisplayDataLabel('');
    }
  }, [currentQuestionId, flow, loadDisplayData]);

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

  const handleAnswer = async (answer: string | boolean) => {
    const answerRecord: QuestionAnswer = {
      questionId: currentQuestion.id,
      answer,
      answeredAt: new Date().toISOString(),
    };

    setAnswers({ ...answers, [currentQuestion.id]: answer });
    onAnswerSave(answerRecord);
    
    if (currentQuestion.type === 'text') {
      setTextAnswer('');
    }

    let nextQuestionId: string | undefined;
    let nextSituation: Situation | undefined;

    // Special handling for verification-go-to-implementation question
    if (currentQuestion.id === 'verification-go-to-implementation' && answer === true) {
      const currentCount = await getTransitionCount('Verifying', 'Implementing');
      if (currentCount >= 5) {
        alert('연속으로 Implementation으로 돌아간 횟수가 5회에 도달했습니다. 더 이상 돌아갈 수 없습니다.');
        nextQuestionId = 'all-criteria-met';
      } else {
        await incrementTransitionCount('Verifying', 'Implementing');
        nextSituation = 'Implementing';
      }
    } 
    // Special handling for cycle-complete question
    else if (currentQuestion.id === 'cycle-complete' && answer === true) {
      const cycleId = await getCurrentCycleId();
      if (cycleId) {
        await completeCycle(cycleId);
      }
      nextSituation = 'CollectingFeedback';
    } 
    else if (currentQuestion.type === 'yesno') {
      if (answer === true && currentQuestion.onYesNextQuestionId) {
        nextQuestionId = currentQuestion.onYesNextQuestionId;
      } else if (answer === true && currentQuestion.onYesNextSituation) {
        nextSituation = currentQuestion.onYesNextSituation;
      } else if (answer === false && currentQuestion.onNoNextQuestionId) {
        nextQuestionId = currentQuestion.onNoNextQuestionId;
      } else if (answer === false && currentQuestion.onNoNextSituation) {
        nextSituation = currentQuestion.onNoNextSituation;
      }
    } else if (currentQuestion.type === 'text') {
      if (currentQuestion.onAnswerNextSituation) {
        nextSituation = currentQuestion.onAnswerNextSituation;
      } else if (currentQuestion.nextQuestionId) {
        nextQuestionId = currentQuestion.nextQuestionId;
      } else if (currentQuestion.nextSituation) {
        nextSituation = currentQuestion.nextSituation;
      }
    } else if (currentQuestion.onAnswerNextSituation) {
      nextSituation = currentQuestion.onAnswerNextSituation;
    } else if (currentQuestion.nextQuestionId) {
      nextQuestionId = currentQuestion.nextQuestionId;
    }

    // Reset transition count when moving to a different situation (except Verifying -> Implementing)
    if (nextSituation && nextSituation !== 'Implementing' && situation === 'Verifying') {
      await resetTransitionCount('Verifying', 'Implementing');
    }
    // Reset transition count when moving from Implementing to a situation other than Verifying
    if (nextSituation && situation === 'Implementing' && nextSituation !== 'Verifying') {
      await resetTransitionCount('Verifying', 'Implementing');
    }

    if (nextSituation) {
      setTimeout(() => {
        onComplete(nextSituation);
      }, 300);
    } else if (nextQuestionId) {
      setQuestionHistory([...questionHistory, nextQuestionId]);
      setCurrentQuestionId(nextQuestionId);
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
        const showDataForYesNo = currentQuestion.showData && displayData;
        const hasAIPrompt = currentQuestion.aiPromptTemplate !== undefined;
        const isVerificationGoToImplementation = currentQuestion.id === 'verification-go-to-implementation';
        const isTransitionLimitReached = isVerificationGoToImplementation && verificationTransitionCount >= 5;
        
        return (
          <div style={{ marginTop: '16px' }}>
            {showDataForYesNo && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {displayDataLabel}:
                </div>
                <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  {displayData}
                </div>
              </div>
            )}
            {isVerificationGoToImplementation && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: isTransitionLimitReached ? '#fee2e2' : '#eff6ff',
                border: `1px solid ${isTransitionLimitReached ? '#ef4444' : '#3b82f6'}`,
                borderRadius: '8px',
                fontSize: '14px',
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: isTransitionLimitReached ? '#991b1b' : '#1e40af' }}>
                  연속 전환 횟수: {verificationTransitionCount} / 5
                </div>
                {isTransitionLimitReached && (
                  <div style={{ color: '#991b1b', fontSize: '13px' }}>
                    최대 연속 횟수(5회)에 도달했습니다. 더 이상 Implementation으로 돌아갈 수 없습니다.
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleAnswer(true)}
                disabled={isTransitionLimitReached}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: isTransitionLimitReached ? '#9ca3af' : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isTransitionLimitReached ? 'not-allowed' : 'pointer',
                  flex: 1,
                  minWidth: '120px',
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
                  minWidth: '120px',
                }}
              >
                아니오
              </button>
              {hasAIPrompt && (
                <button
                  onClick={handleShowAIPromptInputs}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    flex: 1,
                    minWidth: '160px',
                  }}
                >
                  답변하기 어려워요
                </button>
              )}
            </div>
            {showAIPromptInputs && currentQuestion.aiPromptTemplate?.inputFields && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                }}>
                  프롬프트에 필요한 정보 입력
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentQuestion.aiPromptTemplate.inputFields?.map(field => (
                    <div key={field.id}>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                      }}>
                        {field.label}
                        {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                      </label>
                      <textarea
                        value={aiPromptInputs[field.id] || ''}
                        onChange={(e) => setAiPromptInputs({ ...aiPromptInputs, [field.id]: e.target.value })}
                        placeholder={field.placeholder || `${field.label}을(를) 입력하세요...`}
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  ))}
                  
                  {currentQuestion.aiPromptTemplate.selectableAnswers && (
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                      }}>
                        {currentQuestion.aiPromptTemplate.selectableAnswers.label}
                      </label>
                      {selectableAnswers.length === 0 ? (
                        <div style={{
                          padding: '12px',
                          fontSize: '13px',
                          color: '#9ca3af',
                          fontStyle: 'italic',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '6px',
                        }}>
                          선택 가능한 이전 답변이 없습니다.
                        </div>
                      ) : (
                        <div style={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                        }}>
                          {selectableAnswers.map(ans => (
                            <label key={ans.id} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              backgroundColor: selectedAnswerIds.includes(ans.id) ? '#eff6ff' : '#ffffff',
                            }}>
                              <input
                                type="checkbox"
                                checked={selectedAnswerIds.includes(ans.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAnswerIds([...selectedAnswerIds, ans.id]);
                                  } else {
                                    setSelectedAnswerIds(selectedAnswerIds.filter(id => id !== ans.id));
                                  }
                                }}
                                style={{
                                  marginTop: '2px',
                                  marginRight: '10px',
                                  cursor: 'pointer',
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '13px',
                                  color: '#374151',
                                  marginBottom: '4px',
                                  lineHeight: '1.4',
                                }}>
                                  {ans.text}
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: '#9ca3af',
                                }}>
                                  {new Date(ans.timestamp).toLocaleString('ko-KR')}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => handleGenerateAIPrompt(aiPromptInputs)}
                      disabled={currentQuestion.aiPromptTemplate.inputFields?.some(f => 
                        f.required && !aiPromptInputs[f.id]?.trim()
                      )}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        backgroundColor: currentQuestion.aiPromptTemplate.inputFields?.some(f => 
                          f.required && !aiPromptInputs[f.id]?.trim()
                        ) ? '#9ca3af' : '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: currentQuestion.aiPromptTemplate.inputFields?.some(f => 
                          f.required && !aiPromptInputs[f.id]?.trim()
                        ) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      프롬프트 생성
                    </button>
                    <button
                      onClick={() => {
                        setShowAIPromptInputs(false);
                        setAiPromptInputs({});
                        setSelectedAnswerIds([]);
                      }}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        backgroundColor: '#ffffff',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showAIPrompt && aiPrompt && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}>
                    AI 프롬프트
                  </h4>
                  <button
                    onClick={handleCopyPrompt}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: copyStatus === 'success' ? '#10b981' : copyStatus === 'error' ? '#ef4444' : '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      transform: copyStatus === 'success' ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <span style={{
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      {copyStatus === 'success' ? '✓ Copied!' : copyStatus === 'error' ? '✗ Failed' : 'Copy'}
                    </span>
                    {copyStatus === 'success' && (
                      <span style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '40px',
                        opacity: 0,
                        animation: 'confetti 0.6s ease-out',
                      }}>
                        🎉
                      </span>
                    )}
                  </button>
                </div>
                <pre style={{
                  margin: 0,
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {aiPrompt}
                </pre>
              </div>
            )}
          </div>
        );

      case 'text':
        // Special handling for problem-select question
        if (currentQuestion.id === 'problem-select' && currentQuestion.aiPromptTemplate?.selectableAnswers) {
          return (
            <div style={{ marginTop: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  {currentQuestion.aiPromptTemplate.selectableAnswers.label}
                </label>
                {selectableAnswers.length === 0 ? (
                  <div style={{
                    padding: '12px',
                    fontSize: '13px',
                    color: '#9ca3af',
                    fontStyle: 'italic',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                  }}>
                    선택 가능한 문제가 없습니다.
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    marginBottom: '16px',
                  }}>
                    {selectableAnswers.map(ans => (
                      <label key={ans.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: selectedAnswerIds.includes(ans.id) ? '#eff6ff' : '#ffffff',
                      }}>
                        <input
                          type="radio"
                          name="problem-select"
                          checked={selectedAnswerIds.includes(ans.id)}
                          onChange={() => {
                            setSelectedAnswerIds([ans.id]);
                            if (ans.dbId) {
                              setSelectedProblemId(ans.dbId);
                            }
                          }}
                          style={{
                            marginTop: '2px',
                            marginRight: '10px',
                            cursor: 'pointer',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            color: '#374151',
                            marginBottom: '4px',
                            lineHeight: '1.4',
                          }}>
                            {ans.text}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#9ca3af',
                          }}>
                            {new Date(ans.timestamp).toLocaleString('ko-KR')}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (selectedAnswerIds.length > 0) {
                    const selectedAnswer = selectableAnswers.find(ans => selectedAnswerIds.includes(ans.id));
                    if (selectedAnswer) {
                      console.log('[DEBUG] Problem selected:', selectedAnswer.text);
                      console.log('[DEBUG] Problem ID:', selectedAnswer.dbId);
                      if (selectedAnswer.dbId) {
                        setSelectedProblemId(selectedAnswer.dbId);
                        console.log('[DEBUG] Set selectedProblemId to:', selectedAnswer.dbId);
                      }
                      handleAnswer(selectedAnswer.text);
                    }
                  }
                }}
                disabled={selectedAnswerIds.length === 0}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: selectedAnswerIds.length > 0 ? '#3b82f6' : '#9ca3af',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedAnswerIds.length > 0 ? 'pointer' : 'not-allowed',
                  width: '100%',
                }}
              >
                선택하고 다음
              </button>
            </div>
          );
        }
        
        const showDataForText = currentQuestion.showData && displayData;
        const hasAIPromptForText = currentQuestion.aiPromptTemplate !== undefined;
        
        return (
          <div style={{ marginTop: '16px' }}>
            {showDataForText && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {displayDataLabel}:
                </div>
                <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  {displayData}
                </div>
              </div>
            )}
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={showDataForText ? `${displayDataLabel}를 참고하여 답변을 입력하세요...` : "답변을 입력하세요..."}
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
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={handleTextSubmit}
                disabled={!textAnswer.trim()}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: textAnswer.trim() ? '#3b82f6' : '#9ca3af',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: textAnswer.trim() ? 'pointer' : 'not-allowed',
                  flex: 1,
                }}
              >
                저장하고 다음
              </button>
              {hasAIPromptForText && (
                <button
                  onClick={handleShowAIPromptInputs}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                  답변하기 어려워요
                </button>
              )}
            </div>
            {showAIPromptInputs && currentQuestion.aiPromptTemplate && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                }}>
                  프롬프트에 필요한 정보 입력
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentQuestion.aiPromptTemplate.inputFields?.map(field => (
                    <div key={field.id}>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                      }}>
                        {field.label}
                        {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                      </label>
                      <textarea
                        value={aiPromptInputs[field.id] || ''}
                        onChange={(e) => setAiPromptInputs({ ...aiPromptInputs, [field.id]: e.target.value })}
                        placeholder={field.placeholder || `${field.label}을(를) 입력하세요...`}
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  ))}
                  
                  {currentQuestion.aiPromptTemplate.selectableAnswers && (
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                      }}>
                        {currentQuestion.aiPromptTemplate.selectableAnswers.label}
                      </label>
                      {selectableAnswers.length === 0 ? (
                        <div style={{
                          padding: '12px',
                          fontSize: '13px',
                          color: '#9ca3af',
                          fontStyle: 'italic',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '6px',
                        }}>
                          선택 가능한 이전 답변이 없습니다.
                        </div>
                      ) : (
                        <div style={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                        }}>
                          {selectableAnswers.map(ans => (
                            <label key={ans.id} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              backgroundColor: selectedAnswerIds.includes(ans.id) ? '#eff6ff' : '#ffffff',
                            }}>
                              <input
                                type="checkbox"
                                checked={selectedAnswerIds.includes(ans.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAnswerIds([...selectedAnswerIds, ans.id]);
                                  } else {
                                    setSelectedAnswerIds(selectedAnswerIds.filter(id => id !== ans.id));
                                  }
                                }}
                                style={{
                                  marginTop: '2px',
                                  marginRight: '10px',
                                  cursor: 'pointer',
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '13px',
                                  color: '#374151',
                                  marginBottom: '4px',
                                  lineHeight: '1.4',
                                }}>
                                  {ans.text}
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: '#9ca3af',
                                }}>
                                  {new Date(ans.timestamp).toLocaleString('ko-KR')}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => handleGenerateAIPrompt(aiPromptInputs)}
                      disabled={currentQuestion.aiPromptTemplate.inputFields?.some(f => 
                        f.required && !aiPromptInputs[f.id]?.trim()
                      )}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        backgroundColor: currentQuestion.aiPromptTemplate.inputFields?.some(f => 
                          f.required && !aiPromptInputs[f.id]?.trim()
                        ) ? '#9ca3af' : '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: currentQuestion.aiPromptTemplate.inputFields?.some(f => 
                          f.required && !aiPromptInputs[f.id]?.trim()
                        ) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      프롬프트 생성
                    </button>
                    <button
                      onClick={() => {
                        setShowAIPromptInputs(false);
                        setAiPromptInputs({});
                        setSelectedAnswerIds([]);
                      }}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        backgroundColor: '#ffffff',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showAIPrompt && aiPrompt && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}>
                    AI 프롬프트
                  </h4>
                  <button
                    onClick={handleCopyPrompt}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: copyStatus === 'success' ? '#10b981' : copyStatus === 'error' ? '#ef4444' : '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      transform: copyStatus === 'success' ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <span style={{
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      {copyStatus === 'success' ? '✓ Copied!' : copyStatus === 'error' ? '✗ Failed' : 'Copy'}
                    </span>
                    {copyStatus === 'success' && (
                      <span style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '40px',
                        opacity: 0,
                        animation: 'confetti 0.6s ease-out',
                      }}>
                        🎉
                      </span>
                    )}
                  </button>
                </div>
                <pre style={{
                  margin: 0,
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {aiPrompt}
                </pre>
              </div>
            )}
          </div>
        );

      case 'multiple':
        return (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQuestion.options?.map((option, index) => {
              const validSituations: Situation[] = [
                'DefiningIntent', 'FailingIntent', 'SelectingProblem', 'DefiningAcceptance',
                'CheckingFeasibility', 'Designing', 'BreakingTasks', 'Implementing',
                'Verifying', 'Verified', 'Releasing', 'CollectingFeedback', 'Learning', 'Ending'
              ];
              
              let nextSituation: Situation | undefined;
              
              if (option === '새로운 문제 선택') {
                nextSituation = 'SelectingProblem';
              } else if (option === '같은 문제 심화') {
                nextSituation = 'DefiningAcceptance';
              } else if (option === 'Intent 조정') {
                nextSituation = 'DefiningIntent';
              } else if (option === '완료') {
                nextSituation = 'Ending';
              } else if (option === 'feasible') {
                nextSituation = 'Designing';
              } else if (option === 'too hard' || option === 'problem too big') {
                nextSituation = 'SelectingProblem';
              } else if (validSituations.includes(option as Situation)) {
                nextSituation = option as Situation;
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

// Add confetti animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes confetti {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0) rotate(0deg);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(2) rotate(360deg);
    }
  }
`;
if (!document.head.querySelector('style[data-confetti-interactive]')) {
  style.setAttribute('data-confetti-interactive', 'true');
  document.head.appendChild(style);
}

export default InteractiveFlow;
