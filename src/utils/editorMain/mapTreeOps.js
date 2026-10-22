import { ElMessage } from 'element-plus'
import DataManager from '@/utils/DataManager'

function applyMapSettings(map, form) {
  const nw = Math.max(1, Number(form.width) || 1)
  const nh = Math.max(1, Number(form.height) || 1)
  const oldW = map.width || 1
  const oldH = map.height || 1
  if (nw !== oldW || nh !== oldH) {
    const layers = 6
    const next = new Array(nw * nh * layers).fill(0)
    const src = map.data || []
    for (let z = 0; z < layers; z++) {
      for (let y = 0; y < Math.min(oldH, nh); y++) {
        for (let x = 0; x < Math.min(oldW, nw); x++) {
          next[z * nw * nh + y * nw + x] = src[z * oldW * oldH + y * oldW + x] || 0
        }
      }
    }
    map.data = next
    map.width = nw
    map.height = nh
  }
  map.tilesetId = Math.max(1, Number(form.tilesetId) || 1)
  map.displayName = form.displayName || ''
  map.scrollType = Number(form.scrollType) || 0
  map.encounterStep = Math.max(1, Number(form.encounterStep) || 30)
  map.autoplayBgm = !!form.autoplayBgm
  map.autoplayBgs = !!form.autoplayBgs
  map.bgm = { ...(form.bgm || {}) }
  map.bgs = { ...(form.bgs || {}) }
  map.specifyBattleback = !!form.specifyBattleback
  map.battleback1Name = form.battleback1Name || ''
  map.battleback2Name = form.battleback2Name || ''
  map.disableDashing = !!form.disableDashing
  map.parallaxName = form.parallaxName || ''
  map.parallaxLoopX = !!form.parallaxLoopX
  map.parallaxLoopY = !!form.parallaxLoopY
  map.parallaxSx = Number(form.parallaxSx) || 0
  map.parallaxSy = Number(form.parallaxSy) || 0
  map.parallaxShow = form.parallaxShow !== false
  map.note = form.note || ''
  map.encounterList = (form.encounterList || []).map((e) => ({
    troopId: e.troopId,
    weight: Number(e.weight) || 1,
    regionSet: Array.isArray(e.regionSet) ? e.regionSet.slice() : [],
  }))
}

function createEmptyMapData(width = 17, height = 13, tilesetId = 1) {
  const w = Math.max(1, Number(width) || 17)
  const h = Math.max(1, Number(height) || 13)
  return {
    autoplayBgm: false,
    autoplayBgs: false,
    battleback1Name: '',
    battleback2Name: '',
    bgm: { name: '', pan: 0, pitch: 100, volume: 90 },
    bgs: { name: '', pan: 0, pitch: 100, volume: 90 },
    disableDashing: false,
    displayName: '',
    encounterList: [],
    encounterStep: 30,
    height: h,
    note: '',
    parallaxLoopX: false,
    parallaxLoopY: false,
    parallaxName: '',
    parallaxShow: true,
    parallaxSx: 0,
    parallaxSy: 0,
    scrollType: 0,
    specifyBattleback: false,
    tilesetId: Math.max(1, Number(tilesetId) || 1),
    width: w,
    data: new Array(w * h * 6).fill(0),
    events: [null],
  }
}

function cloneMapInfos(list) {
  const src = Array.isArray(list) ? list : []
  const out = new Array(src.length)
  for (let i = 0; i < src.length; i++) {
    out[i] = src[i] ? { ...src[i] } : null
  }
  return out
}

function nextMapId(infos) {
  let max = 0
  for (let i = 1; i < infos.length; i++) {
    if (infos[i] && infos[i].id > max) max = infos[i].id
  }
  return max + 1
}

function collectDescendants(infos, rootId) {
  const out = []
  const walk = (pid) => {
    for (let i = 1; i < infos.length; i++) {
      const m = infos[i]
      if (m && m.parentId === pid) {
        out.push(m.id)
        walk(m.id)
      }
    }
  }
  walk(rootId)
  return out
}

function isDescendantOf(infos, ancestorId, nodeId) {
  let cur = infos[nodeId]
  while (cur && cur.parentId) {
    if (cur.parentId === ancestorId) return true
    cur = infos[cur.parentId]
  }
  return false
}

function mapNodeLabel(infos, id) {
  if (!id) return '根目录'
  const m = infos && infos[id]
  if (!m) return `ID ${id}`
  const name = m.name || '未命名'
  return `${name} (${id})`
}

function siblingSequence(infos, parentId) {
  const kids = []
  const list = infos || []
  for (let i = 1; i < list.length; i++) {
    const m = list[i]
    if (m && (m.parentId || 0) === parentId) kids.push(m)
  }
  kids.sort((a, b) => (a.order || 0) - (b.order || 0) || a.id - b.id)
  return kids.map((m) => `${m.name || '未命名'}(${m.id})`).join('、')
}

function diffMapTree(before, after) {
  const a = before || []
  const b = after || []
  const parents = new Set([0])
  const n = Math.max(a.length, b.length)
  for (let i = 1; i < n; i++) {
    if (a[i]) parents.add(a[i].parentId || 0)
    if (b[i]) parents.add(b[i].parentId || 0)
  }
  const lines = []
  parents.forEach((pid) => {
    const left = siblingSequence(a, pid)
    const right = siblingSequence(b, pid)
    if (left === right) return
    lines.push(`${mapNodeLabel(b.length ? b : a, pid)}：${left || '（无）'} → ${right || '（无）'}`)
  })
  return lines
}

function renumberSiblingOrders(infos, parentId) {
  const kids = []
  for (let i = 1; i < infos.length; i++) {
    const m = infos[i]
    if (m && (m.parentId || 0) === parentId) kids.push(m)
  }
  kids.sort((a, b) => (a.order || 0) - (b.order || 0) || a.id - b.id)
  kids.forEach((m, idx) => {
    m.order = idx + 1
  })
}

function mapFileName(id) {
  return 'Map' + String(id).padStart(3, '0')
}

export const mapTreeOpsMethods = {
    buildTree() {
      const list = this.mapList
      const byParent = new Map()
      list.forEach((m) => {
        const pid = m.parentId || 0
        if (!byParent.has(pid)) byParent.set(pid, [])
        byParent.get(pid).push(m)
      })
      byParent.forEach((arr) => {
        arr.sort((a, b) => (a.order || 0) - (b.order || 0))
      })
      const walk = (parentId) => {
        const children = byParent.get(parentId) || []
        return children.map((m) => ({
          id: m.id,
          name: m.name || '(无名称)',
          children: walk(m.id),
        }))
      }
      return walk(0)
    },
    selectMap(id) {
      if (this.blockedMapIds.includes(id)) {
        ElMessage.warning('该地图已在设置中禁止打开')
        return
      }
      if (this.mapDirty) {
        const ok = window.confirm('当前地图有未保存更改，切换将丢失。继续？')
        if (!ok) return
      }
      this.$store.commit('setSelectedMapId', id)
    },
    toggleExpand(id) {
      this.expandedIds = { ...this.expandedIds, [id]: !this.expandedIds[id] }
    },
    closeTreeMenu() {
      if (this.treeMenu.visible) this.treeMenu.visible = false
    },
    onTreeRootMenu(e) {
      this.closeCtx()
      this.treeMenu = { visible: true, x: e.clientX, y: e.clientY, mapId: 0 }
      this.nudgeFixedMenu('treeMenuEl', 'treeMenu', e.clientX, e.clientY)
    },
    onTreeMenu({ id, x, y }) {
      this.closeCtx()
      this.treeMenu = { visible: true, x, y, mapId: id || 0 }
      this.nudgeFixedMenu('treeMenuEl', 'treeMenu', x, y)
    },
    persistMapInfos(infos) {
      if (!DataManager.$saveDataSync('MapInfos', infos)) {
        ElMessage.error('保存 MapInfos 失败')
        return false
      }
      this.$store.commit('setMapInfos', infos)
      DataManager.mapInfos = infos
      this.savedMapInfos = cloneMapInfos(infos)
      return true
    },
    applyMapTree(infos) {
      this.$store.commit('setMapInfos', infos)
    },
    treeNew() {
      const parentId = this.treeMenu.mapId || 0
      this.closeTreeMenu()
      this.mapSettings = {
        visible: true,
        mode: 'create',
        mapId: 0,
        parentId,
        mapInfo: null,
        mapData: null,
      }
    },
    onMapSettingsConfirm(form) {
      if (this.mapSettings.mode === 'create') this.confirmCreateMap(form)
      else this.confirmMapEdit(form)
    },
    treeCopy() {
      const id = this.treeMenu.mapId
      this.closeTreeMenu()
      if (!id) return
      const info = (this.mapInfos || [])[id]
      if (!info) return
      let mapData = null
      try {
        mapData = DataManager.$loadDataSync(mapFileName(id), false, false)
      } catch (e) {
        mapData = null
      }
      if (!mapData) {
        ElMessage.error('读取地图数据失败')
        return
      }
      this.mapClipboard = {
        info: { ...info },
        mapData: JSON.parse(JSON.stringify(mapData)),
      }
      ElMessage.success(`已复制地图 ${id}`)
    },
    treePaste() {
      const parentId = this.treeMenu.mapId || 0
      this.closeTreeMenu()
      if (!this.mapClipboard) return
      const infos = cloneMapInfos(this.mapInfos)
      const id = nextMapId(infos)
      while (infos.length <= id) infos.push(null)
      const siblings = []
      for (let i = 1; i < infos.length; i++) {
        if (infos[i] && (infos[i].parentId || 0) === parentId) siblings.push(infos[i])
      }
      const order = siblings.reduce((m, s) => Math.max(m, s.order || 0), 0) + 1
      const src = this.mapClipboard.info
      infos[id] = {
        id,
        name: (src.name || `MAP${String(id).padStart(3, '0')}`) + ' 副本',
        parentId,
        order,
        expanded: true,
        scrollX: src.scrollX || 0,
        scrollY: src.scrollY || 0,
      }
      const mapData = JSON.parse(JSON.stringify(this.mapClipboard.mapData))
      if (!DataManager.$saveDataSync(mapFileName(id), mapData)) {
        ElMessage.error('粘贴地图文件失败')
        return
      }
      if (!this.persistMapInfos(infos)) return
      if (parentId) this.expandedIds = { ...this.expandedIds, [parentId]: true }
      this.selectMap(id)
      ElMessage.success(`已粘贴为地图 ${id}`)
    },
    treeDelete() {
      const id = this.treeMenu.mapId
      this.closeTreeMenu()
      if (!id) return
      const infos = cloneMapInfos(this.mapInfos)
      if (!infos[id]) return
      const kids = collectDescendants(infos, id)
      const names = [id, ...kids].map((i) => `${i}:${(infos[i] && infos[i].name) || ''}`).join('\n')
      const ok = window.confirm(`删除以下地图及其数据文件？\n${names}`)
      if (!ok) return
      const removeIds = [id, ...kids]
      const parentId = infos[id].parentId || 0
      removeIds.forEach((rid) => {
        infos[rid] = null
        try {
          const p = DataManager.$getPath('data', `${mapFileName(rid)}.json`)
          if (DataManager.$fs && DataManager.$fs.existsSync(p)) DataManager.$fs.unlinkSync(p)
        } catch (e) {
          console.warn(e)
        }
      })
      renumberSiblingOrders(infos, parentId)
      if (!this.persistMapInfos(infos)) return
      if (removeIds.includes(this.selectedMapId)) {
        this.mapDirty = false
        const next = this.mapList.find((m) => m && !removeIds.includes(m.id))
        this.$store.commit('setSelectedMapId', next ? next.id : 0)
      }
      ElMessage.success('已删除')
    },
    treeEdit() {
      const id = this.treeMenu.mapId
      this.closeTreeMenu()
      if (!id) return
      const info = (this.mapInfos || [])[id]
      if (!info) return
      let map = null
      try {
        map = DataManager.$loadDataSync(mapFileName(id), false, false)
      } catch (e) {
        map = null
      }
      this.mapSettings = {
        visible: true,
        mode: 'edit',
        mapId: id,
        parentId: info.parentId || 0,
        mapInfo: info,
        mapData: map,
      }
    },
    confirmMapEdit(form) {
      const id = this.mapSettings.mapId
      if (!id || !form) return
      const infos = cloneMapInfos(this.mapInfos)
      if (!infos[id]) return
      infos[id].name = String(form.name || '').trim() || `MAP${String(id).padStart(3, '0')}`
      let map = null
      if (id === this.selectedMapId) {
        const viewer = this.viewer()
        if (viewer && typeof viewer.getMapData === 'function') map = viewer.getMapData()
      }
      if (!map) {
        try {
          map = DataManager.$loadDataSync(mapFileName(id), false, false)
        } catch (e) {
          map = null
        }
      }
      if (!map) {
        ElMessage.error('读取地图失败')
        return
      }
      applyMapSettings(map, form)
      if (!DataManager.$saveDataSync(mapFileName(id), map)) {
        ElMessage.error('保存地图失败')
        return
      }
      if (!this.persistMapInfos(infos)) return
      this.mapSettings.visible = false
      if (id === this.selectedMapId) {
        this.mapDirty = false
        const viewer = this.viewer()
        if (viewer && typeof viewer.loadMap === 'function') viewer.loadMap(id)
      }
      ElMessage.success('已保存地图设置')
    },
    confirmCreateMap(form) {
      const parentId = this.mapSettings.parentId || 0
      const infos = cloneMapInfos(this.mapInfos)
      const id = nextMapId(infos)
      while (infos.length <= id) infos.push(null)
      const siblings = []
      for (let i = 1; i < infos.length; i++) {
        if (infos[i] && (infos[i].parentId || 0) === parentId) siblings.push(infos[i])
      }
      const order = siblings.reduce((m, s) => Math.max(m, s.order || 0), 0) + 1
      const name = String(form.name || '').trim() || `MAP${String(id).padStart(3, '0')}`
      infos[id] = {
        id,
        name,
        parentId,
        order,
        expanded: true,
        scrollX: 0,
        scrollY: 0,
      }
      const mapData = createEmptyMapData(form.width, form.height, form.tilesetId)
      applyMapSettings(mapData, form)
      if (!DataManager.$saveDataSync(mapFileName(id), mapData)) {
        ElMessage.error('创建地图文件失败')
        return
      }
      if (!this.persistMapInfos(infos)) return
      this.mapSettings.visible = false
      if (parentId) this.expandedIds = { ...this.expandedIds, [parentId]: true }
      this.selectMap(id)
      ElMessage.success(`已新建地图 ${id}`)
    },
    onTreeDropMove({ fromId, toId, pos }) {
      this.treeDragId = 0
      if (!fromId || !toId || fromId === toId) return
      const infos = cloneMapInfos(this.mapInfos)
      const from = infos[fromId]
      const to = infos[toId]
      if (!from || !to) return
      if (isDescendantOf(infos, fromId, toId)) {
        ElMessage.warning('不能移动到自己的子地图下')
        return
      }
      const oldParent = from.parentId || 0
      let newParent = to.parentId || 0
      if (pos === 'into') newParent = toId
      from.parentId = newParent

      const siblings = []
      for (let i = 1; i < infos.length; i++) {
        const m = infos[i]
        if (m && (m.parentId || 0) === newParent && m.id !== fromId) siblings.push(m)
      }
      siblings.sort((a, b) => (a.order || 0) - (b.order || 0) || a.id - b.id)
      let insertAt = siblings.length
      if (pos === 'before' || pos === 'after') {
        const idx = siblings.findIndex((m) => m.id === toId)
        if (idx >= 0) insertAt = pos === 'before' ? idx : idx + 1
      }
      siblings.splice(insertAt, 0, from)
      siblings.forEach((m, i) => {
        m.order = i + 1
      })
      if (oldParent !== newParent) renumberSiblingOrders(infos, oldParent)
      this.applyMapTree(infos)
      if (pos === 'into') this.expandedIds = { ...this.expandedIds, [toId]: true }
    },
    requestSave() {
      if (this.mapTreeDirty) {
        this.treeSave = {
          visible: true,
          lines: diffMapTree(this.savedMapInfos, this.mapInfos),
        }
        return
      }
      if (this.mapDirty) this.saveMap()
    },
    confirmTreeSave() {
      const infos = cloneMapInfos(this.mapInfos)
      if (!this.persistMapInfos(infos)) return
      this.treeSave.visible = false
      if (this.mapDirty) this.saveMap()
      ElMessage.success('已保存地图结构')
    }
}

export {
  applyMapSettings,
  createEmptyMapData,
  cloneMapInfos,
  nextMapId,
  collectDescendants,
  isDescendantOf,
  diffMapTree,
  renumberSiblingOrders,
  mapFileName,
}
