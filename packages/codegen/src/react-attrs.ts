/**
 * SVG 属性名 → React（JSX）属性名。
 *
 * React 只认 camelCase 形式，直接写 `stroke-width` 会触发 "Invalid DOM property" 警告，
 * 所以导出 React 组件和画布渲染（`NodeView` 走 `React.createElement`）必须用同一张表。
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

/** CSS 属性名 → React `style` 对象的 key。 */
export function toReactStyleKey(name: string): string {
  return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}
