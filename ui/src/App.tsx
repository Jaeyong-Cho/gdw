/**
 * @fileoverview Main application component
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Situation, LayoutType } from './types';
import { CytoscapeDiagram } from './components/CytoscapeDiagram';
import { SituationInfoPanel } from './components/SituationInfoPanel';
import { LayoutSelector } from './components/LayoutSelector';
import { DatabaseSettings } from './components/DatabaseSettings';
import WorkflowStateManager from './components/WorkflowStateManager';
import WorkflowDataViewer from './components/WorkflowDataViewer';
import { StatisticsViewer } from './components/StatisticsViewer';
import { CycleListModal } from './components/CycleListModal';
import { createCycle, getCurrentCycleId, activateCycle, recordUnconsciousEntry, recordUnconsciousExit, recordStateEntry, recordStateExit } from './data/db';

/**
 * @brief Main application component
 * 
 * Manages the selected situation state and coordinates between
 * the workflow graph and information panel.
 * 
 * @return React component rendering the complete application
 * 
 * @pre None
 * @post Application is rendered with graph and info panel
 */
const App: React.FC = () => {
  const [selectedSituation, setSelectedSituation] = useState<Situation | null>(null);
  const [layoutType, setLayoutType] = useState<LayoutType>('circle');
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
  });
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [startWidth, setStartWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStateManager, setShowStateManager] = useState<boolean>(false);
  const [showDataViewer, setShowDataViewer] = useState<boolean>(false);
  const [showStatisticsViewer, setShowStatisticsViewer] = useState<boolean>(false);
  const [currentSituation, setCurrentSituation] = useState<Situation>('FailingIntent');
  const [showCycleList, setShowCycleList] = useState<boolean>(false);
  const [showEnterUnconsciousModal, setShowEnterUnconsciousModal] = useState<boolean>(false);
  const [unconsciousEntryReason, setUnconsciousEntryReason] = useState<string>('');
  const [initialQuestionId, setInitialQuestionId] = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleNodeClick = useCallback((situation: Situation) => {
    setSelectedSituation(situation);
  }, []);

  const handleLayoutChange = useCallback((layout: LayoutType) => {
    setLayoutType(layout);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setStartX(e.clientX);
    setStartWidth(sidebarWidth);
    setIsResizing(true);
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const diff = startX - e.clientX;
      const newWidth = startWidth + diff;
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.8;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, startX, startWidth]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <header style={{
        padding: '16px 24px',
        backgroundColor: '#1f2937',
        color: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
          }}>
            Development Workflow Tracker
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: '#9ca3af',
          }}>
            Visualize and track your current position in the software development workflow
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={async () => {
              try {
                const cycleId = await createCycle();
                console.log('New cycle created:', cycleId);
                await recordStateEntry('Dumping', cycleId);
                setCurrentSituation('Dumping');
                setSelectedSituation('Dumping');
              } catch (error) {
                console.error('Error creating cycle:', error);
                alert('Cycle 생성에 실패했습니다.');
              }
            }}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#d97706';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f59e0b';
            }}
          >
            Cycle 시작
          </button>
          <button
            onClick={() => setShowCycleList(!showCycleList)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: showCycleList ? '#3b82f6' : '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            이전 Cycle
          </button>
          <button
            onClick={() => setShowDataViewer(true)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            데이터 뷰어
          </button>
          <button
            onClick={() => setShowStatisticsViewer(true)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#ec4899',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            통계 보기
          </button>
          {currentSituation !== 'Unconscious' && (
            <button
              onClick={async () => {
                const cycleId = await getCurrentCycleId();
                if (!cycleId) {
                  alert('Cycle을 먼저 시작해주세요.');
                  return;
                }
                setUnconsciousEntryReason('');
                setShowEnterUnconsciousModal(true);
              }}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: '#a78bfa',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              무의식으로 이동
            </button>
          )}
          <button
            onClick={() => setShowStateManager(true)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            상태 관리
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: showSettings ? '#3b82f6' : '#4b5563',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {showSettings ? '워크플로우 보기' : '데이터베이스 설정'}
          </button>
        </div>
      </header>

      {showDataViewer && (
        <WorkflowDataViewer
          onClose={() => setShowDataViewer(false)}
        />
      )}

      {showStatisticsViewer && (
        <StatisticsViewer
          onClose={() => setShowStatisticsViewer(false)}
        />
      )}

      {showEnterUnconsciousModal && (
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
            borderRadius: '8px',
            padding: '24px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
            }}>
              무의식으로 이동
            </h3>
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#4b5563',
              backgroundColor: '#f5f3ff',
              border: '1px solid #e9e5ff',
              borderRadius: '6px',
            }}>
              <strong style={{ color: '#5b21b6' }}>무의식에 들어가면 좋은 상황</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>익숙한 업무를 처리할 때 (생각과 판단이 빨라짐)</li>
                <li>반복적·루틴 작업을 할 때</li>
                <li>이미 알고 있는 문제를 해결할 때</li>
                <li>패턴이 정해진 작업을 진행할 때</li>
              </ul>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                새로운 문제나 중요한 결정이 필요하면 의식 상태에서 진행하는 것이 좋습니다.
              </p>
            </div>
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              color: '#6b7280',
            }}>
              무의식으로 들어가는 사유를 간단히 적어주세요.
            </p>
            <textarea
              value={unconsciousEntryReason}
              onChange={(e) => setUnconsciousEntryReason(e.target.value)}
              placeholder="예: 익숙한 리팩터링 작업으로 전환"
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '20px',
            }}>
              <button
                onClick={() => {
                  setShowEnterUnconsciousModal(false);
                  setUnconsciousEntryReason('');
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  const cycleId = await getCurrentCycleId();
                  if (!cycleId) {
                    alert('Cycle을 먼저 시작해주세요.');
                    return;
                  }
                  try {
                    if (currentSituation && currentSituation !== 'Unconscious') {
                      await recordStateExit(currentSituation, cycleId);
                    }
                    await recordUnconsciousEntry(cycleId, unconsciousEntryReason.trim() || null);
                    setCurrentSituation('Unconscious');
                    setSelectedSituation('Unconscious');
                    setInitialQuestionId(null);
                    setShowEnterUnconsciousModal(false);
                    setUnconsciousEntryReason('');
                  } catch (error) {
                    console.error('Error entering Unconscious:', error);
                    alert('무의식으로 이동에 실패했습니다.');
                  }
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}

      {showStateManager && (
        <WorkflowStateManager
          currentSituation={currentSituation}
          onRestore={(situation) => {
            setCurrentSituation(situation);
            setSelectedSituation(situation);
            setShowStateManager(false);
          }}
          onClose={() => setShowStateManager(false)}
        />
      )}

      {showCycleList && (
        <CycleListModal
          onClose={() => setShowCycleList(false)}
          onRestartCycle={async (cycleId: number, lastSituation: string, lastQuestionId: string | null) => {
            try {
              // Activate the selected cycle instead of creating a new one
              await activateCycle(cycleId);
              console.log('Cycle activated:', cycleId);
              const situation = lastSituation as Situation || 'Dumping';
              
              // Record state entry for the resumed situation
              if (situation && situation !== 'Unconscious') {
                await recordStateEntry(situation, cycleId);
              }
              
              setCurrentSituation(situation);
              setSelectedSituation(situation);
              setInitialQuestionId(lastQuestionId);
              setSelectedCycleId(cycleId); // Store the selected cycle ID
              setShowCycleList(false);
            } catch (error) {
              console.error('Error restarting cycle:', error);
              alert('Cycle 다시 시작에 실패했습니다.');
            }
          }}
        />
      )}

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {showSettings ? (
          <div style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#ffffff',
          }}>
            <DatabaseSettings />
          </div>
        ) : (
          <>
            <div style={{
              flex: 1,
              backgroundColor: '#f3f4f6',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              overflow: 'hidden',
            }}>
              <LayoutSelector
                selectedLayout={layoutType}
                onLayoutChange={handleLayoutChange}
              />
              <div style={{ flex: 1, position: 'relative' }}>
                <CytoscapeDiagram
                  selectedSituation={selectedSituation}
                  layoutType={layoutType}
                  onNodeClick={handleNodeClick}
                />
              </div>
            </div>

            <div
              ref={sidebarRef}
              style={{
                width: `${sidebarWidth}px`,
                display: 'flex',
                position: 'relative',
                backgroundColor: '#ffffff',
                borderLeft: '1px solid #e5e7eb',
                flexShrink: 0,
                zIndex: 100,
              }}
            >
              <div
                onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              left: '-2px',
              top: 0,
              bottom: 0,
              width: '8px',
              cursor: 'col-resize',
              backgroundColor: isResizing ? '#3b82f6' : 'transparent',
              zIndex: 1000,
              transition: isResizing ? 'none' : 'background-color 0.2s',
              pointerEvents: 'auto',
            }}
            onMouseEnter={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          />
              <aside style={{
                width: '100%',
                padding: '24px',
                overflowY: 'auto',
              }}>
                <SituationInfoPanel 
                  situation={selectedSituation} 
                />
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
