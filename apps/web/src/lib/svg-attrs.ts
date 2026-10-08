import type { SVGProps } from 'react'
import type { VectorNode } from '@vectorhub/svg-model'

/**
 * React 要求部分 SVG 展示属性使用 camelCase；其余 kebab-case 属性会原样透传。
 */
const CAMEL_CASE_ATTRS: Record<string, string> = {
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'dominant-baseline': 'dominantBaseline',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-style': 'fontStyle',
  'font-weight': 'fontWeight',
  'letter-spacing': 'letterSpacing',
  'marker-end': 'markerEnd',
  'marker-mid': 'markerMid',
  'marker-start': 'markerStart',
  'paint-order': 'paintOrder',
  'shape-rendering': 'shapeRendering',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'stroke-width': 'strokeWidth',
  'text-anchor': 'textAnchor',
  'transform-origin': 'transformOrigin',
  'vector-effect': 'vectorEffect',
  'xlink:href': 'xlinkHref',
}

export function toReactAttrName(name: string): string {
  return CAMEL_CASE_ATTRS[name] ?? name
}

function kebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

export function toReactStyle(
  style: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!style) return undefined
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(style)) {
    result[kebabToCamel(key)] = value
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
