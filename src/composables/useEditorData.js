/**
 * 编辑器数据存读（仅数据层）
 *
 * 对外只暴露 fileName + 可选 mergeField。
 * 若磁盘上是「以 id 为 key 的对象表」，读时转成数组、写时再转回（内部自动识别，无外部参数）。
 */
import DataManager from '@/utils/DataManager'

function isRecordMap(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const values = Object.values(data)
  if (!values.length) return false
  // 值全是普通对象 → 视为 id→条目 表（区别于 Config 那种扁平配置对象）
  return values.every((v) => v && typeof v === 'object' && !Array.isArray(v))
}

function recordMapToArray(map) {
  return Object.keys(map).map((key) => {
    const item = map[key]
    if (item && typeof item === 'object') {
      item.id = key
    }
    return item
  })
}

function arrayToRecordMap(list) {
  const out = {}
  list.forEach((item) => {
    if (!item || item.id == null) return
    out[item.id] = item
  })
  return out
}

/**
 * 从旧 meta / exportOptions 解析出 useEditorData 参数（供 mixin 过渡）
 */
export function optionsFromMeta(meta = {}) {
  const o = meta.exportOptions || {}
  let fileName = meta.fileName
  let mergeField
  if (o.merge) {
    const parts = String(o.merge).split('.')
    if (parts.length === 2) {
      fileName = parts[0]
      mergeField = parts[1]
    }
  }
  return {
    fileName,
    mergeField,
    // 旧页显式写了 target:json 时，即使空对象也按对象表落盘
    preferRecordMap: o.target === 'json',
  }
}

/**
 * @param {{ fileName: string, mergeField?: string, preferRecordMap?: boolean }} options
 */
export function useEditorData(options = {}) {
  const { fileName, mergeField, preferRecordMap = false } = options
  if (!fileName) {
    throw new Error('useEditorData: fileName is required')
  }

  /** @type {boolean} 本次会话写回时是否用对象表 */
  let storeAsRecordMap = !!preferRecordMap || !!mergeField

  function readRaw() {
    if (mergeField) {
      const main = DataManager.$loadDataSync(fileName, false, false)
      if (!main || main[mergeField] == null) return null
      return main[mergeField]
    }
    return DataManager.$loadDataSync(fileName, false, false)
  }

  function load() {
    const raw = readRaw()
    if (raw == null) {
      // 无文件：有 mergeField / preferRecordMap 时按对象表新建
      storeAsRecordMap = !!preferRecordMap || !!mergeField
      return null
    }
    if (isRecordMap(raw)) {
      storeAsRecordMap = true
      return recordMapToArray(raw)
    }
    // 数组或普通配置对象：原样返回
    storeAsRecordMap = !!preferRecordMap
    return raw
  }

  function save(data) {
    let payload = data
    if (Array.isArray(data) && storeAsRecordMap) {
      payload = arrayToRecordMap(data)
    }
    if (mergeField) {
      let main = DataManager.$loadDataSync(fileName, false, false)
      if (!main) main = {}
      main[mergeField] = payload
      return DataManager.$saveDataSync(fileName, main)
    }
    return DataManager.$saveDataSync(fileName, payload)
  }

  return {
    fileName,
    mergeField,
    load,
    save,
  }
}

export default useEditorData
