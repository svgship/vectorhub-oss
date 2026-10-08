import { Canvas } from './components/Canvas'
import { StatusBar } from './components/StatusBar'
import { StructureTree } from './components/StructureTree'
import { ToolRail } from './components/ToolRail'
import { TopBar } from './components/TopBar'
import { useEditorShortcuts } from './hooks/useEditorShortcuts'

const RIGHT_PANEL_TABS = ['属性', 'SVG', '代码'] as const

export function App() {
  useEditorShortcuts()

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <Canvas />

        <aside className="flex w-80 shrink-0 flex-col border-l border-slate-800">
          <div className="flex shrink-0 border-b border-slate-800 text-xs">
            {RIGHT_PANEL_TABS.map((tab) => (
              <span
                key={tab}
                className={`flex-1 px-3 py-2 text-center ${
                  tab === 'SVG' ? 'border-b-2 border-sky-500 text-white' : 'text-slate-400'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <h3 className="mb-2 font-medium text-slate-300">SVG 结构树</h3>
            <StructureTree />
          </div>
        </aside>
      </div>

      <StatusBar />
    </div>
  )
}
