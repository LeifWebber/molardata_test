import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { PCDLoader } from 'three-stdlib';

export interface PointCloudData {
    geometry: THREE.BufferGeometry;
    pointCount: number;
    originalColors: Float32Array;
}

interface UsePointCloudResult {
    pointCloud: PointCloudData | null;
    loading: boolean;
    error: string | null;
    loadPCD: (url: string) => Promise<void>;
    resetColors: () => void;
    setPointColors: (indices: Uint8Array, color: THREE.Color) => void;
}

/**
 * 点云加载和管理 Hook
 */
export function usePointCloud(): UsePointCloudResult {
    const [pointCloud, setPointCloud] = useState<PointCloudData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loaderRef = useRef<PCDLoader | null>(null);

    // 初始化 loader
    useEffect(() => {
        loaderRef.current = new PCDLoader();
    }, []);

    /**
     * 加载 PCD 文件
     */
    const loadPCD = useCallback(async (url: string) => {
        if (!loaderRef.current) return;

        setLoading(true);
        setError(null);

        try {
            const points = await new Promise<THREE.Points>((resolve, reject) => {
                loaderRef.current!.load(
                    url,
                    (points) => resolve(points),
                    undefined,
                    (err) => reject(err)
                );
            });

            const geometry = points.geometry;
            const positionAttr = geometry.getAttribute('position');
            const pointCount = positionAttr.count;

            // 初始化颜色属性（如果不存在）
            let colorAttr = geometry.getAttribute('color');
            if (!colorAttr) {
                const colors = new Float32Array(pointCount * 3);
                // 默认白色
                for (let i = 0; i < pointCount; i++) {
                    colors[i * 3] = 1.0;     // R
                    colors[i * 3 + 1] = 1.0; // G
                    colors[i * 3 + 2] = 1.0; // B
                }
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                colorAttr = geometry.getAttribute('color');
            }

            // 保存原始颜色
            const originalColors = new Float32Array(colorAttr.array.length);
            originalColors.set(colorAttr.array as Float32Array);

            setPointCloud({
                geometry,
                pointCount,
                originalColors
            });

            console.log(`Loaded ${pointCount.toLocaleString()} points from ${url}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load PCD file';
            setError(message);
            console.error('PCD loading error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * 重置所有点为原始颜色
     */
    const resetColors = useCallback(() => {
        if (!pointCloud) return;

        const colorAttr = pointCloud.geometry.getAttribute('color');
        if (colorAttr) {
            (colorAttr.array as Float32Array).set(pointCloud.originalColors);
            colorAttr.needsUpdate = true;
        }
    }, [pointCloud]);

    /**
     * 设置指定点的颜色
     * @param indices Uint8Array，1 表示选中，0 表示未选中
     * @param color 要设置的颜色
     */
    const setPointColors = useCallback((indices: Uint8Array, color: THREE.Color) => {
        if (!pointCloud) return;

        const colorAttr = pointCloud.geometry.getAttribute('color');
        if (!colorAttr) return;

        const colors = colorAttr.array as Float32Array;
        const originalColors = pointCloud.originalColors;

        // 先重置所有颜色
        colors.set(originalColors);

        // 设置选中点的颜色
        for (let i = 0; i < indices.length; i++) {
            if (indices[i]) {
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
        }

        colorAttr.needsUpdate = true;
    }, [pointCloud]);

    return {
        pointCloud,
        loading,
        error,
        loadPCD,
        resetColors,
        setPointColors
    };
}
