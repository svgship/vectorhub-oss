/** 数值输入的最小工具集，属性面板与状态栏共用。 */

/** 把数值收进 [min, max]；任一端缺省则该侧不设限。 */
export function clamp(value: number, min?: number, max?: number): number {
  let result = value
  if (min !== undefined && result < min) result = min
  if (max !== undefined && result > max) result = max
  return result
}

/**
 * 显示用数字：最多两位小数并去掉尾随的 0。
 * 拖拽缩放会产生 16.666666 这种值，直接显示会把输入框撑爆。
 */
export function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)))
}
