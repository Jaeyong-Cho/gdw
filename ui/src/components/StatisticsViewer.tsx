/**
 * @fileoverview Statistics Viewer component for conscious/unconscious time tracking
 * 
 * @brief Displays daily statistics with charts for conscious and unconscious time
 * 
 * @pre Database contains state transitions and cycle data
 * @post Displays charts showing daily conscious/unconscious time distribution
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { getDailyStatistics } from '../data/db';

interface StatisticsViewerProps {
  onClose: () => void;
}

interface DailyStat {
  date: string;
  consciousMinutes: number;
  unconsciousMinutes: number;
}

/**
 * @brief Component for viewing daily statistics
 * 
 * @param onClose - Callback when viewer is closed
 * 
 * @pre Database is initialized
 * @post Displays daily statistics charts
 */
export const StatisticsViewer: React.FC<StatisticsViewerProps> = ({ onClose }) => {
  const [statistics, setStatistics] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadStatistics();
  }, [startDate, endDate]);

  /**
   * @brief Load daily statistics from database
   * 
   * @pre Database is available
   * @post Statistics are loaded into component state
   */
  const loadStatistics = async () => {
    setLoading(true);
    try {
      const stats = await getDailyStatistics(
        startDate || undefined,
        endDate || undefined
      );
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * @brief Format minutes to hours and minutes string
   * 
   * @param minutes - Total minutes
   * @return Formatted string (e.g., "2h 30m")
   * 
   * @pre minutes >= 0
   * @post Returns formatted time string
   */
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `${mins}m`;
    }
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };

  /**
   * @brief Format date for display
   * 
   * @param dateStr - ISO date string
   * @return Formatted date string
   * 
   * @pre dateStr is valid ISO date string
   * @post Returns formatted date
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
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
          borderRadius: '8px',
          fontSize: '16px',
        }}>
          통계를 불러오는 중...
        </div>
      </div>
    );
  }

  const totalConscious = statistics.reduce((sum, stat) => sum + stat.consciousMinutes, 0);
  const totalUnconscious = statistics.reduce((sum, stat) => sum + stat.unconsciousMinutes, 0);
  const totalMinutes = totalConscious + totalUnconscious;

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
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
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
            fontWeight: '600',
            color: '#111827',
          }}>
            의식/무의식 시간 통계
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

        {/* Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
          }}>
            <div style={{
              fontSize: '14px',
              color: '#1e40af',
              marginBottom: '8px',
            }}>
              총 의식 시간
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1e3a8a',
            }}>
              {formatTime(totalConscious)}
            </div>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#f5f3ff',
            borderRadius: '8px',
            border: '1px solid #c4b5fd',
          }}>
            <div style={{
              fontSize: '14px',
              color: '#5b21b6',
              marginBottom: '8px',
            }}>
              총 무의식 시간
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#4c1d95',
            }}>
              {formatTime(totalUnconscious)}
            </div>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #86efac',
          }}>
            <div style={{
              fontSize: '14px',
              color: '#166534',
              marginBottom: '8px',
            }}>
              총 시간
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#14532d',
            }}>
              {formatTime(totalMinutes)}
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          alignItems: 'center',
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
          }}>
            시작일:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
            }}
          />
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginLeft: '12px',
          }}>
            종료일:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
            }}
          />
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              marginLeft: '12px',
            }}
          >
            초기화
          </button>
        </div>

        {/* Charts */}
        {statistics.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            color: '#6b7280',
            fontSize: '16px',
          }}>
            통계 데이터가 없습니다.
          </div>
        ) : (
          <>
            {/* Bar Chart */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '16px',
              }}>
                날짜별 의식/무의식 시간 (막대 그래프)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={statistics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    label={{ value: '시간 (분)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatTime(value)}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Legend />
                  <Bar dataKey="consciousMinutes" fill="#3b82f6" name="의식 시간" />
                  <Bar dataKey="unconsciousMinutes" fill="#8b5cf6" name="무의식 시간" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line Chart */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '16px',
              }}>
                날짜별 의식/무의식 시간 추이 (선 그래프)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={statistics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    label={{ value: '시간 (분)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatTime(value)}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="consciousMinutes"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="의식 시간"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="unconsciousMinutes"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="무의식 시간"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
