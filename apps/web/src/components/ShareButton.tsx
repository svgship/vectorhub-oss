import { useState } from 'react'
import { useEditorStore } from '@vectorhub/editor-core'
import { copyText } from '../lib/clipboard'
import { isShareUrlTooLong, shareUrlFor } from '../lib/share'
import { toast } from '../lib/toast-store'

/** PRD §7.5：把整份文档编码进 URL，复制给别人即可打开只读副本，全程不经过服务器。 */
export function ShareButton() {
  const [busy, setBusy] = useState(false)

  const handleShare = async () => {
    setBusy(true)
    try {
      // 不订阅文档：分享是点击时才发生的动作，没必要跟着拖拽每帧重渲染。
      const url = shareUrlFor(useEditorStore.getState().document)
      if (isShareUrlTooLong(url)) {
        toast.error('文档太大，分享链接超出浏览器长度上限，请改用「导出」下载文件发送。')
        return
      }
      if (await copyText(url)) {
        toast.success('分享链接已复制，对方打开就是只读副本。')
      } else {
        toast.error('复制失败，请检查浏览器的剪贴板权限。')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={busy}
      title="复制只读分享链接"
      className="rounded px-2 py-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent"
    >
      分享
    </button>
  )
}
