/**
 * 编辑器会话状态：本地项目、保存状态、只读分享模式。
 *
 * 与 `@vectorhub/editor-core` 分开是有意的——文档本身属于编辑器核心，
 * 而「存到哪个项目、存成功没有、是不是只读分享」是应用层的事。
 */

import { create } from 'zustand'
import type { ProjectRecord } from '@vectorhub/local-store'

/** PRD §5.3：保存中… / 已保存 / 离线草稿 / 保存失败。 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface SessionState {
  /** 当前本地项目；只读分享模式下为 null（还没有落到本地）。 */
  project: ProjectRecord | null
  saveStatus: SaveStatus
  /** 通过分享链接打开的只读文档。 */
  readOnly: boolean
  setProject: (project: ProjectRecord | null) => void
  patchProject: (patch: Partial<ProjectRecord>) => void
  setSaveStatus: (status: SaveStatus) => void
  setReadOnly: (readOnly: boolean) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  project: null,
  saveStatus: 'idle',
  readOnly: false,

  setProject: (project) => set({ project }),

  patchProject: (patch) =>
    set((state) => (state.project ? { project: { ...state.project, ...patch } } : state)),

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  setReadOnly: (readOnly) => set({ readOnly }),
}))
