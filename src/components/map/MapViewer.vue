<template>
  <div class="map-viewer">
    <div class="map-stage">
      <div ref="canvasContainer" class="canvas-container">
        <canvas
          ref="canvas"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @mouseleave="onMouseLeave"
          @dblclick="onDblClick"
          @wheel.prevent="onWheel"
          @contextmenu="onContextMenu" />
        <div v-if="!mapId" class="map-empty">请从左侧地图列表选择地图</div>
        <div v-else-if="loadError" class="map-empty">{{ loadError }}</div>
        <div v-else-if="mapLoading" class="map-empty">加载中…</div>
        <!-- 覆盖式滚动条：不挤占画布 -->
        <div
          v-show="scrollMetrics.showV"
          ref="vScroll"
          class="map-scroll map-scroll-v"
          :class="{ 'has-h': scrollMetrics.showH }"
          @scroll="onVScroll">
          <div class="map-scroll-spacer" :style="{ height: scrollMetrics.contentH + 'px' }" />
        </div>
        <div
          v-show="scrollMetrics.showH"
          ref="hScroll"
          class="map-scroll map-scroll-h"
          :class="{ 'has-v': scrollMetrics.showV }"
          @scroll="onHScroll">
          <div class="map-scroll-spacer" :style="{ width: scrollMetrics.contentW + 'px' }" />
        </div>
        <div
          v-show="scrollMetrics.showH && scrollMetrics.showV"
          class="map-scroll-corner" />
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
import {
  isAutotile,
  isTileA5,
  getAutotileKind,
  isLowerTile,
} from './mapAutotile'
import { tileSetOfId } from '@/utils/imgAssets'
import { getEventDisplayPage } from './eventRef'
import { eventsLayerMethods } from '@/utils/mapViewer/eventsLayer'
import { paintMethods } from '@/utils/mapViewer/paint'
import { renderMethods } from '@/utils/mapViewer/render'
import { scrollFocusMethods, scrollFocusComputed } from '@/utils/mapViewer/scrollFocus'


export default {
  name: 'MapViewer',
  props: {
    mapId: { type: Number, default: 0 },
    projectPath: { type: String, default: '' },
    editLayer: { type: [String, Number], default: 'auto' },
    showGrid: { type: Boolean, default: false },
    showRegions: { type: Boolean, default: false },
    showEvents: { type: Boolean, default: true },
    paintEnabled: { type: Boolean, default: false },
    brush: { type: Object, default: null },
  },
  emits: [
    'tile-select',
    'ready',
    'error',
    'event-select',
    'open-event',
    'create-event',
    'event-moved',
    'event-context',
    'map-dirty',
    'paint-stroke',
    'brush-pick',
  ],
  data() {
    return {
      tilesets: {},
      flags: [],
      tilesetImages: {},
      characterImages: {},
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      isPanning: false,
      hasDragged: false,
      dragStartX: 0,
      dragStartY: 0,
      velocityX: 0,
      velocityY: 0,
      lastMoveTime: 0,
      boundaryFeedback: 'bounce',
      boundaryGlowAlpha: 0,
      boundaryDirections: { top: false, right: false, bottom: false, left: false },
      tileWidth: 48,
      tileHeight: 48,
      mapCache: null,
      regionsCache: null,
      eventsCache: null,
      needsRedraw: true,
      selectedTile: null,
      hoverTile: null,
      selectedEventId: 0,
      draggingEventId: 0,
      eventDragOrigin: null,
      isPainting: false,
      paintErase: false,
      paintLastCell: null,
      paintBefore: null,
      paintDirtyCells: null,
      isShapeDrag: false,
      shapePreview: null,
      isEyedrop: false,
      startMarkers: {
        player: { mapId: 0, x: 0, y: 0 },
        boat: { mapId: 0, x: 0, y: 0, characterName: '', characterIndex: 0 },
        ship: { mapId: 0, x: 0, y: 0, characterName: '', characterIndex: 0 },
        airship: { mapId: 0, x: 0, y: 0, characterName: '', characterIndex: 0 },
      },
      loadError: '',
      mapLoading: false,
      pendingFit: false,
      syncingScroll: false,
      scrollTick: 0,
      _raf: 0,
      _loadToken: 0,
      _paintToken: 0,
    }
  },
  computed: {
    ...scrollFocusComputed,
    ...mapGetters([
      'zoomRequest',
      'editorMode',
      'mapCharOriginalSize',
      'previewWalkAnim',
      'showHyperlinks',
      'showHyperlinkImages',
      'focusEventRequest',
      'editorUi',
      'paintTool',
      'paletteTab',
    ]),
    workRoot() {
      if (this.projectPath) return this.projectPath
      try {
        return DataManager.$config && DataManager.$config.workSpace
      } catch (e) {
        return ''
      }
    },
    isEventMode() {
      return this.editorMode === 'event'
    },
    /** 超链接桩是否按 Map015 模板图像绘制 */
    useHyperlinkImages() {
      return !!(this.showHyperlinks && this.showHyperlinkImages)
    },
    effectiveShowGrid() {
      return this.showGrid || this.isEventMode
    },
    effectiveShowEvents() {
      return this.showEvents || this.isEventMode
    },

  },
  watch: {
    mapId: {
      immediate: true,
      handler(id) {
        this.stopWalkAnim()
        this.clearFocusRing(true)
        if (id > 0) this.loadMap(id)
        else {
          this.currentMapData = null
          this.loadError = ''
          this.selectedEventId = 0
          this.$nextTick(() => this.render())
        }
      },
    },
    editLayer() {
      this.render()
    },
    showGrid() {
      this.render()
    },
    showRegions() {
      this.render()
    },
    showEvents() {
      this.render()
    },
    editorMode() {
      this.cancelShape()
      this.hoverTile = null
      this.render()
    },
    paintTool() {
      this.cancelShape()
    },
    brush() {
      // 笔刷尺寸变了：快照仍有效，只重叠框即可
      if (this.hoverTile) this.renderHoverOverlay()
    },
    mapCharOriginalSize() {
      this.refreshEventsLayer()
    },
    previewWalkAnim(v) {
      if (v) this.startWalkAnim()
      else this.stopWalkAnim()
    },
    showHyperlinks() {
      this.refreshEventsLayer()
    },
    showHyperlinkImages() {
      if (this.useHyperlinkImages && this.currentMapData) {
        this.preloadEventCharacters(this._loadToken)
          .then(() => this.refreshEventsLayer())
          .catch((e) => console.error(e))
      } else {
        this.refreshEventsLayer()
      }
    },
    focusEventRequest(req) {
      if (!req) return
      if (req.mapId && req.mapId !== this.mapId) {
        this._pendingFocus = req
        return
      }
      this.applyFocusRequest(req)
    },
    zoomRequest(req) {
      if (!req) return
      if (req === 'in') this.zoomIn()
      else if (req === 'out') this.zoomOut()
      else if (req === 'reset') this.resetView()
      else if (req === 'fit') this.fitToView()
      this.$store.commit('clearZoomRequest')
    },
    'editorUi.mapBgSkin': {
      immediate: true,
      handler(name) {
        this.loadMapBgSkin(name)
      },
    },
    // 勿 deep 监听整个 editorUi：写盘/回写会连带触发，且 applyEditorUiCss 可能引起 ResizeObserver 重入 render
    'editorUi.mapBgSkinOpacity'() {
      this.render()
    },
    'editorUi.mapEmptyColor'() {
      this.render()
    },
    'editorUi.gridColor'() {
      this.render()
    },
    'editorUi.gridWidth'() {
      this.render()
    },
    'editorUi.mapEdgeVisible'() {
      this.render()
    },
    'editorUi.mapEdgeColor'() {
      this.render()
    },
    'editorUi.eventFillColor'() {
      this.refreshEventsLayer()
      this.render()
    },
    'editorUi.eventLargeFit'() {
      this.refreshEventsLayer()
      this.render()
    },
  },
  mounted() {
    this.canvas = this.$refs.canvas
    this.ctx = this.canvas.getContext('2d')
    this.resizeCanvas()
    this._onResize = () => this.resizeCanvas()
    window.addEventListener('resize', this._onResize)
    if (typeof ResizeObserver !== 'undefined' && this.$refs.canvasContainer) {
      this._ro = new ResizeObserver(() => this.resizeCanvas())
      this._ro.observe(this.$refs.canvasContainer)
    }
    this.emitZoom()
    this.startInertia()
    this.loadTilesetsIndex()
    if (this.previewWalkAnim) this.startWalkAnim()
  },
  created() {
    this.currentMapData = null
    this._focusRing = null
    this._focusBase = null
    this._focusRaf = 0
    this._focusTimer = 0
    this._pendingFocus = null
    this._mapBgImg = null
    this._mapBgName = ''
    this._rendering = false
    this._panFrame = 0
    this._cachePainting = false
    this._pendingCacheRedraw = false
    this._cacheMetrics = null
    this._viewBuf = null
    this._viewBufMeta = null
    this._viewBufDirty = true
    this._bufTw = 0
    this._bufTh = 0
    this._mapPaint = null
    this._mapPaintReady = false
    this._bufJob = null
      this._bufToken = 0
      this._bufRaf = 0
      this._interacting = false
      this._interactTimer = 0
  },
  beforeUnmount() {
    this._loadToken += 1
    this._paintToken += 1
    this._cachePainting = false
    this._pendingCacheRedraw = false
    this._cacheMetrics = null
    this.releaseMapCaches()
    window.removeEventListener('resize', this._onResize)
    if (this._ro) this._ro.disconnect()
    if (this._raf) cancelAnimationFrame(this._raf)
    if (this._panFrame) cancelAnimationFrame(this._panFrame)
    if (this._focusTimer) clearTimeout(this._focusTimer)
    this.clearFocusRing(true)
    this.stopWalkAnim(false)
  },
  methods: {
    ...eventsLayerMethods,
    ...paintMethods,
    ...renderMethods,
    ...scrollFocusMethods,
    getMapData() {
      return this.currentMapData
    },
    loadTilesetsIndex() {
      const arr = DataManager.$loadDataSync('Tilesets', false, false)
      const next = {}
      if (Array.isArray(arr)) {
        arr.forEach((t) => {
          if (t && t.id) next[t.id] = markRaw(t)
        })
      }
      this.tilesets = markRaw(next)
    },
    frameYield() {
      return new Promise((resolve) => requestAnimationFrame(() => resolve()))
    },
    readMapFile(mapPath) {
      return new Promise((resolve, reject) => {
        try {
          if (typeof fs.readFile === 'function') {
            fs.readFile(mapPath, 'utf-8', (err, data) => {
              if (err) reject(err)
              else resolve(typeof data === 'string' ? data : String(data))
            })
            return
          }
          resolve(fs.readFileSync(mapPath, 'utf-8'))
        } catch (e) {
          reject(e)
        }
      })
    },
    async loadMap(mapId) {
      const token = ++this._loadToken
      this._paintToken += 1
      this._cachePainting = false
      this._pendingCacheRedraw = false
      this.mapLoading = true
      this.stopWalkAnim(false)
      this.clearFocusRing(true)
      this.releaseMapCaches()
      this.loadError = ''
      this.selectedTile = null
      this.selectedEventId = 0
      this.characterImages = {}
      this.currentMapData = null
      this.zoom = Math.min(1, Math.max(0.05, this.zoom || 1))
      this.needsRedraw = true
      this.render()
      try {
        await this.$nextTick()
        if (token !== this._loadToken) return
        if (!isNw || !fs || !path || !this.workRoot) {
          this.loadError = '需要 NW.js 工作空间才能加载地图'
          this.$emit('error', this.loadError)
          return
        }
        if (!this.tilesets || !Object.keys(this.tilesets).length) this.loadTilesetsIndex()
        const mapFileName = `Map${String(mapId).padStart(3, '0')}.json`
        const mapPath = path.join(this.workRoot, 'data', mapFileName)
        if (!fs.existsSync(mapPath)) {
          this.loadError = `地图文件不存在: ${mapFileName}`
          this.$emit('error', this.loadError)
          return
        }
        // immediate watcher 可能早于 mounted：等到 canvas 就绪再继续
        for (let i = 0; i < 30 && !this.canvas; i++) {
          await this.frameYield()
          if (token !== this._loadToken) return
        }
        if (!this.canvas) {
          this.loadError = '画布未就绪'
          this.$emit('error', this.loadError)
          return
        }
        const text = await this.readMapFile(mapPath)
        if (token !== this._loadToken) return
        let map
        try {
          map = JSON.parse(text)
        } catch (e) {
          throw new Error('地图 JSON 解析失败')
        }
        if (token !== this._loadToken) return
        if (!map || !map.width || !map.height) throw new Error('地图尺寸无效')
        if (!Array.isArray(map.events)) map.events = [null]

        const willFocus = !!(
          (this._pendingFocus && this._pendingFocus.mapId === mapId) ||
          (this.focusEventRequest && this.focusEventRequest.mapId === mapId)
        )
        this.resizeCanvas()
        const cw = Math.max(1, (this.canvas && this.canvas.width) || 800)
        const ch = Math.max(1, (this.canvas && this.canvas.height) || 600)
        const mapPxW = Math.max(1, Number(map.width) * this.tileWidth)
        const mapPxH = Math.max(1, Number(map.height) * this.tileHeight)
        // 先定安全缩放再挂数据，避免中间帧撑爆滚动条 DOM / 整图绘制卡死
        this.zoom = willFocus ? 1 : this.safeFitZoom(mapPxW, mapPxH, cw, ch)
        this.offsetX = (cw - mapPxW * this.zoom) / 2
        this.offsetY = (ch - mapPxH * this.zoom) / 2
        this.velocityX = 0
        this.velocityY = 0
        this.currentMapData = markRaw(map)
        this.invalidateViewBuf()
        this.loadStartPosition()
        // 图块未就绪前不重绘整屏，只更新滚动条状态
        this.emitZoom()
        this.bumpScroll()

        await this.loadTilesetImages()
        if (token !== this._loadToken) return
        this.loadTilesetFlags()
        this.pendingFit = false
        if (!willFocus) this.fitToView({ render: false })
        else this.emitZoom()
        if (token !== this._loadToken) return
        await this.frameYield()
        if (token !== this._loadToken) return
        this.render()
        if (this.previewWalkAnim) this.startWalkAnim()
        this.tryPendingFocus(mapId)
        this.$emit('ready', { mapId })
        // 行走图后台限流加载，不阻塞首帧
        this.preloadEventCharacters(token)
          .then(() => this.preloadStartCharacters())
          .then(() => {
            if (token !== this._loadToken) return
            this.render()
          })
          .catch((e) => console.error(e))
      } catch (e) {
        if (token !== this._loadToken) return
        console.error(e)
        this.loadError = '加载地图失败: ' + ((e && e.message) || e)
        this.$emit('error', this.loadError)
      } finally {
        if (token === this._loadToken && !this._bufJob) this.mapLoading = false
      }
    },
    loadTilesetFlags() {
      const tileset = this.tilesets[this.currentMapData.tilesetId]
      this.flags = tileset && tileset.flags ? tileset.flags : []
    },
    loadStartPosition() {
      const emptyVeh = () => ({ mapId: 0, x: 0, y: 0, characterName: '', characterIndex: 0 })
      try {
        const sys = DataManager.$loadDataSync('System', false, false)
        if (!sys) {
          this.startMarkers = {
            player: { mapId: 0, x: 0, y: 0 },
            boat: emptyVeh(),
            ship: emptyVeh(),
            airship: emptyVeh(),
          }
          return
        }
        const veh = (key) => {
          const v = sys[key] || {}
          return {
            mapId: v.startMapId || 0,
            x: v.startX || 0,
            y: v.startY || 0,
            characterName: v.characterName || '',
            characterIndex: v.characterIndex || 0,
          }
        }
        this.startMarkers = {
          player: {
            mapId: sys.startMapId || 0,
            x: sys.startX || 0,
            y: sys.startY || 0,
          },
          boat: veh('boat'),
          ship: veh('ship'),
          airship: veh('airship'),
        }
      } catch (e) {
        this.startMarkers = {
          player: { mapId: 0, x: 0, y: 0 },
          boat: emptyVeh(),
          ship: emptyVeh(),
          airship: emptyVeh(),
        }
      }
    },
    setStartPosition(kind, x, y, opts = {}) {
      if (!this.mapId) return false
      const sys = DataManager.$loadDataSync('System', false, false)
      if (!sys) return false
      const clear = !!opts.clear
      if (kind === 'player') {
        if (clear) return false
        sys.startMapId = this.mapId
        sys.startX = x
        sys.startY = y
      } else if (kind === 'boat' || kind === 'ship' || kind === 'airship') {
        if (!sys[kind]) sys[kind] = {}
        if (clear) {
          sys[kind].startMapId = 0
          sys[kind].startX = 0
          sys[kind].startY = 0
        } else {
          sys[kind].startMapId = this.mapId
          sys[kind].startX = x
          sys[kind].startY = y
        }
      } else {
        return false
      }
      const ok = DataManager.$saveDataSync('System', sys)
      if (ok) {
        this.loadStartPosition()
        this.render()
      }
      return ok
    },
    loadImageFile(imgFile) {
      return new Promise((resolve) => {
        const img = new Image()
        img.src = imgFile
        img.onload = () => resolve(img)
        img.onerror = () => {
          try {
            img.src = 'file:///' + imgFile.replace(/\\/g, '/')
            img.onload = () => resolve(img)
            img.onerror = () => resolve(null)
          } catch (e) {
            resolve(null)
          }
        }
      })
    },
    async loadTilesetImages() {
      if (!this.currentMapData) return
      const tileset = this.tilesets[this.currentMapData.tilesetId]
      if (!tileset) return
      const imgPath = path.join(this.workRoot, 'img', 'tilesets')
      for (const tilesetName of tileset.tilesetNames || []) {
        if (!tilesetName || this.tilesetImages[tilesetName]) continue
        const imgFile = path.join(imgPath, tilesetName + '.png')
        if (!fs.existsSync(imgFile)) continue
        const img = await this.loadImageFile(imgFile)
        if (img) this.tilesetImages[tilesetName] = markRaw(img)
      }
    },
    async ensureCharacterImage(name) {
      if (!name) return null
      if (this.characterImages[name]) return this.characterImages[name]
      const imgFile = path.join(this.workRoot, 'img', 'characters', name + '.png')
      if (!fs.existsSync(imgFile)) {
        this.characterImages[name] = null
        return null
      }
      const img = await this.loadImageFile(imgFile)
      this.characterImages[name] = img ? markRaw(img) : null
      return this.characterImages[name]
    },
    async preloadEventCharacters(token) {
      if (!this.currentMapData) return
      const names = new Set()
      const useTpl = this.useHyperlinkImages
      ;(this.currentMapData.events || []).forEach((ev) => {
        if (!ev) return
        const page = getEventDisplayPage(ev, useTpl)
        const n = page && page.image && page.image.characterName
        if (n) names.add(n)
      })
      // 限流：避免一张图上百张行走图同时解码把 NW 打崩
      const list = [...names]
      const conc = 4
      for (let i = 0; i < list.length; i += conc) {
        if (token != null && token !== this._loadToken) return
        await Promise.all(list.slice(i, i + conc).map((n) => this.ensureCharacterImage(n)))
      }
    },
    async preloadStartCharacters() {
      for (const k of ['boat', 'ship', 'airship']) {
        const n = this.startMarkers[k] && this.startMarkers[k].characterName
        if (n) await this.ensureCharacterImage(n)
      }
    },
    async renderToCacheAsync() {
      this.invalidateViewBuf()
    },
    resizeCanvas() {
      const container = this.$refs.canvasContainer
      if (!container || !this.canvas) return
      const w = container.clientWidth
      const h = container.clientHeight
      if (this.canvas.width === w && this.canvas.height === h) {
        // 尺寸未变时勿重设 width（会清空画布并可能与进行中的 render 打架）
        return
      }
      this.canvas.width = w
      this.canvas.height = h
      if (this.pendingFit && w > 8 && h > 8) {
        this.pendingFit = false
        this.fitToView()
        return
      }
      this.clampOffset()
      this.render()
    },
    clientToMap(e) {
      const rect = this.canvas.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top
      const mapX = Math.floor((canvasX - this.offsetX) / this.zoom / this.tileWidth)
      const mapY = Math.floor((canvasY - this.offsetY) / this.zoom / this.tileHeight)
      return { mapX, mapY, canvasX, canvasY }
    },
    inMapBounds(mx, my) {
      return (
        this.currentMapData &&
        mx >= 0 &&
        my >= 0 &&
        mx < this.currentMapData.width &&
        my < this.currentMapData.height
      )
    },
    onMouseDown(e) {
      if (!this.currentMapData) return

      // 仅 Ctrl+右键拖拽平移视图
      if (e.button === 2 && e.ctrlKey) {
        this.clearFocusRing()
        this.draggingEventId = 0
        this.isPanning = true
        this.isDragging = true
        this.hasDragged = false
        this.dragStartX = e.clientX - this.offsetX
        this.dragStartY = e.clientY - this.offsetY
        this.velocityX = 0
        this.velocityY = 0
        this._panX = this.offsetX
        this._panY = this.offsetY
        this._panMoveTime = Date.now()
        this.lastMoveTime = this._panMoveTime
        e.preventDefault()
        return
      }

      // 地图模式：右键吸管；Alt+右键擦除；阴影笔右键仍清阴影
      if (e.button === 2 && this.paintEnabled && !this.isEventMode && this.currentMapData) {
        const tool = this.activePaintTool()
        if (tool === 'shadow') {
          if (this.canPaint()) this.startToolStroke(e, true)
        } else if (e.altKey) {
          if (this.canPaint()) this.startToolStroke(e, true)
        } else {
          this.beginEyedrop(e)
        }
        e.preventDefault()
        return
      }
      if (e.button === 2) return

      if (e.button === 0) this.clearFocusRing()

      if (e.button === 0 && this.canPaint()) {
        this.startToolStroke(e, false)
        e.preventDefault()
        return
      }

      if (this.isEventMode && e.button === 0) {
        const { mapX, mapY } = this.clientToMap(e)
        const hit = this.inMapBounds(mapX, mapY) ? this.findEventAt(mapX, mapY) : null
        if (hit) {
          this.selectedEventId = hit.id
          this.selectedTile = { x: hit.x, y: hit.y }
          this.draggingEventId = hit.id
          this.eventDragOrigin = { x: hit.x, y: hit.y }
          this.isPanning = false
          this.isDragging = true
          this.hasDragged = false
          this.velocityX = 0
          this.velocityY = 0
          this.$emit('event-select', { id: hit.id, name: hit.name, x: hit.x, y: hit.y })
          this.render()
          e.preventDefault()
          return
        }
      }

      // 左键：只做点选，不平移
      if (e.button === 0) {
        this.draggingEventId = 0
        this.isPanning = false
        this.isDragging = true
        this.hasDragged = false
        this.velocityX = 0
        this.velocityY = 0
      }
    },
    startToolStroke(e, erase) {
      const tool = this.activePaintTool()
      const { mapX, mapY } = this.clientToMap(e)
      this.selectedTile = { x: mapX, y: mapY }
      this.hasDragged = true
      if (tool === 'rect' || tool === 'ellipse') {
        this.paintErase = !!erase
        this.isShapeDrag = true
        this.isDragging = true
        this.shapePreview = { kind: tool, x0: mapX, y0: mapY, x1: mapX, y1: mapY }
        this.render()
        return
      }
      if (tool === 'fill') {
        this.floodFill(mapX, mapY, erase)
        return
      }
      if (tool === 'shadow') {
        this.beginPaintStroke(erase)
        this.isDragging = true
        this.paintShadowAt(e, erase)
        return
      }
      this.beginPaintStroke(erase)
      this.isDragging = true
      this.paintAt(mapX, mapY)
    },
    beginEyedrop(e) {
      const { mapX, mapY } = this.clientToMap(e)
      if (!this.inMapBounds(mapX, mapY)) return
      this.isEyedrop = true
      this.isDragging = true
      this.hasDragged = true
      this.selectedTile = { x: mapX, y: mapY }
      this.shapePreview = {
        kind: 'rect',
        eyedrop: true,
        x0: mapX,
        y0: mapY,
        x1: mapX,
        y1: mapY,
      }
      this.render()
    },
    cancelEyedrop() {
      this.isEyedrop = false
      this.isDragging = false
      this.shapePreview = null
      this.render()
    },
    commitEyedrop() {
      const p = this.shapePreview
      this.isEyedrop = false
      this.isDragging = false
      this.shapePreview = null
      if (!p || !this.currentMapData) {
        this.render()
        return
      }
      const brush = this.sampleBrushFromRect(p.x0, p.y0, p.x1, p.y1)
      // 取色松手后立刻以左上角为悬停锚点显示笔刷框
      this.hoverTile = { x: Math.min(p.x0, p.x1), y: Math.min(p.y0, p.y1) }
      this.render()
      if (brush) this.$emit('brush-pick', brush)
    },
    sampleTileAt(x, y) {
      if (this.paletteTab === 'R' || (this.brush && this.brush.isRegion)) {
        return { id: this.readMapData(x, y, 5) || 0, isRegion: true }
      }
      if (this.editLayer !== 'auto' && this.editLayer !== 'Auto') {
        const z = Number(this.editLayer)
        if (z >= 0 && z <= 3) return { id: this.readMapData(x, y, z) || 0, isRegion: false }
        if (z === 5) return { id: this.readMapData(x, y, 5) || 0, isRegion: true }
      }
      const lower = this.readMapData(x, y, 0) || 0
      if (lower && isLowerTile(lower)) return { id: lower, isRegion: false }
      for (const z of [2, 1, 3]) {
        const id = this.readMapData(x, y, z) || 0
        if (id) return { id, isRegion: false }
      }
      return { id: lower, isRegion: false }
    },
    normalizePickId(id, isRegion) {
      if (isRegion) return Math.max(0, Math.min(255, id | 0))
      if (!id) return 0
      if (isAutotile(id)) return 2048 + getAutotileKind(id) * 48
      return id
    },
    pageOfPickId(id, isRegion) {
      if (isRegion) return 'R'
      if (!id) return this.paletteTab || 'A'
      if (isAutotile(id) || isTileA5(id)) return 'A'
      return tileSetOfId(id) || 'B'
    },
    sampleBrushFromRect(x0, y0, x1, y1) {
      const minX = Math.min(x0, x1)
      const maxX = Math.max(x0, x1)
      const minY = Math.min(y0, y1)
      const maxY = Math.max(y0, y1)
      const tiles = []
      let isAutotileKind = false
      let isRegion = false
      let page = this.paletteTab || 'A'
      let pageSet = false
      for (let y = minY; y <= maxY; y++) {
        const row = []
        for (let x = minX; x <= maxX; x++) {
          if (!this.inMapBounds(x, y)) {
            row.push(0)
            continue
          }
          const raw = this.sampleTileAt(x, y)
          const id = this.normalizePickId(raw.id, raw.isRegion)
          if (raw.isRegion) isRegion = true
          if (isAutotile(id)) isAutotileKind = true
          if (!pageSet && (id || raw.isRegion)) {
            page = this.pageOfPickId(id, raw.isRegion)
            pageSet = true
          }
          row.push(id)
        }
        tiles.push(row)
      }
      if (isRegion) page = 'R'
      return {
        page,
        tiles,
        isAutotileKind,
        isRegion,
        cols: maxX - minX + 1,
        rows: maxY - minY + 1,
      }
    },
    onMouseMove(e) {
      if ((this.isShapeDrag || this.isEyedrop) && this.shapePreview) {
        const { mapX, mapY } = this.clientToMap(e)
        this.shapePreview = { ...this.shapePreview, x1: mapX, y1: mapY }
        this.render()
        return
      }

      if (this.canPaint() && !this.isEyedrop && !this.isShapeDrag) {
        const { mapX, mapY } = this.clientToMap(e)
        const prev = this.hoverTile
        if (!prev || prev.x !== mapX || prev.y !== mapY) {
          this.hoverTile = { x: mapX, y: mapY }
          // 空闲悬停：只叠笔刷框，不全量重绘地图
          if (!this.isDragging) this.renderHoverOverlay()
        }
      }

      if (!this.isDragging) return

      if (this.isPainting) {
        if (this.activePaintTool() === 'shadow') this.paintShadowAt(e, this.paintErase)
        else {
          const { mapX, mapY } = this.clientToMap(e)
          this.paintAt(mapX, mapY)
        }
        return
      }

      if (this.draggingEventId) {
        const { mapX, mapY } = this.clientToMap(e)
        if (!this.inMapBounds(mapX, mapY)) return
        const ev = this.getEventById(this.draggingEventId)
        if (!ev) return
        if (ev.x !== mapX || ev.y !== mapY) {
          const other = this.findEventAt(mapX, mapY)
          if (other && other.id !== ev.id) return
          ev.x = mapX
          ev.y = mapY
          this.hasDragged = true
          this.refreshEventsLayer()
        }
        return
      }

      if (!this.isPanning) return

      const newOffsetX = e.clientX - this.dragStartX
      const newOffsetY = e.clientY - this.dragStartY
      if (Math.abs(newOffsetX - this.offsetX) > 3 || Math.abs(newOffsetY - this.offsetY) > 3) {
        this.hasDragged = true
      }
      const now = Date.now()
      const dt = now - (this._panMoveTime || now)
      if (dt > 0) {
        this.velocityX = ((newOffsetX - this._panX) / dt) * 16
        this.velocityY = ((newOffsetY - this._panY) / dt) * 16
      }
      this._panX = newOffsetX
      this._panY = newOffsetY
      this._panMoveTime = now
      this.schedulePanFrame()
    },
    onMouseLeave(e) {
      if (this.isEyedrop) {
        this.cancelEyedrop()
        return
      }
      if (this.isShapeDrag) {
        this.cancelShape()
        return
      }
      const hadHover = !!this.hoverTile
      this.hoverTile = null
      this.onMouseUp(e)
      // 离开画布时清掉悬停框（未拖拽时 onMouseUp 不会重绘）
      if (hadHover && !this.isDragging) this.renderHoverOverlay()
    },
    onMouseUp(e) {
      if (this.isEyedrop) {
        this.commitEyedrop()
        return
      }
      if (this.isShapeDrag) {
        this.commitShape()
        return
      }
      if (this.isPainting) {
        this.isDragging = false
        this.endPaintStroke()
        return
      }
      if (!this.isDragging) return
      const wasPanning = this.isPanning
      if (wasPanning) this.flushPanFrame()
      this.isDragging = false
      this.isPanning = false

      if (this.draggingEventId) {
        const id = this.draggingEventId
        const ev = this.getEventById(id)
        this.draggingEventId = 0
        if (this.hasDragged && ev) {
          const from = this.eventDragOrigin || { x: ev.x, y: ev.y }
          this.$emit('event-moved', {
            id: ev.id,
            x: ev.x,
            y: ev.y,
            fromX: from.x,
            fromY: from.y,
          })
          this.$emit('map-dirty')
        } else if (!this.hasDragged && ev) {
          this.selectedTile = { x: ev.x, y: ev.y }
          this.$emit('event-select', { id: ev.id, name: ev.name, x: ev.x, y: ev.y })
        }
        this.eventDragOrigin = null
        this.render()
        return
      }

      if (wasPanning) return
      if (!this.hasDragged) this.handleTileClick(e)
    },
    onDblClick(e) {
      if (!this.isEventMode || !this.currentMapData) return
      e.preventDefault()
      const { mapX, mapY } = this.clientToMap(e)
      if (!this.inMapBounds(mapX, mapY)) return
      const hit = this.findEventAt(mapX, mapY)
      if (hit) {
        this.selectedEventId = hit.id
        this.$emit('open-event', { id: hit.id })
      } else {
        this.$emit('create-event', { x: mapX, y: mapY })
      }
    },
    onContextMenu(e) {
      e.preventDefault()
      // Ctrl+右键用于平移；地图模式右键吸管不弹菜单
      if (e.ctrlKey || this.hasDragged || this.isPainting) return
      if (this.canPaint()) return
      if (!this.currentMapData) return
      const { mapX, mapY } = this.clientToMap(e)
      if (!this.inMapBounds(mapX, mapY)) return
      const hit = this.isEventMode ? this.findEventAt(mapX, mapY) : null
      if (hit) this.selectedEventId = hit.id
      this.$emit('event-context', {
        x: mapX,
        y: mapY,
        clientX: e.clientX,
        clientY: e.clientY,
        eventId: hit ? hit.id : 0,
        mode: this.isEventMode ? 'event' : 'map',
      })
      this.render()
    },
    handleTileClick(e) {
      if (!this.currentMapData || !e) return
      const { mapX, mapY } = this.clientToMap(e)
      if (!this.inMapBounds(mapX, mapY)) return

      this.selectedTile = { x: mapX, y: mapY }

      if (this.isEventMode) {
        const hit = this.findEventAt(mapX, mapY)
        this.selectedEventId = hit ? hit.id : 0
        if (hit) this.$emit('event-select', { id: hit.id, name: hit.name, x: hit.x, y: hit.y })
        else this.$emit('event-select', { id: 0, x: mapX, y: mapY, empty: true })
        this.render()
        return
      }

      const regionId = this.readMapData(mapX, mapY, 5)
      const event = this.findEventAt(mapX, mapY)
      this.$emit('tile-select', {
        x: mapX,
        y: mapY,
        regionId,
        event: event
          ? { id: event.id, name: event.name, pages: (event.pages && event.pages.length) || 0 }
          : null,
      })
      this.render()
    },
  },
}

</script>

<style scoped>
.map-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: transparent;
}
.map-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.canvas-container {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.map-scroll {
  position: absolute;
  z-index: 5;
  background: var(--map-scroll-track, rgba(40, 40, 40, 0.55));
  scrollbar-color: var(--map-scroll-thumb, rgba(200, 200, 200, 0.95)) var(--map-scroll-track, rgba(40, 40, 40, 0.55));
}
.map-scroll::-webkit-scrollbar {
  width: var(--map-scroll-size, 14px);
  height: var(--map-scroll-size, 14px);
}
.map-scroll::-webkit-scrollbar-track {
  background: var(--map-scroll-track, rgba(40, 40, 40, 0.55));
}
.map-scroll::-webkit-scrollbar-thumb {
  background: var(--map-scroll-thumb, rgba(200, 200, 200, 0.95));
  border-radius: 4px;
}
.map-scroll-v {
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--map-scroll-size, 14px);
  overflow-x: hidden;
  overflow-y: scroll;
}
.map-scroll-v.has-h {
  bottom: var(--map-scroll-size, 14px);
}
.map-scroll-h {
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--map-scroll-size, 14px);
  overflow-x: scroll;
  overflow-y: hidden;
}
.map-scroll-h.has-v {
  right: var(--map-scroll-size, 14px);
}
.map-scroll-corner {
  position: absolute;
  right: 0;
  bottom: 0;
  width: var(--map-scroll-size, 14px);
  height: var(--map-scroll-size, 14px);
  z-index: 5;
  background: var(--map-scroll-track, rgba(40, 40, 40, 0.55));
  pointer-events: none;
}
.map-scroll-spacer {
  min-width: 1px;
  min-height: 1px;
}
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: grab;
  image-rendering: pixelated;
}
canvas:active {
  cursor: grabbing;
}
.map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 14px;
  pointer-events: none;
}
</style>
