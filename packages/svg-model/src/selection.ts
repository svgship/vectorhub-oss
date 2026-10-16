/**
 * 框选（橡皮筋选区）：命中测试与选择集合并。
 *
 * 和 `align.ts` 一样只放纯函数：画布那边只管手势与坐标换算，
 * 「这个框选中了谁」「和已有选择怎么合并」都留在这里，好脱离 UI 验证。
 */

import { getNodeBounds, rectsIntersect } from './geometry'
import type { Rect, VectorNode } from './types'

/** 修饰键决定框选结果如何并入已有选择，语义对齐 Photoshop。 */
export type SelectionMode = 'replace' | 'add' | 'subtract' | 'intersect'

/** 修饰键 → 合并方式：Shift 加选、Alt 减选、两者同按取交集。 */
export function selectionModeOf(modifiers: { shiftKey: boolean; altKey: boolean }): SelectionMode {
  if (modifiers.shiftKey && modifiers.altKey) return 'intersect'
  if (modifiers.shiftKey) return 'add'
  if (modifiers.altKey) return 'subtract'
  return 'replace'
}

/**
 * 收集包围盒与选区相交的节点 ID，按文档顺序返回。
 *
 * 只挑最外层：组命中了就整体选中，不再钻进去挑子节点——和 Photoshop
 * 用移动工具框选图层的手感一致。否则框选一个组会连带选中它所有子节点，
 * 后续移动 / 对齐就会重复计算。
 *
 * 推不出包围盒的节点（path、text）不参与框选，和「不参与对齐」是同一套取舍。
 */
export function nodesIntersectingRect(nodes: readonly VectorNode[], rect: Rect): string[] {
  const hits: string[] = []
  for (const node of nodes) {
    // defs 里是渐变之类的资源，不是可编辑对象。
    if (node.type === 'defs') continue
    const bounds = getNodeBounds(node)
    if (bounds && rectsIntersect(bounds, rect)) hits.push(node.id)
  }
  return hits
}

/**
 * 把框选命中并入已有选择。
 *
 * `add` 保持已有顺序、命中的新对象追加在后面，这样「Shift 加选」不会让
 * 已经选好的对象跳位置。
 */
export function mergeSelection(
  base: readonly string[],
  hits: readonly string[],
  mode: SelectionMode,
): string[] {
  switch (mode) {
    case 'add': {
      const merged = [...base]
      const seen = new Set(base)
      for (const id of hits) {
        if (seen.has(id)) continue
        seen.add(id)
        merged.push(id)
      }
      return merged
    }
    case 'subtract': {
      const removed = new Set(hits)
      return base.filter((id) => !removed.has(id))
    }
    case 'intersect': {
      const kept = new Set(hits)
      return base.filter((id) => kept.has(id))
    }
    default:
      return [...hits]
  }
}
