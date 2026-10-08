import { useMemo } from 'react'
import { useEditorStore, type EditorTool } from '@vectorhub/editor-core'
import { countNodes } from '@vectorhub/svg-model'

const TOOLS: ReadonlyArray<{ id: EditorTool; label: string; shortcut: string }> = [
  { id: 'select', label: '选择', shortcut: 'V' },
  { id: 'pen', label: '钢笔', shortcut: 'P' },
  { id: 'node', label: '节点', shortcut: 'N' },
  { id: 'shape', label: '形状', shortcut: 'R' },
  { id: 'text', label: '文本', shortcut: 'T' },
]

const RIGHT_PANEL_TABS = ['属性', 'SVG', '代码'] as const

export function App() {
  const doc = useEditorStore((state) => state.document)
  const tool = useEditorStore((state) => state.tool)
  const setTool = useEditorStore((state) => state.setTool)
  const addNode = useEditorStore((state) => state.addNode)
  const zoom = useEditorStore((state) => state.viewport.zoom)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)

  const nodeCount = useMemo(() => countNodes(doc.root), [doc.root])
  const estimatedSize = useMemo(() => new Blob([JSON.stringify(doc)]).size, [doc])

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-slate-800 px-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight text-white">VectorHub</span>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800"
          >
            未命名项目 ▾
          </button>
          <span className="text-xs text-emerald-400">已保存</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button type="button" className="rounded px-2 py-1 hover:bg-slate-800" onClick={undo}>
            撤销
          </button>
          <button type="button" className="rounded px-2 py-1 hover:bg-slate-800" onClick={redo}>
            重做
          </button>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button type="button" className="rounded px-2 py-1 hover:bg-slate-800">
            导出
          </button>
          <button type="button" className="rounded px-2 py-1 hover:bg-slate-800">
            分享
          </button>
          <button
            type="button"
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
          >
            ⌘K
          </button>
          <a
            className="rounded px-2 py-1 hover:bg-slate-800"
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
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

        <main className="relative min-w-0 flex-1 overflow-hidden bg-slate-900">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative flex h-full items-center justify-center">
            <div className="text-center text-sm text-slate-500">
              <p className="font-medium text-slate-400">画布 · viewBox {doc.viewBox}</p>
              <p className="mt-1 text-xs">M1 将在此实现无限画布、形状与钢笔编辑</p>
              <button
                type="button"
                onClick={() =>
                  addNode('rect', { x: 4, y: 4, width: 16, height: 16, rx: 2, fill: '#0ea5e9' })
                }
                className="mt-4 rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
              >
                添加一个矩形
              </button>
            </div>
          </div>
        </main>

        <aside className="flex w-80 shrink-0 flex-col border-l border-slate-800">
          <div className="flex shrink-0 border-b border-slate-800 text-xs">
            {RIGHT_PANEL_TABS.map((tab) => (
              <span
                key={tab}
                className={`flex-1 px-3 py-2 text-center ${
                  tab === 'SVG'
                    ? 'border-b-2 border-sky-500 text-white'
                    : 'text-slate-400'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3 text-xs text-slate-400">
            <h3 className="mb-2 font-medium text-slate-300">SVG 结构树</h3>
            {doc.root.length === 0 ? (
              <p>暂无节点</p>
            ) : (
              <ul className="space-y-1 font-mono">
                {doc.root.map((node) => (
                  <li key={node.id} className="rounded bg-slate-900 px-2 py-1">
                    &lt;{node.type} /&gt;
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-slate-800 px-4 text-xs text-slate-400">
        <span>缩放 {Math.round(zoom * 100)}%</span>
        <span>坐标 0, 0</span>
        <span>节点数 {nodeCount}</span>
        <span>预估 {(estimatedSize / 1024).toFixed(1)}KB</span>
        <span className="ml-auto text-emerald-400">状态：本地草稿</span>
      </footer>
    </div>
  )
}
