import { useMemo, useRef, type ReactNode } from 'react'
import { useEditorStore, type UpdateDocumentOptions } from '@vectorhub/editor-core'
import {
  DEFAULT_GRADIENT_FROM,
  alignmentOffsets,
  contrastStopFor,
  createGradientId,
  createGradientSpec,
  distributionOffsets,
  findNode,
  getNodeBounds,
  gradientRef,
  parseViewBox,
  pruneGradients,
  readGradientRef,
  writeGradient,
  type AlignItem,
  type AlignKind,
  type AttrValue,
  type DistributeKind,
  type GradientSpec,
  type VectorDocument,
  type VectorNode,
  type VectorNodeType,
} from '@vectorhub/svg-model'
import { isHexColor } from '../lib/color'
import {
  moveNodesTo,
  replaceNodes,
  resizeNodesTo,
  translateNodesBy,
  withAttrs,
} from '../lib/node-edits'
import { formatNumber } from '../lib/number'
import { AlignTools } from './AlignTools'
import { ColorField } from './ColorField'
import { GradientEditor } from './GradientEditor'
import { NumberField } from './NumberField'

/** 宽高缩到 0 会让图形消失且很难再选回来，留一个兜底尺寸。 */
const MIN_SIZE = 0.01

const ADD_GRADIENT_CLASS =
  'w-full rounded border border-dashed border-slate-700 py-1 text-[10px] text-slate-400 transition-colors hover:border-sky-500 hover:text-sky-200'

const MIXED = Symbol('mixed')
type Maybe<T> = T | typeof MIXED

function unwrap<T>(value: Maybe<T>): T | null {
  return value === MIXED ? null : value
}

/** 多选取公共值；不一致时返回 MIXED。 */
function commonValue<T>(values: readonly T[]): Maybe<T> {
  const [first, ...rest] = values
  if (first === undefined) return MIXED
  return rest.every((value) => value === first) ? first : MIXED
}

function attrText(node: VectorNode, key: string): string {
  const value = node.attrs[key]
  return value === undefined ? '' : String(value)
}

function attrNumber(node: VectorNode, key: string): number | null {
  const value = node.attrs[key]
  if (value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const TYPE_LABELS: Record<VectorNodeType, string> = {
  path: '路径',
  rect: '矩形',
  circle: '圆',
  ellipse: '椭圆',
  line: '直线',
  polyline: '折线',
  polygon: '多边形',
  text: '文本',
  g: '分组',
  defs: '定义',
  symbol: '符号',
  use: '引用',
  linearGradient: '线性渐变',
  radialGradient: '径向渐变',
  stop: '色标',
}

/** 填充在这些类型上没有意义。 */
const FILLABLE = new Set<VectorNodeType>([
  'rect',
  'circle',
  'ellipse',
  'polyline',
  'polygon',
  'path',
  'text',
])

/** 描边在这些类型上没有意义。 */
const STROKABLE = new Set<VectorNodeType>([
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'text',
])

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-1.5 text-[10px] tracking-wide text-slate-500">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-[10px] text-slate-500">{children}</p>
}

function EmptyPanel({ viewBox }: { viewBox: string }) {
  const artboard = parseViewBox(viewBox)

  return (
    <div className="h-full overflow-auto p-3 text-xs">
      <p className="mb-4 text-slate-300">未选中对象</p>

      <Section title="画板">
        <div className="flex gap-4 text-slate-400">
          <span>宽 {formatNumber(artboard.width)}</span>
          <span>高 {formatNumber(artboard.height)}</span>
        </div>
      </Section>

      <Hint>在画布中选中对象后，可在这里修改位置、尺寸、填充与描边。</Hint>
    </div>
  )
}

/**
 * 属性面板（PRD §5.5 / §7.1）。
 *
 * 位置与尺寸按包围盒换算成平移 / 缩放，所以矩形、圆、椭圆、直线、多边形
 * 共用同一套输入；组会整体平移。
 * 多选时改为对齐 / 分布，外加样式批改。
 */
export function PropertiesPanel() {
  const doc = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)
  const updateDocument = useEditorStore((state) => state.updateDocument)

  const nodes = useMemo(() => {
    const found: VectorNode[] = []
    for (const id of selection) {
      const node = findNode(doc.root, id)
      if (node) found.push(node)
    }
    return found
  }, [doc, selection])

  const ids = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes])

  /** 能算出包围盒的对象才有资格参与对齐。 */
  const alignItems = useMemo<AlignItem[]>(() => {
    const items: AlignItem[] = []
    for (const node of nodes) {
      const rect = getNodeBounds(node)
      if (rect) items.push({ id: node.id, rect })
    }
    return items
  }, [nodes])

  const single = nodes.length === 1 ? nodes[0] : undefined
  const multi = nodes.length > 1
  const bounds = single ? getNodeBounds(single) : null

  /** 取色器拖动期间开启的「预览会话」，记录拖动前的文档用于补一步撤销。 */
  const colorSessionRef = useRef<VectorDocument | null>(null)

  const edit = (updater: (current: VectorDocument) => VectorDocument) => {
    const options: UpdateDocumentOptions | undefined = colorSessionRef.current
      ? { history: false }
      : undefined
    updateDocument(updater, options)
  }

  const commitAttrs = (attrs: Record<string, AttrValue>) => {
    edit((current) => replaceNodes(current, ids, (node) => withAttrs(node, attrs)))
  }

  /**
   * 取色器会连着触发一串 input 事件。
   * 拖动期间用 `history: false` 只更新画面，松手（失焦）时再把拖动前的快照
   * 补进历史——一次调色只占一步撤销。和画布拖拽用的是同一套做法。
   */
  const beginColorSession = () => {
    colorSessionRef.current = useEditorStore.getState().document
  }

  const endColorSession = () => {
    const snapshot = colorSessionRef.current
    colorSessionRef.current = null
    if (!snapshot) return
    const state = useEditorStore.getState()
    if (snapshot === state.document) return
    state.commitHistory(snapshot)
  }

  /** 位置输入的是包围盒左上角，组也能整体挪。 */
  const setPosition = (axis: 'x' | 'y', next: number) => {
    if (!bounds) return
    const target = axis === 'x' ? { x: next } : { y: next }
    edit((current) => moveNodesTo(current, ids, bounds, target))
  }

  /** 以包围盒左上角为定点缩放，圆、椭圆、多边形都能覆盖。 */
  const setSize = (axis: 'width' | 'height', next: number) => {
    if (!bounds) return
    const target = axis === 'width' ? { width: next } : { height: next }
    edit((current) => resizeNodesTo(current, ids, bounds, target))
  }

  const setRoundness = (value: number) => {
    if (!single) return
    const patch: Record<string, AttrValue> = { rx: value }
    // 只有本来就带 ry 的矩形才同步 ry，不给普通矩形平白多写一个属性。
    if (single.attrs.ry !== undefined) patch.ry = value
    commitAttrs(patch)
  }

  const runAlign = (kind: AlignKind) => {
    const offsets = alignmentOffsets(alignItems, kind)
    if (offsets.size === 0) return
    edit((current) => translateNodesBy(current, offsets))
  }

  const runDistribute = (kind: DistributeKind) => {
    const offsets = distributionOffsets(alignItems, kind)
    if (offsets.size === 0) return
    edit((current) => translateNodesBy(current, offsets))
  }

  const fillValue = single ? attrText(single, 'fill') : ''
  const gradient = single ? readGradientRef(doc, fillValue) : null

  const addGradient = () => {
    const id = createGradientId()
    const from = isHexColor(fillValue) ? fillValue : DEFAULT_GRADIENT_FROM
    const spec = createGradientSpec({ id, from, to: contrastStopFor(from) })
    edit((current) =>
      writeGradient(
        replaceNodes(current, ids, (node) => withAttrs(node, { fill: gradientRef(id) })),
        spec,
      ),
    )
  }

  const changeGradient = (spec: GradientSpec) => {
    edit((current) => writeGradient(current, spec))
  }

  const removeGradient = () => {
    if (!gradient) return
    const solid = gradient.stops[0]?.color ?? '#000000'
    edit((current) =>
      pruneGradients(replaceNodes(current, ids, (node) => withAttrs(node, { fill: solid }))),
    )
  }

  if (nodes.length === 0) return <EmptyPanel viewBox={doc.viewBox} />

  const fill = unwrap(commonValue(nodes.map((node) => attrText(node, 'fill'))))
  const stroke = unwrap(commonValue(nodes.map((node) => attrText(node, 'stroke'))))
  const strokeWidth = unwrap(
    commonValue(nodes.map((node) => attrNumber(node, 'stroke-width') ?? 1)),
  )
  // opacity 缺省即 1，展示成 1 比展示成空白更贴近实际渲染。
  const opacity = unwrap(commonValue(nodes.map((node) => attrNumber(node, 'opacity') ?? 1)))

  const showFill = single ? FILLABLE.has(single.type) : true
  const showStroke = single ? STROKABLE.has(single.type) : true

  return (
    <div className="h-full overflow-auto p-3 text-xs">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <span className="truncate text-slate-300">
          {single ? TYPE_LABELS[single.type] : `已选中 ${nodes.length} 个对象`}
        </span>
        <span className="shrink-0 text-[10px] text-slate-500">{multi ? '多选' : '单个'}</span>
      </header>

      {/* 单选时也保留这一栏（置灰），否则用户根本发现不了对齐功能在哪。 */}
      <Section title="对齐与分布">
        <AlignTools
          onAlign={runAlign}
          onDistribute={runDistribute}
          canAlign={alignItems.length >= 2}
          canDistribute={alignItems.length >= 3}
        />
        {alignItems.length < 2 ? (
          <Hint>
            选中两个以上对象才能对齐：在空白处拖出选框，或按住 Shift 点选；Alt 拖框可减选。
          </Hint>
        ) : null}
        {alignItems.length < nodes.length ? (
          <Hint>路径与文本还算不出包围盒，不参与对齐。</Hint>
        ) : null}
        {multi ? <Hint>多选时改不了位置与尺寸，用上面的对齐，或单独选中一个对象。</Hint> : null}
      </Section>

      {multi ? null : (
        <Section title="位置与尺寸">
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="X"
              value={bounds ? bounds.x : null}
              disabled={!bounds}
              onCommit={(value) => setPosition('x', value)}
            />
            <NumberField
              label="Y"
              value={bounds ? bounds.y : null}
              disabled={!bounds}
              onCommit={(value) => setPosition('y', value)}
            />
            <NumberField
              label="宽"
              value={bounds ? bounds.width : null}
              disabled={!bounds}
              min={MIN_SIZE}
              onCommit={(value) => setSize('width', value)}
            />
            <NumberField
              label="高"
              value={bounds ? bounds.height : null}
              disabled={!bounds}
              min={MIN_SIZE}
              onCommit={(value) => setSize('height', value)}
            />
          </div>
          {single && !bounds ? (
            <Hint>路径与文本暂时还无法计算包围盒，改不了位置和尺寸。</Hint>
          ) : null}
        </Section>
      )}

      {showFill ? (
        <Section title={gradient ? '填充 · 渐变' : '填充'}>
          {gradient ? (
            <GradientEditor
              spec={gradient}
              onChange={changeGradient}
              onEditStart={beginColorSession}
              onEditEnd={endColorSession}
              onRemove={removeGradient}
            />
          ) : (
            <>
              <ColorField
                label="填充"
                value={fill}
                onCommit={(value) => commitAttrs({ fill: value })}
                onEditStart={beginColorSession}
                onEditEnd={endColorSession}
              />
              <button type="button" onClick={addGradient} className={ADD_GRADIENT_CLASS}>
                渐变色…
              </button>
            </>
          )}
        </Section>
      ) : null}

      {showStroke ? (
        <Section title="描边">
          <ColorField
            label="描边"
            value={stroke}
            onCommit={(value) => commitAttrs({ stroke: value })}
            onEditStart={beginColorSession}
            onEditEnd={endColorSession}
          />
          <NumberField
            label="粗细"
            value={strokeWidth}
            min={0}
            step={0.5}
            onCommit={(value) => commitAttrs({ 'stroke-width': value })}
          />
        </Section>
      ) : null}

      {single?.type === 'rect' ? (
        <Section title="圆角">
          <NumberField
            label="圆角"
            // rx 缺省即 0；用 null 会被当成「多选值不一致」。
            value={attrNumber(single, 'rx') ?? 0}
            min={0}
            onCommit={setRoundness}
          />
        </Section>
      ) : null}

      <Section title="透明度">
        <NumberField
          label="不透明"
          value={opacity}
          min={0}
          max={1}
          step={0.1}
          onCommit={(value) => commitAttrs({ opacity: value })}
        />
      </Section>
    </div>
  )
}
