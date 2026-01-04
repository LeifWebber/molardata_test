/**
 * 套索选择 Worker
 * 使用 ArrayBuffer 传递大规模点云数据，避免主线程阻塞
 */

import { batchPointsInPolygon, type Point2D } from '../utils/pointInPolygon';

export interface LassoWorkerInput {
    type: 'select';
    // 屏幕坐标 ArrayBuffer (Float32Array: [x0, y0, x1, y1, ...])
    screenPositions: ArrayBufferLike;
    // 套索多边形顶点
    polygon: Point2D[];
}

export interface LassoWorkerOutput {
    type: 'result';
    // 选中状态 ArrayBuffer (Uint8Array: 0 或 1)
    selectedIndices: ArrayBufferLike;
    // 选中的点数量
    selectedCount: number;
    // 处理耗时（毫秒）
    processingTime: number;
}

// Worker 消息处理
self.onmessage = (e: MessageEvent<LassoWorkerInput>) => {
    const { type, screenPositions, polygon } = e.data;

    if (type === 'select') {
        const startTime = performance.now();

        // 转换 ArrayBuffer 为 Float32Array
        const positions = new Float32Array(screenPositions);

        // 批量检测点是否在多边形内
        const results = batchPointsInPolygon(positions, polygon);

        // 计算选中数量
        let selectedCount = 0;
        for (let i = 0; i < results.length; i++) {
            if (results[i]) selectedCount++;
        }

        const processingTime = performance.now() - startTime;

        // 发送结果，使用 transferable objects
        const response: LassoWorkerOutput = {
            type: 'result',
            selectedIndices: results.buffer,
            selectedCount,
            processingTime
        };

        self.postMessage(response, { transfer: [results.buffer] });
    }
};
