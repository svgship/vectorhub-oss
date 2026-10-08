import type { SnapGuide } from '@vectorhub/svg-model'

const OBJECT_COLOR = '#f472b6'
const GRID_COLOR = '#64748b'

/**
 * 网格吸附就是像素对齐（间距 1px），拖拽时到最近整数的距离恒小于 0.5px，
 * 也就是每次拖拽都会命中。把它画成参考线会变成常驻噪声，因此默认不显示；
 * 需要观察像素对齐时改成 true。
 */
const SHOW_GRID_GUIDES = false

export interface SnapGuidesProps {
  guides: readonly SnapGuide[]
  zoom: number
}

/** 拖动时显示的对齐参考线。 */
export function SnapGuides({ guides, zoom }: SnapGuidesProps) {
  const visible = SHOW_GRID_GUIDES ? guides : guides.filter((guide) => guide.kind !== 'grid')
  if (visible.length === 0) return null

  return (
    <g pointerEvents="none">
      {visible.map((guide, index) => {
        const isVertical = guide.axis === 'x'
        return (
          <line
            key={`${guide.kind}-${guide.axis}-${index}`}
            x1={isVertical ? guide.position : guide.from}
            y1={isVertical ? guide.from : guide.position}
            x2={isVertical ? guide.position : guide.to}
            y2={isVertical ? guide.to : guide.position}
            stroke={guide.kind === 'grid' ? GRID_COLOR : OBJECT_COLOR}
            strokeWidth={1 / zoom}
            strokeDasharray={guide.kind === 'grid' ? `${3 / zoom} ${3 / zoom}` : 'none'}
            strokeOpacity={guide.kind === 'grid' ? 0.7 : 1}
          />
        )
      })}
    </g>
  )
}
