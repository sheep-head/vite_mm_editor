<template>
  <div class="mz-main" @click="closeAllMenus">
    <div ref="workspace" class="mz-workspace">
      <aside class="mz-left" :style="{ width: leftWidth + 'px' }">
        <div class="mz-palette" :style="{ height: paletteHeight + 'px' }">
          <div class="mz-palette-body">
            <div v-if="editorMode === 'event'" class="mz-event-list">
              <el-input v-model="eventFilter" size="small" clearable placeholder="筛选 ID / 名称" />
              <div ref="eventRows" class="mz-event-rows">
                <div
                  v-for="ev in filteredMapEvents"
                  :key="ev.id"
                  class="mz-event-row"
                  :class="{ active: selectedEventInfo && selectedEventInfo.id === ev.id }"
                  @click="focusMapEvent(ev)">
                  <span class="mz-event-id">{{ String(ev.id).padStart(3, '0') }}</span>
                  <span class="mz-event-name">{{ ev.name || '' }}</span>
                </div>
                <div v-if="!filteredMapEvents.length" class="mz-blank">没有事件</div>
              </div>
            </div>
            <tile-palette
              v-else
              ref="tilePalette"
              :tileset-id="currentTilesetId"
              v-model="paintBrush" />
          </div>
          <div v-show="editorMode !== 'event'" class="mz-palette-tabs">
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
        <div class="mz-maptree" @contextmenu.prevent="onTreeRootMenu">
          <el-scrollbar class="mz-maptree-scroll">
            <ul v-if="treeRoots.length" class="mz-tree">
              <li class="mz-tree-root" @contextmenu.prevent.stop="onTreeRootMenu">
                <span class="mz-tree-label muted">地图</span>
              </li>
              <map-tree-node
                v-for="node in treeRoots"
                :key="node.id"
                :node="node"
                :depth="0"
                :selected-id="selectedMapId"
                :expanded-ids="expandedIds"
                :drag-id="treeDragId"
                @select="selectMap"
                @toggle="toggleExpand"
                @menu="onTreeMenu"
                @drag-start="treeDragId = $event"
                @drag-end="treeDragId = 0"
                @drop-move="onTreeDropMove" />
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
          :paint-enabled="editorMode === 'map'"
          :brush="paintBrush"
          @tile-select="onTileSelect"
          @error="onMapError"
          @event-select="onEventSelect"
          @open-event="onOpenEvent"
          @create-event="onCreateEvent"
          @event-moved="onEventMoved"
          @event-context="onEventContext"
          @map-dirty="onMapDirty"
          @paint-stroke="onPaintStroke"
          @brush-pick="onBrushPick"
          @ready="onMapReady" />
      </section>
    </div>

    <footer class="mz-statusbar">
      <span>{{ statusText }}</span>
      <span class="mz-statusbar-right">
        <el-button
          v-if="mapDirty || mapTreeDirty"
          text
          type="primary"
          size="small"
          @click.stop="requestSave">
          保存
        </el-button>
        {{ modeLabel }}
      </span>
    </footer>

    <ul
      v-if="ctxMenu.visible"
      ref="mapCtxEl"
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
      @jump-to-ref="onJumpToRef"
      @view-ref="onViewRef" />

    <database-dialog
      :model-value="databaseVisible"
      @update:model-value="setDatabaseVisible" />

    <ul
      v-if="treeMenu.visible"
      ref="treeMenuEl"
      class="mz-ctx"
      :style="{ left: treeMenu.x + 'px', top: treeMenu.y + 'px' }"
      @click.stop>
      <li @click="treeNew">新建</li>
      <template v-if="treeMenu.mapId">
        <li @click="treeEdit">编辑</li>
        <li @click="treeCopy">复制</li>
        <li :class="{ disabled: !mapClipboard }" @click="treePaste">粘贴</li>
        <li class="sep" />
        <li class="danger" @click="treeDelete">删除</li>
      </template>
      <li v-else :class="{ disabled: !mapClipboard }" @click="treePaste">粘贴</li>
    </ul>

    <map-settings-dialog
      v-model="mapSettings.visible"
      :mode="mapSettings.mode"
      :map-id="mapSettings.mapId"
      :map-info="mapSettings.mapInfo"
      :map-data="mapSettings.mapData"
      @confirm="onMapSettingsConfirm" />

    <el-dialog
      v-model="treeSave.visible"
      title="保存更改"
      width="480px"
      append-to-body
      :close-on-click-modal="false">
      <p class="mz-save-lead">地图结构有以下修改，是否保存？</p>
      <ul class="mz-save-list">
        <li v-for="(line, i) in treeSave.lines" :key="i">{{ line }}</li>
      </ul>
      <p v-if="mapDirty" class="mz-save-lead">当前地图的图块和事件也会一起保存。</p>
      <template #footer>
        <el-button @click="treeSave.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmTreeSave">保存</el-button>
      </template>
    </el-dialog>

    <map-tools-panel />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { ElMessage } from 'element-plus'
import DataManager from '@/utils/DataManager'
import DatabaseDialog from '@/components/database/DatabaseDialog.vue'
import MapViewer from '@/components/map/MapViewer.vue'
import MapTreeNode from '@/components/map/MapTreeNode.vue'
import EventEditorDialog from '@/components/map/EventEditorDialog.vue'
import MapToolsPanel from '@/components/map/MapToolsPanel.vue'
import TilePalette from '@/components/map/TilePalette.vue'
import MapSettingsDialog from '@/components/map/MapSettingsDialog.vue'
import { createEmptyEvent, nextEventId } from '@/components/map/eventDefaults'
import { loadTemplateEvent, REF_TEMPLATE_MAP_ID } from '@/components/map/eventRef'
import { pushHistory } from '@/components/map/mapHistory'
import {
  mapTreeOpsMethods,
  cloneMapInfos,
  diffMapTree,
} from '@/utils/editorMain/mapTreeOps'
import { editorHistoryMethods } from '@/utils/editorMain/editorHistory'

/** 8 列图块 × 36px + 纵向滚动条 */
const LEFT_MIN = 304
const MAP_MIN = 280
const SPLITTER = 5
const PALETTE_MIN = 140
const MAPTREE_MIN = 100

export default {
  name: 'EditorMain',
  components: {
    DatabaseDialog,
    MapViewer,
    MapTreeNode,
    EventEditorDialog,
    MapToolsPanel,
    TilePalette,
    MapSettingsDialog,
  },
  data() {
    return {
      tileInfo: null,
      selectedEventInfo: null,
      mapError: '',
      mapDirty: false,
      savedMapInfos: null,
      treeSave: {
        visible: false,
        lines: [],
      },
      leftWidth: 304,
      paletteHeight: 360,
      paletteTabs: ['A', 'B', 'C', 'D', 'E', 'R'],
      paintBrush: null,
      currentTilesetId: 0,
      expandedIds: {},
      _drag: null,
      editorVisible: false,
      editingEvent: null,
      editorRefMode: null,
      eventClipboard: null,
      eventFilter: '',
      eventListTick: 0,
      ctxMenu: {
        visible: false,
        x: 0,
        y: 0,
        mapX: 0,
        mapY: 0,
        eventId: 0,
        mode: 'map',
      },
      treeMenu: { visible: false, x: 0, y: 0, mapId: 0 },
      treeDragId: 0,
      mapClipboard: null,
      mapSettings: {
        visible: false,
        mode: 'edit',
        mapId: 0,
        parentId: 0,
        mapInfo: null,
        mapData: null,
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
      'editorUi',
    ]),
    blockedMapIds() {
      return (this.editorUi && this.editorUi.blockedMapIds) || []
    },
    mapList() {
      const list = this.mapInfos
      if (!Array.isArray(list)) return []
      return list.filter((m) => m && m.id > 0)
    },
    treeRoots() {
      return this.buildTree()
    },
    filteredMapEvents() {
      void this.eventListTick
      void this.selectedMapId
      const q = (this.eventFilter || '').trim().toLowerCase()
      return this.currentMapEvents.filter((ev) => {
        if (!q) return true
        return String(ev.id).includes(q) || String(ev.name || '').toLowerCase().includes(q)
      })
    },
    currentMapEvents() {
      void this.eventListTick
      void this.selectedMapId
      // 只读 MapViewer 已加载数据；禁止在这里 sync 整份 MapXXX.json（换图会双倍解析，大图直接崩）
      const viewer = this.$refs.mapViewer
      const events =
        viewer && viewer.currentMapData && viewer.currentMapData.events
          ? viewer.currentMapData.events
          : null
      return (events || []).filter((ev) => ev && ev.id > 0)
    },
    modeLabel() {
      return this.editorMode === 'map' ? '地图模式' : '事件模式'
    },
    mapTreeDirty() {
      return diffMapTree(this.savedMapInfos, this.mapInfos).length > 0
    },
    statusText() {
      if (this.mapError) return this.mapError
      const dirty = this.mapDirty || this.mapTreeDirty ? ' · 未保存' : ''
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
      if (this.tileInfo && this.editorMode === 'map') {
        const t = this.tileInfo
        return `地图 ${this.selectedMapId} · (${t.x},${t.y}) Region=${t.regionId} · 绘制中${dirty}`
      }
      if (this.selectedMapId) {
        const m = this.mapList.find((x) => x.id === this.selectedMapId)
        return m
          ? `地图 ${m.id}: ${m.name || ''} · 左键绘制 / 右键擦除 · Ctrl+右键平移 · Ctrl+Z 撤销${dirty}`
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
          const blocked = new Set(this.blockedMapIds)
          const first = [...list]
            .filter((m) => !blocked.has(m.id))
            .sort((a, b) => (a.order || 0) - (b.order || 0))[0]
          if (first) this.$store.commit('setSelectedMapId', first.id)
        }
      },
    },
    selectedMapId() {
      this.tileInfo = null
      this.selectedEventInfo = null
      this.mapError = ''
      this.mapDirty = false
      this.eventFilter = ''
      this.eventListTick += 1
      this.closeAllMenus()
    },
    editorMode(mode) {
      this.closeAllMenus()
      if (mode === 'event') this.$store.commit('setShowEvents', true)
    },
    editorVisible(v) {
      if (!v) this.editorRefMode = null
    },
    'selectedEventInfo.id'() {
      this.scrollEventListToSelected()
    },
  },
  mounted() {
    this.savedMapInfos = cloneMapInfos(this.mapInfos)
    this._onDragMove = (e) => this.onDragMove(e)
    this._onDragEnd = () => this.onDragEnd()
    this._onWinResize = () => {
      this.leftWidth = this.clampLeftWidth(this.leftWidth)
      this.paletteHeight = this.clampPaletteHeight(this.paletteHeight)
    }
    this._onKey = (e) => {
      const tag = (e.target && e.target.tagName) || ''
      const typing =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target && e.target.isContentEditable)
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key
      if (!typing && this.editorMode === 'event') {
        if (key === 'c' || key === 'C') {
          e.preventDefault()
          this.hotkeyCopyEvent()
          return
        }
        if (key === 'x' || key === 'X') {
          e.preventDefault()
          this.hotkeyCutEvent()
          return
        }
        if (key === 'v' || key === 'V') {
          e.preventDefault()
          this.hotkeyPasteEvent()
          return
        }
      }
      if (key === 's' || key === 'S') {
        e.preventDefault()
        this.requestSave()
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
    this._onSaveEvt = () => this.requestSave()
    this._onCutEvt = () => this.hotkeyCutEvent()
    this._onCopyEvt = () => this.hotkeyCopyEvent()
    this._onPasteEvt = () => this.hotkeyPasteEvent()
    window.addEventListener('resize', this._onWinResize)
    window.addEventListener('keydown', this._onKey)
    window.addEventListener('editor-map-undo', this._onUndoEvt)
    window.addEventListener('editor-map-redo', this._onRedoEvt)
    window.addEventListener('editor-map-save', this._onSaveEvt)
    window.addEventListener('editor-map-cut', this._onCutEvt)
    window.addEventListener('editor-map-copy', this._onCopyEvt)
    window.addEventListener('editor-map-paste', this._onPasteEvt)
    this.$nextTick(this._onWinResize)
  },
  beforeUnmount() {
    this.detachDrag()
    window.removeEventListener('resize', this._onWinResize)
    window.removeEventListener('keydown', this._onKey)
    window.removeEventListener('editor-map-undo', this._onUndoEvt)
    window.removeEventListener('editor-map-redo', this._onRedoEvt)
    window.removeEventListener('editor-map-save', this._onSaveEvt)
    window.removeEventListener('editor-map-cut', this._onCutEvt)
    window.removeEventListener('editor-map-copy', this._onCopyEvt)
    window.removeEventListener('editor-map-paste', this._onPasteEvt)
  },
  methods: {
    ...mapTreeOpsMethods,
    ...editorHistoryMethods,
    viewer() {
      return this.$refs.mapViewer
    },
    nudgeFixedMenu(refName, stateKey, x, y) {
      this.$nextTick(() => {
        const el = this.$refs[refName]
        if (!el) return
        const h = el.offsetHeight || 0
        const w = el.offsetWidth || 0
        const pad = 4
        let left = x
        let top = y
        if (top + h > window.innerHeight - pad) top = y - h
        if (top < pad) top = pad
        if (left + w > window.innerWidth - pad) left = window.innerWidth - w - pad
        if (left < pad) left = pad
        const cur = this[stateKey]
        if (!cur) return
        cur.x = left
        cur.y = top
      })
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
      this.eventListTick += 1
      this.syncTilesetId()
    },
    onMapDirty() {
      this.mapDirty = true
    },
    syncTilesetId() {
      const v = this.viewer()
      const map = v && v.getMapData()
      this.currentTilesetId = (map && map.tilesetId) || 0
    },
    onPaintStroke({ before, after }) {
      if (!this.selectedMapId || !before || !before.length) return
      pushHistory(this.selectedMapId, {
        type: 'tiles',
        label: '绘制图块',
        before,
        after,
      })
      this.mapDirty = true
    },
    onBrushPick(brush) {
      if (!brush || !brush.tiles) return
      this.paintBrush = brush
      const pal = this.$refs.tilePalette
      const samePage = !brush.page || brush.page === this.paletteTab
      if (pal && typeof pal.prepareBrush === 'function') pal.prepareBrush(brush)
      if (brush.page) this.setPaletteTab(brush.page)
      if (samePage && pal && typeof pal.applyBrush === 'function') pal.applyBrush(brush)
    },
    onEventSelect(info) {
      this.selectedEventInfo = info
      this.eventListTick += 1
      this.closeCtx()
      this.scrollEventListToSelected()
    },
    scrollEventListToSelected() {
      const id = this.selectedEventInfo && this.selectedEventInfo.id
      if (!id || this.editorMode !== 'event') return
      this.$nextTick(() => {
        const root = this.$refs.eventRows
        if (!root) return
        const row = root.querySelector('.mz-event-row.active')
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' })
      })
    },
    focusMapEvent(ev) {
      if (!ev || !this.selectedMapId) return
      this.selectedEventInfo = { id: ev.id, name: ev.name, x: ev.x, y: ev.y }
      this.$store.dispatch('requestFocusEvent', { mapId: this.selectedMapId, eventId: ev.id })
      this.scrollEventListToSelected()
    },
    onOpenEvent({ id }) {
      const v = this.viewer()
      const ev = v && v.getEventById(id)
      if (!ev) return
      this._pendingCreate = false
      // 始终打开本地事件（含超链接桩），模板改由编辑器内「查看模板」进入
      this.editorRefMode = null
      this.editingEvent = JSON.parse(JSON.stringify(ev))
      this.editorVisible = true
    },
    onViewRef(refId) {
      const n = Number(refId) || 0
      if (!n) return
      const template = loadTemplateEvent(n)
      if (!template) {
        ElMessage.warning(`Map${String(REF_TEMPLATE_MAP_ID).padStart(3, '0')} 上找不到 EV${String(n).padStart(3, '0')}`)
        return
      }
      this.editingEvent = template
      this.editorRefMode = { mapId: REF_TEMPLATE_MAP_ID, refId: n }
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
      this.closeTreeMenu()
      this.ctxMenu = {
        visible: true,
        x: payload.clientX,
        y: payload.clientY,
        mapX: payload.x,
        mapY: payload.y,
        eventId: payload.eventId || 0,
        mode: payload.mode || 'map',
      }
      this.nudgeFixedMenu('mapCtxEl', 'ctxMenu', payload.clientX, payload.clientY)
    },
    closeCtx() {
      if (this.ctxMenu.visible) this.ctxMenu.visible = false
    },
    closeAllMenus() {
      this.closeCtx()
      this.closeTreeMenu()
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
      this.copyEventById(this.ctxMenu.eventId)
      this.closeCtx()
    },
    ctxCut() {
      this.cutEventById(this.ctxMenu.eventId)
      this.closeCtx()
    },
    ctxPaste() {
      const { mapX, mapY } = this.ctxMenu
      this.closeCtx()
      this.pasteEventAt(mapX, mapY)
    },
    copyEventById(id) {
      const v = this.viewer()
      const ev = v && v.getEventById(id)
      if (!ev) return false
      this.eventClipboard = JSON.parse(JSON.stringify(ev))
      return true
    },
    cutEventById(id) {
      const v = this.viewer()
      const ev = v && v.getEventById(id)
      if (!ev) return false
      const before = this.snapshotEvents()
      this.eventClipboard = JSON.parse(JSON.stringify(ev))
      v.removeEventById(id)
      this.pushEventsHistory('剪切事件', before)
      this.selectedEventInfo = null
      this.saveMap()
      return true
    },
    pasteEventAt(mapX, mapY) {
      if (!this.eventClipboard) return false
      const v = this.viewer()
      const map = v && v.getMapData()
      if (!map) return false
      if (v.findEventAt(mapX, mapY)) return false
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
      return true
    },
    hotkeyCopyEvent() {
      const id = this.selectedEventInfo && this.selectedEventInfo.id
      if (id) this.copyEventById(id)
    },
    hotkeyCutEvent() {
      const id = this.selectedEventInfo && this.selectedEventInfo.id
      if (id) this.cutEventById(id)
    },
    hotkeyPasteEvent() {
      const v = this.viewer()
      let x = null
      let y = null
      if (v && v.selectedTile) {
        x = v.selectedTile.x
        y = v.selectedTile.y
      } else if (this.selectedEventInfo && this.selectedEventInfo.x != null) {
        x = this.selectedEventInfo.x
        y = this.selectedEventInfo.y
      }
      if (x == null || y == null) return
      this.pasteEventAt(x, y)
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
  min-width: 304px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--app-surface-2);
  overflow-x: hidden;
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
  overflow-x: hidden;
}
.mz-event-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
}
.mz-event-rows {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--app-border);
  background: #fff;
}
.mz-event-row {
  display: flex;
  gap: 8px;
  padding: 2px 8px;
  font-size: 13px;
  cursor: pointer;
  color: #222;
}
.mz-event-row:nth-child(even) {
  background: #f0f5fa;
}
.mz-event-row.active {
  background: #2a5db0;
  color: #fff;
}
.mz-event-id {
  width: 36px;
  flex-shrink: 0;
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
  overflow-x: hidden;
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
.mz-maptree-scroll :deep(.el-scrollbar__wrap) {
  overflow-x: hidden !important;
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
.mz-save-lead {
  margin: 0 0 8px;
  line-height: 1.5;
}
.mz-save-list {
  margin: 0 0 8px;
  padding-left: 18px;
  max-height: 240px;
  overflow: auto;
  line-height: 1.6;
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
