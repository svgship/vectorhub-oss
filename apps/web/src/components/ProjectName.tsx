import { useEffect, useRef, useState } from 'react'
import { renameProject } from '../lib/projects'
import { useSessionStore } from '../lib/session-store'

/** PRD §5.3：项目名可点击重命名。 */
export function ProjectName() {
  const project = useSessionStore((state) => state.project)
  const readOnly = useSessionStore((state) => state.readOnly)
  const setProject = useSessionStore((state) => state.setProject)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (readOnly || !project) {
    return <span className="text-sm text-slate-400">{project?.name ?? '分享文档'}</span>
  }

  const commit = async () => {
    setEditing(false)
    if (draft.trim() === project.name) return
    setProject(await renameProject(project, draft))
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void commit()
          if (event.key === 'Escape') setEditing(false)
        }}
        className="w-40 rounded border border-sky-600 bg-slate-900 px-1.5 py-0.5 text-sm text-white outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(project.name)
        setEditing(true)
      }}
      className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800"
      title="点击重命名"
    >
      {project.name} ▾
    </button>
  )
}
