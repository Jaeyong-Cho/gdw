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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  getDailyStatistics, 
  getStateTimeStatistics, 
  getStateTransitionHistory,
  getDailyStateStatistics,
  getUnconsciousStatistics,
  getAllUnconsciousPeriods,
  StateTimeStats,
  StateTransitionRecord,
  DailyStateStats,
} from '../data/db';

interface StatisticsViewerProps {
  onClose: () => void;
}

interface DailyStat {
  date: string;
  consciousMinutes: number;
  unconsciousMinutes: number;
}

type TabType = 'overview' | 'states' | 'history' | 'daily-states' | 'unconscious';

/**
 * @brief Unconscious period data type
 */
interface UnconsciousPeriodData {
  id: number;
  startedAt: string;
  endedAt: string | null;
  entryReason: string | null;
  exitReason: string | null;
  previousCycleId: number | null;
  nextCycleId: number | null;
  durationMs: number | null;
}

/**
 * @brief Unconscious statistics type
 */
interface UnconsciousStats {
  totalPeriods: number;
  completedPeriods: number;
  activePeriod: boolean;
  totalDurationMs: number;
  averageDurationMs: number;
  longestDurationMs: number;
  shortestDurationMs: number;
}

/**
 * @brief Color palette for state charts
 */
const STATE_COLORS: Record<string, string> = {
  Dumping: '#3b82f6',
  DefiningIntent: '#8b5cf6',
  GatheringFacts: '#f59e0b',
  SelectingProblem: '#ec4899',
  DefiningAcceptance: '#f59e0b',
  CheckingFeasibility: '#10b981',
  Designing: '#06b6d4',
  BreakingTasks: '#6366f1',
  Implementing: '#84cc16',
  Verifying: '#f97316',
  Verified: '#22c55e',
  Releasing: '#14b8a6',
  CollectingFeedback: '#a855f7',
  Learning: '#ef4444',
  Ending: '#78716c',
  Unconscious: '#9333ea',
  FailingIntent: '#dc2626',
};

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
  const [stateStats, setStateStats] = useState<StateTimeStats[]>([]);
  const [transitionHistory, setTransitionHistory] = useState<StateTransitionRecord[]>([]);
  const [dailyStateStats, setDailyStateStats] = useState<DailyStateStats[]>([]);
  const [unconsciousPeriods, setUnconsciousPeriods] = useState<UnconsciousPeriodData[]>([]);
  const [unconsciousStats, setUnconsciousStats] = useState<UnconsciousStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Period selection state
  type PeriodType = 'day' | 'week' | 'month' | 'year';
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [periodOffset, setPeriodOffset] = useState<number>(0); // 0 = current, -1 = previous, 1 = next

  /**
   * @brief Calculate date range based on period type and offset
   */
  const calculateDateRange = (type: PeriodType, offset: number): { start: string; end: string; label: string } => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    switch (type) {
      case 'day':
        start = new Date(now);
        start.setDate(start.getDate() + offset);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        label = start.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        break;
      case 'week':
        start = new Date(now);
        const dayOfWeek = start.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start.setDate(start.getDate() + diffToMonday + (offset * 7));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        label = `${start.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
        end.setHours(23, 59, 59, 999);
        label = start.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
        break;
      case 'year':
        start = new Date(now.getFullYear() + offset, 0, 1);
        end = new Date(now.getFullYear() + offset, 11, 31);
        end.setHours(23, 59, 59, 999);
        label = `${start.getFullYear()}년`;
        break;
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label,
    };
  };

  useEffect(() => {
    const range = calculateDateRange(periodType, periodOffset);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [periodType, periodOffset]);

  useEffect(() => {
    if (startDate && endDate) {
      loadStatistics();
    }
  }, [startDate, endDate]);

  /**
   * @brief Load all statistics from database
   * 
   * @pre Database is available
   * @post Statistics are loaded into component state
   */
  const loadStatistics = async () => {
    setLoading(true);
    try {
      const [stats, stateTimeStats, history, dailyStates, uncPeriods, uncStats] = await Promise.all([
        getDailyStatistics(startDate || undefined, endDate || undefined),
        getStateTimeStatistics(startDate || undefined, endDate || undefined),
        getStateTransitionHistory(100),
        getDailyStateStatistics(startDate || undefined, endDate || undefined),
        getAllUnconsciousPeriods(),
        getUnconsciousStatistics(),
      ]);
      setStatistics(stats);
      setStateStats(stateTimeStats);
      setTransitionHistory(history);
      setDailyStateStats(dailyStates);
      setUnconsciousPeriods(uncPeriods);
      setUnconsciousStats(uncStats);
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

  /**
   * @brief Format datetime for display
   * 
   * @param dateStr - ISO datetime string
   * @return Formatted datetime string
   * 
   * @pre dateStr is valid ISO datetime string
   * @post Returns formatted datetime
   */
  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * @brief Get color for a state
   * 
   * @param situation - State name
   * @return Color hex code
   */
  const getStateColor = (situation: string): string => {
    return STATE_COLORS[situation] || '#6b7280';
  };

  /**
   * @brief Prepare data for stacked bar chart
   */
  const prepareStackedBarData = () => {
    const allStates = new Set<string>();
    dailyStateStats.forEach(day => {
      Object.keys(day.stateMinutes).forEach(state => allStates.add(state));
    });

    return dailyStateStats.map(day => ({
      date: day.date,
      ...day.stateMinutes,
    }));
  };

  /**
   * @brief Get unique states from daily state stats
   */
  const getUniqueStates = (): string[] => {
    const states = new Set<string>();
    dailyStateStats.forEach(day => {
      Object.keys(day.stateMinutes).forEach(state => states.add(state));
    });
    return Array.from(states);
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

        {/* Period Selection */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['day', 'week', 'month', 'year'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setPeriodType(type);
                  setPeriodOffset(0);
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: periodType === type ? '600' : '400',
                  backgroundColor: periodType === type ? '#3b82f6' : '#ffffff',
                  color: periodType === type ? '#ffffff' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {type === 'day' ? '일별' : type === 'week' ? '주별' : type === 'month' ? '월별' : '연별'}
              </button>
            ))}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setPeriodOffset(prev => prev - 1)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              ◀ 이전
            </button>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827',
              minWidth: '150px',
              textAlign: 'center',
            }}>
              {calculateDateRange(periodType, periodOffset).label}
            </span>
            <button
              onClick={() => setPeriodOffset(prev => prev + 1)}
              disabled={periodOffset >= 0}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: periodOffset >= 0 ? '#f3f4f6' : '#ffffff',
                color: periodOffset >= 0 ? '#9ca3af' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: periodOffset >= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              다음 ▶
            </button>
            <button
              onClick={() => setPeriodOffset(0)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              오늘
            </button>
          </div>
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

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #e5e7eb',
        }}>
          {[
            { id: 'overview' as TabType, label: '개요' },
            { id: 'states' as TabType, label: '상태별 통계' },
            { id: 'daily-states' as TabType, label: '일별 상태 분석' },
            { id: 'unconscious' as TabType, label: '무의식 기간' },
            { id: 'history' as TabType, label: '전환 이력' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                backgroundColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#6b7280',
                border: 'none',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
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
                        strokeDasharray="5 5"
                        name="의식 시간"
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="unconsciousMinutes"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="무의식 시간"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'states' && (
          <>
            {stateStats.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: '#6b7280',
                fontSize: '16px',
              }}>
                상태별 통계 데이터가 없습니다.
              </div>
            ) : (
              <>
                {/* State Time Pie Chart */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '16px',
                    }}>
                      상태별 시간 분포
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={stateStats}
                          dataKey="totalMinutes"
                          nameKey="situation"
                          cx="50%"
                          cy="50%"
                          outerRadius={150}
                          label={({ situation, totalMinutes }) => 
                            totalMinutes > 0 ? `${situation}: ${formatTime(totalMinutes)}` : ''
                          }
                        >
                          {stateStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getStateColor(entry.situation)} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatTime(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* State Statistics Table */}
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '16px',
                  }}>
                    상태별 시간 상세
                  </h3>
                  <div style={{
                    overflowX: 'auto',
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px',
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>상태</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>총 시간</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>평균 시간</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>최소 시간</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>최대 시간</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>진입 횟수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stateStats.map((stat, index) => (
                          <tr key={stat.situation} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                            <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '2px',
                                  backgroundColor: getStateColor(stat.situation),
                                }} />
                                {stat.situation}
                              </div>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                              {formatTime(stat.totalMinutes)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                              {formatTime(stat.averageMinutes)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                              {formatTime(stat.minMinutes)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                              {formatTime(stat.maxMinutes)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                              {stat.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'daily-states' && (
          <>
            {dailyStateStats.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: '#6b7280',
                fontSize: '16px',
              }}>
                일별 상태 데이터가 없습니다.
              </div>
            ) : (
              <>
                {/* Stacked Bar Chart */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '16px',
                  }}>
                    일별 상태별 시간 분포
                  </h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={prepareStackedBarData()}>
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
                      {getUniqueStates().map(state => (
                        <Bar
                          key={state}
                          dataKey={state}
                          stackId="a"
                          fill={getStateColor(state)}
                          name={state}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'unconscious' && (
          <>
            {unconsciousPeriods.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: '#6b7280',
                fontSize: '16px',
              }}>
                무의식 기간 데이터가 없습니다.
              </div>
            ) : (
              <>
                {/* Unconscious Statistics Summary */}
                {unconsciousStats && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '32px',
                  }}>
                    <div style={{
                      backgroundColor: '#f3e8ff',
                      padding: '20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#9333ea' }}>
                        {unconsciousStats.totalPeriods}
                      </div>
                      <div style={{ fontSize: '14px', color: '#7e22ce', marginTop: '4px' }}>
                        총 무의식 기간
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#fef3c7',
                      padding: '20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#d97706' }}>
                        {formatTime(Math.floor(unconsciousStats.totalDurationMs / 60000))}
                      </div>
                      <div style={{ fontSize: '14px', color: '#b45309', marginTop: '4px' }}>
                        총 무의식 시간
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#dbeafe',
                      padding: '20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb' }}>
                        {formatTime(Math.floor(unconsciousStats.averageDurationMs / 60000))}
                      </div>
                      <div style={{ fontSize: '14px', color: '#1d4ed8', marginTop: '4px' }}>
                        평균 무의식 시간
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: unconsciousStats.activePeriod ? '#fee2e2' : '#dcfce7',
                      padding: '20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: '700', 
                        color: unconsciousStats.activePeriod ? '#dc2626' : '#16a34a' 
                      }}>
                        {unconsciousStats.activePeriod ? '무의식 중' : '의식 중'}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: unconsciousStats.activePeriod ? '#b91c1c' : '#15803d', 
                        marginTop: '4px' 
                      }}>
                        현재 상태
                      </div>
                    </div>
                  </div>
                )}

                {/* Unconscious Periods Bar Chart */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '16px',
                  }}>
                    무의식 기간 분포
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={unconsciousPeriods.filter(p => p.durationMs !== null).slice(0, 20).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="startedAt" 
                        tickFormatter={(value) => formatDate(value)}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatTime(Math.floor(value / 60000))}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatTime(Math.floor(value / 60000)), '무의식 시간']}
                        labelFormatter={(value) => formatDateTime(value as string)}
                      />
                      <Bar dataKey="durationMs" name="무의식 시간" fill="#9333ea" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Unconscious Periods Table */}
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '16px',
                  }}>
                    무의식 기간 상세
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>시작 시간</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>종료 시간</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>소요 시간</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>진입 사유</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>이전 Cycle</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>다음 Cycle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unconsciousPeriods.map((period, index) => (
                          <tr key={period.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                            <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                              {formatDateTime(period.startedAt)}
                            </td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                              {period.endedAt ? formatDateTime(period.endedAt) : (
                                <span style={{ color: '#9333ea', fontWeight: '500' }}>진행 중</span>
                              )}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                              {period.durationMs !== null ? formatTime(Math.floor(period.durationMs / 60000)) : '-'}
                            </td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                              {period.entryReason || '-'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                              {period.previousCycleId || '-'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                              {period.nextCycleId || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {transitionHistory.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: '#6b7280',
                fontSize: '16px',
              }}>
                전환 이력이 없습니다.
              </div>
            ) : (
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '16px',
                }}>
                  최근 상태 전환 이력
                </h3>
                <div style={{
                  overflowX: 'auto',
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>상태</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>시작 시간</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>종료 시간</th>
                        <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>소요 시간</th>
                        <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Cycle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transitionHistory.map((record, index) => (
                        <tr key={record.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '2px',
                                backgroundColor: getStateColor(record.situation),
                              }} />
                              {record.situation}
                            </div>
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                            {formatDateTime(record.enteredAt)}
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                            {record.exitedAt ? formatDateTime(record.exitedAt) : (
                              <span style={{ color: '#10b981', fontWeight: '500' }}>진행 중</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                            {record.durationMinutes !== null ? formatTime(record.durationMinutes) : '-'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                            {record.cycleId || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
