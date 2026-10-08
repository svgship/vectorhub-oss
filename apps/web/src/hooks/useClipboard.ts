import { useCallback, useEffect, useRef, useState } from 'react'
import { copyText } from '../lib/clipboard'

export interface ClipboardApi {
  /** 刚刚复制成功，用于把按钮文案切成「已复制」。 */
  copied: boolean
  copy: (text: string) => Promise<boolean>
}

/** 复制按钮的反馈状态：成功后一段时间自动复原。 */
export function useClipboard(resetAfterMs = 1600): ClipboardApi {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const copy = useCallback(
    async (text: string) => {
      if (!(await copyText(text))) return false
      setCopied(true)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), resetAfterMs)
      return true
    },
    [resetAfterMs],
  )

  return { copied, copy }
}
