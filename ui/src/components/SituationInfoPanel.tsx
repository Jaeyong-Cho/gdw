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
 * @brief Panel component displaying situation details and guide
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
          Select a situation from the graph to view its details and guide.
        </p>
      </div>
    );
  }

  const definition = situationDefinitions[situation];
  const guide = definition.guide;

  const sectionStyle = {
    marginTop: '24px',
  };

  const sectionTitleStyle = {
    marginTop: 0,
    marginBottom: '12px',
    color: '#374151',
    fontSize: '16px',
    fontWeight: '600',
  };

  const contentStyle = {
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '8px',
  };

  const listItemStyle = {
    padding: '8px 0',
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.5',
    borderBottom: '1px solid #e5e7eb',
  };

  const quickCheckItemStyle = {
    padding: '8px 0',
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.5',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  };

  const badgeStyle = {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    marginLeft: '8px',
  };

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

      {guide && (
        <>
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              해야 할 것
            </h3>
            <p style={contentStyle}>
              {guide.whatToDo}
            </p>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              다음 단계 조건
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {guide.conditionsToProceed.map((condition, index) => (
                <li key={index} style={listItemStyle}>
                  <span style={{ color: '#3b82f6', marginRight: '8px' }}>✓</span>
                  {condition}
                </li>
              ))}
            </ul>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              실패
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {guide.failure.map((item, index) => (
                <li key={index} style={listItemStyle}>
                  <span style={{ color: '#ef4444', marginRight: '8px' }}>✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              되돌아갈 곳
            </h3>
            <p style={contentStyle}>
              {guide.goBackTo}
            </p>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              주의
            </h3>
            <p style={{
              ...contentStyle,
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderLeft: '3px solid #f59e0b',
              borderRadius: '4px',
            }}>
              {guide.warning}
            </p>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              팁
            </h3>
            <p style={{
              ...contentStyle,
              padding: '12px',
              backgroundColor: '#dbeafe',
              borderLeft: '3px solid #3b82f6',
              borderRadius: '4px',
            }}>
              {guide.tip}
            </p>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              AI 활용
            </h3>
            <p style={contentStyle}>
              {guide.aiUsage}
            </p>
          </div>

          <div style={{
            ...sectionStyle,
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderLeft: '3px solid #10b981',
            borderRadius: '4px',
          }}>
            <h3 style={{
              ...sectionTitleStyle,
              color: '#059669',
              marginBottom: '12px',
            }}>
              빠른 체크 (30초)
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {guide.quickCheck.items.map((item, index) => (
                <li key={index} style={quickCheckItemStyle}>
                  <input
                    type="checkbox"
                    style={{
                      marginTop: '2px',
                      cursor: 'pointer',
                    }}
                  />
                  <span>{item.question}</span>
                </li>
              ))}
            </ul>
            <p style={{
              ...contentStyle,
              marginTop: '12px',
              fontWeight: '600',
              color: '#059669',
            }}>
              → {guide.quickCheck.nextStep}
            </p>
          </div>
        </>
      )}

      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
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
