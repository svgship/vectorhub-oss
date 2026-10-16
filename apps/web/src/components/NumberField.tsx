import { useDraftInput } from '../hooks/useDraftInput'
import { clamp, formatNumber } from '../lib/number'

const INPUT_CLASS =
  'w-full min-w-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs text-slate-200 outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600'

export interface NumberFieldProps {
  label: string
  /** null 表示多选时各对象取值不一致。 */
  value: number | null
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  onCommit: (value: number) => void
}

/** 带标签的数值输入。回车 / 失焦提交，Escape 放弃。 */
export function NumberField({
  label,
  value,
  disabled,
  min,
  max,
  step = 1,
  onCommit,
}: NumberFieldProps) {
  const text = value === null ? '' : formatNumber(value)
  const draft = useDraftInput(text, (raw) => {
    const trimmed = raw.trim()
    if (trimmed === '') return
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) return
    const next = clamp(parsed, min, max)
    // 输入 20.0000001 这种等于没改的值时不落历史。
    if (value !== null && Math.abs(next - value) < 1e-9) return
    onCommit(next)
  })

  return (
    <label className="flex items-center gap-1.5">
      <span className="w-8 shrink-0 text-[10px] text-slate-500">{label}</span>
      <input
        type="number"
        step={step}
        disabled={disabled}
        placeholder={value === null ? '多个值' : ''}
        value={draft.display}
        onFocus={draft.onFocus}
        onChange={draft.onChange}
        onBlur={draft.onBlur}
        onKeyDown={draft.onKeyDown}
        className={INPUT_CLASS}
      />
    </label>
  )
}
