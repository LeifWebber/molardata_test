import { memo } from 'react';
import './Navbar.css';

export type ToolMode = 'viewer' | 'lasso';

interface NavbarProps {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  pcdFiles: string[];
  selectedFile: string;
  onFileChange: (file: string) => void;
  loading: boolean;
  pointCount: number;
  lastSelectionTime: number | null;
  selectedPointCount: number;
}

/**
 * 悬浮工具栏组件
 */
export const Navbar = memo(function Navbar({
  mode,
  onModeChange,
  pcdFiles,
  selectedFile,
  onFileChange,
  loading,
  pointCount,
  lastSelectionTime,
  selectedPointCount
}: NavbarProps) {
  return (
    <nav className="navbar">
      {/* 工具切换 */}
      <div className="navbar__section">
        <span className="navbar__label">工具</span>
        <button
          className={`navbar__tool-btn ${mode === 'viewer' ? 'navbar__tool-btn--active' : ''}`}
          onClick={() => onModeChange('viewer')}
          title="查看器模式：支持缩放、旋转、平移"
        >
          🔍 查看器
        </button>
        <button
          className={`navbar__tool-btn ${mode === 'lasso' ? 'navbar__tool-btn--active' : ''}`}
          onClick={() => onModeChange('lasso')}
          title="套索模式：点击拖动选择点云区域"
        >
          ✏️ 套索
        </button>
      </div>

      <div className="navbar__divider" />

      {/* 文件选择 */}
      <div className="navbar__section">
        <span className="navbar__label">模型</span>
        <select
          className="navbar__select"
          value={selectedFile}
          onChange={(e) => onFileChange(e.target.value)}
          disabled={loading}
        >
          {pcdFiles.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
      </div>

      <div className="navbar__divider" />

      {/* 状态信息 */}
      <div className="navbar__section">
        {loading ? (
          <div className="navbar__loading">
            <div className="navbar__spinner" />
            <span>加载中...</span>
          </div>
        ) : (
          <>
            <span className="navbar__point-count">
              {pointCount.toLocaleString()} 点
            </span>
            {selectedPointCount > 0 && (
              <span className="navbar__point-count" style={{ color: '#4ade80' }}>
                | 选中 {selectedPointCount.toLocaleString()}
              </span>
            )}
          </>
        )}
      </div>

      <div className="navbar__divider" />

      {/* 计时显示 */}
      <div className="navbar__section">
        <div className="navbar__timer">
          <span className="navbar__timer-icon">⏱️</span>
          <span className={`navbar__timer-value ${lastSelectionTime === null ? 'navbar__timer-value--idle' : ''}`}>
            {lastSelectionTime !== null ? `${lastSelectionTime.toFixed(2)} ms` : '-- ms'}
          </span>
        </div>
      </div>
    </nav>
  );
});
