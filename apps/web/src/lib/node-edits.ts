/**
 * 对选中的一组节点做批量改写。
 *
 * 所有改写都走 `updateDocument`，所以整批操作只落一步撤销——
 * 多选改填充不该产生 N 步历史（PRD §7.1「撤销重做：完整历史栈」）。
 *
 * 另外这里的函数在「改了等于没改」时返回原文档引用，
 * `updateDocument` 见到同一个引用会直接跳过，因此既不会写历史也不会重渲染。
 */

import {
  mapNodes,
  scaleNode,
  translateNode,
  type AttrValue,
  type Point,
  type Rect,
  type VectorDocument,
  type VectorNode,
} from '@vectorhub/svg-model'

/** 几何真的变了才提交，避免 1e-15 级的浮点噪声落一条无意义的历史。 */
const EPSILON = 1e-6

/**
 * 把命中的节点换成 `transform` 的返回值，其余节点原样保留。
 *
 * 注意 `mapNodes` 会继续向下递归，所以 `transform` 只应作用于
 * 「命中 id 的节点本身」；未命中的子节点会被原样返回，不会重复处理。
 */
export function replaceNodes(
  doc: VectorDocument,
  ids: ReadonlySet<string>,
  transform: (node: VectorNode) => VectorNode,
): VectorDocument {
  if (ids.size === 0) return doc
  return {
    ...doc,
    root: mapNodes(doc.root, (node) => (ids.has(node.id) ? transform(node) : node)),
  }
}

/** 合并属性，保留原节点其余部分（含子树）。 */
export function withAttrs(node: VectorNode, attrs: Record<string, AttrValue>): VectorNode {
  return { ...node, attrs: { ...node.attrs, ...attrs } }
}

/**
 * 只保留「最外层」的位移目标：父节点已经在移动清单里时，子节点会被它带着走，
 * 再去移动一次就重复了。全选之后做对齐就会踩到这个坑。
 */
function topLevelOffsets(
  root: readonly VectorNode[],
  offsets: ReadonlyMap<string, Point>,
): Map<string, Point> {
  const result = new Map<string, Point>()

  const visit = (nodes: readonly VectorNode[]) => {
    for (const node of nodes) {
      const offset = offsets.get(node.id)
      if (offset) {
        result.set(node.id, offset)
        continue
      }
      if (node.children?.length) visit(node.children)
    }
  }

  visit(root)
  return result
}

/**
 * 按 id 给每个节点各自的位移，整批只落一步撤销。
 * 对齐、分布这类「每个对象挪不同距离」的操作走这里。
 */
export function translateNodesBy(
  doc: VectorDocument,
  offsets: ReadonlyMap<string, Point>,
): VectorDocument {
  if (offsets.size === 0) return doc
  const effective = topLevelOffsets(doc.root, offsets)
  if (effective.size === 0) return doc

  let changed = false
  const root = mapNodes(doc.root, (node) => {
    const offset = effective.get(node.id)
    if (!offset) return node
    const moved = translateNode(node, offset.x, offset.y)
    if (moved !== node) changed = true
    return moved
  })
  return changed ? { ...doc, root } : doc
}

/**
 * 把一组节点平移到「包围盒左上角 = target」的位置。
 * 只传一条轴时另一条轴不动。
 */
export function moveNodesTo(
  doc: VectorDocument,
  ids: ReadonlySet<string>,
  bounds: Rect,
  target: { x?: number; y?: number },
): VectorDocument {
  const dx = target.x === undefined ? 0 : target.x - bounds.x
  const dy = target.y === undefined ? 0 : target.y - bounds.y
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return doc
  if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) return doc
  return replaceNodes(doc, ids, (node) => translateNode(node, dx, dy))
}

/**
 * 以包围盒左上角为定点把一组节点缩放到目标宽高。
 *
 * 直线可以是水平或垂直的，那种情况下另一条轴的包围盒长度为 0，
 * 该轴保持原比例（而不是算出 Infinity 把图形毁掉）。
 */
export function resizeNodesTo(
  doc: VectorDocument,
  ids: ReadonlySet<string>,
  bounds: Rect,
  target: { width?: number; height?: number },
): VectorDocument {
  const width = target.width ?? bounds.width
  const height = target.height ?? bounds.height
  // 只校验调用方真的想改的那条轴：竖直直线的包围盒宽度本来就是 0，
  // 不该因为「另一条轴是 0」而把改高度也一起拒掉。
  // `!(x > 0)` 同时挡掉 0、负数和 NaN。
  if (target.width !== undefined && !(target.width > 0)) return doc
  if (target.height !== undefined && !(target.height > 0)) return doc

  const scaleX = bounds.width > 0 ? width / bounds.width : 1
  const scaleY = bounds.height > 0 ? height / bounds.height : 1
  if (Math.abs(scaleX - 1) < EPSILON && Math.abs(scaleY - 1) < EPSILON) return doc

  return replaceNodes(doc, ids, (node) =>
    scaleNode(node, { x: bounds.x, y: bounds.y }, scaleX, scaleY),
  )
}
