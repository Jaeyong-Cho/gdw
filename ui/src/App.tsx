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
import { CycleListModal } from './components/CycleListModal';
import { createCycle, getCurrentCycleId, activateCycle } from './data/db';

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
  const [currentSituation, setCurrentSituation] = useState<Situation>('FailingIntent');
  const [showCycleList, setShowCycleList] = useState<boolean>(false);
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
                  initialQuestionId={initialQuestionId}
                  selectedCycleId={selectedCycleId}
                  onSituationChange={(sit) => {
                    setSelectedSituation(sit);
                    if (sit) {
                      setCurrentSituation(sit);
                      setInitialQuestionId(null); // Reset after situation change
                    }
                  }}
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
