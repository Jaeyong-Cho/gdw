/**
 * @fileoverview Panel displaying information about the selected situation
 */

import React from 'react';
import { Situation } from '../types';
import { situationDefinitions } from '../data/situations';

/**
 * @brief Props for SituationInfoPanel component
 */
interface SituationInfoPanelProps {
  situation: Situation | null;
}

/**
 * @brief Panel component displaying situation details and checklist
 * 
 * @param situation - Currently selected situation
 * @return React component showing situation information
 * 
 * @pre situation must be a valid Situation or null
 * @post Panel displays situation information or placeholder if none selected
 */
export const SituationInfoPanel: React.FC<SituationInfoPanelProps> = ({ situation }) => {
  if (!situation) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderLeft: '4px solid #e5e7eb',
        borderRadius: '8px',
        minHeight: '200px',
      }}>
        <h3 style={{ marginTop: 0, color: '#6b7280' }}>No Situation Selected</h3>
        <p style={{ color: '#9ca3af' }}>
          Select a situation from the graph to view its details and required facts.
        </p>
      </div>
    );
  }

  const definition = situationDefinitions[situation];

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#ffffff',
      borderLeft: '4px solid #3b82f6',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      <h2 style={{
        marginTop: 0,
        marginBottom: '12px',
        color: '#1f2937',
        fontSize: '24px',
      }}>
        {situation}
      </h2>
      
      <p style={{
        color: '#4b5563',
        marginBottom: '24px',
        fontSize: '16px',
        lineHeight: '1.6',
      }}>
        {definition.description}
      </p>

      <div style={{ marginTop: '24px' }}>
        <h3 style={{
          marginTop: 0,
          marginBottom: '16px',
          color: '#374151',
          fontSize: '18px',
          fontWeight: '600',
        }}>
          Required Facts
        </h3>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}>
          {definition.required_facts.map((fact, index) => (
            <li
              key={index}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                borderLeft: '3px solid #3b82f6',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                <span style={{
                  color: '#3b82f6',
                  fontWeight: '600',
                  marginRight: '8px',
                }}>
                  •
                </span>
                <span style={{ color: '#4b5563', lineHeight: '1.5' }}>
                  {fact.description}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
