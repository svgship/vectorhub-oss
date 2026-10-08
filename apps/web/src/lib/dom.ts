export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/** 会把 Space 用于「激活」自身的元素：按钮、折叠块、ARIA 按钮类控件。 */
const SPACE_ACTIVATED_SELECTOR =
  'button, summary, [role="button"], [role="menuitem"], [role="tab"], [role="option"]'

/**
 * Space 是否已被目标元素占用。聚焦在这些控件上时按空格是在激活控件，
 * 画布不应把它抢成「按住空格平移」，否则键盘操作会被无声吞掉。
 */
export function isSpaceActivatedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (isEditableTarget(target)) return true
  return target.closest(SPACE_ACTIVATED_SELECTOR) !== null
}
