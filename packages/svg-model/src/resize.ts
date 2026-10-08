/**
 * 变换手柄与「手柄拖拽位移 → 缩放比例」的换算。
 *
 * 与 `snapping` 的 `snapResize` 共用同一套模型：位移先换算成以对边 / 对角为定点的
 * 比例（本模块），吸附再把比例修正到目标边线。两处必须在同一层，否则公式会分叉。
 */

import { clampScale } from './geometry'
import type { Point, Rect } from './types'

export type HandleX = -1 | 0 | 1
export type HandleY = -1 | 0 | 1

export interface ResizeHandle {
  id: string
  x: HandleX
  y: HandleY
  cursor: string
}

/** 八个变换手柄。x / y 表示手柄相对包围盒的方向（-1 起点、0 中点、1 终点）。 */
export const RESIZE_HANDLES: readonly ResizeHandle[] = [
  { id: 'nw', x: -1, y: -1, cursor: 'nwse-resize' },
  { id: 'n', x: 0, y: -1, cursor: 'ns-resize' },
  { id: 'ne', x: 1, y: -1, cursor: 'nesw-resize' },
  { id: 'e', x: 1, y: 0, cursor: 'ew-resize' },
  { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
  { id: 's', x: 0, y: 1, cursor: 'ns-resize' },
  { id: 'sw', x: -1, y: 1, cursor: 'nesw-resize' },
  { id: 'w', x: -1, y: 0, cursor: 'ew-resize' },
]

export interface ResizeResolution {
  /** 保持不动的定点（对边 / 对角）。 */
  anchor: Point
  /** 被拖动的起始点。 */
  moving: Point
  scaleX: number
  scaleY: number
}

/**
 * 手柄拖拽位移 → 以对边为定点的缩放比例。
 * 边中手柄只缩放一个方向；按住 Shift 拖角手柄时等比缩放。
 */
export function resolveResize(
  bounds: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  uniform: boolean,
): ResizeResolution {
  const anchor: Point = {
    x: handle.x === -1 ? bounds.x + bounds.width : bounds.x,
    y: handle.y === -1 ? bounds.y + bounds.height : bounds.y,
  }
  const moving: Point = {
    x: handle.x === -1 ? bounds.x : bounds.x + bounds.width,
    y: handle.y === -1 ? bounds.y : bounds.y + bounds.height,
  }

  const canScaleX = handle.x !== 0 && moving.x !== anchor.x
  const canScaleY = handle.y !== 0 && moving.y !== anchor.y
  let scaleX = canScaleX ? (moving.x + dx - anchor.x) / (moving.x - anchor.x) : 1
  let scaleY = canScaleY ? (moving.y + dy - anchor.y) / (moving.y - anchor.y) : 1

  if (uniform && handle.x !== 0 && handle.y !== 0) {
    const value = Math.max(clampScale(scaleX), clampScale(scaleY))
    scaleX = value
    scaleY = value
  }

  return { anchor, moving, scaleX: clampScale(scaleX), scaleY: clampScale(scaleY) }
}
