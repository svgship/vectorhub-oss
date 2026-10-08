/**
 * 画布视图变换。世界坐标 = 文档坐标（viewBox 坐标系），屏幕坐标 = 画布容器内像素。
 */

import type { Point, Rect } from '@vectorhub/svg-model'

export interface Viewport {
  zoom: number
  /** 屏幕坐标下的平移量（像素）。 */
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** PRD §7.1：缩放范围 10%–3200%。 */
export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 32

/** 单次滚轮 / 按钮缩放的倍率。 */
export const ZOOM_FACTOR = 1.1

export const DEFAULT_VIEWPORT: Viewport = { zoom: 1, x: 0, y: 0 }

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

/** 世界坐标 → 屏幕坐标。 */
export function worldToScreen(viewport: Viewport, point: Point): Point {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  }
}

/** 屏幕坐标 → 世界坐标。 */
export function screenToWorld(viewport: Viewport, point: Point): Point {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  }
}

/** 以 anchor（屏幕坐标）为锚点缩放，锚点下的世界坐标保持不动。 */
export function zoomAtPoint(viewport: Viewport, nextZoom: number, anchor: Point): Viewport {
  const zoom = clampZoom(nextZoom)
  const world = screenToWorld(viewport, anchor)
  return {
    zoom,
    x: anchor.x - world.x * zoom,
    y: anchor.y - world.y * zoom,
  }
}

export function zoomByFactor(viewport: Viewport, factor: number, anchor: Point): Viewport {
  return zoomAtPoint(viewport, viewport.zoom * factor, anchor)
}

/** 以容器中心为锚点设置缩放。 */
export function zoomCentered(viewport: Viewport, nextZoom: number, container: Size): Viewport {
  return zoomAtPoint(viewport, nextZoom, { x: container.width / 2, y: container.height / 2 })
}

/** 把内容按容器尺寸居中，并缩放到可见区域内（含内边距）。 */
export function fitViewport(content: Rect, container: Size, padding = 48): Viewport {
  const availableWidth = Math.max(container.width - padding * 2, 1)
  const availableHeight = Math.max(container.height - padding * 2, 1)
  const zoom = clampZoom(
    Math.min(
      availableWidth / Math.max(content.width, 1),
      availableHeight / Math.max(content.height, 1),
    ),
  )
  return {
    zoom,
    x: (container.width - content.width * zoom) / 2 - content.x * zoom,
    y: (container.height - content.height * zoom) / 2 - content.y * zoom,
  }
}
