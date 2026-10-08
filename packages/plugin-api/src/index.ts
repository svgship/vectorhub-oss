/**
 * 插件 API 草案（PRD §11）。v0.1 不实现插件系统，仅冻结接口形状，v0.2 开放。
 */

import type { VectorDocument, VectorNode } from '@vectorhub/svg-model'

export interface VectorHubPlugin {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  activate(ctx: PluginContext): void | Promise<void>
  deactivate?(): void | Promise<void>
}

export interface PluginContext {
  commands: CommandRegistry
  toolbar: ToolbarRegistry
  panels: PanelRegistry
  exporters: ExporterRegistry
  shapes: ShapeRegistry
  document: DocumentAPI
  ui: UIRegistry
  storage: PluginStorage
}

export interface CommandContext {
  document: VectorDocument
  selection: readonly string[]
}

export interface Command {
  id: string
  title: string
  run: (ctx: CommandContext) => void | Promise<void>
  shortcut?: string
}

export interface CommandRegistry {
  register(command: Command): void
}

export interface ToolbarRegistry {
  register(item: { id: string; title: string; icon?: string }): void
}

export interface PanelRegistry {
  register(panel: { id: string; title: string; mount: (host: HTMLElement) => void }): void
}

export interface Exporter {
  id: string
  label: string
  language: string
  generate: (doc: VectorDocument, options?: Record<string, unknown>) => string
}

export interface ExporterRegistry {
  register(exporter: Exporter): void
}

export interface ShapeDefinition {
  type: string
  label: string
  icon?: string
  create: (props?: Record<string, unknown>) => VectorNode
}

export interface ShapeRegistry {
  register(shape: ShapeDefinition): void
}

export interface DocumentAPI {
  get(): VectorDocument
  replace(next: VectorDocument): void
  on(event: 'change', listener: (doc: VectorDocument) => void): () => void
}

export interface UIRegistry {
  notify(message: string, options?: { level?: 'info' | 'success' | 'warn' | 'error' }): void
}

export interface PluginStorage {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * 插件安全原则（PRD §11）：
 * - 必须声明权限；
 * - 默认沙箱运行；
 * - 访问文档、存储、网络需用户授权。
 */
export type PluginPermission = 'document:read' | 'document:write' | 'storage' | 'network' | 'ui'
