import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useEditorStore } from '@vectorhub/editor-core'
import {
  mergeSelection,
  nodesIntersectingRect,
  rectFromPoints,
  selectionModeOf,
  type Point,
  type Rect,
  type SelectionMode,
} from '@vectorhub/svg-model'

/** 拖动距离小于这个屏幕像素数就当成「点空白处」，免得手抖把选择清掉。 */
const CLICK_SLOP = 3

interface MarqueeSession {
  pointerId: number
  mode: SelectionMode
  /** 按下时的选择集：加选 / 减选 / 交集都在它上面运算。 */
  base: readonly string[]
  /** 按下的世界坐标，选框的固定角。 */
  start: Point
  startClientX: number
  startClientY: number
  /** 画布 SVG，用来把屏幕坐标换算回文档坐标。 */
  element: SVGSVGElement
}

/** 屏幕坐标 → 文档坐标。每次都重新取视口，框选途中缩放 / 平移也不会算歪。 */
function toWorld(element: SVGSVGElement, clientX: number, clientY: number): Point {
  const rect = element.getBoundingClientRect()
  const { viewport } = useEditorStore.getState()
  return {
    x: (clientX - rect.left - viewport.x) / viewport.zoom,
    y: (clientY - rect.top - viewport.y) / viewport.zoom,
  }
}

function isSameSelection(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

/** 把选框（null 表示还没拖出有效范围）换算成新的选择集并写入 store。 */
function applyMarquee(session: MarqueeSession, rect: Rect | null): void {
  const store = useEditorStore.getState()
  const hits = rect ? nodesIntersectingRect(store.document.root, rect) : []
  const next = mergeSelection(session.base, hits, session.mode)
  if (!isSameSelection(next, store.selection)) store.select(next)
}

function hasMoved(session: MarqueeSession, event: PointerEvent): boolean {
  return (
    Math.abs(event.clientX - session.startClientX) >= CLICK_SLOP ||
    Math.abs(event.clientY - session.startClientY) >= CLICK_SLOP
  )
}

export interface MarqueeApi {
  /** 在空白画布上按下时调用，开始框选。 */
  beginMarquee: (event: ReactPointerEvent<SVGSVGElement>) => void
  isMarqueeing: boolean
  /** 当前选框（文档坐标），没有框选时为 null。 */
  rect: Rect | null
}

/**
 * 画布框选，Photoshop 式的橡皮筋选区。
 *
 * 修饰键语义对齐 PS：Shift 加选、Alt 减选、Shift+Alt 取交集；
 * 不带修饰键时拖出选框会实时代替原选择，不到 3px 的抖动按「点空白处」处理（清空选择）。
 * 框选只改选择集不碰文档，所以不落历史，只读分享里也照常可用。
 */
export function useMarqueeSelect(): MarqueeApi {
  const sessionRef = useRef<MarqueeSession | null>(null)
  const [isMarqueeing, setIsMarqueeing] = useState(false)
  const [rect, setRect] = useState<Rect | null>(null)

  const beginMarquee = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    const state = useEditorStore.getState()
    sessionRef.current = {
      pointerId: event.pointerId,
      mode: selectionModeOf(event),
      base: state.selection,
      start: toWorld(event.currentTarget, event.clientX, event.clientY),
      startClientX: event.clientX,
      startClientY: event.clientY,
      element: event.currentTarget,
    }
    setRect(null)
    setIsMarqueeing(true)
  }, [])

  useEffect(() => {
    if (!isMarqueeing) return

    const onPointerMove = (event: PointerEvent) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      if (!hasMoved(session, event)) return
      const next = rectFromPoints(
        session.start,
        toWorld(session.element, event.clientX, event.clientY),
      )
      setRect(next)
      applyMarquee(session, next)
    }

    const onPointerUp = (event: PointerEvent) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      // 没拖动就交给 base 决定：普通点击清空选择，Shift / Alt 点击保持原样。
      applyMarquee(
        session,
        hasMoved(session, event)
          ? rectFromPoints(session.start, toWorld(session.element, event.clientX, event.clientY))
          : null,
      )
      sessionRef.current = null
      setRect(null)
      setIsMarqueeing(false)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [isMarqueeing])

  return { beginMarquee, isMarqueeing, rect }
}
