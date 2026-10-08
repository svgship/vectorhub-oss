/**
 * 编辑器核心状态（Zustand）。画布、结构树、代码面板都从这里读写文档。
 */

import { create } from 'zustand'
import {
  createDocument,
  createNode,
  type AttrValue,
  type VectorDocument,
  type VectorNodeType,
} from '@vectorhub/svg-model'

export type EditorTool = 'select' | 'pen' | 'node' | 'shape' | 'text'

export interface Viewport {
  zoom: number
  x: number
  y: number
}

export interface ReplaceDocumentOptions {
  /** 是否写入历史栈，默认 true。 */
  history?: boolean
}

export interface EditorState {
  document: VectorDocument
  selection: readonly string[]
  tool: EditorTool
  viewport: Viewport
  past: readonly VectorDocument[]
  future: readonly VectorDocument[]
  setTool: (tool: EditorTool) => void
  select: (ids: readonly string[]) => void
  addNode: (type: VectorNodeType, attrs?: Record<string, AttrValue>) => void
  updateViewport: (patch: Partial<Viewport>) => void
  replaceDocument: (doc: VectorDocument, options?: ReplaceDocumentOptions) => void
  undo: () => void
  redo: () => void
}

export const HISTORY_LIMIT = 100

function pushHistory(past: readonly VectorDocument[], doc: VectorDocument): VectorDocument[] {
  return [...past, doc].slice(-HISTORY_LIMIT)
}

export const useEditorStore = create<EditorState>((set) => ({
  document: createDocument(),
  selection: [],
  tool: 'select',
  viewport: { zoom: 1, x: 0, y: 0 },
  past: [],
  future: [],

  setTool: (tool) => set({ tool }),

  select: (selection) => set({ selection }),

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

  updateViewport: (patch) => set((state) => ({ viewport: { ...state.viewport, ...patch } })),

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
