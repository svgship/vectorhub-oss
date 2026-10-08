import { useMemo } from 'react'
import { serializeSvg } from '@vectorhub/codegen'
import { useEditorStore } from '@vectorhub/editor-core'
import { countNodes } from '@vectorhub/svg-model'

export function StatusBar() {
  const doc = useEditorStore((state) => state.document)
  const zoom = useEditorStore((state) => state.viewport.zoom)
  const selection = useEditorStore((state) => state.selection)

  const nodeCount = useMemo(() => countNodes(doc.root), [doc.root])
  const estimatedSize = useMemo(() => new Blob([serializeSvg(doc)]).size, [doc])

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-slate-800 px-4 text-xs text-slate-400">
      <span>缩放 {Math.round(zoom * 100)}%</span>
      <span>选中 {selection.length}</span>
      <span>节点数 {nodeCount}</span>
      <span>预估 {(estimatedSize / 1024).toFixed(1)}KB</span>
      <span className="ml-auto text-emerald-400">状态：本地草稿</span>
    </footer>
  )
}
