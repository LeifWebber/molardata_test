import * as THREE from 'three';

/**
 * 高性能 3D 到 2D 投影工具
 * 批量将 3D 点云坐标投影到屏幕坐标
 */

/**
 * 批量投影 3D 点到屏幕坐标
 * 使用手动矩阵运算避免创建 THREE.Vector3 对象
 * 
 * @param positions 点云位置数组 (Float32Array, [x0, y0, z0, x1, y1, z1, ...])
 * @param camera 相机
 * @param width 画布宽度
 * @param height 画布高度
 * @returns 屏幕坐标数组 (Float32Array, [sx0, sy0, sx1, sy1, ...])
 */
export function projectPointsToScreen(
    positions: Float32Array,
    camera: THREE.Camera,
    width: number,
    height: number
): Float32Array {
    const pointCount = positions.length / 3;
    const screenPositions = new Float32Array(pointCount * 2);

    // 获取投影矩阵和视图矩阵的组合
    const projectionMatrix = camera.projectionMatrix;
    const matrixWorldInverse = camera.matrixWorldInverse;

    // 组合成 MVP 矩阵
    const mvpMatrix = new THREE.Matrix4();
    mvpMatrix.multiplyMatrices(projectionMatrix, matrixWorldInverse);

    const e = mvpMatrix.elements;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    for (let i = 0; i < pointCount; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];

        // 手动矩阵乘法（比 THREE.Vector3.project() 快很多）
        const w = e[3] * x + e[7] * y + e[11] * z + e[15];

        if (w === 0) {
            screenPositions[i * 2] = -Infinity;
            screenPositions[i * 2 + 1] = -Infinity;
            continue;
        }

        const invW = 1 / w;
        const ndcX = (e[0] * x + e[4] * y + e[8] * z + e[12]) * invW;
        const ndcY = (e[1] * x + e[5] * y + e[9] * z + e[13]) * invW;

        // NDC 转屏幕坐标
        screenPositions[i * 2] = (ndcX + 1) * halfWidth;
        screenPositions[i * 2 + 1] = (1 - ndcY) * halfHeight;
    }

    return screenPositions;
}

/**
 * 使用 Web Worker 批量投影（用于超大规模点云）
 * 传递 ArrayBuffer 避免数据复制
 */
export interface ProjectionWorkerMessage {
    type: 'project';
    positions: ArrayBuffer;
    mvpElements: number[];
    width: number;
    height: number;
}

export interface ProjectionWorkerResult {
    type: 'result';
    screenPositions: ArrayBuffer;
}
