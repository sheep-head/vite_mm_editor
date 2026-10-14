<template>
  <div class="mz-main" @click="closeCtx">
    <div ref="workspace" class="mz-workspace">
      <aside class="mz-left" :style="{ width: leftWidth + 'px' }">
        <div class="mz-palette" :style="{ height: paletteHeight + 'px' }">
          <div class="mz-palette-body">
            <div class="mz-blank">图块选择稍后接入</div>
          </div>
          <div class="mz-palette-tabs">
            <button
              v-for="tab in paletteTabs"
              :key="tab"
              type="button"
              class="mz-tab"
              :class="{ active: paletteTab === tab }"
              @click="setPaletteTab(tab)">
              {{ tab }}
            </button>
          </div>
        </div>
        <div
          class="mz-splitter mz-splitter-h"
          title="拖拽调整图块板 / 地图列表高度"
          @pointerdown="onVSplitStart" />
        <div class="mz-maptree">
          <el-scrollbar class="mz-maptree-scroll">
            <ul v-if="treeRoots.length" class="mz-tree">
              <li class="mz-tree-root">
                <span class="mz-tree-label muted">地图</span>
              </li>
              <map-tree-node
                v-for="node in treeRoots"
                :key="node.id"
                :node="node"
                :depth="0"
                :selected-id="selectedMapId"
                :expanded-ids="expandedIds"
                @select="selectMap"
                @toggle="toggleExpand" />
            </ul>
            <div v-else class="mz-blank">无 MapInfos 或未选工作空间</div>
          </el-scrollbar>
        </div>
      </aside>

      <div
        class="mz-splitter mz-splitter-v"
        title="拖拽调整左右宽度"
        @pointerdown="onHSplitStart" />

      <section class="mz-mapview">
        <map-viewer
          ref="mapViewer"
          :map-id="selectedMapId"
          :edit-layer="editLayer"
          :show-grid="showGrid"
          :show-regions="showRegions"
          :show-events="showEvents"
          @tile-select="onTileSelect"
          @error="onMapError"
          @event-select="onEventSelect"
          @open-event="onOpenEvent"
          @create-event="onCreateEvent"
          @event-moved="onEventMoved"
          @event-context="onEventContext"
          @map-dirty="onMapDirty"
          @ready="onMapReady" />
      </section>
    </div>

    <footer class="mz-statusbar">
      <span>{{ statusText }}</span>
      <span class="mz-statusbar-right">
        <el-button
          v-if="mapDirty"
          text
          type="primary"
          size="small"
          @click.stop="saveMap">
          保存地图
        </el-button>
        {{ modeLabel }}
      </span>
    </footer>

    <ul
      v-if="ctxMenu.visible"
      class="mz-ctx"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
      @click.stop>
      <template v-if="ctxMenu.mode === 'event'">
        <li v-if="ctxMenu.eventId" @click="ctxEdit">编辑</li>
        <li v-else @click="ctxNew">新建</li>
        <li v-if="ctxMenu.eventId" @click="ctxCut">剪切</li>
        <li v-if="ctxMenu.eventId" @click="ctxCopy">复制</li>
        <li :class="{ disabled: !eventClipboard }" @click="ctxPaste">粘贴</li>
        <li v-if="ctxMenu.eventId" class="danger" @click="ctxDelete">删除</li>
        <li class="sep" />
      </template>
      <li class="group">设置初始位置</li>
      <li @click="ctxSetStart('player')">玩家</li>
      <li @click="ctxSetStart('boat')">小舟</li>
      <li @click="ctxSetStart('ship')">大船</li>
      <li @click="ctxSetStart('airship')">飞艇</li>
      <li class="sep" />
      <li class="group">清除载具初始位置</li>
      <li @click="ctxClearStart('boat')">清除小舟</li>
      <li @click="ctxClearStart('ship')">清除大船</li>
      <li @click="ctxClearStart('airship')">清除飞艇</li>
    </ul>

    <event-editor-dialog
      v-model="editorVisible"
      :event="editingEvent"
      :ref-mode="editorRefMode"
      @confirm="onEditorConfirm"
      @apply="onEditorApply"
      @jump-to-ref="onJumpToRef" />

    <database-dialog
      :model-value="databaseVisible"
      @update:model-value="setDatabaseVisible" />

    <map-tools-panel />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import DataManager from '@/utils/DataManager'
import DatabaseDialog from '@/components/database/DatabaseDialog.vue'
import MapViewer from '@/components/map/MapViewer.vue'
import MapTreeNode from '@/components/map/MapTreeNode.vue'
import EventEditorDialog from '@/components/map/EventEditorDialog.vue'
import MapToolsPanel from '@/components/map/MapToolsPanel.vue'
import { createEmptyEvent, nextEventId } from '@/components/map/eventDefaults'
import {
  parseEventRef,
  loadTemplateEvent,
  REF_TEMPLATE_MAP_ID,
} from '@/components/map/eventRef'
import {
  pushHistory,
  undo as historyUndo,
  redo as historyRedo,
  canUndo,
  canRedo,
} from '@/components/map/mapHistory'

const LEFT_MIN = 256
const MAP_MIN = 280
const SPLITTER = 5
const PALETTE_MIN = 140
const MAPTREE_MIN = 100

export default {
  name: 'EditorMain',
  components: { DatabaseDialog, MapViewer, MapTreeNode, EventEditorDialog, MapToolsPanel },
  data() {
    return {
      tileInfo: null,
      selectedEventInfo: null,
      mapError: '',
      mapDirty: false,
      leftWidth: 280,
      paletteHeight: 360,
      paletteTabs: ['A', 'B', 'C', 'D', 'E', 'R'],
      expandedIds: {},
      _drag: null,
      editorVisible: false,
      editingEvent: null,
      editorRefMode: null,
      eventClipboard: null,
      ctxMenu: {
        visible: false,
        x: 0,
        y: 0,
        mapX: 0,
        mapY: 0,
        eventId: 0,
        mode: 'map',
      },
    }
  },
  computed: {
    ...mapGetters([
      'mapInfos',
      'editorMode',
      'editLayer',
      'showGrid',
      'showRegions',
      'showEvents',
      'selectedMapId',
      'paletteTab',
      'databaseVisible',
      'showHyperlinks',
    ]),
    mapList() {
      const list = this.mapInfos
      if (!Array.isArray(list)) return []
      return list.filter((m) => m && m.id > 0)
    },
    treeRoots() {
      return this.buildTree()
    },
    modeLabel() {
      return this.editorMode === 'map' ? '地图模式' : '事件模式'
    },
    statusText() {
      if (this.mapError) return this.mapError
      const dirty = this.mapDirty ? ' · 未保存' : ''
      if (this.editorMode === 'event') {
        if (this.selectedEventInfo && this.selectedEventInfo.id) {
          const e = this.selectedEventInfo
          return `事件 EV${String(e.id).padStart(3, '0')} ${e.name || ''} @ (${e.x},${e.y})${dirty}`
        }
        if (this.selectedEventInfo && this.selectedEventInfo.empty) {
          return `选中格 (${this.selectedEventInfo.x},${this.selectedEventInfo.y}) · 双击新建事件${dirty}`
        }
        return `事件模式 · 双击新建/编辑，Ctrl+Z/Y 撤销重做${dirty}`
      }
      if (this.tileInfo) {
        const t = this.tileInfo
        const ev = t.event ? ` EV${t.event.id}` : ''
        return `地图 ${this.selectedMapId} · (${t.x},${t.y}) Region=${t.regionId}${ev}${dirty}`
      }
      if (this.selectedMapId) {
        const m = this.mapList.find((x) => x.id === this.selectedMapId)
        return m
          ? `地图 ${m.id}: ${m.name || ''} · 滚动条/Ctrl+右键平移，右键设初始位置${dirty}`
          : `地图 ${this.selectedMapId}${dirty}`
      }
      return '就绪 · 请选择地图'
    },
  },
  watch: {
    mapList: {
      immediate: true,
      handler(list) {
        if (!list.length) return
        const next = { ...this.expandedIds }
        list.forEach((m) => {
          if (next[m.id] === undefined) next[m.id] = m.expanded !== false
        })
        this.expandedIds = next
        if (!this.selectedMapId) {
          const first = [...list].sort((a, b) => (a.order || 0) - (b.order || 0))[0]
          if (first) this.$store.commit('setSelectedMapId', first.id)
        }
      },
    },
    selectedMapId() {
      this.tileInfo = null
      this.selectedEventInfo = null
      this.mapError = ''
      this.mapDirty = false
      this.closeCtx()
    },
    editorMode(mode) {
      this.closeCtx()
      if (mode === 'event') this.$store.commit('setShowEvents', true)
    },
    editorVisible(v) {
      if (!v) this.editorRefMode = null
    },
  },
  mounted() {
    this._onDragMove = (e) => this.onDragMove(e)
    this._onDragEnd = () => this.onDragEnd()
    this._onWinResize = () => {
      this.leftWidth = this.clampLeftWidth(this.leftWidth)
      this.paletteHeight = this.clampPaletteHeight(this.paletteHeight)
    }
    this._onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key
      if (key === 's' || key === 'S') {
        e.preventDefault()
        if (this.mapDirty) this.saveMap()
        return
      }
      if (key === 'z' || key === 'Z') {
        e.preventDefault()
        if (e.shiftKey) this.doRedo()
        else this.doUndo()
        return
      }
      if (key === 'y' || key === 'Y') {
        e.preventDefault()
        this.doRedo()
      }
    }
    this._onUndoEvt = () => this.doUndo()
    this._onRedoEvt = () => this.doRedo()
    window.addEventListener('resize', this._onWinResize)
    window.addEventListener('keydown', this._onKey)
    window.addEventListener('editor-map-undo', this._onUndoEvt)
    window.addEventListener('editor-map-redo', this._onRedoEvt)
    this.$nextTick(this._onWinResize)
  },
  beforeUnmount() {
    this.detachDrag()
    window.removeEventListener('resize', this._onWinResize)
    window.removeEventListener('keydown', this._onKey)
    window.removeEventListener('editor-map-undo', this._onUndoEvt)
    window.removeEventListener('editor-map-redo', this._onRedoEvt)
  },
  methods: {
    viewer() {
      return this.$refs.mapViewer
    },
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
      if (this.mapDirty) {
        const ok = window.confirm('当前地图有未保存更改，切换将丢失。继续？')
        if (!ok) return
      }
      this.$store.commit('setSelectedMapId', id)
    },
    toggleExpand(id) {
      this.expandedIds = { ...this.expandedIds, [id]: !this.expandedIds[id] }
    },
    setPaletteTab(tab) {
      this.$store.commit('setPaletteTab', tab)
    },
    setDatabaseVisible(v) {
      this.$store.commit('setDatabaseVisible', v)
    },
    clampLeftWidth(w) {
      const root = this.$refs.workspace
      const maxByMap = root ? root.clientWidth - MAP_MIN - SPLITTER : 800
      return Math.max(LEFT_MIN, Math.min(maxByMap, Math.round(w)))
    },
    clampPaletteHeight(h) {
      const left = this.$refs.workspace && this.$refs.workspace.querySelector('.mz-left')
      const total = left ? left.clientHeight : 600
      const max = total - MAPTREE_MIN - SPLITTER
      return Math.max(PALETTE_MIN, Math.min(max, Math.round(h)))
    },
    onHSplitStart(e) {
      e.preventDefault()
      this._drag = { kind: 'h', startX: e.clientX, startW: this.leftWidth }
      this.attachDrag(e)
    },
    onVSplitStart(e) {
      e.preventDefault()
      this._drag = { kind: 'v', startY: e.clientY, startH: this.paletteHeight }
      this.attachDrag(e)
    },
    attachDrag(e) {
      window.addEventListener('pointermove', this._onDragMove)
      window.addEventListener('pointerup', this._onDragEnd)
      window.addEventListener('pointercancel', this._onDragEnd)
      if (e.currentTarget && e.currentTarget.setPointerCapture) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch (_) {
          /* ignore */
        }
      }
      document.body.classList.add(this._drag.kind === 'h' ? 'mz-resizing-col' : 'mz-resizing-row')
    },
    detachDrag() {
      window.removeEventListener('pointermove', this._onDragMove)
      window.removeEventListener('pointerup', this._onDragEnd)
      window.removeEventListener('pointercancel', this._onDragEnd)
      document.body.classList.remove('mz-resizing-col', 'mz-resizing-row')
    },
    onDragMove(e) {
      if (!this._drag) return
      if (this._drag.kind === 'h') {
        this.leftWidth = this.clampLeftWidth(this._drag.startW + (e.clientX - this._drag.startX))
      } else {
        this.paletteHeight = this.clampPaletteHeight(
          this._drag.startH + (e.clientY - this._drag.startY),
        )
      }
    },
    onDragEnd() {
      if (!this._drag) return
      this._drag = null
      this.detachDrag()
    },
    onTileSelect(info) {
      this.tileInfo = info
      this.mapError = ''
    },
    onMapError(msg) {
      this.mapError = msg || ''
    },
    onMapReady() {
      this.mapDirty = false
    },
    onMapDirty() {
      this.mapDirty = true
    },
    onEventSelect(info) {
      this.selectedEventInfo = info
      this.closeCtx()
    },
    snapshotEvents() {
      const v = this.viewer()
      return v ? v.cloneEvents() : [null]
    },
    pushEventsHistory(label, before, after) {
      if (!this.selectedMapId) return
      pushHistory(this.selectedMapId, {
        type: 'events',
        label,
        before,
        after: after || this.snapshotEvents(),
      })
    },
    pushSystemHistory(label, before, after) {
      if (!this.selectedMapId) return
      pushHistory(this.selectedMapId, {
        type: 'system',
        label,
        before,
        after,
      })
    },
    onOpenEvent({ id }) {
      const v = this.viewer()
      const ev = v && v.getEventById(id)
      if (!ev) return
      this._pendingCreate = false
      if (this.showHyperlinks) {
        const refId = parseEventRef(ev)
        if (refId != null) {
          const template = loadTemplateEvent(refId)
          if (template) {
            this.editingEvent = template
            this.editorRefMode = { mapId: REF_TEMPLATE_MAP_ID, refId }
            this.editorVisible = true
            return
          }
        }
      }
      this.editorRefMode = null
      this.editingEvent = JSON.parse(JSON.stringify(ev))
      this.editorVisible = true
    },
    onJumpToRef() {
      const ref = this.editorRefMode
      if (!ref) return
      this.editorVisible = false
      this.editorRefMode = null
      this.$store.commit('setEditorMode', 'event')
      this.$store.commit('setShowEvents', true)
      this.$store.commit('setSelectedMapId', ref.mapId)
      this.$store.dispatch('requestFocusEvent', { mapId: ref.mapId, eventId: ref.refId })
    },
    onCreateEvent({ x, y }) {
      const v = this.viewer()
      const map = v && v.getMapData()
      if (!map) return
      const id = nextEventId(map.events)
      const ev = createEmptyEvent(id, x, y)
      this.editorRefMode = null
      this.editingEvent = ev
      this.editorVisible = true
      this._pendingCreate = true
    },
    async onEditorConfirm(draft) {
      await this.persistEditedEvent(draft, true)
    },
    async onEditorApply(draft) {
      await this.persistEditedEvent(draft, false)
    },
    async persistEditedEvent(draft, closeAfter) {
      const v = this.viewer()
      if (!v || !draft) return
      const before = this.snapshotEvents()
      for (const page of draft.pages || []) {
        const n = page && page.image && page.image.characterName
        if (n) await v.ensureCharacterImage(n)
      }
      v.upsertEvent(draft)
      this.pushEventsHistory(this._pendingCreate ? '新建事件' : '编辑事件', before)
      this.selectedEventInfo = {
        id: draft.id,
        name: draft.name,
        x: draft.x,
        y: draft.y,
      }
      this.editingEvent = JSON.parse(JSON.stringify(draft))
      this._pendingCreate = false
      this.saveMap()
      if (!closeAfter) {
        // 应用后保持对话框打开；同步草稿数据源
      }
    },
    onEventMoved(info) {
      if (info.fromX === info.x && info.fromY === info.y) return
      const v = this.viewer()
      if (!v) return
      const after = this.snapshotEvents()
      const before = JSON.parse(JSON.stringify(after))
      const evBefore = before.find((e) => e && e.id === info.id)
      if (evBefore) {
        evBefore.x = info.fromX
        evBefore.y = info.fromY
      }
      this.pushEventsHistory('移动事件', before, after)
      this.selectedEventInfo = {
        ...(this.selectedEventInfo || {}),
        id: info.id,
        x: info.x,
        y: info.y,
      }
      this.saveMap()
    },
    onEventContext(payload) {
      this.ctxMenu = {
        visible: true,
        x: payload.clientX,
        y: payload.clientY,
        mapX: payload.x,
        mapY: payload.y,
        eventId: payload.eventId || 0,
        mode: payload.mode || 'map',
      }
    },
    closeCtx() {
      if (this.ctxMenu.visible) this.ctxMenu.visible = false
    },
    ctxEdit() {
      const id = this.ctxMenu.eventId
      this.closeCtx()
      if (id) this.onOpenEvent({ id })
    },
    ctxNew() {
      const { mapX, mapY } = this.ctxMenu
      this.closeCtx()
      this.onCreateEvent({ x: mapX, y: mapY })
    },
    ctxCopy() {
      const v = this.viewer()
      const ev = v && v.getEventById(this.ctxMenu.eventId)
      this.closeCtx()
      if (!ev) return
      this.eventClipboard = JSON.parse(JSON.stringify(ev))
    },
    ctxCut() {
      const v = this.viewer()
      const id = this.ctxMenu.eventId
      const ev = v && v.getEventById(id)
      this.closeCtx()
      if (!ev) return
      const before = this.snapshotEvents()
      this.eventClipboard = JSON.parse(JSON.stringify(ev))
      v.removeEventById(id)
      this.pushEventsHistory('剪切事件', before)
      this.selectedEventInfo = null
      this.saveMap()
    },
    ctxPaste() {
      if (!this.eventClipboard) return
      const { mapX, mapY } = this.ctxMenu
      this.closeCtx()
      const v = this.viewer()
      const map = v && v.getMapData()
      if (!map) return
      if (v.findEventAt(mapX, mapY)) return
      const before = this.snapshotEvents()
      const id = nextEventId(map.events)
      const ev = JSON.parse(JSON.stringify(this.eventClipboard))
      ev.id = id
      ev.x = mapX
      ev.y = mapY
      ev.name = ev.name || `EV${String(id).padStart(3, '0')}`
      v.upsertEvent(ev)
      this.pushEventsHistory('粘贴事件', before)
      this.selectedEventInfo = { id: ev.id, name: ev.name, x: ev.x, y: ev.y }
      this.saveMap()
    },
    ctxDelete() {
      const id = this.ctxMenu.eventId
      this.closeCtx()
      const v = this.viewer()
      if (!v || !id) return
      if (!window.confirm(`删除事件 EV${String(id).padStart(3, '0')}？`)) return
      const before = this.snapshotEvents()
      v.removeEventById(id)
      this.pushEventsHistory('删除事件', before)
      this.selectedEventInfo = null
      this.saveMap()
    },
    ctxSetStart(kind) {
      const { mapX, mapY } = this.ctxMenu
      this.closeCtx()
      const v = this.viewer()
      if (!v) return
      const before = v.getStartSnapshot()
      const ok = v.setStartPosition(kind, mapX, mapY)
      if (ok) {
        this.pushSystemHistory('设置初始位置', before, v.getStartSnapshot())
        this.mapError = ''
      } else {
        this.mapError = '设置初始位置失败（无法写入 System.json）'
      }
    },
    ctxClearStart(kind) {
      this.closeCtx()
      const v = this.viewer()
      if (!v) return
      const before = v.getStartSnapshot()
      const ok = v.setStartPosition(kind, 0, 0, { clear: true })
      if (ok) {
        this.pushSystemHistory('清除载具初始位置', before, v.getStartSnapshot())
        this.mapError = ''
      } else {
        this.mapError = '清除初始位置失败'
      }
    },
    doUndo() {
      if (!canUndo(this.selectedMapId)) return
      const entry = historyUndo(this.selectedMapId)
      if (!entry) return
      this.applyHistoryEntry(entry, 'before')
    },
    doRedo() {
      if (!canRedo(this.selectedMapId)) return
      const entry = historyRedo(this.selectedMapId)
      if (!entry) return
      this.applyHistoryEntry(entry, 'after')
    },
    applyHistoryEntry(entry, side) {
      const v = this.viewer()
      if (!v || !entry) return
      const snap = side === 'before' ? entry.before : entry.after
      if (entry.type === 'events') {
        v.applyEventsSnapshot(snap)
        this.saveMap()
      } else if (entry.type === 'system') {
        v.applyStartSnapshot(snap)
      }
    },
    saveMap() {
      const v = this.viewer()
      const map = v && v.getMapData()
      if (!map || !this.selectedMapId) return
      const fileName = `Map${String(this.selectedMapId).padStart(3, '0')}`
      const ok = DataManager.$saveDataSync(fileName, map)
      if (ok) {
        this.mapDirty = false
        this.mapError = ''
      } else {
        this.mapError = '保存地图失败'
      }
    },
  },
}
</script>

<style scoped>
.mz-main {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--app-bg);
  color: var(--app-text);
  position: relative;
}
.mz-workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.mz-left {
  flex: 0 0 auto;
  min-width: 256px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--app-surface-2);
}
.mz-palette {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.mz-palette-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.mz-palette-tabs {
  display: flex;
  flex-shrink: 0;
  border-top: 1px solid var(--app-border);
  background: var(--app-surface);
}
.mz-tab {
  flex: 1;
  height: 28px;
  border: none;
  border-right: 1px solid var(--app-border);
  background: transparent;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.mz-tab:last-child {
  border-right: none;
}
.mz-tab:hover {
  background: var(--app-hover-bg);
  color: var(--app-text);
}
.mz-tab.active {
  background: var(--app-hover-bg);
  color: var(--app-active-color);
  box-shadow: inset 0 -2px 0 var(--app-active-color);
}
.mz-maptree {
  flex: 1 1 auto;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.mz-splitter {
  flex: 0 0 5px;
  background: var(--app-border);
  position: relative;
  z-index: 2;
  touch-action: none;
}
.mz-splitter::after {
  content: '';
  position: absolute;
  inset: -2px;
}
.mz-splitter-v {
  cursor: col-resize;
}
.mz-splitter-h {
  cursor: row-resize;
}
.mz-splitter:hover,
.mz-splitter:active {
  background: var(--app-active-color, #409eff);
}
.mz-mapview {
  flex: 1;
  min-width: 280px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--app-surface);
  overflow: hidden;
}
.mz-blank {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  color: var(--app-text-muted);
  font-size: 13px;
  text-align: center;
}
.mz-maptree-scroll {
  flex: 1;
  min-height: 0;
}
.mz-tree {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}
.mz-tree-root {
  padding: 4px 8px;
  font-size: 12px;
}
.mz-tree-label.muted {
  color: var(--app-text-muted);
  font-weight: 600;
}
.mz-statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  background: var(--app-surface);
  border-top: 1px solid var(--app-border);
  color: var(--app-text-muted);
  flex-shrink: 0;
}
.mz-statusbar-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.mz-ctx {
  position: fixed;
  z-index: 3000;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  min-width: 120px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  border-radius: 4px;
}
.mz-ctx li {
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}
.mz-ctx li:hover {
  background: var(--app-hover-bg);
  color: var(--app-active-color);
}
.mz-ctx li.disabled {
  opacity: 0.4;
  pointer-events: none;
}
.mz-ctx li.danger:hover {
  color: #f56c6c;
}
.mz-ctx li.sep {
  height: 1px;
  padding: 0;
  margin: 4px 0;
  background: var(--app-border);
  pointer-events: none;
}
.mz-ctx li.group {
  padding: 4px 14px 2px;
  font-size: 11px;
  color: var(--app-text-muted);
  cursor: default;
  pointer-events: none;
}
</style>

<style>
body.mz-resizing-col,
body.mz-resizing-col * {
  cursor: col-resize !important;
  user-select: none !important;
}
body.mz-resizing-row,
body.mz-resizing-row * {
  cursor: row-resize !important;
  user-select: none !important;
}
</style>
