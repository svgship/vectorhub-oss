import { useEffect } from 'react'
import { useToastStore, type Toast as ToastItem, type ToastTone } from '../lib/toast-store'

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'border-slate-700 bg-slate-800 text-slate-100',
  success: 'border-emerald-600/60 bg-emerald-950 text-emerald-100',
  error: 'border-rose-600/60 bg-rose-950 text-rose-100',
}

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss)

  useEffect(() => {
    if (item.duration <= 0) return
    const timer = window.setTimeout(() => dismiss(item.id), item.duration)
    return () => window.clearTimeout(timer)
  }, [item.duration, item.id, dismiss])

  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border px-3 py-2 text-xs shadow-xl ${
        TONE_CLASS[item.tone]
      }`}
    >
      <span className="flex-1 leading-relaxed">{item.message}</span>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="关闭提示"
        className="shrink-0 rounded px-1 text-current opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}

/** 提示堆栈：固定在底部居中，压在状态栏之上。 */
export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts)
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-12 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  )
}
