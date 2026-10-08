/**
 * 本地优先存储：IndexedDB 保存项目、文档与设置（PRD §7.4）。
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { VectorDocument } from '@vectorhub/svg-model'

export const DB_NAME = 'vectorhub'
export const DB_VERSION = 1

export interface ProjectRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  thumbnail?: string
}

export interface DocumentRecord {
  id: string
  projectId: string
  version: string
  updatedAt: number
  content: VectorDocument
}

export interface SettingRecord {
  key: string
  value: unknown
}

interface VectorHubDB extends DBSchema {
  projects: {
    key: string
    value: ProjectRecord
    indexes: { updatedAt: number }
  }
  documents: {
    key: string
    value: DocumentRecord
    indexes: { projectId: string }
  }
  settings: {
    key: string
    value: SettingRecord
  }
}

let dbPromise: Promise<IDBPDatabase<VectorHubDB>> | undefined

export function getDb(): Promise<IDBPDatabase<VectorHubDB>> {
  dbPromise ??= openDB<VectorHubDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const projects = db.createObjectStore('projects', { keyPath: 'id' })
      projects.createIndex('updatedAt', 'updatedAt')
      const documents = db.createObjectStore('documents', { keyPath: 'id' })
      documents.createIndex('projectId', 'projectId')
      db.createObjectStore('settings', { keyPath: 'key' })
    },
  })
  return dbPromise
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const db = await getDb()
  return db.getAllFromIndex('projects', 'updatedAt')
}

export async function putProject(project: ProjectRecord): Promise<void> {
  const db = await getDb()
  await db.put('projects', project)
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb()
  const documents = await db.getAllFromIndex('documents', 'projectId', id)
  const tx = db.transaction(['projects', 'documents'], 'readwrite')
  await Promise.all([
    tx.objectStore('projects').delete(id),
    ...documents.map((record) => tx.objectStore('documents').delete(record.id)),
    tx.done,
  ])
}

export async function saveDocument(record: DocumentRecord): Promise<void> {
  const db = await getDb()
  await db.put('documents', record)
}

export async function loadDocument(id: string): Promise<DocumentRecord | undefined> {
  const db = await getDb()
  return db.get('documents', id)
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDb()
  const record = await db.get('settings', key)
  return record?.value as T | undefined
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDb()
  await db.put('settings', { key, value } satisfies SettingRecord)
}
