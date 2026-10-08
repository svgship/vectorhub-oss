import {
  DOCUMENT_VERSION,
  type AttrValue,
  type Rect,
  type VectorDocument,
  type VectorNode,
  type VectorNodeType,
} from './types'

let counter = 0

/** 生成稳定、可读且足够唯一的节点 ID。 */
export function createId(prefix = 'node'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`
}

export function createNode(
  type: VectorNodeType,
  attrs: Record<string, AttrValue> = {},
  id?: string,
): VectorNode {
  return { id: id ?? createId(type), type, attrs }
}

export function createDocument(init: Partial<VectorDocument> = {}): VectorDocument {
  return {
    id: init.id ?? createId('doc'),
    version: init.version ?? DOCUMENT_VERSION,
    viewBox: init.viewBox ?? '0 0 24 24',
    root: init.root ?? [],
    ...(init.width === undefined ? {} : { width: init.width }),
    ...(init.height === undefined ? {} : { height: init.height }),
  }
}

/** 深度优先遍历节点树。 */
export function walkNodes(
  nodes: readonly VectorNode[],
  visit: (node: VectorNode, parent: VectorNode | null) => void,
  parent: VectorNode | null = null,
): void {
  for (const node of nodes) {
    visit(node, parent)
    if (node.children?.length) {
      walkNodes(node.children, visit, node)
    }
  }
}

export function findNode(nodes: readonly VectorNode[], id: string): VectorNode | undefined {
  let found: VectorNode | undefined
  walkNodes(nodes, (node) => {
    if (!found && node.id === id) {
      found = node
    }
  })
  return found
}

export function countNodes(nodes: readonly VectorNode[]): number {
  let total = 0
  walkNodes(nodes, () => {
    total += 1
  })
  return total
}

/**
 * 自顶向下重建节点树。`transform` 的返回值会作为新节点，
 * 其子树继续被映射，因此可以安全地做整体平移 / 缩放。
 */
export function mapNodes(
  nodes: readonly VectorNode[],
  transform: (node: VectorNode) => VectorNode,
): VectorNode[] {
  return nodes.map((node) => {
    const next = transform(node)
    if (!next.children?.length) return next
    return { ...next, children: mapNodes(next.children, transform) }
  })
}

/** 从 viewBox 解析出 `{ x, y, width, height }`。 */
export function parseViewBox(viewBox: string): Rect {
  const parts = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  const [x = 0, y = 0, width = 0, height = 0] = parts
  return { x, y, width, height }
}
