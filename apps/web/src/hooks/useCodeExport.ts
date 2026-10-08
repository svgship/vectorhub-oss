import { useCallback, useDeferredValue, useMemo } from 'react'
import {
  exporters,
  getExporter,
  svgExporter,
  toComponentName,
  type ExportOptions,
  type Exporter,
} from '@vectorhub/codegen'
import { useEditorStore } from '@vectorhub/editor-core'

/** 某个导出目标在某份配置下的产物。 */
export interface CodeArtifact {
  exporter: Exporter
  code: string
  fileName: string
}

export interface CodeExportBase {
  /** 全部导出目标。 */
  targets: readonly Exporter[]
  /** 当前目标。 */
  exporter: Exporter
  options: ExportOptions
  /** 切换目标，并把 currentColor 复位到该目标的默认值。 */
  setTarget: (id: string) => void
  setOptions: (patch: Partial<ExportOptions>) => void
  /** 按目标生成一次，使用该目标的默认 currentColor；未知 id 返回 null。 */
  generateFor: (id: string) => CodeArtifact | null
}

export interface CodeExportApi extends CodeExportBase {
  /** 当前目标的产物，用于代码面板展示。 */
  code: string
  fileName: string
}

function fileNameFor(exporter: Exporter, options: ExportOptions): string {
  const base = exporter.usesComponentName
    ? toComponentName(options.componentName ?? '')
    : 'vectorhub'
  return `${base}.${exporter.extension}`
}

/**
 * 导出目标的读取与动作。
 * 不订阅文档，生成发生在调用时——这样顶部「导出」菜单不会随拖拽每帧重算。
 */
export function useCodeExportActions(): CodeExportBase {
  const codeTarget = useEditorStore((state) => state.codeTarget)
  const codeOptions = useEditorStore((state) => state.codeOptions)
  const setCodeTarget = useEditorStore((state) => state.setCodeTarget)
  const setCodeOptions = useEditorStore((state) => state.setCodeOptions)

  const exporter = getExporter(codeTarget) ?? svgExporter

  const setTarget = useCallback(
    (id: string) => {
      const next = getExporter(id)
      if (!next) return
      setCodeTarget(id)
      // 切换目标时把 currentColor 拉回该目标的默认值：组件代码默认开，
      // 独立 SVG / HTML 文件默认关（单开会被渲染成黑色）。
      setCodeOptions({ currentColor: next.currentColorByDefault })
    },
    [setCodeTarget, setCodeOptions],
  )

  const generateFor = useCallback(
    (id: string): CodeArtifact | null => {
      const target = getExporter(id)
      if (!target) return null
      const doc = useEditorStore.getState().document
      const options = { ...codeOptions, currentColor: target.currentColorByDefault }
      return {
        exporter: target,
        code: target.generate(doc, options),
        fileName: fileNameFor(target, options),
      }
    },
    [codeOptions],
  )

  return {
    targets: exporters,
    exporter,
    options: codeOptions,
    setTarget,
    setOptions: setCodeOptions,
    generateFor,
  }
}

/** 代码面板用：额外订阅文档并生成当前目标的代码。 */
export function useCodeExport(): CodeExportApi {
  const base = useCodeExportActions()
  const doc = useEditorStore((state) => state.document)

  // 拖拽时文档每帧都在变，代码预览不紧急，交给 React 降级渲染，别抢画布的帧。
  const deferredDoc = useDeferredValue(doc)
  const code = useMemo(
    () => base.exporter.generate(deferredDoc, base.options),
    [base.exporter, base.options, deferredDoc],
  )
  const fileName = useMemo(
    () => fileNameFor(base.exporter, base.options),
    [base.exporter, base.options],
  )

  return { ...base, code, fileName }
}
