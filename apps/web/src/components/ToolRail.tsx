import { useEditorStore, type EditorTool } from '@vectorhub/editor-core'

const TOOLS: ReadonlyArray<{ id: EditorTool; label: string; shortcut: string }> = [
  { id: 'select', label: '选择', shortcut: 'V' },
  { id: 'pen', label: '钢笔', shortcut: 'P' },
  { id: 'node', label: '节点', shortcut: 'N' },
  { id: 'shape', label: '形状', shortcut: 'R' },
  { id: 'text', label: '文本', shortcut: 'T' },
]

export function ToolRail() {
  const tool = useEditorStore((state) => state.tool)
  const setTool = useEditorStore((state) => state.setTool)

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-slate-800 py-2">
      {TOOLS.map((item) => (
        <button
          key={item.id}
          type="button"
          title={`${item.label} (${item.shortcut})`}
          onClick={() => setTool(item.id)}
          className={`h-10 w-12 rounded text-xs transition-colors ${
            tool === item.id
              ? 'bg-sky-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          {item.label}
        </button>
      ))}
    </aside>
  )
}
