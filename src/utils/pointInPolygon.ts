/**
 * 高性能点在多边形内判断算法（射线法）
 * 
 * 算法原理：从点向右发射射线，计算与多边形边的交点数
 * 如果交点数为奇数，则点在多边形内
 */

export interface Point2D {
    x: number;
    y: number;
}

/**
 * 判断单个点是否在多边形内
 * @param point 待判断的点
 * @param polygon 多边形顶点数组（按顺序连接）
 * @returns 是否在多边形内
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
    const n = polygon.length;
    if (n < 3) return false;

    let inside = false;
    const { x, y } = point;

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        // 检查射线是否与边相交
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * 获取多边形的边界框
 */
export function getPolygonBounds(polygon: Point2D[]): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
} {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const p of polygon) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    return { minX, maxX, minY, maxY };
}

/**
 * 批量检测点是否在多边形内（优化版）
 * 使用边界框预过滤 + 射线法精确判断
 * 
 * @param screenPositions 屏幕坐标数组 [x0, y0, x1, y1, ...]
 * @param polygon 多边形顶点
 * @returns 每个点是否在多边形内的布尔数组
 */
export function batchPointsInPolygon(
    screenPositions: Float32Array,
    polygon: Point2D[]
): Uint8Array {
    const pointCount = screenPositions.length / 2;
    const results = new Uint8Array(pointCount);

    if (polygon.length < 3) return results;

    // 获取边界框用于快速过滤
    const bounds = getPolygonBounds(polygon);

    // 预计算多边形数据
    const n = polygon.length;
    const polyX = new Float32Array(n);
    const polyY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        polyX[i] = polygon[i].x;
        polyY[i] = polygon[i].y;
    }

    for (let i = 0; i < pointCount; i++) {
        const x = screenPositions[i * 2];
        const y = screenPositions[i * 2 + 1];

        // 边界框快速过滤
        if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) {
            results[i] = 0;
            continue;
        }

        // 射线法精确判断
        let inside = false;
        for (let j = 0, k = n - 1; j < n; k = j++) {
            const xi = polyX[j], yi = polyY[j];
            const xk = polyX[k], yk = polyY[k];

            if (((yi > y) !== (yk > y)) && (x < (xk - xi) * (y - yi) / (yk - yi) + xi)) {
                inside = !inside;
            }
        }

        results[i] = inside ? 1 : 0;
    }

    return results;
}
