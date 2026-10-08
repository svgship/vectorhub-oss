import { useEffect } from 'react'
import { useEditorStore, type EditorTool } from '@vectorhub/editor-core'
import { isEditableTarget } from '../lib/dom'
import { useSessionStore } from '../lib/session-store'

const TOOL_KEYS: Record<string, EditorTool> = {
  v: 'select',
  p: 'pen',
  n: 'node',
  r: 'shape',
  t: 'text',
}

export function useEditorShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      const state = useEditorStore.getState()
      // 只读分享副本：选择、缩放仍然可用，但任何会改文档的快捷键都短路掉。
      const readOnly = useSessionStore.getState().readOnly
      const modifier = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (modifier && key === 'z') {
        event.preventDefault()
        if (readOnly) return
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (modifier && key === 'y') {
        event.preventDefault()
        if (readOnly) return
        state.redo()
        return
      }
      if (modifier && key === 'a') {
        event.preventDefault()
        state.selectAll()
        return
      }
      if (modifier) return

      if (event.key === 'Escape') {
        state.clearSelection()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (readOnly || state.selection.length === 0) return
        event.preventDefault()
        state.deleteNodes(state.selection)
        return
      }

      const tool = TOOL_KEYS[key]
      if (tool && !event.shiftKey && !event.altKey) {
        state.setTool(tool)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
