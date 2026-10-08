import { useEffect, useRef, useState } from 'react'
import { useClipboard } from '../hooks/useClipboard'
import { useCodeExportActions } from '../hooks/useCodeExport'
import { downloadText } from '../lib/download'

const ITEM_CLASS =
  'flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800'

export function ExportMenu() {
  const { targets, exporter, generateFor, setTarget } = useCodeExportActions()
  const { copied, copy } = useClipboard()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleDownload = (id: string) => {
    const artifact = generateFor(id)
    if (!artifact) return
    downloadText(artifact.fileName, artifact.code, artifact.exporter.mime)
    // 顺带把代码面板切到刚导出的目标，两处状态保持一致。
    setTarget(id)
    setOpen(false)
  }

  const handleCopy = async () => {
    const artifact = generateFor(exporter.id)
    if (!artifact) return
    if (await copy(artifact.code)) setTarget(exporter.id)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded px-2 py-1 hover:bg-slate-800"
      >
        导出
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-800 bg-slate-900 p-1 shadow-xl">
          {targets.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => handleDownload(target.id)}
              className={ITEM_CLASS}
            >
              <span>下载 {target.label}</span>
              <span className="text-[10px] text-slate-500">.{target.extension}</span>
            </button>
          ))}

          <div className="my-1 border-t border-slate-800" />

          <button
            type="button"
            onClick={() => {
              void handleCopy()
            }}
            className={ITEM_CLASS}
          >
            {copied ? '已复制' : `复制${exporter.label}代码`}
          </button>
        </div>
      ) : null}
    </div>
  )
}
