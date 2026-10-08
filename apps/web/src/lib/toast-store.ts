/**
 * 轻量全局提示（toast）：分享、复制、保存失败等一次性反馈。
 *
 * 放在 store 里而不是组件局部状态，是为了让事件处理器（分享按钮、持久化引导）
 * 不必把提示状态层层往上抬。
 */

import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
  /** 自动消失时间（毫秒）；0 表示只能手动关闭。 */
  duration: number
}

interface ToastState {
  toasts: readonly Toast[]
  push: (message: string, tone?: ToastTone, duration?: number) => number
  dismiss: (id: number) => void
}

const TONE_DURATION: Record<ToastTone, number> = {
  info: 3200,
  success: 3200,
  // 失败提示留久一点，给用户时间读完并决定怎么办。
  error: 6000,
}

let nextId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (message, tone = 'info', duration = TONE_DURATION[tone]) => {
    let id = 0
    set((state) => {
      // 同样的提示已经在屏幕上就不再叠一条：StrictMode 会把引导跑两遍，
      // 重复的失败提示比一次不提示更让人困惑。
      const existing = state.toasts.find((item) => item.message === message && item.tone === tone)
      if (existing) {
        id = existing.id
        return state
      }
      nextId += 1
      id = nextId
      return { toasts: [...state.toasts, { id, message, tone, duration }] }
    })
    return id
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}))

/** 命令式入口，事件处理器里直接用，不必先 subscribe。 */
export const toast = {
  info: (message: string) => useToastStore.getState().push(message, 'info'),
  success: (message: string) => useToastStore.getState().push(message, 'success'),
  error: (message: string) => useToastStore.getState().push(message, 'error'),
}
