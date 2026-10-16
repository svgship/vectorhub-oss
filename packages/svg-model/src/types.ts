/**
 * SVG 文档模型 —— 画布、结构树、代码面板与所有导出器共享的唯一数据源。
 */

export const DOCUMENT_VERSION = '0.1.0'

export type VectorNodeType =
  | 'path'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'text'
  | 'g'
  | 'defs'
  | 'symbol'
  | 'use'
  | 'linearGradient'
  | 'radialGradient'
  | 'stop'

export type AttrValue = string | number

export interface VectorNode {
  id: string
  type: VectorNodeType
  attrs: Record<string, AttrValue>
  children?: VectorNode[]
  style?: Record<string, string>
}

export interface VectorDocument {
  id: string
  version: string
  viewBox: string
  width?: number
  height?: number
  root: VectorNode[]
}

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}
