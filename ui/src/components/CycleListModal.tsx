/**
 * @fileoverview Modal component for displaying and restarting previous cycles
 */

import React, { useState, useEffect } from 'react';
import { getAllCycles, getCycleData } from '../data/db';
import { formatCycleAnswersAsMarkdown, copyToClipboard } from '../utils/cycle-markdown';

/**
 * @brief Props for CycleListModal component
 */
interface CycleListModalProps {
  onClose: () => void;
  onRestartCycle: (cycleId: number, lastSituation: string, lastQuestionId: string | null) => void;
}

/**
 * @brief Modal component displaying list of previous cycles
 * 
 * @param onClose - Callback to close the modal
 * @param onRestartCycle - Callback when restarting a cycle
 * @return React component showing cycle list
 * 
 * @pre None
 * @post Modal displays all cycles and allows restart
 */
export const CycleListModal: React.FC<CycleListModalProps> = ({
  onClose,
  onRestartCycle,
}) => {
  const [cycles, setCycles] = useState<Array<{
    id: number;
    cycleNumber: number;
    startedAt: string;
    completedAt: string | null;
    status: string;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [cycleDetails, setCycleDetails] = useState<{
    id: number;
    cycleNumber: number;
    startedAt: string;
    completedAt: string | null;
    status: string;
    lastSituation: string;
    lastQuestionId: string | null;
    answers: Array<{
      id: number;
      questionId: string;
      answer: string;
      answeredAt: string;
      situation: string;
    }>;
  } | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copiedCycleId, setCopiedCycleId] = useState<number | null>(null);

  useEffect(() => {
    const loadCycles = async () => {
      setLoading(true);
      try {
        const allCycles = await getAllCycles();
        setCycles(allCycles);
      } catch (error) {
        console.error('Error loading cycles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCycles();
  }, []);

  const handleCycleClick = async (cycleId: number) => {
    try {
      const details = await getCycleData(cycleId);
      setCycleDetails(details);
      setSelectedCycleId(cycleId);
    } catch (error) {
      console.error('Error loading cycle details:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}
    >
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}
      onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
          }}>
            이전 Cycle 목록
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>

        <div style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}>
          <div style={{
            width: '300px',
            borderRight: '1px solid #e5e7eb',
            overflowY: 'auto',
            padding: '16px',
          }}>
            {loading ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6b7280',
              }}>
                로딩 중...
              </div>
            ) : cycles.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#9ca3af',
              }}>
                Cycle이 없습니다.
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {cycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    onClick={() => handleCycleClick(cycle.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: selectedCycleId === cycle.id ? '#eff6ff' : '#ffffff',
                      border: selectedCycleId === cycle.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCycleId !== cycle.id) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCycleId !== cycle.id) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '4px',
                        }}>
                          Cycle {cycle.cycleNumber}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '4px',
                        }}>
                          시작: {formatDate(cycle.startedAt)}
                        </div>
                        {cycle.completedAt && (
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                          }}>
                            완료: {formatDate(cycle.completedAt)}
                          </div>
                        )}
                        <div style={{
                          fontSize: '11px',
                          color: cycle.status === 'completed' ? '#10b981' : '#f59e0b',
                          marginTop: '4px',
                          fontWeight: '500',
                        }}>
                          {cycle.status === 'completed' ? '완료됨' : '진행 중'}
                        </div>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const data = await getCycleData(cycle.id);
                            const md = formatCycleAnswersAsMarkdown({
                              cycleNumber: data.cycleNumber,
                              startedAt: data.startedAt,
                              completedAt: data.completedAt,
                              answers: data.answers,
                            });
                            await copyToClipboard(md);
                            setCopiedCycleId(cycle.id);
                            setCopyStatus('success');
                            setTimeout(() => { setCopyStatus('idle'); setCopiedCycleId(null); }, 2000);
                          } catch (error) {
                            console.error('Error copying cycle:', error);
                            setCopiedCycleId(cycle.id);
                            setCopyStatus('error');
                            setTimeout(() => { setCopyStatus('idle'); setCopiedCycleId(null); }, 2000);
                          }
                        }}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: copiedCycleId === cycle.id && copyStatus === 'success' ? '#10b981' : copiedCycleId === cycle.id && copyStatus === 'error' ? '#ef4444' : '#e5e7eb',
                          color: copiedCycleId === cycle.id ? '#ffffff' : '#374151',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {copiedCycleId === cycle.id && copyStatus === 'success' ? '복사됨' : copiedCycleId === cycle.id && copyStatus === 'error' ? '실패' : '복사'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
          }}>
            {selectedCycleId && cycleDetails ? (
              <div>
                <div style={{
                  marginBottom: '24px',
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}>
                    Cycle {cycleDetails.cycleNumber} 상세
                  </h3>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#4b5563',
                    }}>
                      <strong>시작:</strong> {formatDate(cycleDetails.startedAt)}
                    </div>
                    {cycleDetails.completedAt && (
                      <div style={{
                        fontSize: '14px',
                        color: '#4b5563',
                      }}>
                        <strong>완료:</strong> {formatDate(cycleDetails.completedAt)}
                      </div>
                    )}
                    <div style={{
                      fontSize: '14px',
                      color: '#4b5563',
                    }}>
                      <strong>상태:</strong> {cycleDetails.status === 'completed' ? '완료됨' : '진행 중'}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#4b5563',
                    }}>
                      <strong>답변 수:</strong> {cycleDetails.answers.length}개
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '16px',
                  }}>
                    <button
                      onClick={() => {
                        onRestartCycle(cycleDetails.id, cycleDetails.lastSituation, cycleDetails.lastQuestionId);
                      }}
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                      }}
                    >
                      이 Cycle 다시 시작
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const md = formatCycleAnswersAsMarkdown({
                            cycleNumber: cycleDetails.cycleNumber,
                            startedAt: cycleDetails.startedAt,
                            completedAt: cycleDetails.completedAt,
                            answers: cycleDetails.answers,
                          });
                          await copyToClipboard(md);
                          setCopyStatus('success');
                          setTimeout(() => setCopyStatus('idle'), 2000);
                        } catch (error) {
                          console.error('Error copying cycle:', error);
                          setCopyStatus('error');
                          setTimeout(() => setCopyStatus('idle'), 2000);
                        }
                      }}
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: copyStatus === 'success' ? '#10b981' : copyStatus === 'error' ? '#ef4444' : '#6b7280',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      {copyStatus === 'success'
                        ? '복사됨'
                        : copyStatus === 'error'
                          ? '복사 실패'
                          : '복사하기'}
                    </button>
                  </div>
                </div>

                {cycleDetails.answers.length > 0 && (
                  <div>
                    <h4 style={{
                      margin: '0 0 12px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                    }}>
                      답변 목록
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      {cycleDetails.answers.map((answer) => (
                        <div
                          key={answer.id}
                          style={{
                            padding: '12px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            marginBottom: '4px',
                          }}>
                            {answer.situation} - {answer.questionId}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#1f2937',
                            marginBottom: '4px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}>
                            {answer.answer}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#9ca3af',
                          }}>
                            {formatDate(answer.answeredAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: '48px',
                textAlign: 'center',
                color: '#9ca3af',
              }}>
                왼쪽에서 Cycle을 선택하세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
