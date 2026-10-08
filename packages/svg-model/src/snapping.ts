/**
 * 吸附与参考线。
 *
 * 两条轴的吸附彼此独立。同一条轴上，对象 / 画板边线（含中点）与网格一起按距离
 * 竞争，取最近的一个；距离相同时对象 / 画板优先（因为它的参考线更有解释力），
 * 同类之间保留先遇到的候选。吸附是「对齐到目标坐标」，命中后误差为 0。
 */

import { MIN_SCALE } from './geometry'
import type { Point, Rect } from './types'

export type SnapKind = 'object' | 'artboard' | 'grid'

export interface SnapGuide {
  axis: 'x' | 'y'
  /** 参考线在吸附轴上的坐标。 */
  position: number
  /** 参考线沿另一条轴的延伸范围，用来把对齐的两个对象连起来。 */
  from: number
  to: number
  kind: SnapKind
}

export interface SnapOptions {
  /** 参与吸附的其他对象包围盒（不含正在拖拽的对象）。 */
  targets: readonly Rect[]
  /** 画板，始终参与吸附。 */
  artboard: Rect
  /** 吸附阈值，世界坐标。 */
  threshold: number
  /** 网格间距；<= 0 表示关闭。 */
  gridSize: number
}

export interface SnapMoveResult {
  offsetX: number
  offsetY: number
  guides: readonly SnapGuide[]
}

export interface ResizeSnapInput {
  /** 保持不动的定点（对边 / 对角）。 */
  anchor: Point
  /** 拖拽开始时被拖动边（或角）的坐标。 */
  moving: Point
  /** 已应用原始缩放比例的包围盒，用来推导参考线跨度与当前边位置。 */
  proposed: Rect
  scaleX: number
  scaleY: number
  handleX: -1 | 0 | 1
  handleY: -1 | 0 | 1
}

export interface ResizeSnapResult {
  scaleX: number
  scaleY: number
  guides: readonly SnapGuide[]
}

/** 浮点容差。吸附距离是减法结果，数学上相等的两个距离在二进制里可能差 1e-16。 */
const EPSILON = 1e-6

/** 新候选只有「实质更近」才值得替换已有候选，否则视为平手。 */
function isCloser(distance: number, best: Candidate): boolean {
  return distance < best.distance - EPSILON
}

type Axis = 'x' | 'y'

function crossAxis(axis: Axis): Axis {
  return axis === 'x' ? 'y' : 'x'
}

/** 包围盒在指定轴上的起点、中点、终点。 */
function positions(rect: Rect, axis: Axis): number[] {
  return axis === 'x'
    ? [rect.x, rect.x + rect.width / 2, rect.x + rect.width]
    : [rect.y, rect.y + rect.height / 2, rect.y + rect.height]
}

function rangeOf(rect: Rect, axis: Axis): { from: number; to: number } {
  return axis === 'x'
    ? { from: rect.x, to: rect.x + rect.width }
    : { from: rect.y, to: rect.y + rect.height }
}

function hasPosition(rect: Rect, axis: Axis, position: number): boolean {
  return positions(rect, axis).some((value) => Math.abs(value - position) < EPSILON)
}

interface Candidate {
  distance: number
  offset: number
  position: number
  kind: SnapKind
}

function buildGuide(
  axis: Axis,
  position: number,
  kind: SnapKind,
  crossRange: { from: number; to: number },
  options: SnapOptions,
): SnapGuide {
  const cross = crossAxis(axis)

  if (kind === 'grid') {
    const span = rangeOf(options.artboard, cross)
    return { axis, position, from: span.from, to: span.to, kind }
  }

  let from = crossRange.from
  let to = crossRange.to
  for (const rect of options.targets) {
    if (!hasPosition(rect, axis, position)) continue
    const span = rangeOf(rect, cross)
    from = Math.min(from, span.from)
    to = Math.max(to, span.to)
  }
  if (hasPosition(options.artboard, axis, position)) {
    const span = rangeOf(options.artboard, cross)
    from = Math.min(from, span.from)
    to = Math.max(to, span.to)
  }
  return { axis, position, from, to, kind }
}

interface AxisSnap {
  offset: number
  guide: SnapGuide | null
}

function snapAxis(
  axis: Axis,
  probes: readonly number[],
  crossRange: { from: number; to: number },
  options: SnapOptions,
): AxisSnap {
  let best: Candidate | null = null

  const entries: ReadonlyArray<{ rect: Rect; kind: SnapKind }> = [
    ...options.targets.map((rect) => ({ rect, kind: 'object' as SnapKind })),
    { rect: options.artboard, kind: 'artboard' as SnapKind },
  ]

  for (const entry of entries) {
    const candidates = positions(entry.rect, axis)
    for (const probe of probes) {
      for (const position of candidates) {
        const distance = Math.abs(position - probe)
        if (distance > options.threshold) continue
        if (best && !isCloser(distance, best)) continue
        best = { distance, offset: position - probe, position, kind: entry.kind }
      }
    }
  }

  if (options.gridSize > 0) {
    for (const probe of probes) {
      const position = Math.round(probe / options.gridSize) * options.gridSize
      const distance = Math.abs(position - probe)
      if (distance > options.threshold) continue
      // 平手（含零距离）时让位给对象 / 画板，网格只有更近才胜出。
      if (best && !isCloser(distance, best)) continue
      best = { distance, offset: position - probe, position, kind: 'grid' }
    }
  }

  if (!best) return { offset: 0, guide: null }

  const { offset, position, kind } = best
  return { offset, guide: buildGuide(axis, position, kind, crossRange, options) }
}

/** 拖拽移动：对齐包围盒的左 / 中 / 右与上 / 中 / 下。 */
export function snapMove(proposed: Rect, options: SnapOptions): SnapMoveResult {
  const x = snapAxis(
    'x',
    [proposed.x, proposed.x + proposed.width / 2, proposed.x + proposed.width],
    rangeOf(proposed, 'y'),
    options,
  )
  const y = snapAxis(
    'y',
    [proposed.y, proposed.y + proposed.height / 2, proposed.y + proposed.height],
    rangeOf(proposed, 'x'),
    options,
  )

  const guides: SnapGuide[] = []
  if (x.guide) guides.push(x.guide)
  if (y.guide) guides.push(y.guide)
  return { offsetX: x.offset, offsetY: y.offset, guides }
}

/** 手柄缩放：只吸附正在被拖动的那条边 / 角，再换算回缩放比例。 */
export function snapResize(input: ResizeSnapInput, options: SnapOptions): ResizeSnapResult {
  const { anchor, moving, proposed, handleX, handleY } = input
  const spanX = moving.x - anchor.x
  const spanY = moving.y - anchor.y

  let scaleX = input.scaleX
  let scaleY = input.scaleY
  const guides: SnapGuide[] = []

  if (handleX !== 0 && spanX !== 0) {
    const edge = handleX === -1 ? proposed.x : proposed.x + proposed.width
    const snap = snapAxis('x', [edge], rangeOf(proposed, 'y'), options)
    const next = (edge + snap.offset - anchor.x) / spanX
    if (Number.isFinite(next) && next >= MIN_SCALE) {
      scaleX = next
      if (snap.guide) guides.push(snap.guide)
    }
  }

  if (handleY !== 0 && spanY !== 0) {
    const edge = handleY === -1 ? proposed.y : proposed.y + proposed.height
    const snap = snapAxis('y', [edge], rangeOf(proposed, 'x'), options)
    const next = (edge + snap.offset - anchor.y) / spanY
    if (Number.isFinite(next) && next >= MIN_SCALE) {
      scaleY = next
      if (snap.guide) guides.push(snap.guide)
    }
  }

  return { scaleX, scaleY, guides }
}
