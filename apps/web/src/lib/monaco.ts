/**
 * Monaco 的本地打包与 Worker 环境。
 *
 * `@monaco-editor/react` 默认从 CDN 拉 monaco，这既违反「本地优先」原则，也会让
 * PWA 离线打开时代码面板空白（PRD §7.8）。这里改为消费 node_modules 里的 monaco：
 * 用 `edcore.main` 拿到完整的编辑器能力（查找、折叠、主题等），但只注册代码面板
 * 需要的高亮贡献（xml / html / typescript），不引入 json / css / html / ts 的语言
 * 服务，避免只读预览里因为缺少类型而跳出一堆假报错。
 */
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/editor/edcore.main'
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution'
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

loader.config({ monaco })

window.MonacoEnvironment = {
  getWorker: () => new editorWorker(),
}

/** 导出目标的语言标识 → Monaco 语言 id。Vue 单文件组件按 HTML 高亮。 */
const MONACO_LANGUAGE: Record<string, string> = {
  xml: 'xml',
  tsx: 'typescript',
  vue: 'html',
  html: 'html',
}

export function monacoLanguageFor(language: string): string {
  return MONACO_LANGUAGE[language] ?? 'plaintext'
}
