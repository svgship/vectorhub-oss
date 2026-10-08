/**
 * 节点几何：从属性推导包围盒，并按类型做平移 / 缩放。
 *
 * 模型刻意不使用 `transform` 属性——几何直接写在属性里，导出的 SVG 更干净，
 * 也更容易在代码面板里阅读。代价是每种元素都要单独实现几何运算。
 *
 * 尚未支持：`path`（需要解析 `d`）、`text`（需要字体度量）、`defs` / `symbol`。
 * 这些留给钢笔与文本工具的迭代。
 */

import type { AttrValue, Point, Rect, VectorNode } from './types'

const MIN_EXTENT = 1e-6

/** 缩放的最小比例，避免拖过头把图形压成 0 尺寸。 */
export const MIN_SCALE = 0.01

export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(MIN_SCALE, value)
}

/** 以 origin 为定点缩放一个包围盒。 */
export function scaleRect(rect: Rect, origin: Point, scaleX: number, scaleY: number): Rect {
  return {
    x: origin.x + (rect.x - origin.x) * scaleX,
    y: origin.y + (rect.y - origin.y) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  }
}

function num(attrs: Record<string, AttrValue>, key: string, fallback = 0): number {
  const value = attrs[key]
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** 解析 `points` 属性。 */
export function parsePoints(value: AttrValue | undefined): Point[] {
  if (typeof value !== 'string') return []
  const numbers = value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  const points: Point[] = []
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    const x = numbers[index]
    const y = numbers[index + 1]
    if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) break
    points.push({ x, y })
  }
  return points
}

export function formatPoints(points: readonly Point[]): string {
  return points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ')
}

function boundsOfPoints(points: readonly Point[]): Rect | null {
  const first = points[0]
  if (!first) return null
  let minX = first.x
  let minY = first.y
  let maxX = first.x
  let maxY = first.y
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function unionBounds(rects: readonly Rect[]): Rect | null {
  const first = rects[0]
  if (!first) return null
  let minX = first.x
  let minY = first.y
  let maxX = first.x + first.width
  let maxY = first.y + first.height
  for (const rect of rects) {
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** 单个节点的包围盒；无法从属性推导时返回 null。 */
export function getNodeBounds(node: VectorNode): Rect | null {
  switch (node.type) {
    case 'rect':
      return {
        x: num(node.attrs, 'x'),
        y: num(node.attrs, 'y'),
        width: num(node.attrs, 'width'),
        height: num(node.attrs, 'height'),
      }
    case 'circle': {
      const r = num(node.attrs, 'r')
      return {
        x: num(node.attrs, 'cx') - r,
        y: num(node.attrs, 'cy') - r,
        width: r * 2,
        height: r * 2,
      }
    }
    case 'ellipse': {
      const rx = num(node.attrs, 'rx')
      const ry = num(node.attrs, 'ry')
      return {
        x: num(node.attrs, 'cx') - rx,
        y: num(node.attrs, 'cy') - ry,
        width: rx * 2,
        height: ry * 2,
      }
    }
    case 'line': {
      const x1 = num(node.attrs, 'x1')
      const y1 = num(node.attrs, 'y1')
      const x2 = num(node.attrs, 'x2')
      const y2 = num(node.attrs, 'y2')
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      }
    }
    case 'polyline':
    case 'polygon':
      return boundsOfPoints(parsePoints(node.attrs['points']))
    case 'g': {
      const rects: Rect[] = []
      for (const child of node.children ?? []) {
        const bounds = getNodeBounds(child)
        if (bounds) rects.push(bounds)
      }
      return unionBounds(rects)
    }
    default:
      return null
  }
}

function withAttrs(node: VectorNode, patch: Record<string, AttrValue>): VectorNode {
  return { ...node, attrs: { ...node.attrs, ...patch } }
}

function mapChildren(node: VectorNode, map: (child: VectorNode) => VectorNode): VectorNode {
  return node.children?.length ? { ...node, children: node.children.map(map) } : node
}

export function translateNode(node: VectorNode, dx: number, dy: number): VectorNode {
  if (dx === 0 && dy === 0) return node
  const base = mapChildren(node, (child) => translateNode(child, dx, dy))

  switch (node.type) {
    case 'rect':
      return withAttrs(base, { x: num(node.attrs, 'x') + dx, y: num(node.attrs, 'y') + dy })
    case 'circle':
    case 'ellipse':
      return withAttrs(base, {
        cx: num(node.attrs, 'cx') + dx,
        cy: num(node.attrs, 'cy') + dy,
      })
    case 'line':
      return withAttrs(base, {
        x1: num(node.attrs, 'x1') + dx,
        y1: num(node.attrs, 'y1') + dy,
        x2: num(node.attrs, 'x2') + dx,
        y2: num(node.attrs, 'y2') + dy,
      })
    case 'polyline':
    case 'polygon':
      return withAttrs(base, {
        points: formatPoints(
          parsePoints(node.attrs['points']).map((point) => ({
            x: point.x + dx,
            y: point.y + dy,
          })),
        ),
      })
    case 'use':
      return withAttrs(base, { x: num(node.attrs, 'x') + dx, y: num(node.attrs, 'y') + dy })
    default:
      return base
  }
}

/** 以 origin 为定点缩放。圆遇到非等比缩放时会转成椭圆。 */
export function scaleNode(
  node: VectorNode,
  origin: Point,
  scaleX: number,
  scaleY: number,
): VectorNode {
  const scaleXValue = (value: number) => origin.x + (value - origin.x) * scaleX
  const scaleYValue = (value: number) => origin.y + (value - origin.y) * scaleY
  const base = mapChildren(node, (child) => scaleNode(child, origin, scaleX, scaleY))

  switch (node.type) {
    case 'rect':
      return withAttrs(base, {
        x: scaleXValue(num(node.attrs, 'x')),
        y: scaleYValue(num(node.attrs, 'y')),
        width: Math.max(num(node.attrs, 'width') * scaleX, MIN_EXTENT),
        height: Math.max(num(node.attrs, 'height') * scaleY, MIN_EXTENT),
      })
    case 'circle': {
      const cx = scaleXValue(num(node.attrs, 'cx'))
      const cy = scaleYValue(num(node.attrs, 'cy'))
      const r = num(node.attrs, 'r')
      if (Math.abs(scaleX - scaleY) < 1e-6) {
        return withAttrs(base, { cx, cy, r: r * scaleX })
      }
      // SVG 里没有「被拉伸的圆」，非等比缩放必须转成椭圆。
      const attrs: Record<string, AttrValue> = { cx, cy, rx: r * scaleX, ry: r * scaleY }
      for (const [key, value] of Object.entries(node.attrs)) {
        if (key === 'cx' || key === 'cy' || key === 'r' || key === 'rx' || key === 'ry') continue
        attrs[key] = value
      }
      return { ...base, type: 'ellipse', attrs }
    }
    case 'ellipse':
      return withAttrs(base, {
        cx: scaleXValue(num(node.attrs, 'cx')),
        cy: scaleYValue(num(node.attrs, 'cy')),
        rx: Math.max(num(node.attrs, 'rx') * scaleX, MIN_EXTENT),
        ry: Math.max(num(node.attrs, 'ry') * scaleY, MIN_EXTENT),
      })
    case 'line':
      return withAttrs(base, {
        x1: scaleXValue(num(node.attrs, 'x1')),
        y1: scaleYValue(num(node.attrs, 'y1')),
        x2: scaleXValue(num(node.attrs, 'x2')),
        y2: scaleYValue(num(node.attrs, 'y2')),
      })
    case 'polyline':
    case 'polygon':
      return withAttrs(base, {
        points: formatPoints(
          parsePoints(node.attrs['points']).map((point) => ({
            x: scaleXValue(point.x),
            y: scaleYValue(point.y),
          })),
        ),
      })
    case 'use':
      return withAttrs(base, {
        x: scaleXValue(num(node.attrs, 'x')),
        y: scaleYValue(num(node.attrs, 'y')),
      })
    default:
      return base
  }
}
