/**
 * 分享链接：文档压缩进 URL hash，不经过服务器（PRD §7.5）。
 */

import type { VectorDocument } from '@vectorhub/svg-model'
import {
  SHARE_HASH_KEY,
  buildShareUrl,
  isShareUrlTooLong,
  parseShareHash,
} from '@vectorhub/share-url'

/** 当前页面的地址（去掉 hash），作为分享链接的基址。 */
export function currentBaseUrl(): string {
  return window.location.href.split('#')[0] ?? window.location.origin
}

export function shareUrlFor(doc: VectorDocument): string {
  return buildShareUrl(currentBaseUrl(), doc)
}

export { isShareUrlTooLong }

/** 地址栏里是否带着分享参数（哪怕内容解不出来）。 */
export function hasShareHash(): boolean {
  return window.location.hash.startsWith(`#${SHARE_HASH_KEY}=`)
}

/** 从地址栏还原分享文档；没有分享参数或解析失败时返回 null。 */
export function readSharedDocument(): VectorDocument | null {
  if (!hasShareHash()) return null
  return parseShareHash(window.location.hash)
}

/** 离开只读分享模式后把 `#share=…` 从地址栏抹掉，刷新时不再回到只读。 */
export function clearShareHash(): void {
  window.history.replaceState(null, '', currentBaseUrl())
}
