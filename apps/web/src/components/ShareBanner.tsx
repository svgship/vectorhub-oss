import { useState } from 'react'
import { useCodeExportActions } from '../hooks/useCodeExport'
import { downloadText } from '../lib/download'
import { adoptSharedDocument } from '../lib/projects'
import { useSessionStore } from '../lib/session-store'
import { toast } from '../lib/toast-store'

const ACTION_CLASS =
  'rounded border border-sky-600/70 px-2 py-0.5 text-sky-200 transition-colors hover:bg-sky-600/20 disabled:cursor-not-allowed disabled:opacity-50'

/** PRD §6.3：通过分享链接打开时，顶部提示这是只读副本，并提供「另存为我的项目」。 */
export function ShareBanner() {
  const readOnly = useSessionStore((state) => state.readOnly)
  const [adopting, setAdopting] = useState(false)
  const { generateFor } = useCodeExportActions()

  if (!readOnly) return null

  const handleAdopt = async () => {
    setAdopting(true)
    try {
      const project = await adoptSharedDocument()
      toast.success(`已另存为「${project.name}」，现在可以自由编辑了。`)
    } catch {
      toast.error('另存失败，请检查浏览器是否允许本地存储。')
    } finally {
      setAdopting(false)
    }
  }

  const handleDownload = () => {
    const artifact = generateFor('svg')
    if (!artifact) return
    downloadText(artifact.fileName, artifact.code, artifact.exporter.mime)
  }

  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b border-sky-900/60 bg-sky-950/40 px-4 text-xs text-sky-100">
      <span className="flex-1 truncate">
        你正在查看分享文档的只读副本，改动不会保存到你的浏览器。
      </span>
      <button type="button" onClick={handleDownload} className={ACTION_CLASS}>
        下载 SVG
      </button>
      <button
        type="button"
        onClick={() => void handleAdopt()}
        disabled={adopting}
        className={ACTION_CLASS}
      >
        {adopting ? '复制中…' : '复制到我的项目'}
      </button>
    </div>
  )
}
