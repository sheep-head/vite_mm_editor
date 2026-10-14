/** 按地图分桶的撤销/重做栈 */

const MAX = 50
const buckets = new Map()

function bucket(mapId) {
  const id = mapId || 0
  if (!buckets.has(id)) {
    buckets.set(id, { undo: [], redo: [] })
  }
  return buckets.get(id)
}

export function pushHistory(mapId, entry) {
  const b = bucket(mapId)
  b.undo.push(entry)
  if (b.undo.length > MAX) b.undo.shift()
  b.redo.length = 0
}

export function canUndo(mapId) {
  return bucket(mapId).undo.length > 0
}

export function canRedo(mapId) {
  return bucket(mapId).redo.length > 0
}

export function undo(mapId) {
  const b = bucket(mapId)
  const entry = b.undo.pop()
  if (!entry) return null
  b.redo.push(entry)
  return entry
}

export function redo(mapId) {
  const b = bucket(mapId)
  const entry = b.redo.pop()
  if (!entry) return null
  b.undo.push(entry)
  return entry
}

export function clearHistory(mapId) {
  if (mapId == null) {
    buckets.clear()
    return
  }
  buckets.delete(mapId)
}
