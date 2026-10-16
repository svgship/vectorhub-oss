/**
 * 代码生成：设计对象 → 目标代码（PRD §9.3）。
 *
 * v0.1 直接按目标语言的书写规则序列化：SVG / HTML / Vue 模板走 XML 规则，
 * React 走 JSX 规则（camelCase 属性、`{...props}` 透传、style 对象）。
 * PRD §9.3 的自定义 AST 中间层与代码质量评分留到代码面板稳定之后再补。
 */

import type { AttrValue, VectorDocument, VectorNode } from '@vectorhub/svg-model'
import { toReactAttrName, toReactStyleKey } from './react-attrs'

export { toReactAttrName, toReactStyleKey } from './react-attrs'

export interface ExportOptions {
  /** 组件名，用于 React / Vue 导出。 */
  componentName?: string
  /** 是否将颜色替换为 `currentColor`（PRD §4.1.2）。 */
  currentColor?: boolean
}

export interface Exporter {
  id: string
  label: string
  /** 语言标识，用于语法高亮与文件类型提示。 */
  language: string
  /** 下载文件的扩展名（不含点）。 */
  extension: string
  /** 下载文件的 MIME 类型。 */
  mime: string
  /** 是否使用「组件名」配置项。 */
  usesComponentName: boolean
  /**
   * 该目标的 `currentColor` 默认值。
   * 组件代码默认开；独立 SVG / HTML 文件默认关，否则单独打开会被渲染成黑色。
   */
  currentColorByDefault: boolean
  generate: (doc: VectorDocument, options?: ExportOptions) => string
}

export const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * 会被 `currentColor` 替换的绘制属性。
 *
 * 故意不含 `stop-color`：渐变的色标一旦被全部换成 currentColor，
 * 多色渐变会塌成一个纯色块，图标也就毁了。渐变保留自己的颜色。
 */
const COLOR_ATTRS = new Set(['color', 'fill', 'stroke', 'flood-color', 'lighting-color'])

const PASS_THROUGH_COLORS = new Set(['none', 'transparent', 'currentColor', 'inherit'])

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 单引号 JS 字符串字面量，用于 JSX 的 style 对象。 */
function quoteJs(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function indent(text: string, pad: string): string {
  return text
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n')
}

/** 把用户输入收敛成合法的组件标识符（React / Vue 共用，也用于文件名）。 */
export function toComponentName(raw: string): string {
  const words = raw
    .replace(/[^\dA-Za-z]+/g, ' ')
    .trim()
    .split(' ')
  const name = words
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
  if (!name) return 'Icon'
  return /^\d/.test(name) ? `Icon${name}` : name
}

/**
 * `currentColor` 只替换实体颜色。`url(#…)` 引用（渐变 / 图案）、
 * `none` / `transparent` / 继承值都保持原样。
 */
function resolveColor(name: string, value: string, currentColor: boolean): string {
  if (!currentColor) return value
  if (PASS_THROUGH_COLORS.has(value) || value.startsWith('url(')) return value
  return COLOR_ATTRS.has(name) ? 'currentColor' : value
}

/** 书写规则：XML（SVG / HTML / Vue 模板）与 JSX（React）。 */
type Flavor = 'xml' | 'jsx'

function serializeAttrs(node: VectorNode, currentColor: boolean, flavor: Flavor): string {
  const parts: string[] = []
  for (const [name, raw] of Object.entries(node.attrs) as Array<[string, AttrValue]>) {
    const value = resolveColor(name, String(raw), currentColor)
    if (flavor === 'xml') {
      parts.push(` ${name}="${escapeAttr(value)}"`)
      continue
    }
    const literal =
      typeof raw === 'number' && value === String(raw) ? `{${value}}` : `"${escapeAttr(value)}"`
    parts.push(` ${toReactAttrName(name)}=${literal}`)
  }
  return parts.join('')
}

function serializeStyle(node: VectorNode, currentColor: boolean, flavor: Flavor): string {
  const entries = Object.entries(node.style ?? {}).filter(([, value]) => value !== '')
  if (entries.length === 0) return ''
  if (flavor === 'xml') {
    const body = entries
      .map(([key, value]) => `${key}:${resolveColor(key, value, currentColor)}`)
      .join(';')
    return ` style="${escapeAttr(body)}"`
  }
  const body = entries
    .map(
      ([key, value]) =>
        `${toReactStyleKey(key)}: ${quoteJs(resolveColor(key, value, currentColor))}`,
    )
    .join(', ')
  return ` style={{ ${body} }}`
}

function serializeNode(
  node: VectorNode,
  currentColor: boolean,
  depth: number,
  flavor: Flavor,
): string {
  const pad = '  '.repeat(depth)
  const attrs = serializeAttrs(node, currentColor, flavor)
  const style = serializeStyle(node, currentColor, flavor)
  const children = node.children ?? []

  if (children.length === 0) {
    return `${pad}<${node.type}${attrs}${style} />`
  }

  const inner = children
    .map((child) => serializeNode(child, currentColor, depth + 1, flavor))
    .join('\n')
  return `${pad}<${node.type}${attrs}${style}>\n${inner}\n${pad}</${node.type}>`
}

function serializeBody(
  doc: VectorDocument,
  currentColor: boolean,
  flavor: Flavor,
  depth: number,
): string {
  return doc.root.map((node) => serializeNode(node, currentColor, depth, flavor)).join('\n')
}

/** 序列化为标准 SVG 1.1 字符串。 */
export function serializeSvg(doc: VectorDocument, options: ExportOptions = {}): string {
  const currentColor = options.currentColor ?? false
  const size = doc.width && doc.height ? ` width="${doc.width}" height="${doc.height}"` : ''
  const body = serializeBody(doc, currentColor, 'xml', 1)
  return `<svg xmlns="${SVG_NS}" viewBox="${doc.viewBox}"${size}>${body ? `\n${body}\n` : ''}</svg>`
}

export const svgExporter: Exporter = {
  id: 'svg',
  label: 'SVG',
  language: 'xml',
  extension: 'svg',
  mime: 'image/svg+xml',
  usesComponentName: false,
  currentColorByDefault: false,
  generate: (doc, options) => `${serializeSvg(doc, options)}\n`,
}

export const reactExporter: Exporter = {
  id: 'react',
  label: 'React',
  language: 'tsx',
  extension: 'tsx',
  mime: 'text/plain',
  usesComponentName: true,
  currentColorByDefault: true,
  generate: (doc, options = {}) => {
    const name = toComponentName(options.componentName ?? '')
    const currentColor = options.currentColor ?? false
    const size = doc.width && doc.height ? ` width={${doc.width}} height={${doc.height}}` : ''
    const body = serializeBody(doc, currentColor, 'jsx', 3)
    return [
      `import type { SVGProps } from 'react'`,
      ``,
      `export function ${name}(props: SVGProps<SVGSVGElement>) {`,
      `  return (`,
      `    <svg {...props} viewBox="${doc.viewBox}"${size}>`,
      ...(body ? [body] : []),
      `    </svg>`,
      `  )`,
      `}`,
      ``,
    ].join('\n')
  },
}

export const vueExporter: Exporter = {
  id: 'vue',
  label: 'Vue',
  language: 'vue',
  extension: 'vue',
  mime: 'text/plain',
  usesComponentName: true,
  currentColorByDefault: true,
  generate: (doc, options = {}) => {
    const name = toComponentName(options.componentName ?? '')
    return [
      `<script setup lang="ts">`,
      `defineOptions({ name: '${name}' })`,
      `</script>`,
      ``,
      `<template>`,
      indent(serializeSvg(doc, options), '  '),
      `</template>`,
      ``,
    ].join('\n')
  },
}

export const htmlExporter: Exporter = {
  id: 'html',
  label: 'HTML',
  language: 'html',
  extension: 'html',
  mime: 'text/html',
  usesComponentName: false,
  currentColorByDefault: false,
  generate: (doc, options = {}) =>
    [
      `<!doctype html>`,
      `<html lang="zh-CN">`,
      `  <head>`,
      `    <meta charset="UTF-8" />`,
      `    <meta name="viewport" content="width=device-width, initial-scale=1" />`,
      `    <title>SVG</title>`,
      `  </head>`,
      `  <body>`,
      indent(serializeSvg(doc, options), '    '),
      `  </body>`,
      `</html>`,
      ``,
    ].join('\n'),
}

export const exporters: readonly Exporter[] = [
  svgExporter,
  reactExporter,
  vueExporter,
  htmlExporter,
]

export function getExporter(id: string): Exporter | undefined {
  return exporters.find((exporter) => exporter.id === id)
}
