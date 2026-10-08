import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useEditorStore, type Viewport } from '@vectorhub/editor-core'
import {
  getNodeBounds,
  mapNodes,
  parseViewBox,
  resolveResize,
  scaleNode,
  scaleRect,
  snapMove,
  snapResize,
  translateNode,
  unionBounds,
  type Rect,
  type ResizeHandle,
  type SnapGuide,
  type VectorDocument,
  type VectorNode,
} from '@vectorhub/svg-model'

/** 吸附阈值，屏幕像素。换算到世界坐标时要除以 zoom，这样手感不随缩放变化。 */
const SNAP_THRESHOLD = 6

/** 像素对齐间距。吸附到整数坐标后，导出的 SVG 不会出现 4.237 这种小数。 */
const PIXEL_SNAP_GRID = 1

/** 判定「几何真的变了」的容差：像素吸附会把 0.x px 的抖动送回原位。 */
const CHANGE_EPSILON = 1e-6

function isNegligible(value: number): boolean {
  return Math.abs(value) < CHANGE_EPSILON
}

interface SessionBase {
  pointerId: number
  startClientX: number
  startClientY: number
  zoom: number
  /** 拖拽开始前的文档快照，用于结束时落一次历史。 */
  snapshot: VectorDocument
  /** 拖拽开始前的原始节点，每次移动都基于它重算，避免误差累积。 */
  originals: Map<string, VectorNode>
  /** 拖拽开始时选中内容的包围盒；几何无法推导时为 null，此时不做吸附。 */
  bounds: Rect | null
  /** 参与吸附的其他对象（快照态，拖拽期间不变）。 */
  targets: readonly Rect[]
  artboard: Rect
  moved: boolean
}

interface MoveSession extends SessionBase {
  kind: 'move'
}

type ResizeSession = Omit<SessionBase, 'bounds'> & {
  kind: 'resize'
  bounds: Rect
  handle: ResizeHandle
}

type Session = MoveSession | ResizeSession

function isRect(value: Rect | null): value is Rect {
  return value !== null
}

function collectNodes(
  root: readonly VectorNode[],
  ids: readonly string[],
): Map<string, VectorNode> {
  const wanted = new Set(ids)
  const found = new Map<string, VectorNode>()
  const visit = (nodes: readonly VectorNode[]) => {
    for (const node of nodes) {
      if (wanted.has(node.id)) found.set(node.id, node)
      if (node.children?.length) visit(node.children)
    }
  }
  visit(root)
  return found
}

/** 收集吸附目标。正在被拖拽的节点整棵子树都跳过，否则会自己吸自己。 */
function collectTargets(root: readonly VectorNode[], dragged: ReadonlySet<string>): Rect[] {
  const result: Rect[] = []
  const visit = (nodes: readonly VectorNode[]) => {
    for (const node of nodes) {
      if (dragged.has(node.id)) continue
      const bounds = getNodeBounds(node)
      if (bounds) result.push(bounds)
      if (node.children?.length) visit(node.children)
    }
  }
  visit(root)
  return result
}

export interface NodeDragApi {
  beginMove: (event: ReactPointerEvent<Element>, ids: readonly string[], viewport: Viewport) => void
  beginResize: (
    event: ReactPointerEvent<Element>,
    handle: ResizeHandle,
    bounds: Rect,
    ids: readonly string[],
    viewport: Viewport,
  ) => void
  isDragging: boolean
  /** 当前生效的对齐参考线，用于绘制。 */
  guides: readonly SnapGuide[]
}

/**
 * 拖拽移动与手柄缩放的交互状态机。
 *
 * 拖拽期间的每次移动都以 `history: false` 写入文档（不进历史栈），
 * 松手时再把拖拽前的快照提交为一步撤销。
 * 按住 Alt 可临时忽略吸附。
 */
export function useNodeDrag(): NodeDragApi {
  const sessionRef = useRef<Session | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [guides, setGuides] = useState<readonly SnapGuide[]>([])

  const start = useCallback((event: ReactPointerEvent<Element>, ids: readonly string[]) => {
    if (event.button !== 0) return null
    const state = useEditorStore.getState()
    const originals = collectNodes(state.document.root, ids)
    if (originals.size === 0) return null

    const dragged = new Set(originals.keys())
    return {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      snapshot: state.document,
      originals,
      bounds: unionBounds([...originals.values()].map(getNodeBounds).filter(isRect)),
      targets: collectTargets(state.document.root, dragged),
      artboard: parseViewBox(state.document.viewBox),
      moved: false,
    }
  }, [])

  const beginMove = useCallback(
    (event: ReactPointerEvent<Element>, ids: readonly string[], viewport: Viewport) => {
      const base = start(event, ids)
      if (!base) return
      sessionRef.current = { ...base, kind: 'move', zoom: viewport.zoom }
      setGuides([])
      setIsDragging(true)
    },
    [start],
  )

  const beginResize = useCallback(
    (
      event: ReactPointerEvent<Element>,
      handle: ResizeHandle,
      bounds: Rect,
      ids: readonly string[],
      viewport: Viewport,
    ) => {
      const base = start(event, ids)
      if (!base) return
      sessionRef.current = {
        ...base,
        kind: 'resize',
        zoom: viewport.zoom,
        bounds: base.bounds ?? bounds,
        handle,
      }
      setGuides([])
      setIsDragging(true)
    },
    [start],
  )

  useEffect(() => {
    if (!isDragging) return

    const onPointerMove = (event: PointerEvent) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== event.pointerId) return

      const dx = (event.clientX - session.startClientX) / session.zoom
      const dy = (event.clientY - session.startClientY) / session.zoom
      const { updateDocument } = useEditorStore.getState()

      const snapOptions = {
        targets: session.targets,
        artboard: session.artboard,
        threshold: SNAP_THRESHOLD / session.zoom,
        gridSize: PIXEL_SNAP_GRID,
      }

      if (session.kind === 'move') {
        let offsetX = 0
        let offsetY = 0
        const nextGuides: SnapGuide[] = []
        if (session.bounds && !event.altKey) {
          const proposed: Rect = {
            x: session.bounds.x + dx,
            y: session.bounds.y + dy,
            width: session.bounds.width,
            height: session.bounds.height,
          }
          const snap = snapMove(proposed, snapOptions)
          offsetX = snap.offsetX
          offsetY = snap.offsetY
          nextGuides.push(...snap.guides)
        }

        setGuides(nextGuides)
        const finalDx = dx + offsetX
        const finalDy = dy + offsetY
        // 位移始终相对「拖拽前的原始节点」计算，所以这里比较的是总位移：
        // 吸附把 0.x px 的抖动送回原位，或者用户拖出去又拖回起点时，几何其实没变，
        // 就不该留下一条撤销后画面纹丝不动的空历史。
        session.moved = !isNegligible(finalDx) || !isNegligible(finalDy)
        updateDocument(
          (doc) => ({
            ...doc,
            root: mapNodes(doc.root, (node) => {
              const original = session.originals.get(node.id)
              return original ? translateNode(original, finalDx, finalDy) : node
            }),
          }),
          { history: false },
        )
        return
      }

      const resolution = resolveResize(session.bounds, session.handle, dx, dy, event.shiftKey)
      const proposed = scaleRect(
        session.bounds,
        resolution.anchor,
        resolution.scaleX,
        resolution.scaleY,
      )

      // Shift 等比缩放时只吸附位移更大的那条轴，再把比例镜像到另一条轴；
      // 两轴各自吸附会把用户明确锁定的长宽比悄悄改掉。
      const uniform = event.shiftKey && session.handle.x !== 0 && session.handle.y !== 0
      const snapX = !uniform || Math.abs(dx) >= Math.abs(dy)

      const snapped = event.altKey
        ? { scaleX: resolution.scaleX, scaleY: resolution.scaleY, guides: [] as SnapGuide[] }
        : snapResize(
            {
              anchor: resolution.anchor,
              moving: resolution.moving,
              proposed,
              scaleX: resolution.scaleX,
              scaleY: resolution.scaleY,
              handleX: uniform && !snapX ? 0 : session.handle.x,
              handleY: uniform && snapX ? 0 : session.handle.y,
            },
            snapOptions,
          )

      // 等比缩放时两条轴共用同一个比例：取被吸附那条轴的结果再镜像到另一条轴。
      const uniformScale = snapX ? snapped.scaleX : snapped.scaleY
      const scaleX = uniform ? uniformScale : snapped.scaleX
      const scaleY = uniform ? uniformScale : snapped.scaleY

      // 同上：只有相对拖拽起点真的缩放了才落历史。
      session.moved = !isNegligible(scaleX - 1) || !isNegligible(scaleY - 1)
      setGuides(snapped.guides)
      updateDocument(
        (doc) => ({
          ...doc,
          root: mapNodes(doc.root, (node) => {
            const original = session.originals.get(node.id)
            return original ? scaleNode(original, resolution.anchor, scaleX, scaleY) : node
          }),
        }),
        { history: false },
      )
    }

    const onPointerUp = (event: PointerEvent) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      if (session.moved) useEditorStore.getState().commitHistory(session.snapshot)
      sessionRef.current = null
      setGuides([])
      setIsDragging(false)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [isDragging])

  return { beginMove, beginResize, isDragging, guides }
}
