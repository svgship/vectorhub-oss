import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'

export interface DraftInputHandlers {
  /** 输入框当前应显示的内容。 */
  display: string
  onFocus: () => void
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

/**
 * 「改完再提交」的输入框行为。
 *
 * - 未聚焦时显示真实值，所以拖拽画布时输入框会实时跟着变；
 * - 聚焦后进入草稿态，回车 / 失焦才提交，Escape 放弃这次的输入；
 * - 内容没变就不提交，避免白落一步撤销。
 */
export function useDraftInput(value: string, commit: (draft: string) => void): DraftInputHandlers {
  const [draft, setDraft] = useState<string | null>(null)
  // Escape 之后浏览器紧接着会派发 blur，用这个标记告诉那次 blur「别提交」。
  const cancelled = useRef(false)

  const finish = (raw: string | null) => {
    setDraft(null)
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    if (raw === null || raw === value) return
    commit(raw)
  }

  return {
    display: draft ?? value,

    onFocus: () => {
      cancelled.current = false
      setDraft(value)
    },

    onChange: (event) => setDraft(event.target.value),

    onBlur: () => finish(draft),

    onKeyDown: (event) => {
      if (event.key === 'Enter') {
        // 统一走 blur 那条提交路径，避免两处逻辑分叉。
        event.currentTarget.blur()
        return
      }
      if (event.key === 'Escape') {
        cancelled.current = true
        setDraft(null)
        event.currentTarget.blur()
      }
    },
  }
}
