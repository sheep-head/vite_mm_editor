/** 地图事件超链接：$events.ref(n) → 固定引用 Map015 上 id=n 的事件 */

import DataManager from '@/utils/DataManager'

export const REF_TEMPLATE_MAP_ID = 15

const REF_RE = /^\$events\.ref\((\d+)\)\s*$/

/**
 * @param {object|null} event
 * @returns {number|null} 引用的事件 id
 */
export function parseEventRef(event) {
  if (!event || !Array.isArray(event.pages) || event.pages.length !== 1) return null
  const page = event.pages[0]
  if (!page || !Array.isArray(page.list)) return null
  const comments = []
  for (const cmd of page.list) {
    if (!cmd) continue
    if (cmd.code === 0) continue
    if (cmd.code === 108 || cmd.code === 408) {
      comments.push(String((cmd.parameters && cmd.parameters[0]) || ''))
      continue
    }
    return null
  }
  const text = comments.join('').trim()
  const m = text.match(REF_RE)
  if (!m) return null
  return parseInt(m[1], 10)
}

export function isEventRef(event) {
  return parseEventRef(event) != null
}

/** 从 Map015 读取被引用的模板事件（深拷贝） */
export function loadTemplateEvent(refId) {
  if (!refId) return null
  const fileName = `Map${String(REF_TEMPLATE_MAP_ID).padStart(3, '0')}`
  const data = DataManager.$loadDataSync(fileName, false, false)
  if (!data || !Array.isArray(data.events)) return null
  const ev = data.events.find((e) => e && e.id === refId)
  return ev ? JSON.parse(JSON.stringify(ev)) : null
}
