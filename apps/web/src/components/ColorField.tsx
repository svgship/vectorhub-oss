import { useDraftInput } from '../hooks/useDraftInput'
import { isHexColor, toHexColor } from '../lib/color'

const TEXT_CLASS =
  'w-full min-w-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs text-slate-200 outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600'

const NONE_CLASS =
  'shrink-0 rounded border px-1.5 py-1 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export interface ColorFieldProps {
  label: string
  /** null 表示多选时各对象取值不一致。 */
  value: string | null
  disabled?: boolean
  onCommit: (value: string) => void
  /** 取色器开始拖动：调用方可以借此把后续改动合并成一步撤销。 */
  onEditStart?: () => void
  /** 取色器结束拖动（输入框失焦）。 */
  onEditEnd?: () => void
}

/**
 * 颜色输入：取色器 + 原样文本 + 「无」。
 *
 * 文本框保留原样是为了不把 `none`、`currentColor`、`url(#gradient)`
 * 这类合法值拍平成一个色块——它们在这份文档模型里都是一等公民。
 */
export function ColorField({
  label,
  value,
  disabled,
  onCommit,
  onEditStart,
  onEditEnd,
}: ColorFieldProps) {
  const raw = value ?? ''
  const draft = useDraftInput(raw, (text) => onCommit(text.trim() === '' ? 'none' : text.trim()))

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-8 shrink-0 text-[10px] text-slate-500">{label}</span>

      {value !== null && (raw === '' || isHexColor(raw)) ? (
        <input
          type="color"
          aria-label={`${label}取色器`}
          value={toHexColor(raw)}
          disabled={disabled}
          onFocus={onEditStart}
          onPointerDown={onEditStart}
          onChange={(event) => onCommit(event.target.value)}
          onBlur={onEditEnd}
          title={raw === '' ? '未设置，取色后会写入具体颜色' : raw}
          className="h-6 w-6 shrink-0 cursor-pointer rounded border border-slate-700 bg-slate-900 p-0 disabled:cursor-not-allowed"
        />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded border border-dashed border-slate-700" />
      )}

      <input
        type="text"
        spellCheck={false}
        disabled={disabled}
        placeholder={value === null ? '多个值' : '未设置'}
        value={draft.display}
        onFocus={draft.onFocus}
        onChange={draft.onChange}
        onBlur={draft.onBlur}
        onKeyDown={draft.onKeyDown}
        className={TEXT_CLASS}
      />

      <button
        type="button"
        disabled={disabled}
        aria-pressed={raw === 'none'}
        title="设为无"
        onClick={() => onCommit('none')}
        className={`${NONE_CLASS} ${
          raw === 'none'
            ? 'border-sky-500 bg-sky-600/20 text-sky-200'
            : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
      >
        无
      </button>
    </div>
  )
}
