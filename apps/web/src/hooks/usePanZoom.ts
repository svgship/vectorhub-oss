import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import {
  fitViewport,
  useEditorStore,
  ZOOM_FACTOR,
  zoomCentered,
  type Size,
} from '@vectorhub/editor-core'
import { parseViewBox, type Rect } from '@vectorhub/svg-model'
import { isSpaceActivatedTarget } from '../lib/dom'

interface PanState {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

export interface PanZoomApi {
  containerRef: RefObject<HTMLDivElement>
  /** 画板矩形（由 viewBox 解析），平移 / 缩放的适配基准。 */
  artboard: Rect
  /** 画布容器当前尺寸（CSS 像素）。 */
  size: Size
  isPanning: boolean
  /** 是否按住空格，用于把光标切成抓手。 */
  isSpaceDown: boolean
  /** 命中平移手势时接管本次按下；返回 true 表示已开始平移。 */
  startPan: (event: ReactPointerEvent<SVGSVGElement>) => boolean
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void
  onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void
  fitToWindow: () => void
  /** 以容器中心为锚点按倍率缩放。 */
  zoomAtCenter: (factor: number) => void
  /** 以容器中心为锚点设置绝对缩放。 */
  zoomTo: (zoom: number) => void
}

/**
 * 画布的平移与缩放：滚轮缩放、中键 / 空格 + 左键拖拽平移，并在首次拿到尺寸时自适应。
 * 缩放状态存在 store，这里只负责手势与容器尺寸。
 */
export function usePanZoom(): PanZoomApi {
  const viewBox = useEditorStore((state) => state.document.viewBox)
  const zoomBy = useEditorStore((state) => state.zoomBy)
  const updateViewport = useEditorStore((state) => state.updateViewport)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef<PanState | null>(null)
  const didFitRef = useRef(false)

  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [isPanning, setIsPanning] = useState(false)

  const artboard = useMemo(() => parseViewBox(viewBox), [viewBox])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  /** 首次拿到容器尺寸时，把画板适配进窗口。 */
  useEffect(() => {
    if (didFitRef.current || size.width === 0 || size.height === 0) return
    didFitRef.current = true
    updateViewport(fitViewport(artboard, size))
  }, [artboard, size, updateViewport])

  const fitToWindow = useCallback(() => {
    updateViewport(fitViewport(artboard, size))
  }, [artboard, size, updateViewport])

  /** React 的 wheel 监听是 passive 的，这里手动注册非 passive 版本以阻止页面滚动。 */
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      zoomBy(event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR, anchor)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  /** 空格：临时切换为平移手势。 */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isSpaceActivatedTarget(event.target)) return
      event.preventDefault()
      if (!event.repeat) setIsSpaceDown(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      setIsSpaceDown(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const startPan = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): boolean => {
      const isPanGesture = event.button === 1 || (event.button === 0 && isSpaceDown)
      if (!isPanGesture) return false
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      const { viewport } = useEditorStore.getState()
      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: viewport.x,
        originY: viewport.y,
      }
      setIsPanning(true)
      return true
    },
    [isSpaceDown],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const pan = panRef.current
      if (!pan || pan.pointerId !== event.pointerId) return
      updateViewport({
        x: pan.originX + (event.clientX - pan.startX),
        y: pan.originY + (event.clientY - pan.startY),
      })
    },
    [updateViewport],
  )

  const onPointerUp = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return
    panRef.current = null
    setIsPanning(false)
  }, [])

  const zoomAtCenter = useCallback(
    (factor: number) => zoomBy(factor, { x: size.width / 2, y: size.height / 2 }),
    [size, zoomBy],
  )

  const zoomTo = useCallback(
    (zoom: number) => updateViewport(zoomCentered(useEditorStore.getState().viewport, zoom, size)),
    [size, updateViewport],
  )

  return {
    containerRef,
    artboard,
    size,
    isPanning,
    isSpaceDown,
    startPan,
    onPointerMove,
    onPointerUp,
    fitToWindow,
    zoomAtCenter,
    zoomTo,
  }
}
