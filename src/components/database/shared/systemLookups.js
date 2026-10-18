/**
 * System.json 下拉与 ID/名称格式化
 */
import DataManager from '@/utils/DataManager'

export function loadSystem() {
  try {
    return DataManager.$loadDataSync('System', false, false) || {}
  } catch (e) {
    return {}
  }
}

export function typeList(key) {
  const sys = loadSystem()
  const arr = sys[key]
  return Array.isArray(arr) ? arr : []
}

export function paramLabels() {
  const sys = loadSystem()
  const p = sys.terms && sys.terms.params
  if (Array.isArray(p) && p.length >= 8) return p.slice(0, 8)
  return ['最大生命值', '最大魔法值', '攻击力', '防御力', '魔法攻击', '魔法防御', '敏捷', '幸运']
}

export function formatTypeName(list, id, emptyLabel = '无') {
  const n = Number(id) || 0
  if (n <= 0) return emptyLabel
  if (!Array.isArray(list)) return String(n)
  const name = list[n]
  if (name == null || name === '') return String(n)
  return `${String(n).padStart(4, '0')} ${name}`
}

export function typeOptions(list, { includeNone = true, noneLabel = '无' } = {}) {
  const out = []
  if (includeNone) out.push({ value: 0, label: noneLabel })
  if (!Array.isArray(list)) return out
  for (let i = 1; i < list.length; i++) {
    const name = list[i]
    if (name == null) continue
    out.push({ value: i, label: name ? `${String(i).padStart(4, '0')} ${name}` : String(i) })
  }
  return out
}

export function loadDataArray(fileName) {
  try {
    const raw = DataManager.$loadDataSync(fileName, false, false)
    return Array.isArray(raw) ? raw : []
  } catch (e) {
    return []
  }
}

export function formatRecordName(fileName, id, emptyLabel = '无') {
  const n = Number(id) || 0
  if (n <= 0) return emptyLabel
  const arr = loadDataArray(fileName)
  const rec = arr[n]
  if (!rec) return String(n)
  return `${String(n).padStart(4, '0')} ${rec.name || ''}`
}

export function equipSlotCount() {
  const types = typeList('equipTypes')
  // index 0 unused; slots = length - 1
  return Math.max(0, (types.length || 1) - 1)
}

export function equipTypeLabel(slotIndex) {
  // equips[i] corresponds to equipTypes[i+1] in MZ (etypeId)
  const types = typeList('equipTypes')
  const etypeId = slotIndex + 1
  return types[etypeId] || `装备${etypeId}`
}

/** 武器槽 etypeId===1，其余按防具选 */
export function isWeaponEquipSlot(slotIndex) {
  return slotIndex === 0
}
