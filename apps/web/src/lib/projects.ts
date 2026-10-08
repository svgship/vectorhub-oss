/**
 * 本地项目的持久化编排：IndexedDB 读写 + 会话/文档状态更新。
 *
 * v0.1 一个项目对应一份文档，所以文档记录直接以项目 id 作为主键；
 * PRD §10.1 的 Project → Document 一对多等到多页/多场景时再展开。
 */

import { useEditorStore } from '@vectorhub/editor-core'
import {
  listProjects,
  loadDocument,
  putProject,
  saveDocument,
  type ProjectRecord,
} from '@vectorhub/local-store'
import { createId, type VectorDocument } from '@vectorhub/svg-model'
import { useSessionStore } from './session-store'
import { clearShareHash } from './share'

/** 首次访问时的草稿用固定 id，保证引导逻辑幂等（StrictMode 会跑两遍）。 */
export const DRAFT_PROJECT_ID = 'draft'
export const DEFAULT_PROJECT_NAME = '未命名项目'

function newProject(name: string): ProjectRecord {
  const now = Date.now()
  return { id: createId('project'), name, createdAt: now, updatedAt: now }
}

/**
 * 打开最近编辑的项目；一个都没有时创建一个固定 id 的草稿。
 * 重复调用是安全的：草稿用的是同一个 id，写入是幂等的。
 */
export async function openOrCreateProject(): Promise<ProjectRecord> {
  const [latest] = await listProjects()
  if (latest) return latest

  const now = Date.now()
  const draft: ProjectRecord = {
    id: DRAFT_PROJECT_ID,
    name: DEFAULT_PROJECT_NAME,
    createdAt: now,
    updatedAt: now,
  }
  await putProject(draft)
  return draft
}

export async function loadProjectDocument(id: string): Promise<VectorDocument | null> {
  const record = await loadDocument(id)
  return record?.content ?? null
}

/** 写入文档并顺带刷新项目的 updatedAt，供「最近编辑」排序使用。 */
export async function persistDocument(
  project: ProjectRecord,
  doc: VectorDocument,
): Promise<ProjectRecord> {
  const updatedAt = Date.now()
  const next: ProjectRecord = { ...project, updatedAt }
  await saveDocument({
    id: project.id,
    projectId: project.id,
    version: doc.version,
    updatedAt,
    content: doc,
  })
  await putProject(next)
  return next
}

export async function renameProject(project: ProjectRecord, name: string): Promise<ProjectRecord> {
  const next: ProjectRecord = { ...project, name: name.trim() || DEFAULT_PROJECT_NAME }
  await putProject(next)
  return next
}

/** 只读分享文档 → 一份新的本地项目，之后可编辑、可自动保存（PRD §6.3）。 */
export async function adoptSharedDocument(): Promise<ProjectRecord> {
  const project = newProject('分享副本')
  const doc = useEditorStore.getState().document
  await persistDocument(project, doc)

  const session = useSessionStore.getState()
  session.setProject(project)
  session.setReadOnly(false)
  session.setSaveStatus('saved')
  clearShareHash()
  return project
}
