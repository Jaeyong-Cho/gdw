/**
 * @fileoverview Main application component
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Situation, LayoutType } from './types';
import { CytoscapeDiagram } from './components/CytoscapeDiagram';
import { SituationInfoPanel } from './components/SituationInfoPanel';
import { LayoutSelector } from './components/LayoutSelector';

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
  const [sidebarWidth, setSidebarWidth] = useState<number>(400);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [startWidth, setStartWidth] = useState<number>(400);
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
      }}>
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
      </header>

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}>
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
              onSituationChange={setSelectedSituation}
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default App;
