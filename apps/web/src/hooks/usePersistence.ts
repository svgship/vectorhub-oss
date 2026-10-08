import { useEffect, useState } from 'react'
import { useEditorStore } from '@vectorhub/editor-core'
import type { ProjectRecord } from '@vectorhub/local-store'
import type { VectorDocument } from '@vectorhub/svg-model'
import { loadProjectDocument, openOrCreateProject, persistDocument } from '../lib/projects'
import { clearShareHash, hasShareHash, readSharedDocument } from '../lib/share'
import { useSessionStore } from '../lib/session-store'
import { toast } from '../lib/toast-store'

/** 自动保存延迟，PRD §7.4 要求编辑后 1s 内落盘。 */
const AUTOSAVE_DELAY = 800

/**
 * 本地优先的引导与自动保存（PRD §4.2 / §7.4）。
 *
 * 引导顺序：地址栏有分享文档 → 只读打开，不碰本地项目；
 * 否则打开最近编辑的项目，没有就新建草稿。
 * 之后每次文档变化都延迟写成一次 IndexedDB 事务。
 */
export function usePersistence(): void {
  const [ready, setReady] = useState(false)
  const readOnly = useSessionStore((state) => state.readOnly)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const session = useSessionStore.getState()

      const shared = readSharedDocument()
      if (shared) {
        useEditorStore.getState().replaceDocument(shared, { history: false })
        session.setReadOnly(true)
        if (!cancelled) setReady(true)
        return
      }

      // 带着 #share= 却解不出来：先清掉，否则刷新会一次次回到一个打不开的链接。
      if (hasShareHash()) {
        clearShareHash()
        toast.error('分享链接已损坏或不完整，已为你打开本地草稿。')
      }

      try {
        const project = await openOrCreateProject()
        const saved = await loadProjectDocument(project.id)
        if (cancelled) return

        if (saved) useEditorStore.getState().replaceDocument(saved, { history: false })
        session.setProject(project)
        session.setSaveStatus(saved ? 'saved' : 'idle')
      } catch {
        if (cancelled) return
        // PRD §8.2：保存不可用时保留内存草稿并如实告知。
        session.setSaveStatus('error')
        toast.error('本地存储不可用，改动只保留在当前页面。')
      }
      if (!cancelled) setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || readOnly) return

    const session = useSessionStore.getState
    let timer: number | null = null
    let pending: VectorDocument | null = null

    const save = async (project: ProjectRecord, doc: VectorDocument) => {
      session().setSaveStatus('saving')
      try {
        session().setProject(await persistDocument(project, doc))
        session().setSaveStatus('saved')
      } catch {
        session().setSaveStatus('error')
      }
    }

    const flush = () => {
      if (timer !== null) window.clearTimeout(timer)
      timer = null
      const doc = pending
      pending = null
      const project = session().project
      if (!project || !doc) return
      void save(project, doc)
    }

    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (state.document === prev.document) return
      pending = state.document
      session().setSaveStatus('saving')
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(flush, AUTOSAVE_DELAY)
    })

    // 关标签页 / 刷新前把待写的改动立刻落盘，别丢掉最后不到 1s 的编辑。
    const onPageHide = () => {
      if (pending) flush()
    }
    window.addEventListener('pagehide', onPageHide)

    return () => {
      unsubscribe()
      window.removeEventListener('pagehide', onPageHide)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [ready, readOnly])
}
