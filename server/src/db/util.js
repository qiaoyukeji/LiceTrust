/** 时间工具（无 SQL） */

/** 当前时间字符串 'YYYY-MM-DD HH:mm:ss' */
export function nowStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
  )
}

/** 当前日期字符串 'YYYY-MM-DD' */
export function todayStr() {
  return nowStr().slice(0, 10)
}

/** N 天前的日期字符串 */
export function daysAgoStr(n) {
  const d = new Date(Date.now() - n * 86400000)
  const p = (x) => String(x).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

/** N 天后的日期字符串 */
export function daysLaterStr(n) {
  const d = new Date(Date.now() + n * 86400000)
  const p = (x) => String(x).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
