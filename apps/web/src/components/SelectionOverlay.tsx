import type { PointerEvent as ReactPointerEvent } from 'react'
import { RESIZE_HANDLES, type Rect, type ResizeHandle } from '@vectorhub/svg-model'

const ACCENT = '#38bdf8'
const HANDLE_SIZE = 8

/** 选中节点的包围盒，带 id 以便稳定渲染单个节点框。 */
export interface SelectionRect {
  id: string
  rect: Rect
}

export interface SelectionOverlayProps {
  bounds: Rect
  /** 多选时额外画出每个节点的包围盒。 */
  nodeBounds: readonly SelectionRect[]
  zoom: number
  showHandles: boolean
  onHandlePointerDown: (event: ReactPointerEvent<SVGRectElement>, handle: ResizeHandle) => void
}

export function SelectionOverlay({
  bounds,
  nodeBounds,
  zoom,
  showHandles,
  onHandlePointerDown,
}: SelectionOverlayProps) {
  const strokeWidth = 1.5 / zoom
  const handleSize = HANDLE_SIZE / zoom

  return (
    <g>
      {nodeBounds.map(({ id, rect }) => (
        <rect
          key={id}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="none"
          stroke={ACCENT}
          strokeOpacity={0.4}
          strokeWidth={strokeWidth}
          pointerEvents="none"
        />
      ))}

      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke={ACCENT}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />

      {showHandles
        ? RESIZE_HANDLES.map((handle) => {
            const centerX =
              handle.x === -1
                ? bounds.x
                : handle.x === 1
                  ? bounds.x + bounds.width
                  : bounds.x + bounds.width / 2
            const centerY =
              handle.y === -1
                ? bounds.y
                : handle.y === 1
                  ? bounds.y + bounds.height
                  : bounds.y + bounds.height / 2
            return (
              <rect
                key={handle.id}
                x={centerX - handleSize / 2}
                y={centerY - handleSize / 2}
                width={handleSize}
                height={handleSize}
                rx={1 / zoom}
                fill="#020617"
                stroke={ACCENT}
                strokeWidth={strokeWidth}
                style={{ cursor: handle.cursor }}
                onPointerDown={(event) => onHandlePointerDown(event, handle)}
              />
            )
          })
        : null}
    </g>
  )
}
