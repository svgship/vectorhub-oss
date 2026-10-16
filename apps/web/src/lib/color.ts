/** 颜色字符串的小工具，颜色输入控件与渐变编辑器共用。 */

const HEX6 = /^#[0-9a-f]{6}$/i
const HEX3 = /^#[0-9a-f]{3}$/i

/** 是否为可取色的纯色值。 */
export function isHexColor(value: string): boolean {
  return HEX6.test(value) || HEX3.test(value)
}

/** 收敛成 `<input type="color">` 能接受的 6 位十六进制。 */
export function toHexColor(value: string, fallback = '#38bdf8'): string {
  if (HEX6.test(value)) return value.toLowerCase()
  if (HEX3.test(value)) {
    const [, r = '0', g = '0', b = '0'] = value.toLowerCase()
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return fallback
}
