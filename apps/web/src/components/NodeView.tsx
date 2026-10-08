import { createElement } from 'react'
import type { VectorNode } from '@vectorhub/svg-model'
import { nodeToProps } from '../lib/svg-attrs'

interface NodeViewProps {
  node: VectorNode
}

export function NodeView({ node }: NodeViewProps) {
  const props = nodeToProps(node)
  const children = node.children?.map((child) => <NodeView key={child.id} node={child} />) ?? []
  return createElement(node.type, props, ...children)
}
