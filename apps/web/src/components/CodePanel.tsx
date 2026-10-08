import { Editor, type BeforeMount, type EditorProps } from '@monaco-editor/react'
import { useClipboard } from '../hooks/useClipboard'
import { useCodeExport } from '../hooks/useCodeExport'
import { downloadText } from '../lib/download'
import { monacoLanguageFor } from '../lib/monaco'

const THEME_NAME = 'vectorhub'

/** 只读预览：关掉缩略图、折叠、右键菜单这些编辑期功能，把横向空间留给代码。 */
const EDITOR_OPTIONS: NonNullable<EditorProps['options']> = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 12,
  lineNumbers: 'on',
  renderLineHighlight: 'none',
  folding: false,
  glyphMargin: false,
  contextmenu: false,
  padding: { top: 8, bottom: 8 },
  tabSize: 2,
  wordWrap: 'off',
  automaticLayout: true,
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
}

/** 编辑器背景对齐画布的 slate-950，避免右侧栏出现一块突兀的底色。 */
const handleBeforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#020617',
      'editorGutter.background': '#020617',
    },
  })
}

const TAB_CLASS = 'rounded px-2 py-0.5 text-[11px] transition-colors'
const FIELD_CLASS =
  'rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200 outline-none focus:border-sky-500'

export function CodePanel() {
  const { targets, exporter, code, fileName, options, setTarget, setOptions } = useCodeExport()
  const { copied, copy } = useClipboard()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap gap-1 border-b border-slate-800 px-2 py-1.5">
        {targets.map((target) => (
          <button
            key={target.id}
            type="button"
            onClick={() => setTarget(target.id)}
            className={`${TAB_CLASS} ${
              target.id === exporter.id
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {target.label}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-800 px-2 py-1.5 text-[11px] text-slate-400">
        {exporter.usesComponentName ? (
          <label className="flex items-center gap-1">
            组件名
            <input
              value={options.componentName ?? ''}
              onChange={(event) => setOptions({ componentName: event.target.value })}
              spellCheck={false}
              className={`w-24 ${FIELD_CLASS}`}
            />
          </label>
        ) : null}

        <label
          className="flex cursor-pointer items-center gap-1"
          title="导出时把颜色换成 currentColor"
        >
          <input
            type="checkbox"
            checked={options.currentColor ?? false}
            onChange={(event) => setOptions({ currentColor: event.target.checked })}
            className="accent-sky-500"
          />
          currentColor
        </label>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          language={monacoLanguageFor(exporter.language)}
          value={code}
          theme={THEME_NAME}
          beforeMount={handleBeforeMount}
          options={EDITOR_OPTIONS}
          loading={<span className="text-xs text-slate-500">加载编辑器…</span>}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-slate-800 px-2 py-1.5 text-[11px]">
        <span className="truncate text-slate-500" title={fileName}>
          {fileName}
        </span>
        <button
          type="button"
          onClick={() => {
            void copy(code)
          }}
          className="ml-auto rounded bg-sky-600 px-2 py-1 text-white hover:bg-sky-500"
        >
          {copied ? '已复制' : '复制'}
        </button>
        <button
          type="button"
          onClick={() => downloadText(fileName, code, exporter.mime)}
          className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
        >
          下载
        </button>
      </div>
    </div>
  )
}
