import { lazy, Suspense, useState } from 'react'
import { StructureTree } from './StructureTree'

/** 代码面板很重（Monaco），拆成独立 chunk，别拖慢首屏。 */
const CodePanel = lazy(() =>
  import('./CodePanel').then((module) => ({ default: module.CodePanel })),
)

type TabId = 'properties' | 'structure' | 'code'

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'properties', label: '属性' },
  { id: 'structure', label: 'SVG' },
  { id: 'code', label: '代码' },
]

export function RightPanel() {
  // PRD §4.1.2 / §7.3：代码面板默认可见。
  const [tab, setTab] = useState<TabId>('code')

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-slate-800">
      <div className="flex shrink-0 border-b border-slate-800 text-xs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 px-3 py-2 text-center transition-colors ${
              tab === item.id
                ? 'border-b-2 border-sky-500 text-white'
                : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'code' ? (
          <Suspense fallback={<p className="p-3 text-xs text-slate-500">加载代码面板…</p>}>
            <CodePanel />
          </Suspense>
        ) : null}

        {tab === 'structure' ? (
          <div className="h-full overflow-auto p-2">
            <h3 className="mb-2 font-medium text-slate-300">SVG 结构树</h3>
            <StructureTree />
          </div>
        ) : null}

        {tab === 'properties' ? (
          <p className="p-3 text-xs leading-relaxed text-slate-500">
            属性面板待实现：填充、描边、线性/径向渐变、透明度、尺寸与位置。
          </p>
        ) : null}
      </div>
    </aside>
  )
}
