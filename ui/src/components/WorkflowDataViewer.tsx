/**
 * @fileoverview Workflow Data Viewer component
 * 
 * @brief SQL-free workflow state inspection interface
 * 
 * @pre ReadModel provides data query capabilities
 * @post Developers can check workflow state without SQL knowledge
 */

import React, { useState, useEffect } from 'react';
import { Situation } from '../types';
import { workflowReadModel, StateHistoryEntry } from '../data/read-model';
import { getAllCycles } from '../data/db';

interface WorkflowDataViewerProps {
  onClose: () => void;
}

/**
 * @brief Component for viewing workflow state and history
 * 
 * @param onClose - Callback when viewer is closed
 * 
 * @pre Database contains workflow data
 * @post Displays current state and complete history
 */
export const WorkflowDataViewer: React.FC<WorkflowDataViewerProps> = ({ onClose }) => {
  const [currentState, setCurrentState] = useState<Situation | null>(null);
  const [stateHistory, setStateHistory] = useState<StateHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<StateHistoryEntry | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [cycles, setCycles] = useState<Array<{
    id: number;
    cycleNumber: number;
    startedAt: string;
    completedAt: string | null;
    status: string;
  }>>([]);

  useEffect(() => {
    loadCycles();
    loadWorkflowData();
  }, []);

  useEffect(() => {
    loadWorkflowData();
  }, [selectedCycleId]);

  /**
   * @brief Load all cycles
   * 
   * @pre Database is available
   * @post Cycles are loaded into component state
   */
  const loadCycles = async () => {
    try {
      const allCycles = await getAllCycles();
      setCycles(allCycles);
    } catch (error) {
      console.error('Failed to load cycles:', error);
    }
  };

  /**
   * @brief Load workflow current state and history
   * 
   * @pre ReadModel is available
   * @post State and history are loaded into component state
   */
  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      const history = await workflowReadModel.getStateHistoryForCycle(selectedCycleId);
      setStateHistory(history);
      
      // Get current state from all cycles if no cycle is selected
      if (selectedCycleId === null) {
        const state = await workflowReadModel.getCurrentState();
        setCurrentState(state);
      } else {
        // For specific cycle, find the latest situation
        if (history.length > 0) {
          const latestEntry = history[history.length - 1];
          setCurrentState(latestEntry.state);
        } else {
          setCurrentState(null);
        }
      }
    } catch (error) {
      console.error('Failed to load workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * @brief Format timestamp to readable string
   * 
   * @param isoString - ISO timestamp string
   * @return Formatted date string
   * 
   * @pre isoString is valid ISO 8601 format
   * @post Returns localized date/time string
   */
  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  /**
   * @brief Get color for situation
   * 
   * @param situation - Situation name
   * @return Color hex code
   * 
   * @pre situation is valid Situation type
   * @post Returns consistent color for each situation
   */
  const getSituationColor = (situation: Situation): string => {
    const colors: Record<string, string> = {
      'Dumping': '#3b82f6',
      'WhatToDo': '#8b5cf6',
      'DefiningIntent': '#10b981',
      'FailingIntent': '#ef4444',
      'SelectingProblem': '#3b82f6',
      'DefiningAcceptance': '#8b5cf6',
      'CheckingFeasibility': '#f59e0b',
      'Designing': '#06b6d4',
      'BreakingTasks': '#ec4899',
      'Implementing': '#6366f1',
      'Verifying': '#f97316',
      'Verified': '#14b8a6',
      'Releasing': '#84cc16',
      'CollectingFeedback': '#a855f7',
      'Learning': '#22c55e',
      'Ending': '#fbbf24'
    };
    return colors[situation] || '#6b7280';
  };

  if (loading) {
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
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
        }}>
          Loading workflow data...
        </div>
      </div>
    );
  }

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
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '1000px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
          }}>
            워크플로우 데이터 뷰어
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: '500',
              }}>
                Cycle 필터
              </label>
              <select
                value={selectedCycleId === null ? '' : selectedCycleId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCycleId(value === '' ? null : parseInt(value, 10));
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  minWidth: '150px',
                }}
              >
                <option value="">전체 Cycle</option>
                {cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    Cycle {cycle.cycleNumber} ({cycle.status === 'completed' ? '완료' : '진행 중'})
                  </option>
                ))}
              </select>
            </div>
            <div style={{
              display: 'inline-flex',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              padding: '2px',
            }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#111827' : '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('card')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: viewMode === 'card' ? '#ffffff' : 'transparent',
                  color: viewMode === 'card' ? '#111827' : '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Card
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#e5e7eb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              닫기
            </button>
          </div>
        </div>

        {/* Current State */}
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: currentState === 'Dumping' ? '#fef3c7' : '#f0f9ff',
          border: currentState === 'Dumping' ? '1px solid #fcd34d' : '1px solid #bae6fd',
          borderRadius: '8px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: currentState === 'Dumping' ? '#92400e' : '#0c4a6e',
            marginBottom: '12px',
          }}>
            현재 상태
          </h3>
          {currentState ? (
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: currentState === 'Dumping' ? '#f59e0b' : getSituationColor(currentState),
              color: '#ffffff',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {currentState}
            </div>
          ) : (
            <div style={{ color: '#6b7280', fontSize: '14px' }}>
              상태 정보가 없습니다.
            </div>
          )}
        </div>

        {/* State History */}
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
          }}>
            상태 이력 ({stateHistory.length}개)
            {selectedCycleId !== null && (
              <span style={{
                fontSize: '14px',
                fontWeight: '400',
                color: '#6b7280',
                marginLeft: '8px',
              }}>
                - Cycle {cycles.find(c => c.id === selectedCycleId)?.cycleNumber || selectedCycleId}
              </span>
            )}
          </h3>
          
          {stateHistory.length === 0 ? (
            <div style={{
              color: '#6b7280',
              fontSize: '14px',
              textAlign: 'center',
              padding: '24px',
            }}>
              상태 이력이 없습니다.
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div style={{ overflow: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#f9fafb',
                    borderBottom: '2px solid #e5e7eb',
                  }}>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      width: '15%',
                    }}>
                      Situation
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      width: '25%',
                    }}>
                      Question ID
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      width: '40%',
                    }}>
                      Answer
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      width: '10%',
                    }}>
                      Cycle
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      width: '15%',
                    }}>
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stateHistory.map((entry, index) => {
                    const cycle = entry.cycleId ? cycles.find(c => c.id === entry.cycleId) : null;
                    return (
                      <tr
                        key={`${entry.questionId}-${entry.timestamp}-${index}`}
                        onClick={() => setSelectedEntry(selectedEntry === entry ? null : entry)}
                        style={{
                          backgroundColor: selectedEntry === entry ? '#f0f9ff' : index % 2 === 0 ? '#ffffff' : '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedEntry !== entry) {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedEntry !== entry) {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
                          }
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: getSituationColor(entry.state),
                            color: '#ffffff',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                          }}>
                            {entry.state}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px',
                          color: '#374151',
                          fontSize: '12px',
                        }}>
                          {entry.questionId}
                        </td>
                        <td style={{
                          padding: '12px',
                          color: '#374151',
                          maxWidth: '400px',
                        }}>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: selectedEntry === entry ? 'pre-wrap' : 'nowrap',
                            wordBreak: 'break-word',
                          }}>
                            {entry.answer}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px',
                          color: '#6b7280',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                        }}>
                          {cycle ? (
                            <div style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              backgroundColor: cycle.status === 'completed' ? '#dbeafe' : '#fef3c7',
                              color: cycle.status === 'completed' ? '#1e40af' : '#92400e',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                            }}>
                              Cycle {cycle.cycleNumber}
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>-</span>
                          )}
                        </td>
                        <td style={{
                          padding: '12px',
                          color: '#6b7280',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                        }}>
                          {formatTimestamp(entry.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Card View */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {stateHistory.map((entry, index) => (
                <div
                  key={`${entry.questionId}-${entry.timestamp}-${index}`}
                  onClick={() => setSelectedEntry(entry)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: selectedEntry === entry ? '#f3f4f6' : '#ffffff',
                    border: `1px solid ${selectedEntry === entry ? '#d1d5db' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEntry !== entry) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedEntry !== entry) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                  }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      backgroundColor: getSituationColor(entry.state),
                      color: '#ffffff',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}>
                      {entry.state}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                    }}>
                      {formatTimestamp(entry.timestamp)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#374151',
                    marginBottom: '4px',
                  }}>
                    <strong>Question:</strong> {entry.questionId}
                  </div>
                  {selectedEntry === entry && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: '#374151',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      <strong>Answer:</strong><br />
                      {entry.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#6b7280',
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Summary:</strong>
          </div>
          <div>• Total entries: {stateHistory.length}</div>
          <div>• Current state: {currentState || 'None'}</div>
          <div>• Unique situations: {new Set(stateHistory.map(e => e.state)).size}</div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDataViewer;
