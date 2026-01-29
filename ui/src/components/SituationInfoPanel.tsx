/**
 * @fileoverview Panel displaying information about the selected situation
 */

import React, { useState, useEffect } from 'react';
import { Situation, QuestionAnswer, SituationGuide } from '../types';
import { situationDefinitions } from '../data/situations';
import { InteractiveFlow } from './InteractiveFlow';
import { SituationAnswers } from './SituationAnswers';
import { getSituationGuides, getSituationFlows } from '../data/data-loader';

/**
 * @brief Props for SituationInfoPanel component
 */
interface SituationInfoPanelProps {
  situation: Situation | null;
  initialQuestionId?: string | null;
  onSituationChange?: (situation: Situation) => void;
}

/**
 * @brief Panel component displaying situation details and guide
 * 
 * @param situation - Currently selected situation
 * @return React component showing situation information
 * 
 * @pre situation must be a valid Situation or null
 * @post Panel displays situation information or placeholder if none selected
 */
export const SituationInfoPanel: React.FC<SituationInfoPanelProps> = ({ 
  situation, 
  initialQuestionId,
  onSituationChange 
}) => {
  const [guide, setGuide] = useState<SituationGuide | undefined>(undefined);
  const [hasFlow, setHasFlow] = useState<boolean>(false);
  const [showFlow, setShowFlow] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [answersUpdated, setAnswersUpdated] = useState<number>(0);

  const handleAnswerSave = async (answer: QuestionAnswer) => {
    if (!situation) {
      return;
    }
    
    try {
      const { saveAnswer } = await import('../data/db');
      await saveAnswer(
        answer.questionId,
        situation,
        answer.answer,
        answer.answeredAt
      );
      setAnswersUpdated(prev => prev + 1);
    } catch (error) {
      console.error('Failed to save answer to database:', error);
    }
  };

  const handleFlowComplete = (nextSituation: Situation | null) => {
    if (nextSituation && onSituationChange) {
      onSituationChange(nextSituation);
    } else {
      setShowFlow(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!situation) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [guides, flows] = await Promise.all([
          getSituationGuides(),
          getSituationFlows(),
        ]);

        setGuide(guides[situation]);
        const hasFlowForSituation = flows[situation] !== undefined;
        setHasFlow(hasFlowForSituation);
        setShowFlow(hasFlowForSituation);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [situation]);

  if (!situation) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderLeft: '4px solid #e5e7eb',
        borderRadius: '8px',
        minHeight: '200px',
      }}>
        <h3 style={{ marginTop: 0, color: '#6b7280' }}>No Situation Selected</h3>
        <p style={{ color: '#9ca3af' }}>
          Select a situation from the graph to view its details and guide.
        </p>
      </div>
    );
  }

  const definition = situationDefinitions[situation];

  if (!definition) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderLeft: '4px solid #e5e7eb',
        borderRadius: '8px',
        minHeight: '200px',
      }}>
        <h3 style={{ marginTop: 0, color: '#6b7280' }}>Situation Definition Not Found</h3>
        <p style={{ color: '#9ca3af' }}>
          Definition for situation "{situation}" is not available.
        </p>
      </div>
    );
  }

  const sectionStyle = {
    marginTop: '24px',
  };

  const sectionTitleStyle = {
    marginTop: 0,
    marginBottom: '12px',
    color: '#374151',
    fontSize: '16px',
    fontWeight: '600',
  };

  const contentStyle = {
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '8px',
  };

  const listItemStyle = {
    padding: '8px 0',
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.5',
    borderBottom: '1px solid #e5e7eb',
  };

  const quickCheckItemStyle = {
    padding: '8px 0',
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.5',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  };

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#ffffff',
      borderLeft: '4px solid #3b82f6',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      <h2 style={{
        marginTop: 0,
        marginBottom: '12px',
        color: '#1f2937',
        fontSize: '24px',
      }}>
        {situation}
      </h2>
      
      <p style={{
        color: '#4b5563',
        marginBottom: '24px',
        fontSize: '16px',
        lineHeight: '1.6',
      }}>
        {definition.description}
      </p>

      {loading && (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: '#6b7280',
        }}>
          데이터 로딩 중...
        </div>
      )}

      {!loading && hasFlow && showFlow && (
        <div style={{ marginBottom: '32px' }}>
          <InteractiveFlow
            situation={situation}
            initialQuestionId={initialQuestionId}
            onComplete={handleFlowComplete}
            onAnswerSave={handleAnswerSave}
          />
        </div>
      )}

      {!loading && situation && (
        <div style={{ marginBottom: '32px' }}>
          <SituationAnswers situation={situation} refreshTrigger={answersUpdated} />
        </div>
      )}

      {guide && (
        <div style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '2px solid #e5e7eb',
        }}>
          <h3 style={{
            marginTop: 0,
            marginBottom: '16px',
            color: '#6b7280',
            fontSize: '14px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            참고 정보
          </h3>

          <div style={sectionStyle}>
            <h4 style={{
              ...sectionTitleStyle,
              fontSize: '14px',
              color: '#6b7280',
            }}>
              해야 할 것
            </h4>
            <p style={{
              ...contentStyle,
              fontSize: '13px',
            }}>
              {guide.whatToDo}
            </p>
          </div>

          <div style={sectionStyle}>
            <h4 style={{
              ...sectionTitleStyle,
              fontSize: '14px',
              color: '#6b7280',
            }}>
              다음 단계 조건
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {guide.conditionsToProceed.map((condition, index) => (
                <li key={index} style={{
                  ...listItemStyle,
                  fontSize: '13px',
                }}>
                  <span style={{ color: '#3b82f6', marginRight: '8px' }}>✓</span>
                  {condition}
                </li>
              ))}
            </ul>
          </div>

          <div style={sectionStyle}>
            <h4 style={{
              ...sectionTitleStyle,
              fontSize: '14px',
              color: '#6b7280',
            }}>
              실패
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {guide.failure.map((item, index) => (
                <li key={index} style={{
                  ...listItemStyle,
                  fontSize: '13px',
                }}>
                  <span style={{ color: '#ef4444', marginRight: '8px' }}>✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={sectionStyle}>
            <h4 style={{
              ...sectionTitleStyle,
              fontSize: '14px',
              color: '#6b7280',
            }}>
              되돌아갈 곳
            </h4>
            <p style={{
              ...contentStyle,
              fontSize: '13px',
            }}>
              {guide.goBackTo}
            </p>
          </div>

          <div style={sectionStyle}>
            <h4 style={{
              ...sectionTitleStyle,
              fontSize: '14px',
              color: '#6b7280',
            }}>
              주의
            </h4>
            <p style={{
              ...contentStyle,
              fontSize: '13px',
              padding: '10px',
              backgroundColor: '#fef3c7',
              borderLeft: '3px solid #f59e0b',
              borderRadius: '4px',
            }}>
              {guide.warning}
            </p>
          </div>

          <div style={sectionStyle}>
            <h4 style={{
              ...sectionTitleStyle,
              fontSize: '14px',
              color: '#6b7280',
            }}>
              팁
            </h4>
            <p style={{
              ...contentStyle,
              fontSize: '13px',
              padding: '10px',
              backgroundColor: '#dbeafe',
              borderLeft: '3px solid #3b82f6',
              borderRadius: '4px',
            }}>
              {guide.tip}
            </p>
          </div>

          <div style={sectionStyle}>
            <h4 style={{
              ...sectionTitleStyle,
              fontSize: '14px',
              color: '#6b7280',
            }}>
              AI 활용
            </h4>
            <p style={{
              ...contentStyle,
              fontSize: '13px',
            }}>
              {guide.aiUsage}
            </p>
          </div>

          <div style={{
            ...sectionStyle,
            padding: '12px',
            backgroundColor: '#f0fdf4',
            borderLeft: '3px solid #10b981',
            borderRadius: '4px',
          }}>
            <h4 style={{
              ...sectionTitleStyle,
              fontSize: '14px',
              color: '#059669',
              marginBottom: '10px',
            }}>
              빠른 체크 (30초)
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {guide.quickCheck.items.map((item, index) => (
                <li key={index} style={{
                  ...quickCheckItemStyle,
                  fontSize: '13px',
                }}>
                  <input
                    type="checkbox"
                    style={{
                      marginTop: '2px',
                      cursor: 'pointer',
                    }}
                  />
                  <span>{item.question}</span>
                </li>
              ))}
            </ul>
            <p style={{
              ...contentStyle,
              marginTop: '10px',
              fontWeight: '600',
              fontSize: '13px',
              color: '#059669',
            }}>
              → {guide.quickCheck.nextStep}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
