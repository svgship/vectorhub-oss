import { canRedo, canUndo, useEditorStore } from '@vectorhub/editor-core'

export function TopBar() {
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const hasPast = useEditorStore((state) => canUndo(state))
  const hasFuture = useEditorStore((state) => canRedo(state))

  return (
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
        <button
          type="button"
          onClick={undo}
          disabled={!hasPast}
          className="rounded px-2 py-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent"
        >
          撤销
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!hasFuture}
          className="rounded px-2 py-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent"
        >
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
  )
}
