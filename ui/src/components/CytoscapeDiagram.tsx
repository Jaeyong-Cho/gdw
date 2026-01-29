/**
 * @fileoverview Cytoscape diagram component with interactivity
 */

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import cytoscape, { Core, LayoutOptions } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { Situation, LayoutType } from '../types';
import { stateTransitions, situationDefinitions, nodePositions } from '../data/situations';

// Register dagre layout
cytoscape.use(dagre);

/**
 * @brief Props for CytoscapeDiagram component
 */
interface CytoscapeDiagramProps {
  selectedSituation: Situation | null;
  layoutType: LayoutType;
  isUnconscious?: boolean;
  onNodeClick?: (situation: Situation) => void;
}

/**
 * @brief Cytoscape diagram component with click interaction
 * 
 * @param selectedSituation - Currently selected situation (highlighted)
 * @param onNodeClick - Callback when a node is clicked
 * @return React component rendering cytoscape diagram
 * 
 * @pre selectedSituation must be a valid Situation or null
 * @post Diagram is rendered with selected node highlighted and clickable
 */
/**
 * @brief Get layout configuration based on layout type
 * 
 * @param layoutType - Type of layout algorithm
 * @return Layout options for cytoscape
 */
function getLayoutConfig(layoutType: LayoutType): LayoutOptions {
  const baseConfig: Record<string, any> = {
    animate: true,
    animationDuration: 500,
    animationEasing: 'ease-out',
  };

  switch (layoutType) {
    case 'dagre':
      return {
        ...baseConfig,
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 100, // Increased from 50 to prevent node overlap
        edgeSep: 50,  // Increased from 20 to prevent edge overlap
        rankSep: 250, // Increased from 200 to prevent rank overlap
        spacingFactor: 1.5, // Increased from 1.2
      };
    
    case 'breadthfirst':
      return {
        ...baseConfig,
        name: 'breadthfirst',
        directed: true,
        roots: ['DefiningIntent'],
        spacingFactor: 2.0, // Increased from 1.5
        padding: 50, // Add padding around graph
      };
    
    case 'grid':
      return {
        ...baseConfig,
        name: 'grid',
        rows: undefined,
        cols: undefined,
        position: (node: any) => ({ row: node.data('id').charCodeAt(0) % 4, col: Math.floor(node.data('id').charCodeAt(0) / 4) }),
        condense: false,
        spacingFactor: 2.0,
        padding: 50,
      };
    
    case 'circle':
      return {
        ...baseConfig,
        name: 'circle',
        radius: 500, // Increased from 400
        startAngle: -90, // Start from top (-90 degrees = top, 0 degrees = right)
        sweep: undefined,
        padding: 50,
        sort: (a: any, b: any) => {
          // Put Dumping first, Unconscious last (after Ending)
          const aId = a.data('id');
          const bId = b.data('id');
          if (aId === 'Dumping') return -1;
          if (bId === 'Dumping') return 1;
          if (aId === 'Unconscious') return 1;
          if (bId === 'Unconscious') return -1;
          return 0;
        },
      };
    
    case 'concentric':
      return {
        ...baseConfig,
        name: 'concentric',
        minNodeSpacing: 100, // Increased from 50
        height: undefined,
        width: undefined,
        padding: 50,
        concentric: (node: any) => {
          const id = node.data('id');
          const order = ['DefiningIntent', 'SelectingProblem', 'DefiningAcceptance', 'CheckingFeasibility', 
                        'Designing', 'BreakingTasks', 'Implementing', 'Verifying', 'Verified', 
                        'Releasing', 'CollectingFeedback', 'Learning'].indexOf(id);
          return order >= 0 ? order : 99;
        },
        levelWidth: () => 250, // Increased from 200
      };
    
    case 'cose':
      return {
        ...baseConfig,
        name: 'cose',
        nodeRepulsion: 8000, // Increased from 4500 for more spacing
        idealEdgeLength: 200, // Increased from 100
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        animate: true,
        animationDuration: 1000,
        padding: 50,
      };
    
    case 'random':
      return {
        ...baseConfig,
        name: 'random',
        padding: 50,
      };
    
    case 'preset':
      return {
        ...baseConfig,
        name: 'preset',
        padding: 50,
      };
    
    default:
      return {
        ...baseConfig,
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 100,
        edgeSep: 50,
        rankSep: 250,
        spacingFactor: 1.5,
      };
  }
}

export const CytoscapeDiagram: React.FC<CytoscapeDiagramProps> = ({
  selectedSituation,
  layoutType,
  isUnconscious = false,
  onNodeClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const rotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Prepare elements
  const elements = useMemo(() => {
    // Sort situations to put Dumping first for circle layout
    const situationEntries = Object.entries(situationDefinitions);
    const sortedEntries = layoutType === 'circle' 
      ? [...situationEntries].sort(([a], [b]) => {
          if (a === 'Dumping') return -1;
          if (b === 'Dumping') return 1;
          return 0;
        })
      : situationEntries;
    
    const nodes = sortedEntries.map(([situation]) => {
      // Only set position for preset layout
      const position = layoutType === 'preset' ? nodePositions[situation as Situation] : undefined;
      return {
        data: {
          id: situation,
          label: situation,
        },
        position: position ? { x: position.x, y: position.y } : undefined,
      };
    });

    const edges = stateTransitions.map(([from, to, label], index) => {
      // Determine if this is a backward edge based on label
      const isBackward = label.includes('drifting') || 
                        label.includes('too hard') || 
                        label.includes('too big') ||
                        label.includes('unclear') ||
                        label.includes('bug') ||
                        label.includes('invalid') ||
                        label.includes('issue') ||
                        label.includes('found') ||
                        label === '';
      
      return {
        data: {
          id: `edge-${from}-${to}-${index}`,
          source: from,
          target: to,
          label: label || '',
          backward: isBackward,
        },
      };
    });

    return [...nodes, ...edges];
  }, [layoutType]);

  // Initialize cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    // Create cytoscape instance
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '160px',
            'font-size': '14px',
            'font-weight': '600',
            'color': '#374151',
            'background-color': '#ffffff',
            'border-width': 2,
            'border-color': '#e5e7eb',
            'width': 180,
            'height': 80,
            'shape': 'round-rectangle',
            'padding': '10px', // Add padding to prevent label overlap
            'events': 'yes', // Allow click to view situation description in sidebar
            'cursor': 'pointer',
          },
        },
        {
          selector: 'node[id = "Dumping"]',
          style: {
            'background-color': '#dbeafe',
            'border-color': '#3b82f6',
            'border-width': 3,
            'font-weight': '700',
          },
        },
        {
          selector: 'node[id = "Ending"]',
          style: {
            'background-color': '#fef3c7',
            'border-color': '#f59e0b',
            'border-width': 3,
            'font-weight': '700',
          },
        },
        {
          selector: 'node[id = "Unconscious"]',
          style: {
            'background-color': '#f3e8ff',
            'background-opacity': 0.9,
            'border-color': '#9333ea',
            'border-width': 4,
            'border-style': 'dashed',
            'font-weight': '700',
            'shape': 'ellipse',
            'width': 200,
            'height': 100,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2.5,
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '12px',
            'text-rotation': 'autorotate',
            'text-margin-y': -20, // Increased from -10 to move label further from edge
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '4px',
            'text-border-width': 1,
            'text-border-color': '#e5e7eb',
            'text-border-opacity': 0.5,
          },
        },
        {
          selector: 'edge[backward = "true"]',
          style: {
            'width': 2,
            'line-color': '#9ca3af',
            'target-arrow-color': '#9ca3af',
            'line-style': 'dashed',
            'text-margin-y': -20, // Same spacing for backward edges
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '4px',
            'text-border-width': 1,
            'text-border-color': '#e5e7eb',
            'text-border-opacity': 0.5,
          },
        },
      ],
      layout: getLayoutConfig(layoutType),
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      zoomingEnabled: true,
      minZoom: 0.1,
      maxZoom: 2,
    });

    cyRef.current = cy;

    // Node click: show situation description in sidebar (does not change workflow state)
    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data();
      if (nodeData.id && onNodeClick) {
        const situation = nodeData.id as Situation;
        onNodeClick(situation);
      }
    });

    // Fit to viewport
    cy.fit(undefined, 50);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, onNodeClick, layoutType]);

  // Update selected node style
  useEffect(() => {
    if (!cyRef.current) return;

    // Reset all nodes to default or special styles
    cyRef.current.nodes().forEach((node) => {
      const nodeId = node.data('id');
      if (nodeId === 'Dumping') {
        node.style({
          'background-color': '#dbeafe',
          'border-color': '#3b82f6',
          'border-width': 3,
        });
      } else if (nodeId === 'Ending') {
        node.style({
          'background-color': '#fef3c7',
          'border-color': '#f59e0b',
          'border-width': 3,
        });
      } else if (nodeId === 'Unconscious') {
        node.style({
          'background-color': '#f3e8ff',
          'background-opacity': 0.9,
          'border-color': '#9333ea',
          'border-width': 4,
          'border-style': 'dashed',
          'shape': 'ellipse',
          'width': 200,
          'height': 100,
        });
      } else {
        node.style({
          'background-color': '#ffffff',
          'border-color': '#e5e7eb',
          'border-width': 2,
        });
      }
    });

    // Highlight selected node (if not Dumping, Ending, or Unconscious)
    if (selectedSituation && selectedSituation !== 'Dumping' && selectedSituation !== 'Ending' && selectedSituation !== 'Unconscious') {
      const selectedNode = cyRef.current.getElementById(selectedSituation);
      if (selectedNode.length > 0) {
        selectedNode.style({
          'background-color': '#dbeafe',
          'border-color': '#3b82f6',
          'border-width': 3,
        });
      }
    } else if (selectedSituation === 'Dumping' || selectedSituation === 'Ending' || selectedSituation === 'Unconscious') {
      // Make selected Dumping, Ending, or Unconscious even more prominent
      const selectedNode = cyRef.current.getElementById(selectedSituation);
      if (selectedNode.length > 0) {
        if (selectedSituation === 'Dumping') {
          selectedNode.style({
            'background-color': '#93c5fd',
            'border-color': '#2563eb',
            'border-width': 4,
          });
        } else if (selectedSituation === 'Unconscious') {
          selectedNode.style({
            'background-color': '#e9d5ff',
            'background-opacity': 1,
            'border-color': '#7e22ce',
            'border-width': 5,
            'border-style': 'dashed',
            'shape': 'ellipse',
            'width': 220,
            'height': 110,
          });
        } else {
          selectedNode.style({
            'background-color': '#fde68a',
            'border-color': '#d97706',
            'border-width': 4,
          });
        }
      }
    }
  }, [selectedSituation]);

  // Update layout when layoutType changes
  useEffect(() => {
    if (!cyRef.current) return;

    const layout = cyRef.current.layout(getLayoutConfig(layoutType));
    layout.run();
    
    // Fit to viewport after layout
    cyRef.current.fit(undefined, 50);
  }, [layoutType]);

  // Rotation animation for Unconscious state in circle layout
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    
    if (isUnconscious && layoutType === 'circle') {
      const centerX = cy.width() / 2;
      const centerY = cy.height() / 2;
      
      // Store initial positions
      const initialPositions = new Map<string, { x: number; y: number; angle: number; radius: number }>();
      cy.nodes().forEach((node) => {
        const pos = node.position();
        const dx = pos.x - centerX;
        const dy = pos.y - centerY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        initialPositions.set(node.id(), { x: pos.x, y: pos.y, angle, radius });
      });

      const rotationSpeed = 0.002; // radians per frame
      let lastTime = performance.now();

      const animate = (currentTime: number) => {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        rotationRef.current += rotationSpeed * (deltaTime / 16.67); // normalize to 60fps

        cy.batch(() => {
          cy.nodes().forEach((node) => {
            const initial = initialPositions.get(node.id());
            if (initial) {
              const newAngle = initial.angle + rotationRef.current;
              const newX = centerX + initial.radius * Math.cos(newAngle);
              const newY = centerY + initial.radius * Math.sin(newAngle);
              node.position({ x: newX, y: newY });
            }
          });
        });

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    } else {
      // Stop animation and reset to initial positions
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      rotationRef.current = 0;
      
      // Re-run layout to reset positions
      if (cy && layoutType === 'circle') {
        const layout = cy.layout(getLayoutConfig(layoutType));
        layout.run();
        cy.fit(undefined, 50);
      }
    }
  }, [isUnconscious, layoutType]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#f3f4f6',
      }}
    />
  );
};
