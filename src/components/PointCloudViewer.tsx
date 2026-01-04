import { useRef, useEffect, useCallback, useState, memo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { LassoSelector } from './LassoSelector';
import { usePointCloud } from '../hooks/usePointCloud';
import { projectPointsToScreen } from '../utils/projection';
import { batchPointsInPolygon, type Point2D } from '../utils/pointInPolygon';
import type { ToolMode } from './Navbar';

// 选中点的颜色（浅绿色）
const SELECTION_COLOR = new THREE.Color(0.5, 1.0, 0.5);

interface PointCloudViewerProps {
  mode: ToolMode;
  pcdUrl: string | null;
  onLoadStart: () => void;
  onLoadComplete: (pointCount: number) => void;
  onLoadError: (error: string) => void;
  onSelectionComplete: (time: number, selectedCount: number) => void;
}

/**
 * 点云查看器组件
 */
export const PointCloudViewer = memo(function PointCloudViewer({
  mode,
  pcdUrl,
  onLoadStart,
  onLoadComplete,
  onLoadError,
  onSelectionComplete
}: PointCloudViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const animationIdRef = useRef<number>(0);
  
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  const { pointCloud, loadPCD, setPointColors } = usePointCloud();

  // 初始化 Three.js 场景
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
    camera.position.set(0, 0, 50);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controlsRef.current = controls;

    // 添加网格辅助线
    const gridHelper = new THREE.GridHelper(100, 50, 0x333340, 0x222230);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);

    // 渲染循环
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 处理窗口大小变化
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      setCanvasSize({ width: w, height: h });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // 根据模式切换控制器状态
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = mode === 'viewer';
    }
  }, [mode]);

  // 加载 PCD 文件
  useEffect(() => {
    if (!pcdUrl || !sceneRef.current) return;

    onLoadStart();

    loadPCD(pcdUrl).then(() => {
      // 加载完成后在下一个 effect 中添加到场景
    }).catch((err) => {
      onLoadError(err.message || 'Failed to load PCD');
    });
  }, [pcdUrl, loadPCD, onLoadStart, onLoadError]);

  // 当点云数据加载完成后，添加到场景
  useEffect(() => {
    if (!pointCloud || !sceneRef.current || !cameraRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // 移除旧的点云
    if (pointsRef.current) {
      scene.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      if (pointsRef.current.material instanceof THREE.Material) {
        pointsRef.current.material.dispose();
      }
    }

    // 创建点材质
    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      sizeAttenuation: true
    });

    // 创建 Points 对象
    const points = new THREE.Points(pointCloud.geometry, material);
    scene.add(points);
    pointsRef.current = points;

    // 自动调整相机位置
    pointCloud.geometry.computeBoundingSphere();
    const sphere = pointCloud.geometry.boundingSphere;
    if (sphere) {
      const center = sphere.center;
      const radius = sphere.radius;
      
      camera.position.set(center.x, center.y, center.z + radius * 2);
      camera.lookAt(center);
      
      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
    }

    onLoadComplete(pointCloud.pointCount);
  }, [pointCloud, onLoadComplete]);

  // 处理套索选择完成
  const handleSelectionComplete = useCallback((polygon: Point2D[]) => {
    if (!pointCloud || !cameraRef.current) return;

    const startTime = performance.now();

    // 获取点云位置数据
    const positions = pointCloud.geometry.getAttribute('position').array as Float32Array;
    
    // 投影所有点到屏幕坐标
    const screenPositions = projectPointsToScreen(
      positions,
      cameraRef.current,
      canvasSize.width,
      canvasSize.height
    );

    // 批量检测点是否在套索多边形内
    const selectedIndices = batchPointsInPolygon(screenPositions, polygon);
    
    // 计算选中数量
    let selectedCount = 0;
    for (let i = 0; i < selectedIndices.length; i++) {
      if (selectedIndices[i]) selectedCount++;
    }

    // 设置选中点的颜色
    setPointColors(selectedIndices, SELECTION_COLOR);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    onSelectionComplete(totalTime, selectedCount);
    
    console.log(`Selection completed in ${totalTime.toFixed(2)}ms, selected ${selectedCount.toLocaleString()} points`);
  }, [pointCloud, canvasSize, setPointColors, onSelectionComplete]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}
    >
      <LassoSelector
        enabled={mode === 'lasso'}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
        onSelectionComplete={handleSelectionComplete}
      />
    </div>
  );
});
