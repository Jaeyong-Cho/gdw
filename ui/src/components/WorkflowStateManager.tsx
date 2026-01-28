/**
 * @fileoverview Workflow state management component for saving and restoring workflow states
 */

import React, { useState, useEffect } from 'react';
import { Situation } from '../types';
import {
  saveWorkflowState,
  restoreWorkflowState,
  getSavedWorkflowStates,
  deleteWorkflowState,
  getWorkflowStateDetails
} from '../data/db';

interface WorkflowStateManagerProps {
  currentSituation: Situation;
  onRestore: (situation: Situation) => void;
  onClose: () => void;
}

interface SavedState {
  id: number;
  currentSituation: string;
  savedAt: string;
  description: string | null;
}

export const WorkflowStateManager: React.FC<WorkflowStateManagerProps> = ({
  currentSituation,
  onRestore,
  onClose
}) => {
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedState, setSelectedState] = useState<number | null>(null);
  const [stateDetails, setStateDetails] = useState<any>(null);

  useEffect(() => {
    loadSavedStates();
  }, []);

  const loadSavedStates = async () => {
    try {
      const states = await getSavedWorkflowStates();
      setSavedStates(states);
    } catch (error) {
      console.error('Failed to load saved states:', error);
    }
  };

  const handleSave = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await saveWorkflowState(currentSituation, description || undefined);
      setSaveStatus('success');
      setDescription('');
      await loadSavedStates();
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save state:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (stateId: number) => {
    if (loading) return;
    
    if (!window.confirm('현재 진행 상황이 복원된 상태로 변경됩니다. 계속하시겠습니까?')) {
      return;
    }
    
    setLoading(true);
    try {
      const restoredSituation = await restoreWorkflowState(stateId);
      onRestore(restoredSituation as Situation);
      onClose();
    } catch (error) {
      console.error('Failed to restore state:', error);
      alert('상태 복원에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (stateId: number) => {
    if (!window.confirm('이 저장 상태를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      await deleteWorkflowState(stateId);
      await loadSavedStates();
    } catch (error) {
      console.error('Failed to delete state:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleShowDetails = async (stateId: number) => {
    try {
      const details = await getWorkflowStateDetails(stateId);
      setStateDetails(details);
      setSelectedState(stateId);
    } catch (error) {
      console.error('Failed to load state details:', error);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
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
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}>
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
            워크플로우 상태 관리
          </h2>
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

        {/* Save Current State */}
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#0c4a6e',
            marginBottom: '12px',
          }}>
            현재 상태 저장
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#0c4a6e',
            marginBottom: '12px',
          }}>
            현재 상황: <strong>{currentSituation}</strong>
          </p>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="저장 설명 (선택사항)"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: saveStatus === 'success' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              transform: saveStatus === 'success' ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>
              {saveStatus === 'success' ? '✓ 저장 완료!' : saveStatus === 'error' ? '✗ 저장 실패' : loading ? '저장 중...' : '현재 상태 저장'}
            </span>
            {saveStatus === 'success' && (
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

        {/* Saved States List */}
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
          }}>
            저장된 상태 목록 ({savedStates.length}개)
          </h3>
          {savedStates.length === 0 ? (
            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              textAlign: 'center',
              padding: '24px',
            }}>
              저장된 상태가 없습니다.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedStates.map((state) => (
                <div
                  key={state.id}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '4px',
                      }}>
                        {state.description || `상태 #${state.id}`}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280',
                      }}>
                        상황: {state.currentSituation}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        marginTop: '4px',
                      }}>
                        저장: {formatDate(state.savedAt)}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                    }}>
                      <button
                        onClick={() => handleShowDetails(state.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          backgroundColor: '#f3f4f6',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        상세
                      </button>
                      <button
                        onClick={() => handleRestore(state.id)}
                        disabled={loading}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        복원
                      </button>
                      <button
                        onClick={() => handleDelete(state.id)}
                        style={{
                          padding: '6px 12px',
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
                    </div>
                  </div>
                  {selectedState === state.id && stateDetails && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#374151',
                    }}>
                      <div>저장된 답변 수: {stateDetails.answerCount}개</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
};

export default WorkflowStateManager;
