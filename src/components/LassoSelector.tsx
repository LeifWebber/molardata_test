import { useRef, useEffect, useCallback, memo } from 'react';
import type { Point2D } from '../utils/pointInPolygon';

interface LassoSelectorProps {
  enabled: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelectionComplete: (polygon: Point2D[]) => void;
}

/**
 * 套索选择器组件
 * 渲染在 Three.js canvas 之上的透明覆盖层
 */
export const LassoSelector = memo(function LassoSelector({
  enabled,
  canvasWidth,
  canvasHeight,
  onSelectionComplete
}: LassoSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const pathRef = useRef<Point2D[]>([]);

  // 绘制套索路径
  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: Point2D[], closed = false) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    if (path.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    
    if (closed) {
      ctx.closePath();
      ctx.fillStyle = 'rgba(74, 222, 128, 0.15)';
      ctx.fill();
    }
    
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    
    // 绘制起点标记
    if (path.length > 0) {
      ctx.beginPath();
      ctx.arc(path[0].x, path[0].y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#4ade80';
      ctx.fill();
    }
  }, [canvasWidth, canvasHeight]);

  // 鼠标事件处理
  useEffect(() => {
    if (!enabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      isDrawing.current = true;
      pathRef.current = [{ x, y }];
      drawPath(ctx, pathRef.current);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 降采样：如果距离上一个点太近，跳过
      const lastPoint = pathRef.current[pathRef.current.length - 1];
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      if (dx * dx + dy * dy < 16) return; // 4px 阈值

      pathRef.current.push({ x, y });
      drawPath(ctx, pathRef.current);
    };

    const handleMouseUp = () => {
      if (!isDrawing.current) return;
      
      isDrawing.current = false;
      
      // 闭合路径并绘制
      if (pathRef.current.length >= 3) {
        drawPath(ctx, pathRef.current, true);
        onSelectionComplete([...pathRef.current]);
      }
      
      // 清空画布（延迟以显示最终结果）
      setTimeout(() => {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      }, 300);
    };

    const handleMouseLeave = () => {
      if (isDrawing.current) {
        handleMouseUp();
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, canvasWidth, canvasHeight, drawPath, onSelectionComplete]);

  // 清空画布当禁用时
  useEffect(() => {
    if (!enabled && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      }
    }
  }, [enabled, canvasWidth, canvasHeight]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
        pointerEvents: enabled ? 'auto' : 'none'
      }}
    />
  );
});
