/**
 * @fileoverview Database settings and management component
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  getDatabaseInfo, 
  exportDatabase, 
  importDatabase, 
  clearDatabase,
  setDatabaseLocationWithPath,
  getDatabasePath,
  clearDatabaseLocation,
  isDatabaseLocationConfigured,
  isBackendServerAvailable
} from '../data/db';

/**
 * @brief Database settings component for managing database
 * 
 * @return React component for database management
 * 
 * @pre None
 * @post Database settings UI is rendered
 */
/**
 * @brief Add CSS animation for confetti effect
 */
const style = document.createElement('style');
style.textContent = `
  @keyframes confetti {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0) rotate(0deg);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(2) rotate(360deg);
    }
  }
`;
if (!document.head.querySelector('style[data-confetti]')) {
  style.setAttribute('data-confetti', 'true');
  document.head.appendChild(style);
}

export const DatabaseSettings: React.FC = () => {
  const [dbInfo, setDbInfo] = useState<{
    storageType: string;
    storageLocation: string;
    sizeBytes: number;
    sizeFormatted: string;
    recordCount: number;
    hasFileSystemAccess: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isServerAvailable, setIsServerAvailable] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [pathStatus, setPathStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * @brief Load database information
   * 
   * @pre None
   * @post Database info is loaded and displayed
   */
  const loadDatabaseInfo = async () => {
    try {
      setLoading(true);
      const info = await getDatabaseInfo();
      setDbInfo(info);
      
      const configured = await isDatabaseLocationConfigured();
      setIsConfigured(configured);
    } catch (error) {
      console.error('Failed to load database info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeSettings = async () => {
      const serverAvailable = await isBackendServerAvailable();
      setIsServerAvailable(serverAvailable);
      
      const configured = await isDatabaseLocationConfigured();
      setIsConfigured(configured);
      
      if (configured) {
        const path = await getDatabasePath();
        if (path) {
          setCustomPath(path);
        }
      }
      
      await loadDatabaseInfo();
    };
    
    initializeSettings();
  }, []);

  /**
   * @brief Show visual feedback
   * 
   * @param status - Status to show
   * @param setter - State setter function
   */
  const showFeedback = (status: 'success' | 'error', setter: React.Dispatch<React.SetStateAction<'idle' | 'success' | 'error'>>) => {
    setter(status);
    setTimeout(() => {
      setter('idle');
    }, 2000);
  };

  /**
   * @brief Export database to file
   * 
   * @pre Database is initialized
   * @post Database file is downloaded
   */
  const handleExport = async () => {
    try {
      const data = await exportDatabase();
      const buffer = data.buffer as ArrayBuffer;
      const blob = new Blob([buffer], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdw-database-${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback('success', setExportStatus);
    } catch (error) {
      console.error('Failed to export database:', error);
      showFeedback('error', setExportStatus);
    }
  };

  /**
   * @brief Import database from file
   * 
   * @pre User selects valid database file
   * @post Database is replaced with imported data
   */
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await importDatabase(uint8Array);
      await loadDatabaseInfo();
      showFeedback('success', setImportStatus);
    } catch (error) {
      console.error('Failed to import database:', error);
      showFeedback('error', setImportStatus);
    }
    
    event.target.value = '';
  };

  /**
   * @brief Trigger file input click
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * @brief Clear all database data
   * 
   * @pre User confirms action
   * @post All database data is deleted
   */
  const handleClear = async () => {
    const confirmed = confirm(
      '모든 데이터베이스 내용이 삭제됩니다. 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?'
    );
    if (!confirmed) return;

    try {
      await clearDatabase();
      await loadDatabaseInfo();
      alert('데이터베이스가 초기화되었습니다.');
    } catch (error) {
      console.error('Failed to clear database:', error);
      alert('데이터베이스 초기화에 실패했습니다.');
    }
  };

  /**
   * @brief Copy storage location to clipboard with fallback for cross-platform compatibility
   * 
   * @pre dbInfo is loaded
   * @post Storage location is copied to clipboard
   */
  const handleCopyLocation = async () => {
    if (!dbInfo) return;
    
    const locationInfo = `Storage Type: ${dbInfo.storageType}\nLocation: ${dbInfo.storageLocation}`;
    
    try {
      // Try modern Clipboard API first (works on HTTPS/localhost)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(locationInfo);
        alert('저장 위치 정보가 클립보드에 복사되었습니다.');
        return;
      }
      
      // Fallback: Use execCommand for older browsers and cross-platform compatibility
      const textArea = document.createElement('textarea');
      textArea.value = locationInfo;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        alert('저장 위치 정보가 클립보드에 복사되었습니다.');
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (error) {
      console.error('Error copying location:', error);
      alert('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
    }
  };

  /**
   * @brief Save custom database path
   */
  const handleSaveCustomPath = async () => {
    if (!customPath.trim()) {
      return;
    }
    
    try {
      const path = await setDatabaseLocationWithPath(customPath);
      await loadDatabaseInfo();
      showFeedback('success', setPathStatus);
      console.log(`Database path set to: ${path}`);
    } catch (error) {
      console.error('Failed to set database path:', error);
      showFeedback('error', setPathStatus);
    }
  };

  /**
   * @brief Clear database file location
   * 
   * @pre Database location is set
   * @post Database location is cleared
   */
  const handleClearLocation = async () => {
    try {
      await clearDatabaseLocation();
      setCustomPath('');
      await loadDatabaseInfo();
      setIsConfigured(false);
      showFeedback('success', setPathStatus);
    } catch (error) {
      console.error('Failed to clear database location:', error);
      showFeedback('error', setPathStatus);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: '#6b7280',
      }}>
        데이터베이스 정보 로딩 중...
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '24px',
      }}>
        데이터베이스 설정
      </h2>

      {/* Database Information */}
      <div style={{
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '16px',
        }}>
          데이터베이스 정보
        </h3>
        
        {dbInfo && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>저장 위치</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>
                  {dbInfo.storageType}
                </span>
                <button
                  onClick={handleCopyLocation}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  복사
                </button>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>저장 경로</span>
              <span style={{ 
                color: '#111827', 
                fontSize: '14px', 
                fontWeight: '500', 
                fontFamily: 'monospace',
                maxWidth: '400px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {dbInfo.storageLocation}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>데이터베이스 크기</span>
              <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>
                {dbInfo.sizeFormatted}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
            }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>저장된 답변 수</span>
              <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>
                {dbInfo.recordCount}개
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Server Status Warning */}
      {!isServerAvailable && (
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '8px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#991b1b',
            marginBottom: '12px',
          }}>
            ⚠️ 백엔드 서버가 실행되지 않았습니다
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#991b1b',
            lineHeight: '1.6',
            margin: '0 0 12px 0',
          }}>
            파일 시스템에 데이터베이스를 저장하려면 백엔드 서버가 필요합니다.
          </p>
          <pre style={{
            fontSize: '12px',
            backgroundColor: '#7f1d1d',
            color: '#fef2f2',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            fontFamily: 'monospace',
          }}>
{`cd server
npm install
npm start`}
          </pre>
          <p style={{
            fontSize: '13px',
            color: '#991b1b',
            margin: '12px 0 0 0',
            fontStyle: 'italic',
          }}>
            현재는 LocalStorage에만 저장됩니다.
          </p>
        </div>
      )}

      {/* Path Configuration Warning */}
      {isServerAvailable && !isConfigured && (
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#fef3c7',
          border: '2px solid #fbbf24',
          borderRadius: '8px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#92400e',
            marginBottom: '12px',
          }}>
            ⚠️ 데이터베이스 저장 경로를 설정해주세요
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#92400e',
            lineHeight: '1.6',
            margin: 0,
          }}>
            아래에서 데이터베이스 파일 경로를 입력하고 저장 버튼을 클릭해주세요.
          </p>
        </div>
      )}

      {/* File Location Settings */}
      {isServerAvailable && (
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: isConfigured ? '#f0fdf4' : '#f0f9ff',
          border: `1px solid ${isConfigured ? '#86efac' : '#bae6fd'}`,
          borderRadius: '8px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: isConfigured ? '#166534' : '#0c4a6e',
            marginBottom: '16px',
          }}>
            데이터베이스 파일 경로
          </h3>
          
          {isConfigured && (
            <div style={{
              padding: '12px',
              backgroundColor: '#dcfce7',
              borderRadius: '6px',
              marginBottom: '12px',
            }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: '#166534',
                fontWeight: '500',
              }}>
                ✓ 파일 시스템에 자동 저장 중
              </p>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#166534',
                fontFamily: 'monospace',
              }}>
                {dbInfo?.storageLocation}
              </p>
            </div>
          )}
          
          <div style={{
            marginBottom: '12px',
          }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: isConfigured ? '#166534' : '#0c4a6e',
            }}>
              파일 경로 입력
            </label>
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="/Users/username/Documents/gdw-database.db"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
            <p style={{
              margin: '6px 0 0 0',
              fontSize: '12px',
              color: '#64748b',
            }}>
              모든 변경사항이 이 경로에 자동으로 저장됩니다
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveCustomPath}
              disabled={!customPath.trim()}
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: pathStatus === 'success' ? '#10b981' : pathStatus === 'error' ? '#ef4444' : customPath.trim() ? '#0284c7' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: customPath.trim() ? 'pointer' : 'not-allowed',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                transform: pathStatus === 'success' ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <span style={{
                position: 'relative',
                zIndex: 1,
              }}>
                {pathStatus === 'success' ? '✓ 경로 저장 완료!' : pathStatus === 'error' ? '✗ 저장 실패' : '경로 저장'}
              </span>
              {pathStatus === 'success' && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '60px',
                  opacity: 0,
                  animation: 'confetti 0.6s ease-out',
                }}>
                  🎉
                </span>
              )}
            </button>
            
            {isConfigured && (
              <button
                onClick={handleClearLocation}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#64748b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                경로 초기화
              </button>
            )}
          </div>
        </div>
      )}

      {/* Database Operations */}
      <div style={{
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '16px',
        }}>
          데이터베이스 관리
        </h3>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Export */}
          <div>
            <button
              onClick={handleExport}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: exportStatus === 'success' ? '#10b981' : exportStatus === 'error' ? '#ef4444' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                transform: exportStatus === 'success' ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <span style={{
                position: 'relative',
                zIndex: 1,
              }}>
                {exportStatus === 'success' ? '✓ 내보내기 성공!' : exportStatus === 'error' ? '✗ 내보내기 실패' : '데이터베이스 내보내기'}
              </span>
              {exportStatus === 'success' && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '60px',
                  opacity: 0,
                  animation: 'confetti 0.6s ease-out',
                }}>
                  🎉
                </span>
              )}
            </button>
            <p style={{
              marginTop: '8px',
              fontSize: '13px',
              color: '#6b7280',
            }}>
              현재 데이터베이스를 파일로 다운로드합니다. 백업용으로 사용할 수 있습니다.
            </p>
          </div>

          {/* Import */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".db,.sqlite,.sqlite3"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleImportClick}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: importStatus === 'success' ? '#10b981' : importStatus === 'error' ? '#ef4444' : '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                transform: importStatus === 'success' ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <span style={{
                position: 'relative',
                zIndex: 1,
              }}>
                {importStatus === 'success' ? '✓ 가져오기 성공!' : importStatus === 'error' ? '✗ 가져오기 실패' : '데이터베이스 가져오기'}
              </span>
              {importStatus === 'success' && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '60px',
                  opacity: 0,
                  animation: 'confetti 0.6s ease-out',
                }}>
                  🎉
                </span>
              )}
            </button>
            <p style={{
              marginTop: '8px',
              fontSize: '13px',
              color: '#6b7280',
            }}>
              이전에 내보낸 데이터베이스 파일을 가져옵니다. 현재 데이터는 완전히 교체됩니다.
            </p>
          </div>

          {/* Clear */}
          <div>
            <button
              onClick={handleClear}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              데이터베이스 초기화
            </button>
            <p style={{
              marginTop: '8px',
              fontSize: '13px',
              color: '#ef4444',
              fontWeight: '500',
            }}>
              주의: 모든 저장된 답변이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div style={{
        padding: '16px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1e40af',
          marginBottom: '8px',
        }}>
          저장 위치 정보
        </h4>
        <div style={{
          fontSize: '13px',
          color: '#1e40af',
          lineHeight: '1.5',
        }}>
          {isServerAvailable ? (
            <>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>백엔드 서버:</strong> 파일 시스템에 직접 접근하여 데이터베이스를 저장합니다.
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>자동 저장:</strong> 모든 변경사항이 실시간으로 설정한 파일 경로에 기록됩니다.
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>LocalStorage 백업:</strong> 서버가 오프라인일 경우 LocalStorage를 백업으로 사용합니다.
              </p>
            </>
          ) : (
            <p style={{ margin: 0 }}>
              백엔드 서버가 실행되지 않았습니다. 
              server 디렉토리에서 `npm start`를 실행하여 서버를 시작해주세요.
              현재는 LocalStorage에만 저장됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
