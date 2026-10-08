import type { AttrValue, VectorNodeType } from '@vectorhub/svg-model'

/**
 * 临时形状预设，用于在画布内核阶段插入示例内容。
 * M1 的形状工具上线后由工具栏 + 拖拽创建替换。
 */

export interface ShapePreset {
  id: string
  label: string
  type: VectorNodeType
  attrs: Record<string, AttrValue>
}

const FILL = '#38bdf8'

function starPoints(cx: number, cy: number, outer: number, inner: number, spikes: number): string {
  const step = Math.PI / spikes
  const points: string[] = []
  for (let index = 0; index < spikes * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner
    const angle = index * step - Math.PI / 2
    const x = (cx + Math.cos(angle) * radius).toFixed(2)
    const y = (cy + Math.sin(angle) * radius).toFixed(2)
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}

export const SHAPE_PRESETS: readonly ShapePreset[] = [
  {
    id: 'rect',
    label: '矩形',
    type: 'rect',
    attrs: { x: 4, y: 4, width: 16, height: 16, rx: 2, fill: FILL },
  },
  { id: 'circle', label: '圆', type: 'circle', attrs: { cx: 12, cy: 12, r: 8, fill: FILL } },
  {
    id: 'ellipse',
    label: '椭圆',
    type: 'ellipse',
    attrs: { cx: 12, cy: 12, rx: 10, ry: 6, fill: FILL },
  },
  {
    id: 'line',
    label: '线',
    type: 'line',
    attrs: { x1: 3, y1: 21, x2: 21, y2: 3, stroke: FILL, 'stroke-width': 2 },
  },
  {
    id: 'polygon',
    label: '三角形',
    type: 'polygon',
    attrs: { points: '12,3 21,20 3,20', fill: FILL },
  },
  {
    id: 'star',
    label: '星形',
    type: 'polygon',
    attrs: { points: starPoints(12, 12.5, 9.5, 4, 5), fill: FILL },
  },
]
