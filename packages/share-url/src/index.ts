/**
 * URL 分享：把文档压缩编码进 URL hash，数据不经过服务器（PRD §7.5）。
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { VectorDocument } from '@vectorhub/svg-model'

export const SHARE_HASH_KEY = 'share'

/** 超过该长度时提示用户改用文件分享。 */
export const MAX_SHARE_URL_LENGTH = 8000

export function encodeDocument(doc: VectorDocument): string {
  return compressToEncodedURIComponent(JSON.stringify(doc))
}

export function decodeDocument(encoded: string): VectorDocument | null {
  const json = decompressFromEncodedURIComponent(encoded)
  if (!json) return null
  try {
    return JSON.parse(json) as VectorDocument
  } catch {
    return null
  }
}

export function buildShareUrl(baseUrl: string, doc: VectorDocument): string {
  const url = new URL(baseUrl)
  url.hash = `${SHARE_HASH_KEY}=${encodeDocument(doc)}`
  return url.toString()
}

/** 从 `location.hash` 还原只读文档；无法解析时返回 null。 */
export function parseShareHash(hash: string): VectorDocument | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const prefix = `${SHARE_HASH_KEY}=`
  const value = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw
  return value ? decodeDocument(value) : null
}

export function isShareUrlTooLong(url: string): boolean {
  return url.length > MAX_SHARE_URL_LENGTH
}
