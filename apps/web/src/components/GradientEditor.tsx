import {
  GRADIENT_TYPE_LABELS,
  gradientAngleOf,
  gradientVectorForAngle,
  insertStop,
  type GradientSpec,
  type GradientType,
} from '@vectorhub/svg-model'
import { toHexColor } from '../lib/color'
import { NumberField } from './NumberField'

const TYPES: readonly GradientType[] = ['linear', 'radial']

const TYPE_CLASS =
  'flex-1 rounded border px-2 py-1 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const REMOVE_CLASS =
  'rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-400 transition-colors hover:border-rose-500 hover:bg-rose-950/40 hover:text-rose-200'

const STOP_REMOVE_CLASS =
  'shrink-0 rounded px-1 text-[10px] text-slate-500 transition-colors hover:text-rose-300 disabled:cursor-not-allowed disabled:text-slate-700 disabled:hover:text-slate-700'

const ADD_CLASS =
  'w-full rounded border border-dashed border-slate-700 py-1 text-[10px] text-slate-400 transition-colors hover:border-sky-500 hover:text-sky-200'

/** 色带预览：只表达颜色走向，不假装精确还原角度。 */
function previewBackground(spec: GradientSpec): string {
  const stops = spec.stops
    .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
    .join(', ')
  return `linear-gradient(to right, ${stops})`
}

export interface GradientEditorProps {
  spec: GradientSpec
  onChange: (spec: GradientSpec) => void
  /** 取色器开始/结束拖动，交给调用方把连续改动合并成一步撤销。 */
  onEditStart: () => void
  onEditEnd: () => void
  /** 转回纯色填充。 */
  onRemove: () => void
}

/**
 * 渐变编辑器（PRD §7.1「线性/径向渐变」）。
 *
 * 坐标用 objectBoundingBox 单位，所以渐变跟着形状的包围盒走，
 * 缩放形状时渐变会一起缩放，这也是设计工具里的默认手感。
 */
export function GradientEditor({
  spec,
  onChange,
  onEditStart,
  onEditEnd,
  onRemove,
}: GradientEditorProps) {
  const updateStop = (index: number, patch: { offset?: number; color?: string }) => {
    onChange({
      ...spec,
      stops: spec.stops.map((stop, current) => (current === index ? { ...stop, ...patch } : stop)),
    })
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="w-8 shrink-0 text-[10px] text-slate-500">类型</span>
        <div className="flex flex-1 gap-1">
          {TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={spec.type === type}
              onClick={() => onChange({ ...spec, type })}
              className={`${TYPE_CLASS} ${
                spec.type === type
                  ? 'border-sky-500 bg-sky-600/20 text-sky-200'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {GRADIENT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <button type="button" title="转回纯色" onClick={onRemove} className={REMOVE_CLASS}>
          纯色
        </button>
      </div>

      {spec.type === 'linear' ? (
        <NumberField
          label="角度"
          value={gradientAngleOf(spec)}
          min={0}
          max={360}
          step={15}
          onCommit={(value) => onChange({ ...spec, ...gradientVectorForAngle(value) })}
        />
      ) : (
        <NumberField
          label="半径"
          value={spec.r}
          min={0.05}
          max={1}
          step={0.05}
          onCommit={(value) => onChange({ ...spec, r: value })}
        />
      )}

      <div
        className="h-4 rounded border border-slate-700"
        style={{ backgroundImage: previewBackground(spec) }}
      />

      {spec.stops.map((stop, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <input
            type="color"
            aria-label={`色标 ${index + 1}`}
            value={toHexColor(stop.color)}
            onFocus={onEditStart}
            onPointerDown={onEditStart}
            onChange={(event) => updateStop(index, { color: event.target.value })}
            onBlur={onEditEnd}
            className="h-6 w-6 shrink-0 cursor-pointer rounded border border-slate-700 bg-slate-900 p-0"
          />
          <NumberField
            label="位置"
            value={stop.offset * 100}
            min={0}
            max={100}
            step={5}
            onCommit={(value) => updateStop(index, { offset: value / 100 })}
          />
          <span className="shrink-0 text-[10px] text-slate-500">%</span>
          <button
            type="button"
            title="删除色标"
            aria-label="删除色标"
            disabled={spec.stops.length <= 2}
            onClick={() => onChange({ ...spec, stops: spec.stops.filter((_, i) => i !== index) })}
            className={STOP_REMOVE_CLASS}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange({ ...spec, stops: insertStop(spec.stops) })}
        className={ADD_CLASS}
      >
        + 添加色标
      </button>
    </div>
  )
}
