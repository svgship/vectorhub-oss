import { useEffect, useState } from 'react'
import { useSessionStore, type SaveStatus as Status } from '../lib/session-store'

/** PRD §5.3 的四种状态之外，再加「未保存」和只读分享。 */
const LABELS: Record<Status, { text: string; className: string }> = {
  idle: { text: '未保存', className: 'text-slate-500' },
  saving: { text: '保存中…', className: 'text-slate-400' },
  saved: { text: '已保存', className: 'text-emerald-400' },
  error: { text: '保存失败', className: 'text-rose-400' },
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}

export function SaveStatus() {
  const status = useSessionStore((state) => state.saveStatus)
  const readOnly = useSessionStore((state) => state.readOnly)
  const online = useOnline()

  if (readOnly) {
    return <span className="text-xs text-sky-400">只读分享</span>
  }
  if (!online) {
    return <span className="text-xs text-amber-400">离线草稿</span>
  }

  const { text, className } = LABELS[status]
  return <span className={`text-xs ${className}`}>{text}</span>
}
