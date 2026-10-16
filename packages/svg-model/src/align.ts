/**
 * 对齐与分布（PRD §7.1「对齐：左、右、顶、底、居中、分布」）。
 *
 * 只做几何计算：给每个节点算出需要移动多少，由调用方落到文档上。
 * 基准取所有参与对象的整体包围盒，和主流设计工具一致。
 */

import { unionBounds } from './geometry'
import type { Point, Rect } from './types'

const EPSILON = 1e-6

export type AlignKind = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'
export type DistributeKind = 'horizontal' | 'vertical'

/** 一个参与对齐的对象及其包围盒。 */
export interface AlignItem {
  id: string
  rect: Rect
}

/** 对齐基准：所有包围盒的并集；没有有效对象时为 null。 */
export function alignFrame(items: readonly AlignItem[]): Rect | null {
  return unionBounds(items.map((item) => item.rect))
}

/**
 * 对齐位移。返回空 Map 表示所有对象都已在位、无需改动。
 */
export function alignmentOffsets(items: readonly AlignItem[], kind: AlignKind): Map<string, Point> {
  const offsets = new Map<string, Point>()
  const frame = alignFrame(items)
  if (!frame) return offsets

  for (const { id, rect } of items) {
    let dx = 0
    let dy = 0
    switch (kind) {
      case 'left':
        dx = frame.x - rect.x
        break
      case 'centerX':
        dx = frame.x + frame.width / 2 - (rect.x + rect.width / 2)
        break
      case 'right':
        dx = frame.x + frame.width - (rect.x + rect.width)
        break
      case 'top':
        dy = frame.y - rect.y
        break
      case 'centerY':
        dy = frame.y + frame.height / 2 - (rect.y + rect.height / 2)
        break
      case 'bottom':
        dy = frame.y + frame.height - (rect.y + rect.height)
        break
    }
    if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) continue
    offsets.set(id, { x: dx, y: dy })
  }
  return offsets
}

/**
 * 分布位移：首尾两个对象不动，中间的按「缝隙均等」重新摆放。
 *
 * 少于 3 个对象时没有可分布的对象（首尾已固定），直接返回空 Map。
 * 缝隙为负（对象互相重叠）时同样按等距处理，不会把对象推开。
 */
export function distributionOffsets(
  items: readonly AlignItem[],
  kind: DistributeKind,
): Map<string, Point> {
  const offsets = new Map<string, Point>()
  if (items.length < 3) return offsets

  const frame = alignFrame(items)
  if (!frame) return offsets

  const horizontal = kind === 'horizontal'
  const ordered = [...items].sort((a, b) =>
    horizontal ? a.rect.x - b.rect.x : a.rect.y - b.rect.y,
  )

  const sizes = ordered.map((item) => (horizontal ? item.rect.width : item.rect.height))
  const total = horizontal ? frame.width : frame.height
  const occupied = sizes.reduce((sum, size) => sum + size, 0)
  const gap = (total - occupied) / (ordered.length - 1)

  let cursor = horizontal ? frame.x : frame.y
  for (let index = 0; index < ordered.length; index += 1) {
    const item = ordered[index]
    const size = sizes[index]
    if (!item || size === undefined) continue

    const current = horizontal ? item.rect.x : item.rect.y
    const delta = cursor - current
    if (Math.abs(delta) >= EPSILON) {
      offsets.set(item.id, horizontal ? { x: delta, y: 0 } : { x: 0, y: delta })
    }
    cursor += size + gap
  }
  return offsets
}
