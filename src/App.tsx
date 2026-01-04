import { useState, useCallback } from 'react';
import './App.css';
import { Navbar, type ToolMode } from './components/Navbar';
import { PointCloudViewer } from './components/PointCloudViewer';

// PCD 文件列表
// 动态获取 src/assets/pcds 下的所有 .pcd 文件
const pcdModules = import.meta.glob('/src/assets/pcds/*.pcd');
const PCD_FILES = Object.keys(pcdModules)
  .map((path) => path.split('/').pop() as string)
  .sort(); // 简单的排序，如果需要特定顺序可以自定义排序逻辑

function App() {
  const [mode, setMode] = useState<ToolMode>('viewer');
  const [selectedFile, setSelectedFile] = useState(PCD_FILES[0]);
  const [loading, setLoading] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [lastSelectionTime, setLastSelectionTime] = useState<number | null>(null);
  const [selectedPointCount, setSelectedPointCount] = useState(0);

  // 构建 PCD 文件 URL
  const pcdUrl = `/src/assets/pcds/${selectedFile}`;

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setPointCount(0);
    setLastSelectionTime(null);
    setSelectedPointCount(0);
  }, []);

  const handleLoadComplete = useCallback((count: number) => {
    setLoading(false);
    setPointCount(count);
  }, []);

  const handleLoadError = useCallback((error: string) => {
    setLoading(false);
    console.error('Load error:', error);
  }, []);

  const handleSelectionComplete = useCallback((time: number, selectedCount: number) => {
    setLastSelectionTime(time);
    setSelectedPointCount(selectedCount);
  }, []);

  const handleFileChange = useCallback((file: string) => {
    setSelectedFile(file);
    setLastSelectionTime(null);
    setSelectedPointCount(0);
  }, []);

  return (
    <>
      <Navbar
        mode={mode}
        onModeChange={setMode}
        pcdFiles={PCD_FILES}
        selectedFile={selectedFile}
        onFileChange={handleFileChange}
        loading={loading}
        pointCount={pointCount}
        lastSelectionTime={lastSelectionTime}
        selectedPointCount={selectedPointCount}
      />
      <PointCloudViewer
        mode={mode}
        pcdUrl={pcdUrl}
        onLoadStart={handleLoadStart}
        onLoadComplete={handleLoadComplete}
        onLoadError={handleLoadError}
        onSelectionComplete={handleSelectionComplete}
      />
    </>
  );
}

export default App;
