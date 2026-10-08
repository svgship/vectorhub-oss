import type { SVGProps } from 'react'
import { toReactAttrName, toReactStyleKey } from '@vectorhub/codegen'
import type { VectorNode } from '@vectorhub/svg-model'

/** 文档节点的 style 记录 → React style 对象。 */
function toReactStyle(
  style: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!style) return undefined
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(style)) {
    result[toReactStyleKey(key)] = value
  }
  return result
}

/** 把文档节点转换成可交给 React.createElement 的 SVG 属性。 */
export function nodeToProps(node: VectorNode): SVGProps<SVGElement> {
  const props: SVGProps<SVGElement> = {}
  const record = props as unknown as Record<string, unknown>

  for (const [name, value] of Object.entries(node.attrs)) {
    record[toReactAttrName(name)] = value
  }

  const style = toReactStyle(node.style)
  if (style) record.style = style
  record['data-node-id'] = node.id

  return props
}
