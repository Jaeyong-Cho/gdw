/**
 * @fileoverview Component displaying saved answers for a situation
 */

import React, { useState, useEffect } from 'react';
import { Situation } from '../types';
import { getAnswersBySituation } from '../data/db';
import { getSituationFlows } from '../data/data-loader';

/**
 * @brief Props for SituationAnswers component
 */
interface SituationAnswersProps {
  situation: Situation;
  refreshTrigger?: number;
}

/**
 * @brief Answer data structure
 */
interface AnswerData {
  questionId: string;
  answer: string;
  answeredAt: string;
  questionText?: string;
}

/**
 * @brief Component displaying saved answers for a situation
 * 
 * @param situation - Situation to display answers for
 * @return React component showing saved answers
 * 
 * @pre situation must be a valid Situation
 * @post Answers are displayed if available
 */
export const SituationAnswers: React.FC<SituationAnswersProps> = ({ situation, refreshTrigger = 0 }) => {
  const [answers, setAnswers] = useState<AnswerData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    const loadAnswers = async () => {
      setLoading(true);
      try {
        const [savedAnswers, flows] = await Promise.all([
          getAnswersBySituation(situation),
          getSituationFlows(),
        ]);

        const flow = flows[situation];
        const questionMap = new Map<string, string>();
        
        if (flow) {
          flow.questions.forEach(q => {
            questionMap.set(q.id, q.question);
          });
        }

        const answersWithQuestions = savedAnswers.map(answer => ({
          ...answer,
          questionText: questionMap.get(answer.questionId) || answer.questionId,
        }));

        setAnswers(answersWithQuestions);
      } catch (error) {
        console.error('Error loading answers:', error);
        setAnswers([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnswers();
  }, [situation, refreshTrigger]);

  if (loading) {
    return (
      <div style={{
        padding: '16px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px',
      }}>
        답변 로딩 중...
      </div>
    );
  }

  if (answers.length === 0) {
    return (
      <div style={{
        padding: '16px',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '14px',
        fontStyle: 'italic',
      }}>
        저장된 답변이 없습니다.
      </div>
    );
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const displayedAnswers = expanded ? answers : answers.slice(0, 3);

  return (
    <div style={{
      marginTop: '24px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
        }}
      >
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151',
        }}>
          저장된 답변 ({answers.length}개)
        </h3>
        <span style={{
          color: '#6b7280',
          fontSize: '14px',
        }}>
          {expanded ? '접기' : '더보기'}
        </span>
      </div>

      <div style={{
        maxHeight: expanded ? 'none' : '400px',
        overflowY: expanded ? 'visible' : 'auto',
      }}>
        {displayedAnswers.map((answer, index) => (
          <div
            key={`${answer.questionId}-${answer.answeredAt}`}
            style={{
              padding: '16px',
              borderBottom: index < displayedAnswers.length - 1 ? '1px solid #e5e7eb' : 'none',
              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
            }}
          >
            <div style={{
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
            }}>
              {answer.questionText}
            </div>
            <div style={{
              marginBottom: '8px',
              padding: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#1f2937',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {answer.answer}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#9ca3af',
            }}>
              {formatDate(answer.answeredAt)}
            </div>
          </div>
        ))}
      </div>

      {answers.length > 3 && (
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: '12px 16px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#3b82f6',
            fontWeight: '500',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          {expanded ? '접기' : `${answers.length - 3}개 더 보기`}
        </div>
      )}
    </div>
  );
};
