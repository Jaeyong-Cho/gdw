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
import { getAllCycles, getAllUnconsciousPeriods, deleteAnswer, updateAnswer, deleteCycle, getCycleData } from '../data/db';
import { formatCycleAnswersAsMarkdown } from '../utils/cycle-markdown';

interface WorkflowDataViewerProps {
  onClose: () => void;
}

interface UnconsciousPeriod {
  id: number;
  startedAt: string;
  endedAt: string | null;
  entryReason: string | null;
  exitReason: string | null;
  previousCycleId: number | null;
  nextCycleId: number | null;
  durationMs: number | null;
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
  const [activeTab, setActiveTab] = useState<'cycles' | 'unconscious'>('cycles');
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [cycles, setCycles] = useState<Array<{
    id: number;
    cycleNumber: number;
    startedAt: string;
    completedAt: string | null;
    status: string;
    unconsciousEnteredAt: string | null;
    unconsciousExitedAt: string | null;
    unconsciousEntryReason: string | null;
  }>>([]);
  const [unconsciousPeriods, setUnconsciousPeriods] = useState<UnconsciousPeriod[]>([]);
  
  // Pagination state
  const [cyclePageSize] = useState<number>(10);
  const [cycleCurrentPage, setCycleCurrentPage] = useState<number>(1);
  const [unconsciousPageSize] = useState<number>(10);
  const [unconsciousCurrentPage, setUnconsciousCurrentPage] = useState<number>(1);

  // Edit/Delete state
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copiedCycleId, setCopiedCycleId] = useState<number | null>(null);

  // Computed pagination values
  const cycleTotalPages = Math.ceil(cycles.length / cyclePageSize);
  const paginatedCycles = cycles.slice(
    (cycleCurrentPage - 1) * cyclePageSize,
    cycleCurrentPage * cyclePageSize
  );
  
  const unconsciousTotalPages = Math.ceil(unconsciousPeriods.length / unconsciousPageSize);
  const paginatedUnconsciousPeriods = unconsciousPeriods.slice(
    (unconsciousCurrentPage - 1) * unconsciousPageSize,
    unconsciousCurrentPage * unconsciousPageSize
  );

  /**
   * @brief Handle delete answer
   */
  const handleDeleteAnswer = async (entryId: number) => {
    const confirmed = confirm('이 답변을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!confirmed) return;

    try {
      await deleteAnswer(entryId);
      await loadWorkflowData();
    } catch (error) {
      console.error('Failed to delete answer:', error);
      alert('답변 삭제에 실패했습니다.');
    }
  };

  /**
   * @brief Handle update answer
   */
  const handleUpdateAnswer = async (entryId: number) => {
    try {
      await updateAnswer(entryId, editingAnswer);
      setEditingEntryId(null);
      setEditingAnswer('');
      await loadWorkflowData();
    } catch (error) {
      console.error('Failed to update answer:', error);
      alert('답변 수정에 실패했습니다.');
    }
  };

  /**
   * @brief Handle delete cycle
   */
  const handleDeleteCycle = async (cycleId: number) => {
    const confirmed = confirm('이 Cycle과 관련된 모든 데이터가 삭제됩니다. 계속하시겠습니까?');
    if (!confirmed) return;

    try {
      await deleteCycle(cycleId);
      if (selectedCycleId === cycleId) {
        setSelectedCycleId(null);
      }
      await loadCycles();
      await loadWorkflowData();
    } catch (error) {
      console.error('Failed to delete cycle:', error);
      alert('Cycle 삭제에 실패했습니다.');
    }
  };

  /**
   * @brief Start editing an answer
   */
  const startEditing = (entryId: number, currentAnswer: string) => {
    setEditingEntryId(entryId);
    setEditingAnswer(currentAnswer);
  };

  /**
   * @brief Cancel editing
   */
  const cancelEditing = () => {
    setEditingEntryId(null);
    setEditingAnswer('');
  };

  useEffect(() => {
    loadCycles();
    loadUnconsciousPeriods();
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
   * @brief Load all unconscious periods
   * 
   * @pre Database is available
   * @post Unconscious periods are loaded into component state
   */
  const loadUnconsciousPeriods = async () => {
    try {
      const periods = await getAllUnconsciousPeriods();
      setUnconsciousPeriods(periods);
    } catch (error) {
      console.error('Failed to load unconscious periods:', error);
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
      'GatheringFacts': '#f59e0b',
      'SelectingProblem': '#3b82f6',
      'ExploringSolution': '#7c3aed',
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
      'Ending': '#fbbf24',
      'Unconscious': '#a78bfa'
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

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #e5e7eb',
        }}>
          <button
            onClick={() => setActiveTab('cycles')}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: activeTab === 'cycles' ? '600' : '400',
              backgroundColor: activeTab === 'cycles' ? '#3b82f6' : 'transparent',
              color: activeTab === 'cycles' ? '#ffffff' : '#6b7280',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            의식 Cycles
          </button>
          <button
            onClick={() => setActiveTab('unconscious')}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: activeTab === 'unconscious' ? '600' : '400',
              backgroundColor: activeTab === 'unconscious' ? '#8b5cf6' : 'transparent',
              color: activeTab === 'unconscious' ? '#ffffff' : '#6b7280',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            무의식 기간 ({unconsciousPeriods.length})
          </button>
        </div>

        {activeTab === 'cycles' && (
          <>
        {/* Cycle List with Pagination */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
          }}>
            Cycle 목록 ({cycles.length}개)
          </h3>
          
          {cycles.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: '#6b7280',
              fontSize: '14px',
            }}>
              Cycle 데이터가 없습니다.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '13px' }}>Cycle #</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '13px' }}>시작 시간</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '13px' }}>완료 시간</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '13px' }}>상태</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '13px' }}>복사</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '13px' }}>선택</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '13px' }}>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCycles.map((cycle, index) => (
                      <tr key={cycle.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                        <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                          #{cycle.cycleNumber}
                        </td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>
                          {new Date(cycle.startedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>
                          {cycle.completedAt ? new Date(cycle.completedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: cycle.status === 'completed' ? '#dcfce7' : '#fef3c7',
                            color: cycle.status === 'completed' ? '#16a34a' : '#d97706',
                          }}>
                            {cycle.status === 'completed' ? '완료' : '진행 중'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
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
                                await navigator.clipboard.writeText(md);
                                setCopiedCycleId(cycle.id);
                                setCopyStatus('success');
                                setTimeout(() => { setCopyStatus('idle'); setCopiedCycleId(null); }, 2000);
                              } catch {
                                setCopiedCycleId(cycle.id);
                                setCopyStatus('error');
                                setTimeout(() => { setCopyStatus('idle'); setCopiedCycleId(null); }, 2000);
                              }
                            }}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              backgroundColor: copiedCycleId === cycle.id && copyStatus === 'success' ? '#10b981' : copiedCycleId === cycle.id && copyStatus === 'error' ? '#ef4444' : '#e5e7eb',
                              color: copiedCycleId === cycle.id ? '#ffffff' : '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            {copiedCycleId === cycle.id && copyStatus === 'success' ? '복사됨' : copiedCycleId === cycle.id && copyStatus === 'error' ? '실패' : '복사'}
                          </button>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                          <button
                            onClick={() => setSelectedCycleId(selectedCycleId === cycle.id ? null : cycle.id)}
                            style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              backgroundColor: selectedCycleId === cycle.id ? '#3b82f6' : '#e5e7eb',
                              color: selectedCycleId === cycle.id ? '#ffffff' : '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            {selectedCycleId === cycle.id ? '선택됨' : '선택'}
                          </button>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                          <button
                            onClick={() => handleDeleteCycle(cycle.id)}
                            style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Cycle Pagination */}
              {cycleTotalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <button
                    onClick={() => setCycleCurrentPage(1)}
                    disabled={cycleCurrentPage === 1}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      backgroundColor: cycleCurrentPage === 1 ? '#f3f4f6' : '#ffffff',
                      color: cycleCurrentPage === 1 ? '#9ca3af' : '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: cycleCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ◀◀
                  </button>
                  <button
                    onClick={() => setCycleCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={cycleCurrentPage === 1}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      backgroundColor: cycleCurrentPage === 1 ? '#f3f4f6' : '#ffffff',
                      color: cycleCurrentPage === 1 ? '#9ca3af' : '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: cycleCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    {cycleCurrentPage} / {cycleTotalPages}
                  </span>
                  <button
                    onClick={() => setCycleCurrentPage(prev => Math.min(cycleTotalPages, prev + 1))}
                    disabled={cycleCurrentPage === cycleTotalPages}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      backgroundColor: cycleCurrentPage === cycleTotalPages ? '#f3f4f6' : '#ffffff',
                      color: cycleCurrentPage === cycleTotalPages ? '#9ca3af' : '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: cycleCurrentPage === cycleTotalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => setCycleCurrentPage(cycleTotalPages)}
                    disabled={cycleCurrentPage === cycleTotalPages}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      backgroundColor: cycleCurrentPage === cycleTotalPages ? '#f3f4f6' : '#ffffff',
                      color: cycleCurrentPage === cycleTotalPages ? '#9ca3af' : '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: cycleCurrentPage === cycleTotalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ▶▶
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Current State */}
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: currentState === 'Dumping' ? '#fef3c7' : currentState === 'Unconscious' ? '#ede9fe' : '#f0f9ff',
          border: currentState === 'Dumping' ? '1px solid #fcd34d' : currentState === 'Unconscious' ? '1px solid #a78bfa' : '1px solid #bae6fd',
          borderRadius: '8px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: currentState === 'Dumping' ? '#92400e' : currentState === 'Unconscious' ? '#5b21b6' : '#0c4a6e',
            marginBottom: '12px',
          }}>
            현재 상태
          </h3>
          {currentState ? (
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: currentState === 'Dumping' ? '#f59e0b' : currentState === 'Unconscious' ? '#8b5cf6' : getSituationColor(currentState),
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
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            상태 이력 ({stateHistory.length}개)
            {selectedCycleId !== null && (
              <>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '400',
                  color: '#6b7280',
                }}>
                  - Cycle {cycles.find(c => c.id === selectedCycleId)?.cycleNumber || selectedCycleId}
                </span>
                {(() => {
                  const cycle = cycles.find(c => c.id === selectedCycleId);
                  if (!cycle?.unconsciousEnteredAt || !cycle?.unconsciousExitedAt) return null;
                  const entered = new Date(cycle.unconsciousEnteredAt).getTime();
                  const exited = new Date(cycle.unconsciousExitedAt).getTime();
                  const minutes = Math.round((exited - entered) / 60000);
                  return (
                    <span style={{
                      fontSize: '13px',
                      color: '#7c3aed',
                    }}>
                      Unconscious: {minutes} min
                    </span>
                  );
                })()}
                <button
                  onClick={async () => {
                    if (selectedCycleId === null) return;
                    try {
                      const data = await getCycleData(selectedCycleId);
                      const md = formatCycleAnswersAsMarkdown({
                        cycleNumber: data.cycleNumber,
                        startedAt: data.startedAt,
                        completedAt: data.completedAt,
                        answers: data.answers,
                      });
                      await navigator.clipboard.writeText(md);
                      setCopyStatus('success');
                      setTimeout(() => setCopyStatus('idle'), 2000);
                    } catch {
                      setCopyStatus('error');
                      setTimeout(() => setCopyStatus('idle'), 2000);
                    }
                  }}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: '500',
                    backgroundColor: copyStatus === 'success' ? '#10b981' : copyStatus === 'error' ? '#ef4444' : '#6b7280',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  {copyStatus === 'success' ? '복사됨' : copyStatus === 'error' ? '복사 실패' : '복사하기'}
                </button>
              </>
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
                      width: '12%',
                    }}>
                      Situation
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      width: '18%',
                    }}>
                      Question ID
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      width: '35%',
                    }}>
                      Answer
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      width: '8%',
                    }}>
                      Cycle
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      width: '12%',
                    }}>
                      Timestamp
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#374151',
                      width: '15%',
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stateHistory.map((entry, index) => {
                    const cycle = entry.cycleId ? cycles.find(c => c.id === entry.cycleId) : null;
                    const isEditing = editingEntryId === entry.id;
                    return (
                      <tr
                        key={`${entry.id}-${entry.questionId}-${entry.timestamp}-${index}`}
                        onClick={() => !isEditing && setSelectedEntry(selectedEntry === entry ? null : entry)}
                        style={{
                          backgroundColor: selectedEntry === entry ? '#f0f9ff' : index % 2 === 0 ? '#ffffff' : '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          cursor: isEditing ? 'default' : 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedEntry !== entry && !isEditing) {
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
                          {isEditing ? (
                            <textarea
                              value={editingAnswer}
                              onChange={(e) => setEditingAnswer(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '100%',
                                minHeight: '60px',
                                padding: '8px',
                                border: '1px solid #3b82f6',
                                borderRadius: '4px',
                                fontSize: '13px',
                                resize: 'vertical',
                              }}
                            />
                          ) : (
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: selectedEntry === entry ? 'pre-wrap' : 'nowrap',
                              wordBreak: 'break-word',
                            }}>
                              {entry.answer}
                            </div>
                          )}
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
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                        >
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleUpdateAnswer(entry.id)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  backgroundColor: '#22c55e',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                저장
                              </button>
                              <button
                                onClick={cancelEditing}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  backgroundColor: '#6b7280',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button
                                onClick={() => startEditing(entry.id, entry.answer)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  backgroundColor: '#3b82f6',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                편집
                              </button>
                              <button
                                onClick={() => handleDeleteAnswer(entry.id)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                삭제
                              </button>
                            </div>
                          )}
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
          </>
        )}

        {activeTab === 'unconscious' && (
          <div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '16px',
            }}>
              무의식 기간 목록 ({unconsciousPeriods.length}개)
            </h3>
            
            {unconsciousPeriods.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: '#6b7280',
                fontSize: '14px',
              }}>
                무의식 기간 데이터가 없습니다.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                {/* Unconscious Periods Pagination Controls - Top */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  padding: '8px 0',
                }}>
                  <div style={{ fontSize: '14px', color: '#5b21b6' }}>
                    총 {unconsciousPeriods.length}개 무의식 기간
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => setUnconsciousCurrentPage(1)}
                      disabled={unconsciousCurrentPage === 1}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #c4b5fd',
                        borderRadius: '4px',
                        backgroundColor: unconsciousCurrentPage === 1 ? '#f5f3ff' : '#ffffff',
                        color: unconsciousCurrentPage === 1 ? '#a5a3a8' : '#5b21b6',
                        cursor: unconsciousCurrentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      First
                    </button>
                    <button
                      onClick={() => setUnconsciousCurrentPage(p => Math.max(1, p - 1))}
                      disabled={unconsciousCurrentPage === 1}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #c4b5fd',
                        borderRadius: '4px',
                        backgroundColor: unconsciousCurrentPage === 1 ? '#f5f3ff' : '#ffffff',
                        color: unconsciousCurrentPage === 1 ? '#a5a3a8' : '#5b21b6',
                        cursor: unconsciousCurrentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Prev
                    </button>
                    <span style={{ padding: '0 12px', fontSize: '14px', color: '#5b21b6' }}>
                      {unconsciousCurrentPage} / {unconsciousTotalPages}
                    </span>
                    <button
                      onClick={() => setUnconsciousCurrentPage(p => Math.min(unconsciousTotalPages, p + 1))}
                      disabled={unconsciousCurrentPage === unconsciousTotalPages}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #c4b5fd',
                        borderRadius: '4px',
                        backgroundColor: unconsciousCurrentPage === unconsciousTotalPages ? '#f5f3ff' : '#ffffff',
                        color: unconsciousCurrentPage === unconsciousTotalPages ? '#a5a3a8' : '#5b21b6',
                        cursor: unconsciousCurrentPage === unconsciousTotalPages ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setUnconsciousCurrentPage(unconsciousTotalPages)}
                      disabled={unconsciousCurrentPage === unconsciousTotalPages}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #c4b5fd',
                        borderRadius: '4px',
                        backgroundColor: unconsciousCurrentPage === unconsciousTotalPages ? '#f5f3ff' : '#ffffff',
                        color: unconsciousCurrentPage === unconsciousTotalPages ? '#a5a3a8' : '#5b21b6',
                        cursor: unconsciousCurrentPage === unconsciousTotalPages ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Last
                    </button>
                  </div>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3e8ff' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #c4b5fd', color: '#5b21b6' }}>ID</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #c4b5fd', color: '#5b21b6' }}>시작 시간</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #c4b5fd', color: '#5b21b6' }}>종료 시간</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #c4b5fd', color: '#5b21b6' }}>소요 시간</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #c4b5fd', color: '#5b21b6' }}>진입 사유</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #c4b5fd', color: '#5b21b6' }}>이전 Cycle</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #c4b5fd', color: '#5b21b6' }}>다음 Cycle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUnconsciousPeriods.map((period, index) => {
                      const formatDuration = (ms: number | null): string => {
                        if (ms === null) return '-';
                        const minutes = Math.floor(ms / 60000);
                        const hours = Math.floor(minutes / 60);
                        const mins = minutes % 60;
                        if (hours === 0) return `${mins}분`;
                        if (mins === 0) return `${hours}시간`;
                        return `${hours}시간 ${mins}분`;
                      };
                      
                      const formatDateTime = (dateStr: string): string => {
                        return new Date(dateStr).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      };
                      
                      return (
                        <tr key={period.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#faf5ff' }}>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontWeight: '600', color: '#8b5cf6' }}>
                            #{period.id}
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                            {formatDateTime(period.startedAt)}
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                            {period.endedAt ? formatDateTime(period.endedAt) : (
                              <span style={{ 
                                color: '#8b5cf6', 
                                fontWeight: '600',
                                backgroundColor: '#f3e8ff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                              }}>
                                진행 중
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                            {formatDuration(period.durationMs)}
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', maxWidth: '200px' }}>
                            {period.entryReason || '-'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                            {period.previousCycleId ? (
                              <span style={{
                                backgroundColor: '#dbeafe',
                                color: '#1d4ed8',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                              }}>
                                #{period.previousCycleId}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                            {period.nextCycleId ? (
                              <span style={{
                                backgroundColor: '#dcfce7',
                                color: '#16a34a',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                              }}>
                                #{period.nextCycleId}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Unconscious Summary */}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f3e8ff',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#5b21b6',
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>무의식 요약:</strong>
              </div>
              <div>• 총 무의식 기간: {unconsciousPeriods.length}회</div>
              <div>• 완료된 기간: {unconsciousPeriods.filter(p => p.endedAt !== null).length}회</div>
              <div>• 진행 중: {unconsciousPeriods.filter(p => p.endedAt === null).length > 0 ? '예' : '아니오'}</div>
              <div>• 총 무의식 시간: {(() => {
                const totalMs = unconsciousPeriods
                  .filter(p => p.durationMs !== null)
                  .reduce((sum, p) => sum + (p.durationMs || 0), 0);
                const minutes = Math.floor(totalMs / 60000);
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                if (hours === 0) return `${mins}분`;
                if (mins === 0) return `${hours}시간`;
                return `${hours}시간 ${mins}분`;
              })()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowDataViewer;
