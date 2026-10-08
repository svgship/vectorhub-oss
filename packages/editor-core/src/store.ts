/**
 * 编辑器核心状态（Zustand）。画布、结构树、代码面板都从这里读写文档。
 */

import { create } from 'zustand'
import {
  createDocument,
  createNode,
  mapNodes,
  walkNodes,
  type AttrValue,
  type Point,
  type VectorDocument,
  type VectorNode,
  type VectorNodeType,
} from '@vectorhub/svg-model'
import { DEFAULT_VIEWPORT, zoomAtPoint, zoomByFactor, type Viewport } from './viewport'

export type EditorTool = 'select' | 'pen' | 'node' | 'shape' | 'text'

export interface ReplaceDocumentOptions {
  /** 是否写入历史栈，默认 true。 */
  history?: boolean
}

export interface UpdateDocumentOptions {
  /** 是否写入历史栈，默认 true。拖拽过程中应传 false，结束时再用 commitHistory 落一次。 */
  history?: boolean
}

export interface UpdateNodePatch {
  attrs?: Record<string, AttrValue>
  style?: Record<string, string>
}

/** 代码面板的配置项（PRD §7.3）。 */
export interface CodeOptions {
  /** React / Vue 导出的组件名。 */
  componentName: string
  /** 导出时把颜色替换为 `currentColor`。 */
  currentColor: boolean
}

/** 代码面板的默认导出目标，与 `@vectorhub/codegen` 的 exporter id 对应。 */
export const DEFAULT_CODE_TARGET = 'svg'

/**
 * 默认代码配置。
 * `currentColor` 必须与 `DEFAULT_CODE_TARGET` 对应目标的 `currentColorByDefault` 一致
 * （独立 SVG 文件默认关，否则单独打开会被渲染成黑色）。
 */
export const DEFAULT_CODE_OPTIONS: CodeOptions = { componentName: 'Icon', currentColor: false }

export interface EditorState {
  document: VectorDocument
  selection: readonly string[]
  tool: EditorTool
  viewport: Viewport
  past: readonly VectorDocument[]
  future: readonly VectorDocument[]
  /** 代码面板当前选中的导出目标。 */
  codeTarget: string
  codeOptions: CodeOptions

  setTool: (tool: EditorTool) => void

  setCodeTarget: (target: string) => void
  setCodeOptions: (patch: Partial<CodeOptions>) => void

  select: (ids: readonly string[]) => void
  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void

  addNode: (type: VectorNodeType, attrs?: Record<string, AttrValue>) => void
  updateNode: (id: string, patch: UpdateNodePatch) => void
  deleteNodes: (ids: readonly string[]) => void

  updateViewport: (patch: Partial<Viewport>) => void
  zoomBy: (factor: number, anchor: Point) => void
  setZoom: (zoom: number, anchor: Point) => void
  resetViewport: () => void

  updateDocument: (
    updater: (doc: VectorDocument) => VectorDocument,
    options?: UpdateDocumentOptions,
  ) => void
  /** 把一次连续操作（拖拽 / 变形）开始前的快照写入历史栈。 */
  commitHistory: (snapshot: VectorDocument) => void

  replaceDocument: (doc: VectorDocument, options?: ReplaceDocumentOptions) => void
  undo: () => void
  redo: () => void
}

export const HISTORY_LIMIT = 100

function pushHistory(past: readonly VectorDocument[], doc: VectorDocument): VectorDocument[] {
  return [...past, doc].slice(-HISTORY_LIMIT)
}

function removeNodes(nodes: readonly VectorNode[], removed: ReadonlySet<string>): VectorNode[] {
  const result: VectorNode[] = []
  for (const node of nodes) {
    if (removed.has(node.id)) continue
    result.push(
      node.children?.length ? { ...node, children: removeNodes(node.children, removed) } : node,
    )
  }
  return result
}

function applyNodePatch(node: VectorNode, patch: UpdateNodePatch): VectorNode {
  const attrs = patch.attrs ? { ...node.attrs, ...patch.attrs } : node.attrs
  const style = patch.style ? { ...node.style, ...patch.style } : node.style
  return style === undefined ? { ...node, attrs } : { ...node, attrs, style }
}

export const useEditorStore = create<EditorState>((set) => ({
  document: createDocument(),
  selection: [],
  tool: 'select',
  viewport: DEFAULT_VIEWPORT,
  past: [],
  future: [],
  codeTarget: DEFAULT_CODE_TARGET,
  codeOptions: DEFAULT_CODE_OPTIONS,

  setTool: (tool) => set({ tool }),

  setCodeTarget: (codeTarget) => set({ codeTarget }),

  setCodeOptions: (patch) => set((state) => ({ codeOptions: { ...state.codeOptions, ...patch } })),

  select: (ids) => set({ selection: [...ids] }),

  toggleSelect: (id) =>
    set((state) => ({
      selection: state.selection.includes(id)
        ? state.selection.filter((current) => current !== id)
        : [...state.selection, id],
    })),

  selectAll: () =>
    set((state) => {
      const ids: string[] = []
      walkNodes(state.document.root, (node) => {
        ids.push(node.id)
      })
      return { selection: ids }
    }),

  clearSelection: () => set({ selection: [] }),

  addNode: (type, attrs = {}) =>
    set((state) => {
      const node = createNode(type, attrs)
      return {
        past: pushHistory(state.past, state.document),
        future: [],
        document: { ...state.document, root: [...state.document.root, node] },
        selection: [node.id],
      }
    }),

  updateNode: (id, patch) =>
    set((state) => {
      let found = false
      const root = mapNodes(state.document.root, (node) => {
        if (node.id !== id) return node
        found = true
        return applyNodePatch(node, patch)
      })
      // 没有命中节点时保持原状态，避免产生一条「看起来没变化」的撤销步。
      if (!found) return state
      return {
        past: pushHistory(state.past, state.document),
        future: [],
        document: { ...state.document, root },
      }
    }),

  deleteNodes: (ids) =>
    set((state) => {
      if (ids.length === 0) return state
      const removed = new Set(ids)
      return {
        past: pushHistory(state.past, state.document),
        future: [],
        document: { ...state.document, root: removeNodes(state.document.root, removed) },
        selection: state.selection.filter((id) => !removed.has(id)),
      }
    }),

  updateViewport: (patch) => set((state) => ({ viewport: { ...state.viewport, ...patch } })),

  zoomBy: (factor, anchor) =>
    set((state) => ({ viewport: zoomByFactor(state.viewport, factor, anchor) })),

  setZoom: (zoom, anchor) =>
    set((state) => ({ viewport: zoomAtPoint(state.viewport, zoom, anchor) })),

  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

  updateDocument: (updater, options = {}) =>
    set((state) => {
      const next = updater(state.document)
      if (next === state.document) return state
      // 瞬态更新（拖拽 / 变形）只改文档，历史由结束时的 commitHistory 统一落一次。
      return options.history === false
        ? { document: next }
        : { document: next, past: pushHistory(state.past, state.document), future: [] }
    }),

  commitHistory: (snapshot) =>
    set((state) => ({ past: pushHistory(state.past, snapshot), future: [] })),

  replaceDocument: (document, options = {}) =>
    set((state) =>
      options.history === false
        ? { document, selection: [] }
        : {
            document,
            selection: [],
            past: pushHistory(state.past, state.document),
            future: [],
          },
    ),

  undo: () =>
    set((state) => {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      return {
        document: previous,
        past: state.past.slice(0, -1),
        future: [state.document, ...state.future].slice(0, HISTORY_LIMIT),
        selection: [],
      }
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0]
      if (!next) return state
      return {
        document: next,
        past: pushHistory(state.past, state.document),
        future: state.future.slice(1),
        selection: [],
      }
    }),
}))

export function canUndo(state: EditorState): boolean {
  return state.past.length > 0
}

export function canRedo(state: EditorState): boolean {
  return state.future.length > 0
}
