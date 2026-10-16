import type { AlignKind, DistributeKind } from '@vectorhub/svg-model'
import type { ReactNode } from 'react'

const ALIGN_BUTTONS: ReadonlyArray<{ kind: AlignKind; label: string }> = [
  { kind: 'left', label: '左对齐' },
  { kind: 'centerX', label: '水平居中' },
  { kind: 'right', label: '右对齐' },
  { kind: 'top', label: '顶对齐' },
  { kind: 'centerY', label: '垂直居中' },
  { kind: 'bottom', label: '底对齐' },
]

const DISTRIBUTE_BUTTONS: ReadonlyArray<{ kind: DistributeKind; label: string }> = [
  { kind: 'horizontal', label: '水平分布' },
  { kind: 'vertical', label: '垂直分布' },
]

/** 两条「对象」的长度，用来画出对齐效果。 */
const BAR_LENGTHS = [11, 7] as const

/** 参考线位置：0–16 的画布里，左/上=2、居中=8、右/下=14。 */
function anchorOf(kind: AlignKind): number {
  if (kind === 'left' || kind === 'top') return 2
  if (kind === 'right' || kind === 'bottom') return 14
  return 8
}

function AlignIcon({ kind }: { kind: AlignKind }) {
  const horizontal = kind === 'left' || kind === 'centerX' || kind === 'right'
  const anchor = anchorOf(kind)

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
      {horizontal ? (
        <line x1={anchor} y1={1.5} x2={anchor} y2={14.5} stroke="currentColor" strokeWidth={1} />
      ) : (
        <line x1={1.5} y1={anchor} x2={14.5} y2={anchor} stroke="currentColor" strokeWidth={1} />
      )}
      {BAR_LENGTHS.map((length, index) => {
        const cross = 3 + index * 6
        const start = anchor === 8 ? anchor - length / 2 : anchor === 14 ? anchor - length : anchor
        return horizontal ? (
          <rect
            key={length}
            x={start}
            y={cross - 1.5}
            width={length}
            height={3}
            rx={0.5}
            fill="currentColor"
          />
        ) : (
          <rect
            key={length}
            x={cross - 1.5}
            y={start}
            width={3}
            height={length}
            rx={0.5}
            fill="currentColor"
          />
        )
      })}
    </svg>
  )
}

function DistributeIcon({ kind }: { kind: DistributeKind }) {
  const horizontal = kind === 'horizontal'
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
      {[0, 6.5, 13].map((position) =>
        horizontal ? (
          <rect
            key={position}
            x={position}
            y={2}
            width={3}
            height={12}
            rx={0.5}
            fill="currentColor"
          />
        ) : (
          <rect
            key={position}
            x={2}
            y={position}
            width={12}
            height={3}
            rx={0.5}
            fill="currentColor"
          />
        ),
      )}
    </svg>
  )
}

const BUTTON_CLASS =
  'flex items-center justify-center gap-1 rounded border border-slate-700 px-1 py-1.5 text-[10px] text-slate-300 transition-colors hover:border-sky-500 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent'

function ToolButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={BUTTON_CLASS}
    >
      {children}
    </button>
  )
}

export interface AlignToolsProps {
  onAlign: (kind: AlignKind) => void
  onDistribute: (kind: DistributeKind) => void
  /** 少于 2 个能算出包围盒的对象时无从对齐。 */
  canAlign: boolean
  /** 少于 3 个对象时首尾已固定，没有可分布的对象。 */
  canDistribute: boolean
}

export function AlignTools({ onAlign, onDistribute, canAlign, canDistribute }: AlignToolsProps) {
  return (
    <>
      <div className="grid grid-cols-6 gap-1">
        {ALIGN_BUTTONS.map((button) => (
          <ToolButton
            key={button.kind}
            label={button.label}
            disabled={!canAlign}
            onClick={() => onAlign(button.kind)}
          >
            <AlignIcon kind={button.kind} />
          </ToolButton>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1">
        {DISTRIBUTE_BUTTONS.map((button) => (
          <ToolButton
            key={button.kind}
            label={button.label}
            disabled={!canDistribute}
            onClick={() => onDistribute(button.kind)}
          >
            <DistributeIcon kind={button.kind} />
            <span>{button.label}</span>
          </ToolButton>
        ))}
      </div>
    </>
  )
}
