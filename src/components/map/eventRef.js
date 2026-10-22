/** 地图事件超链接：$events.ref(n) → 固定引用 Map015 上 id=n 的事件 */

import DataManager from '@/utils/DataManager'
import { createEmptyPage } from './eventDefaults'

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

export function buildEventRefComment(refId) {
  const n = Number(refId) || 0
  return `$events.ref(${n})`
}

/**
 * 将事件写成超链接桩：保留 id/x/y/name/note，单页仅含注释。
 * @returns {object} event
 */
export function applyEventRef(event, refId) {
  if (!event) return event
  const n = Number(refId) || 0
  const page = createEmptyPage()
  page.list = [
    { code: 108, indent: 0, parameters: [buildEventRefComment(n)] },
    { code: 0, indent: 0, parameters: [] },
  ]
  event.pages = [page]
  return event
}

/**
 * 取消超链接：清空为默认空页（去掉 $events.ref 注释）。
 * @returns {object} event
 */
export function clearEventRef(event) {
  if (!event) return event
  event.pages = [createEmptyPage()]
  return event
}

/** Map015 事件表缓存（只读引用，勿原地改） */
let _tplById = null

export function invalidateTemplateEventCache() {
  _tplById = null
}

function templateEventsById() {
  if (_tplById) return _tplById
  const fileName = `Map${String(REF_TEMPLATE_MAP_ID).padStart(3, '0')}`
  const data = DataManager.$loadDataSync(fileName, false, false)
  const map = Object.create(null)
  if (data && Array.isArray(data.events)) {
    data.events.forEach((ev) => {
      if (ev && ev.id) map[ev.id] = ev
    })
  }
  _tplById = map
  return map
}

/** 从 Map015 读取被引用的模板事件（深拷贝，给编辑器用） */
export function loadTemplateEvent(refId) {
  if (!refId) return null
  const ev = templateEventsById()[refId]
  return ev ? JSON.parse(JSON.stringify(ev)) : null
}

/** 只读取模板事件（绘制用，勿修改返回值） */
export function getTemplateEventCached(refId) {
  if (!refId) return null
  return templateEventsById()[refId] || null
}

/**
 * 地图/预览绘制用的事件页：开启「显示超链接事件图」时，超链接桩用 Map015 模板第一页。
 * @returns {object|null} page
 */
export function getEventDisplayPage(event, useHyperlinkImages) {
  if (!event) return null
  if (useHyperlinkImages) {
    const refId = parseEventRef(event)
    if (refId != null) {
      const tpl = getTemplateEventCached(refId)
      if (tpl && Array.isArray(tpl.pages) && tpl.pages[0]) return tpl.pages[0]
    }
  }
  return (event.pages && event.pages[0]) || null
}

/** Map015 上可供引用的事件列表 */
export function listTemplateEvents() {
  const byId = templateEventsById()
  const list = []
  Object.keys(byId).forEach((k) => {
    const ev = byId[k]
    if (!ev || !ev.id) return
    list.push({
      id: ev.id,
      name: ev.name || `EV${String(ev.id).padStart(3, '0')}`,
      x: ev.x || 0,
      y: ev.y || 0,
    })
  })
  list.sort((a, b) => a.id - b.id)
  return list
}
