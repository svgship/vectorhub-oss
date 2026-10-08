/**
 * 代码生成：设计对象 → 中间 AST → 目标代码（PRD §9.3）。
 *
 * v0.1 以标准 SVG 序列化为基础，React / Vue / HTML 走薄包装，后续再引入
 * 完整 AST 中间层与质量评分。
 */

import type { VectorDocument, VectorNode } from '@vectorhub/svg-model'

export interface ExportOptions {
  /** 组件名，用于 React / Vue 导出。 */
  componentName?: string
  /** 是否将颜色替换为 `currentColor`。 */
  currentColor?: boolean
}

export interface Exporter {
  id: string
  label: string
  language: string
  generate: (doc: VectorDocument, options?: ExportOptions) => string
}

export const SVG_NS = 'http://www.w3.org/2000/svg'

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function serializeStyle(style: Record<string, string> | undefined, currentColor: boolean): string {
  if (!style) return ''
  const entries = Object.entries(style).filter(([, value]) => value !== '')
  if (entries.length === 0) return ''
  const body = entries
    .map(([key, value]) => `${key}:${currentColor ? currentColorValue(key, value) : value}`)
    .join(';')
  return ` style="${escapeAttr(body)}"`
}

function currentColorValue(key: string, value: string): string {
  return key.includes('color') && value !== 'none' && value !== 'transparent'
    ? 'currentColor'
    : value
}

function serializeAttrs(node: VectorNode, currentColor: boolean): string {
  return Object.entries(node.attrs)
    .map(([key, value]) => {
      const raw = String(value)
      const next = currentColor ? currentColorValue(key, raw) : raw
      return ` ${key}="${escapeAttr(next)}"`
    })
    .join('')
}

function indent(text: string, pad: string): string {
  return text
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n')
}

function serializeNode(node: VectorNode, currentColor: boolean, depth: number): string {
  const pad = '  '.repeat(depth)
  const attrs = serializeAttrs(node, currentColor)
  const style = serializeStyle(node.style, currentColor)
  const children = node.children ?? []

  if (children.length === 0) {
    return `${pad}<${node.type}${attrs}${style} />`
  }

  const inner = children.map((child) => serializeNode(child, currentColor, depth + 1)).join('\n')
  return `${pad}<${node.type}${attrs}${style}>\n${inner}\n${pad}</${node.type}>`
}

/** 序列化为标准 SVG 1.1 字符串。 */
export function serializeSvg(doc: VectorDocument, options: ExportOptions = {}): string {
  const currentColor = options.currentColor ?? false
  const size = doc.width && doc.height ? ` width="${doc.width}" height="${doc.height}"` : ''
  const body = doc.root.map((node) => serializeNode(node, currentColor, 1)).join('\n')
  return `<svg xmlns="${SVG_NS}" viewBox="${doc.viewBox}"${size}>\n${body}\n</svg>`
}

export const svgExporter: Exporter = {
  id: 'svg',
  label: 'SVG',
  language: 'xml',
  generate: (doc, options) => `${serializeSvg(doc, options)}\n`,
}

export const reactExporter: Exporter = {
  id: 'react',
  label: 'React',
  language: 'tsx',
  generate: (doc, options = {}) => {
    const name = options.componentName ?? 'Icon'
    const jsx = serializeSvg(doc, options)
      .replace(/ xmlns="[^"]*"/, '')
    return [
      `import type { SVGProps } from 'react'`,
      ``,
      `export function ${name}(props: SVGProps<SVGSVGElement>) {`,
      `  return (`,
      indent(jsx, '    '),
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
  generate: (doc, options = {}) => {
    const name = options.componentName ?? 'Icon'
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
  generate: (doc, options) => `${serializeSvg(doc, options)}\n`,
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
