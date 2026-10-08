import { useEditorStore } from '@vectorhub/editor-core'
import type { VectorNode } from '@vectorhub/svg-model'

interface TreeRowProps {
  node: VectorNode
  depth: number
}

function TreeRow({ node, depth }: TreeRowProps) {
  const selected = useEditorStore((state) => state.selection.includes(node.id))
  const select = useEditorStore((state) => state.select)
  const toggleSelect = useEditorStore((state) => state.toggleSelect)

  return (
    <li>
      <button
        type="button"
        onClick={(event) => (event.shiftKey ? toggleSelect(node.id) : select([node.id]))}
        style={{ paddingLeft: 8 + depth * 12 }}
        className={`flex w-full items-center gap-2 rounded py-1 pr-2 text-left ${
          selected ? 'bg-sky-600/20 text-sky-200' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        <span>&lt;{node.type}&gt;</span>
        <span className="ml-auto truncate text-[10px] text-slate-500">{node.id}</span>
      </button>
      {node.children?.length ? (
        <ul>
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function StructureTree() {
  const root = useEditorStore((state) => state.document.root)

  if (root.length === 0) {
    return <p className="text-xs text-slate-500">暂无节点，从画布左上角插入一个形状。</p>
  }

  return (
    <ul className="space-y-0.5 font-mono text-xs">
      {root.map((node) => (
        <TreeRow key={node.id} node={node} depth={0} />
      ))}
    </ul>
  )
}
