/**
 * @fileoverview Layout selector component for choosing different graph layouts
 */

import React from 'react';
import { LayoutType } from '../types';

/**
 * @brief Props for LayoutSelector component
 */
interface LayoutSelectorProps {
  selectedLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
}

/**
 * @brief Layout selector component
 * 
 * @param selectedLayout - Currently selected layout type
 * @param onLayoutChange - Callback when layout is changed
 * @return React component for layout selection
 * 
 * @pre selectedLayout must be a valid LayoutType
 * @post Layout selector is rendered with current selection
 */
export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  selectedLayout,
  onLayoutChange,
}) => {
  const layouts: Array<{ value: LayoutType; label: string; description: string }> = [
    { value: 'dagre', label: 'Dagre', description: 'Hierarchical top-to-bottom layout' },
    { value: 'breadthfirst', label: 'Breadth First', description: 'Tree-like breadth-first traversal' },
    { value: 'grid', label: 'Grid', description: 'Regular grid arrangement' },
    { value: 'circle', label: 'Circle', description: 'Circular arrangement' },
    { value: 'concentric', label: 'Concentric', description: 'Concentric circles by importance' },
    { value: 'cose', label: 'CoSE', description: 'Force-directed physics simulation' },
    { value: 'random', label: 'Random', description: 'Random node positions' },
    { value: 'preset', label: 'Preset', description: 'Use predefined positions' },
  ];

  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
    }}>
      <label style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        Layout Algorithm
      </label>
      <select
        value={selectedLayout}
        onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: '#ffffff',
          color: '#374151',
          cursor: 'pointer',
        }}
      >
        {layouts.map((layout) => (
          <option key={layout.value} value={layout.value}>
            {layout.label} - {layout.description}
          </option>
        ))}
      </select>
    </div>
  );
};
