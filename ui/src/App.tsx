/**
 * @fileoverview Main application component
 */

import React, { useState, useCallback } from 'react';
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
  const [layoutType, setLayoutType] = useState<LayoutType>('dagre');

  const handleNodeClick = useCallback((situation: Situation) => {
    setSelectedSituation(situation);
  }, []);

  const handleLayoutChange = useCallback((layout: LayoutType) => {
    setLayoutType(layout);
  }, []);

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
      }}>
        <div style={{
          flex: 1,
          backgroundColor: '#f3f4f6',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
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

        <aside style={{
          width: '400px',
          padding: '24px',
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e5e7eb',
          overflowY: 'auto',
        }}>
          <SituationInfoPanel situation={selectedSituation} />
        </aside>
      </div>
    </div>
  );
};

export default App;
