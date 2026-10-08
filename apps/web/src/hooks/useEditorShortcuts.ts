import { useEffect } from 'react'
import { useEditorStore, type EditorTool } from '@vectorhub/editor-core'
import { isEditableTarget } from '../lib/dom'

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
      const modifier = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (modifier && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (modifier && key === 'y') {
        event.preventDefault()
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
        if (state.selection.length === 0) return
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
