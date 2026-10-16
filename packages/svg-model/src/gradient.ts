/**
 * 渐变定义（PRD §7.1「样式：填充、描边、线性/径向渐变、透明度」）。
 *
 * 渐变按 SVG 原生的方式存在 `<defs>` 里，填充写成 `url(#id)`。
 * 这里只负责「规格对象 ↔ 文档节点」的转换，具体 UI 交给应用层。
 */

import { createId } from './document'
import type { AttrValue, VectorDocument, VectorNode } from './types'

/** 渐变默认两端颜色。 */
export const DEFAULT_GRADIENT_FROM = '#38bdf8'
export const DEFAULT_GRADIENT_TO = '#a855f7'

export type GradientType = 'linear' | 'radial'

export interface GradientStop {
  /** 位置，0–1。 */
  offset: number
  color: string
  /** stop-opacity，0–1；缺省即 1。 */
  opacity?: number
}

/**
 * 一份渐变的完整规格。
 *
 * 坐标一律用 `objectBoundingBox` 单位（0–1 相对于形状外接矩形），
 * 这也是 SVG 的默认值，所以导出的节点上不需要再写 gradientUnits。
 */
export interface GradientSpec {
  /** 真正的 SVG id，被 `url(#…)` 引用。 */
  id: string
  type: GradientType
  stops: GradientStop[]
  x1: number
  y1: number
  x2: number
  y2: number
  cx: number
  cy: number
  r: number
}

export const GRADIENT_TYPE_LABELS: Record<GradientType, string> = {
  linear: '线性',
  radial: '径向',
}

/** 生成一个全新的渐变 id。 */
export function createGradientId(): string {
  return createId('grad')
}

export function gradientRef(id: string): string {
  return `url(#${id})`
}

/** 从 `url(#id)` 里取出 id；不是引用时返回 null。 */
export function parseGradientRef(value: string): string | null {
  const match = /^url\(\s*#([^)\s]+)\s*\)$/.exec(value.trim())
  return match?.[1] ?? null
}

/** 把角度（度）换算成以包围盒中心为原点的渐变向量。 */
export function gradientVectorForAngle(angle: number): {
  x1: number
  y1: number
  x2: number
  y2: number
} {
  const radians = (angle * Math.PI) / 180
  const dx = Math.cos(radians) / 2
  const dy = Math.sin(radians) / 2
  return { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy }
}

/** 从渐变向量反推角度，结果落在 [0, 360)。 */
export function gradientAngleOf(spec: GradientSpec): number {
  const degrees = (Math.atan2(spec.y2 - spec.y1, spec.x2 - spec.x1) * 180) / Math.PI
  return (degrees + 360) % 360
}

export interface CreateGradientOptions {
  id?: string
  from?: string
  to?: string
  type?: GradientType
}

/** 新建一份默认渐变：两端颜色沿水平方向铺开。 */
export function createGradientSpec(options: CreateGradientOptions = {}): GradientSpec {
  const vector = gradientVectorForAngle(0)
  return {
    id: options.id ?? createGradientId(),
    type: options.type ?? 'linear',
    stops: [
      { offset: 0, color: options.from ?? DEFAULT_GRADIENT_FROM },
      { offset: 1, color: options.to ?? DEFAULT_GRADIENT_TO },
    ],
    ...vector,
    cx: 0.5,
    cy: 0.5,
    r: 0.5,
  }
}

function num(value: AttrValue | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** 停止点 → 节点。 */
export function stopToNode(stop: GradientStop): VectorNode {
  const attrs: Record<string, AttrValue> = { offset: stop.offset, 'stop-color': stop.color }
  if (stop.opacity !== undefined) attrs['stop-opacity'] = stop.opacity
  return { id: createId('stop'), type: 'stop', attrs }
}

/** 节点 → 停止点；不是 stop 时返回 null。 */
export function stopFromNode(node: VectorNode): GradientStop | null {
  if (node.type !== 'stop') return null
  const color = node.attrs['stop-color']
  const stop: GradientStop = {
    offset: num(node.attrs['offset'], 0),
    color: color === undefined ? '#000000' : String(color),
  }
  if (node.attrs['stop-opacity'] !== undefined) {
    stop.opacity = num(node.attrs['stop-opacity'], 1)
  }
  return stop
}

/** 规格 → 文档节点。 */
export function gradientToNode(spec: GradientSpec): VectorNode {
  const attrs: Record<string, AttrValue> = { id: spec.id }
  if (spec.type === 'linear') {
    attrs['x1'] = spec.x1
    attrs['y1'] = spec.y1
    attrs['x2'] = spec.x2
    attrs['y2'] = spec.y2
  } else {
    attrs['cx'] = spec.cx
    attrs['cy'] = spec.cy
    attrs['r'] = spec.r
  }
  return {
    id: createId(spec.type === 'linear' ? 'linear' : 'radial'),
    type: spec.type === 'linear' ? 'linearGradient' : 'radialGradient',
    attrs,
    children: spec.stops.map(stopToNode),
  }
}

/** 节点 → 规格；不是渐变节点或缺 id 时返回 null。 */
export function nodeToGradient(node: VectorNode): GradientSpec | null {
  if (node.type !== 'linearGradient' && node.type !== 'radialGradient') return null
  const id = node.attrs['id']
  if (typeof id !== 'string' || id === '') return null

  const stops: GradientStop[] = []
  for (const child of node.children ?? []) {
    const stop = stopFromNode(child)
    if (stop) stops.push(stop)
  }
  if (stops.length === 0) return null

  return {
    id,
    type: node.type === 'linearGradient' ? 'linear' : 'radial',
    stops,
    x1: num(node.attrs['x1'], 0),
    y1: num(node.attrs['y1'], 0),
    x2: num(node.attrs['x2'], 1),
    y2: num(node.attrs['y2'], 0),
    cx: num(node.attrs['cx'], 0.5),
    cy: num(node.attrs['cy'], 0.5),
    r: num(node.attrs['r'], 0.5),
  }
}

/** 在根节点里找出承载渐变的 defs。 */
/**
 * 复用旧节点的内部 id（含色标），这样 React 在每次改色时不会重建整棵
 * `<linearGradient>`，只有真正变化的属性会更新。
 */
function reuseNodeIds(next: VectorNode, existing: VectorNode | undefined): VectorNode {
  if (!existing) return next
  const children = next.children?.map((child, index) => {
    const previous = existing.children?.[index]
    return previous && previous.type === child.type ? { ...child, id: previous.id } : child
  })
  return children ? { ...next, id: existing.id, children } : { ...next, id: existing.id }
}

/** 在根节点里找出承载渐变的 defs。 */
export function findDefs(doc: VectorDocument): VectorNode | undefined {
  return doc.root.find((node) => node.type === 'defs')
}

/** 按 SVG id 读取渐变；不存在时返回 null。 */
export function readGradient(doc: VectorDocument, id: string): GradientSpec | null {
  const defs = findDefs(doc)
  if (!defs) return null
  for (const child of defs.children ?? []) {
    if (child.attrs['id'] === id) return nodeToGradient(child)
  }
  return null
}

/** 按 `url(#id)` 引用读取渐变。 */
export function readGradientRef(doc: VectorDocument, value: string): GradientSpec | null {
  const id = parseGradientRef(value)
  return id ? readGradient(doc, id) : null
}

/**
 * 写入（新增或替换）一份渐变，需要的 defs 会自动补上。
 * 找不到任何变化时返回原文档引用，调用方据此跳过重渲染和历史。
 */
export function writeGradient(doc: VectorDocument, spec: GradientSpec): VectorDocument {
  const defs = findDefs(doc)
  const current = defs?.children ?? []
  const index = current.findIndex((child) => child.attrs['id'] === spec.id)
  const existing = index === -1 ? undefined : current[index]
  const node = reuseNodeIds(gradientToNode(spec), existing)
  const children =
    index === -1 ? [...current, node] : current.map((c, i) => (i === index ? node : c))
  const nextDefs: VectorNode = defs
    ? { ...defs, children }
    : // defs 本身不被任何地方引用，就别往导出里塞一个没用的 id 属性。
      { id: createId('defs-node'), type: 'defs', attrs: {}, children }

  return {
    ...doc,
    root: defs ? doc.root.map((n) => (n === defs ? nextDefs : n)) : [...doc.root, nextDefs],
  }
}

/**
 * 在 6 位十六进制颜色之间插值，用于「添加色标」时给出一个中间色。
 * 任一端不是纯色（none / currentColor / url(#…)）时返回 null，由调用方兜底。
 */
export function mixHexColors(from: string, to: string, ratio: number): string | null {
  const parse = (value: string): [number, number, number] | null => {
    const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
    if (!match?.[1]) return null
    const int = Number.parseInt(match[1], 16)
    return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff]
  }

  const a = parse(from)
  const b = parse(to)
  if (!a || !b) return null

  const channel = (index: 0 | 1 | 2): string => {
    const value = Math.round(a[index] + (b[index] - a[index]) * ratio)
    return value.toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/** 6 位十六进制的相对亮度（0–1），用来判断一个颜色偏亮还是偏暗。 */
function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match?.[1]) return 0.5
  const int = Number.parseInt(match[1], 16)
  const channel = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  const r = channel(((int >> 16) & 0xff) / 255)
  const g = channel(((int >> 8) & 0xff) / 255)
  const b = channel((int & 0xff) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * 由单个颜色推一个「另一端」，让「一键变渐变」立刻能看出方向。
 * 暗色往亮里调，亮色往暗里调；不是纯色时退回默认色。
 */
export function contrastStopFor(color: string): string {
  const towardsLight = mixHexColors(color, '#ffffff', 0.5)
  const towardsDark = mixHexColors(color, '#0f172a', 0.45)
  if (!towardsLight || !towardsDark) return DEFAULT_GRADIENT_TO
  return relativeLuminance(color) > 0.5 ? towardsDark : towardsLight
}

/**
 * 在最大的空档中间插入一个色标，颜色取两侧插值。
 * 返回按位置排好序的新数组（插入色标本就该出现在中间）。
 */
export function insertStop(stops: readonly GradientStop[]): GradientStop[] {
  if (stops.length === 0) return [{ offset: 0, color: DEFAULT_GRADIENT_FROM }]
  if (stops.length === 1) {
    const only = stops[0]
    return only ? [only, { offset: 1, color: only.color }] : [...stops]
  }

  const ordered = [...stops].sort((a, b) => a.offset - b.offset)
  let insertAt = 1
  let widest = -1
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const current = ordered[index]
    if (!previous || !current) continue
    const gap = current.offset - previous.offset
    if (gap > widest) {
      widest = gap
      insertAt = index
    }
  }

  const before = ordered[insertAt - 1]
  const after = ordered[insertAt]
  if (!before || !after) return ordered

  const next = [...ordered]
  next.splice(insertAt, 0, {
    offset: (before.offset + after.offset) / 2,
    color: mixHexColors(before.color, after.color, 0.5) ?? before.color,
  })
  return next
}

/**
 * 删掉没有任何节点引用的渐变，避免导出里留下孤儿 defs。
 * 没有变化时返回原文档引用。
 */
export function pruneGradients(doc: VectorDocument): VectorDocument {
  const defs = findDefs(doc)
  if (!defs?.children?.length) return doc

  const used = new Set<string>()
  const visit = (nodes: readonly VectorNode[]) => {
    for (const node of nodes) {
      if (node.type === 'defs') continue
      for (const key of ['fill', 'stroke']) {
        const value = node.attrs[key]
        if (typeof value !== 'string') continue
        const id = parseGradientRef(value)
        if (id) used.add(id)
      }
      if (node.children?.length) visit(node.children)
    }
  }
  visit(doc.root)

  const children = defs.children.filter((child) => {
    const id = child.attrs['id']
    return typeof id !== 'string' || used.has(id)
  })
  if (children.length === defs.children.length) return doc
  if (children.length === 0) {
    return { ...doc, root: doc.root.filter((node) => node !== defs) }
  }
  return {
    ...doc,
    root: doc.root.map((node) => (node === defs ? { ...defs, children } : node)),
  }
}
