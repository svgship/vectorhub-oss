import { Canvas } from './components/Canvas'
import { RightPanel } from './components/RightPanel'
import { ShareBanner } from './components/ShareBanner'
import { StatusBar } from './components/StatusBar'
import { ToastHost } from './components/Toast'
import { ToolRail } from './components/ToolRail'
import { TopBar } from './components/TopBar'
import { useEditorShortcuts } from './hooks/useEditorShortcuts'
import { usePersistence } from './hooks/usePersistence'

export function App() {
  usePersistence()
  useEditorShortcuts()

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      <TopBar />
      <ShareBanner />

      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <Canvas />
        <RightPanel />
      </div>

      <StatusBar />
      <ToastHost />
    </div>
  )
}
