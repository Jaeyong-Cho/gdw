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

type TabType = 'overview' | 'states' | 'history' | 'daily-states';

/**
 * @brief Color palette for state charts
 */
const STATE_COLORS: Record<string, string> = {
  Dumping: '#3b82f6',
  DefiningIntent: '#8b5cf6',
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
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    loadStatistics();
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
      const [stats, stateTimeStats, history, dailyStates] = await Promise.all([
        getDailyStatistics(startDate || undefined, endDate || undefined),
        getStateTimeStatistics(startDate || undefined, endDate || undefined),
        getStateTransitionHistory(100),
        getDailyStateStatistics(startDate || undefined, endDate || undefined),
      ]);
      setStatistics(stats);
      setStateStats(stateTimeStats);
      setTransitionHistory(history);
      setDailyStateStats(dailyStates);
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
