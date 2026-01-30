/**
 * @fileoverview Interactive question flow component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Situation, QuestionAnswer, SituationFlow, QuestionDataDisplay } from '../types';
import { getSituationFlows } from '../data/data-loader';
import { generatePrompt, buildPromptContext } from '../utils/prompt-generator';
import { getTransitionCount, incrementTransitionCount, resetTransitionCount, getCurrentCycleId, completeCycle, getPreviousCyclesAnswers, addCycleContext, removeCycleContext, getCycleContext } from '../data/db';

/**
 * @brief Previous cycle answer structure
 */
interface PreviousCycleAnswer {
  id: number;
  questionId: string;
  answer: string;
  situation: string;
  answeredAt: string;
  cycleId: number;
  cycleNumber: number;
}

/**
 * @brief Selected context structure
 */
interface SelectedContext {
  id: number;
  sourceAnswerId: number;
  questionId: string;
  answerText: string;
  situation: string;
  cycleNumber?: number;
}

/**
 * @brief Props for InteractiveFlow component
 */
interface InteractiveFlowProps {
  situation: Situation;
  initialQuestionId?: string | null;
  selectedCycleId?: number | null;
  onComplete: (nextSituation: Situation | null) => void;
  onAnswerSave: (answer: QuestionAnswer) => Promise<void>;
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
  selectedCycleId,
  onComplete,
  onAnswerSave,
}) => {
  const [flow, setFlow] = useState<SituationFlow | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [textAnswers, setTextAnswers] = useState<string[]>(['']);
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
  
  // Context selection state
  const [showContextSelector, setShowContextSelector] = useState<boolean>(false);
  const [previousCyclesAnswers, setPreviousCyclesAnswers] = useState<Array<{
    cycleId: number;
    cycleNumber: number;
    startedAt: string;
    completedAt: string | null;
    answers: PreviousCycleAnswer[];
  }>>([]);
  const [selectedContexts, setSelectedContexts] = useState<SelectedContext[]>([]);
  const [expandedCycles, setExpandedCycles] = useState<Set<number>>(new Set());
  
  const currentQuestionIdRef = useRef<string | null>(null);

  // Load previous cycles answers and saved contexts for Dumping situation
  useEffect(() => {
    const loadContextData = async () => {
      if (situation !== 'Dumping') {
        return;
      }
      
      try {
        const currentCycleId = await getCurrentCycleId();
        
        // Load previous cycles answers
        const prevCycles = await getPreviousCyclesAnswers(currentCycleId);
        const formattedCycles = prevCycles.map(cycle => ({
          ...cycle,
          answers: cycle.answers.map(ans => ({
            ...ans,
            cycleId: cycle.cycleId,
            cycleNumber: cycle.cycleNumber,
          })),
        }));
        setPreviousCyclesAnswers(formattedCycles);
        
        // Load saved contexts for current cycle
        if (currentCycleId !== null) {
          const savedContexts = await getCycleContext(currentCycleId);
          const formattedContexts: SelectedContext[] = savedContexts.map(ctx => {
            const sourceCycle = prevCycles.find(c => c.cycleId === ctx.sourceCycleId);
            return {
              id: ctx.id,
              sourceAnswerId: ctx.sourceAnswerId,
              questionId: ctx.questionId,
              answerText: ctx.answerText,
              situation: ctx.situation,
              cycleNumber: sourceCycle?.cycleNumber,
            };
          });
          setSelectedContexts(formattedContexts);
        }
      } catch (error) {
        console.error('Error loading context data:', error);
      }
    };
    
    loadContextData();
  }, [situation]);

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
                  // Get all answers from current cycle, not just the most recent one
                  const allAnswers = await db.getAllAnswersByQuestionIdInCycle(startQuestion.showData.sourceParam, selectedCycleId);
                  if (allAnswers.length > 0) {
                    if (allAnswers.length === 1) {
                      data = allAnswers[0].answer;
                    } else {
                      data = allAnswers.map((a, index) => `${index + 1}. ${a.answer}`).join('\n\n');
                    }
                  }
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
            // Get all answers from current cycle, not just the most recent one
            const allAnswers = await db.getAllAnswersByQuestionIdInCycle(showData.sourceParam, selectedCycleId);
            if (allAnswers.length > 0) {
              // Format multiple answers with numbering
              if (allAnswers.length === 1) {
                data = allAnswers[0].answer;
              } else {
                data = allAnswers.map((a, index) => `${index + 1}. ${a.answer}`).join('\n\n');
              }
            }
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
  }, [selectedCycleId]);

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
      
      const context = await buildPromptContext(situation, selectedProblemIdForPrompt, selectedCycleId);
      
      console.log('[DEBUG] Context problem:', context.problem);
      console.log('[DEBUG] Context acceptanceCriteria:', context.acceptanceCriteria);
      console.log('[DEBUG] Context selectedContext:', context.selectedContext);
      
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
  }, [flow, currentQuestionId, situation, selectableAnswers, selectedAnswerIds, selectedProblemId, selectedCycleId]);

  /**
   * @brief Show AI prompt input form
   * 
   * @pre currentQuestion has aiPromptTemplate
   * @post Input form is displayed
   */
  /**
   * @brief Add a previous cycle answer to current cycle context
   */
  const handleAddContext = useCallback(async (answer: PreviousCycleAnswer) => {
    const currentCycleId = await getCurrentCycleId();
    if (currentCycleId === null) {
      return;
    }
    
    // Check if already added
    if (selectedContexts.some(ctx => ctx.sourceAnswerId === answer.id)) {
      return;
    }
    
    try {
      const contextId = await addCycleContext(
        currentCycleId,
        answer.cycleId,
        answer.id,
        answer.questionId,
        answer.answer,
        answer.situation
      );
      
      setSelectedContexts(prev => [...prev, {
        id: contextId,
        sourceAnswerId: answer.id,
        questionId: answer.questionId,
        answerText: answer.answer,
        situation: answer.situation,
        cycleNumber: answer.cycleNumber,
      }]);
    } catch (error) {
      console.error('Error adding context:', error);
    }
  }, [selectedContexts]);

  /**
   * @brief Remove a context from current cycle
   */
  const handleRemoveContext = useCallback(async (contextId: number) => {
    try {
      await removeCycleContext(contextId);
      setSelectedContexts(prev => prev.filter(ctx => ctx.id !== contextId));
    } catch (error) {
      console.error('Error removing context:', error);
    }
  }, []);

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
    setTextAnswers(['']);
    
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
                <div style={{ color: '#6b7280', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
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
        
        // Check if multiple answers are allowed
        const allowMultipleAnswers = currentQuestion.allowMultiple !== false;
        const hasValidAnswers = allowMultipleAnswers 
          ? textAnswers.some(a => a.trim())
          : textAnswer.trim();
        
        const handleMultiTextSubmit = async () => {
          if (allowMultipleAnswers) {
            const validAnswers = textAnswers.filter(a => a.trim());
            if (validAnswers.length > 0) {
              // Save each answer separately to database
              for (let i = 0; i < validAnswers.length; i++) {
                const answerRecord: QuestionAnswer = {
                  questionId: currentQuestion.id,
                  answer: validAnswers[i],
                  answeredAt: new Date().toISOString(),
                };
                await onAnswerSave(answerRecord);
                console.log(`[DEBUG] Saved answer ${i + 1}/${validAnswers.length}: ${validAnswers[i].substring(0, 30)}`);
              }
              console.log(`[DEBUG] All ${validAnswers.length} answers saved for ${currentQuestion.id}`);
              
              // Clear input and navigate (use last answer for state tracking)
              setTextAnswers(['']);
              setAnswers({ ...answers, [currentQuestion.id]: validAnswers[validAnswers.length - 1] });
              
              // Handle navigation
              let nextQuestionId: string | undefined;
              let nextSituation: Situation | undefined;
              
              if (currentQuestion.onAnswerNextSituation) {
                nextSituation = currentQuestion.onAnswerNextSituation;
              } else if (currentQuestion.nextQuestionId) {
                nextQuestionId = currentQuestion.nextQuestionId;
              } else if (currentQuestion.nextSituation) {
                nextSituation = currentQuestion.nextSituation;
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
            }
          } else {
            handleTextSubmit();
          }
        };
        
        // Check if this is Dumping situation for context selection
        const isDumpingSituation = situation === 'Dumping';
        
        return (
          <div style={{ marginTop: '16px' }}>
            {/* Context Selection for Dumping */}
            {isDumpingSituation && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#fefce8',
                border: '1px solid #fde047',
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
                    color: '#854d0e',
                  }}>
                    이전 Cycle Context ({selectedContexts.length}개 선택됨)
                  </h4>
                  <button
                    onClick={() => setShowContextSelector(!showContextSelector)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: showContextSelector ? '#fde047' : '#fef9c3',
                      color: '#854d0e',
                      border: '1px solid #fde047',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    {showContextSelector ? '선택 닫기' : '이전 답변에서 선택'}
                  </button>
                </div>
                
                {/* Selected Contexts Display */}
                {selectedContexts.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: showContextSelector ? '16px' : '0',
                  }}>
                    {selectedContexts.map(ctx => (
                      <div key={ctx.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            marginBottom: '4px',
                          }}>
                            Cycle #{ctx.cycleNumber} - {ctx.situation}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#374151',
                            lineHeight: '1.4',
                            whiteSpace: 'pre-wrap',
                          }}>
                            {ctx.answerText.length > 200 ? ctx.answerText.slice(0, 200) + '...' : ctx.answerText}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveContext(ctx.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Context Selector */}
                {showContextSelector && (
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                  }}>
                    {previousCyclesAnswers.length === 0 ? (
                      <div style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#9ca3af',
                        fontSize: '13px',
                      }}>
                        이전 Cycle 답변이 없습니다.
                      </div>
                    ) : (
                      previousCyclesAnswers.map(cycle => (
                        <div key={cycle.cycleId}>
                          <div
                            onClick={() => {
                              setExpandedCycles(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(cycle.cycleId)) {
                                  newSet.delete(cycle.cycleId);
                                } else {
                                  newSet.add(cycle.cycleId);
                                }
                                return newSet;
                              });
                            }}
                            style={{
                              padding: '10px 12px',
                              backgroundColor: '#f9fafb',
                              borderBottom: '1px solid #e5e7eb',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#374151',
                            }}>
                              Cycle #{cycle.cycleNumber}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              color: '#6b7280',
                            }}>
                              {expandedCycles.has(cycle.cycleId) ? '▼' : '▶'} {cycle.answers.length}개 답변
                            </span>
                          </div>
                          
                          {expandedCycles.has(cycle.cycleId) && (
                            <div>
                              {cycle.answers.map(answer => {
                                const isSelected = selectedContexts.some(ctx => ctx.sourceAnswerId === answer.id);
                                return (
                                  <div
                                    key={answer.id}
                                    style={{
                                      padding: '10px 12px 10px 24px',
                                      borderBottom: '1px solid #f3f4f6',
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px',
                                      backgroundColor: isSelected ? '#fef9c3' : '#ffffff',
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      <div style={{
                                        fontSize: '11px',
                                        color: '#9ca3af',
                                        marginBottom: '4px',
                                      }}>
                                        [{answer.situation}] {new Date(answer.answeredAt).toLocaleString('ko-KR')}
                                      </div>
                                      <div style={{
                                        fontSize: '13px',
                                        color: '#374151',
                                        lineHeight: '1.4',
                                        whiteSpace: 'pre-wrap',
                                      }}>
                                        {answer.answer.length > 150 ? answer.answer.slice(0, 150) + '...' : answer.answer}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (isSelected) {
                                          const ctx = selectedContexts.find(c => c.sourceAnswerId === answer.id);
                                          if (ctx) {
                                            handleRemoveContext(ctx.id);
                                          }
                                        } else {
                                          handleAddContext(answer);
                                        }
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '12px',
                                        backgroundColor: isSelected ? '#fee2e2' : '#dbeafe',
                                        color: isSelected ? '#dc2626' : '#1d4ed8',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {isSelected ? '제거' : '추가'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                <p style={{
                  margin: '12px 0 0 0',
                  fontSize: '12px',
                  color: '#a16207',
                }}>
                  선택한 context는 AI 프롬프트 생성 시 자동으로 포함됩니다.
                </p>
              </div>
            )}
            
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
                <div style={{ color: '#6b7280', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                  {displayData}
                </div>
              </div>
            )}
            
            {allowMultipleAnswers ? (
              /* Multiple answer inputs */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {textAnswers.map((answer, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      flexShrink: 0,
                      marginTop: '8px',
                    }}>
                      {index + 1}
                    </div>
                    <textarea
                      value={answer}
                      onChange={(e) => {
                        const newAnswers = [...textAnswers];
                        newAnswers[index] = e.target.value;
                        setTextAnswers(newAnswers);
                      }}
                      placeholder={isDumpingSituation ? "현재 머리속에 생각나는 것들을 모두 입력해보세요" : (showDataForText ? `${displayDataLabel}를 참고하여 답변을 입력하세요...` : "답변을 입력하세요...")}
                      style={{
                        flex: 1,
                        minHeight: '80px',
                        padding: '12px',
                        fontSize: '14px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                    {textAnswers.length > 1 && (
                      <button
                        onClick={() => {
                          const newAnswers = textAnswers.filter((_, i) => i !== index);
                          setTextAnswers(newAnswers);
                        }}
                        style={{
                          padding: '8px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginTop: '8px',
                          fontSize: '16px',
                          lineHeight: 1,
                        }}
                        title="삭제"
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={() => setTextAnswers([...textAnswers, ''])}
                  style={{
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px dashed #9ca3af',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
                  답변 추가
                </button>
              </div>
            ) : (
              /* Single answer input */
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder={isDumpingSituation ? "현재 머리속에 생각나는 것들을 모두 입력해보세요" : (showDataForText ? `${displayDataLabel}를 참고하여 답변을 입력하세요...` : "답변을 입력하세요...")}
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
            )}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={handleMultiTextSubmit}
                disabled={!hasValidAnswers}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: hasValidAnswers ? '#3b82f6' : '#9ca3af',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: hasValidAnswers ? 'pointer' : 'not-allowed',
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
                'Verifying', 'Verified', 'Releasing', 'CollectingFeedback', 'Learning', 'Ending', 'Unconscious'
              ];
              
              let nextSituation: Situation | undefined;
              
              if (option === '새로운 문제 선택') {
                nextSituation = 'SelectingProblem';
              } else if (option === '새 Cycle 시작') {
                nextSituation = 'Dumping';
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
