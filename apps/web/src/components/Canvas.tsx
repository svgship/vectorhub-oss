import { useMemo, type PointerEvent as ReactPointerEvent } from 'react'
import { useEditorStore, ZOOM_FACTOR } from '@vectorhub/editor-core'
import { findNode, getNodeBounds, unionBounds, type ResizeHandle } from '@vectorhub/svg-model'
import { useNodeDrag } from '../hooks/useNodeDrag'
import { usePanZoom } from '../hooks/usePanZoom'
import { SHAPE_PRESETS } from '../lib/sample-shapes'
import { useSessionStore } from '../lib/session-store'
import { NodeView } from './NodeView'
import { SelectionOverlay, type SelectionRect } from './SelectionOverlay'
import { SnapGuides } from './SnapGuides'

const ARTBOARD_STROKE = '#334155'
const ARTBOARD_LABEL = '#64748b'

/** 画布背景的视觉网格间距（CSS 像素），与拖拽吸附的像素网格无关。 */
const BACKGROUND_GRID_SIZE = 24

/** 画板虚线与尺寸标注都按屏幕像素给定，渲染时除以 zoom 以保持恒定。 */
const DASH_LENGTH = 6
const DASH_GAP = 4
const LABEL_SIZE = 11
const LABEL_OFFSET = 6

function formatLength(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const OVERLAY_BUTTON =
  'rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent'

export function Canvas() {
  const doc = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)
  const viewport = useEditorStore((state) => state.viewport)
  const tool = useEditorStore((state) => state.tool)
  const addNode = useEditorStore((state) => state.addNode)
  const select = useEditorStore((state) => state.select)
  const toggleSelect = useEditorStore((state) => state.toggleSelect)
  const clearSelection = useEditorStore((state) => state.clearSelection)
  // PRD §6.3：分享链接打开的是只读副本，改动不会落盘，所以干脆别让用户改。
  const readOnly = useSessionStore((state) => state.readOnly)

  const {
    containerRef,
    artboard,
    isPanning,
    isSpaceDown,
    startPan,
    onPointerMove,
    onPointerUp,
    fitToWindow,
    zoomAtCenter,
    zoomTo,
  } = usePanZoom()
  const { beginMove, beginResize, isDragging, guides } = useNodeDrag()

  const artboardLabel = `${formatLength(artboard.width)} × ${formatLength(artboard.height)}`

  const selectionRects = useMemo<SelectionRect[]>(() => {
    const rects: SelectionRect[] = []
    for (const id of selection) {
      const node = findNode(doc.root, id)
      if (!node) continue
      const rect = getNodeBounds(node)
      if (rect) rects.push({ id, rect })
    }
    return rects
  }, [selection, doc])

  const selectionBounds = useMemo(
    () => unionBounds(selectionRects.map((item) => item.rect)),
    [selectionRects],
  )

  const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (startPan(event)) return
    if (event.button !== 0) return

    const target = event.target as Element | null
    const nodeId = target?.closest('[data-node-id]')?.getAttribute('data-node-id') ?? null

    if (!nodeId) {
      if (!event.shiftKey) clearSelection()
      return
    }
    if (event.shiftKey) {
      toggleSelect(nodeId)
      return
    }

    const alreadySelected = selection.includes(nodeId)
    const nextSelection = alreadySelected ? selection : [nodeId]
    if (!alreadySelected) select([nodeId])
    if (tool === 'select' && !readOnly) beginMove(event, nextSelection, viewport)
  }

  const handleHandlePointerDown = (
    event: ReactPointerEvent<SVGRectElement>,
    handle: ResizeHandle,
  ) => {
    if (!selectionBounds) return
    event.stopPropagation()
    event.preventDefault()
    beginResize(event, handle, selectionBounds, selection, viewport)
  }

  const cursor = isPanning ? 'grabbing' : isDragging ? 'move' : isSpaceDown ? 'grab' : 'default'

  return (
    <main
      ref={containerRef}
      className="relative min-w-0 flex-1 overflow-hidden bg-slate-950"
      style={{ cursor }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
          backgroundSize: `${BACKGROUND_GRID_SIZE}px ${BACKGROUND_GRID_SIZE}px`,
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full touch-none select-none"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
          <rect
            x={artboard.x}
            y={artboard.y}
            width={artboard.width}
            height={artboard.height}
            fill="none"
            stroke={ARTBOARD_STROKE}
            strokeWidth={1 / viewport.zoom}
            strokeDasharray={`${DASH_LENGTH / viewport.zoom} ${DASH_GAP / viewport.zoom}`}
          />

          <text
            x={artboard.x}
            y={artboard.y - LABEL_OFFSET / viewport.zoom}
            fill={ARTBOARD_LABEL}
            fontSize={LABEL_SIZE / viewport.zoom}
            pointerEvents="none"
          >
            {artboardLabel}
          </text>

          {doc.root.map((node) => (
            <NodeView key={node.id} node={node} />
          ))}

          {selectionBounds ? (
            <SelectionOverlay
              bounds={selectionBounds}
              nodeBounds={selection.length > 1 ? selectionRects : []}
              zoom={viewport.zoom}
              showHandles={tool === 'select' && !readOnly}
              onHandlePointerDown={handleHandlePointerDown}
            />
          ) : null}

          <SnapGuides guides={guides} zoom={viewport.zoom} />
        </g>
      </svg>

      <div className="absolute left-3 top-3 flex items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-900/90 p-1 backdrop-blur">
        <span className="px-1 text-[10px] text-slate-500">插入</span>
        {SHAPE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={`插入${preset.label}`}
            onClick={() => addNode(preset.type, preset.attrs)}
            disabled={readOnly}
            className={`${OVERLAY_BUTTON} text-xs`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-xs backdrop-blur">
        <button
          type="button"
          title="缩小"
          onClick={() => zoomAtCenter(1 / ZOOM_FACTOR)}
          className={OVERLAY_BUTTON}
        >
          −
        </button>
        <button type="button" onClick={fitToWindow} className={OVERLAY_BUTTON}>
          适应
        </button>
        <button type="button" onClick={() => zoomTo(1)} className={OVERLAY_BUTTON}>
          100%
        </button>
        <button
          type="button"
          title="放大"
          onClick={() => zoomAtCenter(ZOOM_FACTOR)}
          className={OVERLAY_BUTTON}
        >
          ＋
        </button>
      </div>
    </main>
  )
}
