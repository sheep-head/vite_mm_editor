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
import { mapGetters } from 'vuex'
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
import { getMapBgSkinPath, isMapEmptyCheckerboard } from '@/utils/appSettings'
import {
  FLOOR_AUTOTILE_TABLE,
  WALL_AUTOTILE_TABLE,
  WATERFALL_AUTOTILE_TABLE,
  isVisibleTile,
  isAutotile,
  isTileA1,
  isTileA2,
  isTileA3,
  isTileA4,
  isTileA5,
  getAutotileKind,
  getAutotileShape,
  isLowerTile,
  refreshAutotileNeighbors,
} from './mapAutotile'
import { tileSetOfId } from '@/utils/imgAssets'
import { isEventRef } from './eventRef'

const DIM_ALPHA = 0.35
const WALK_ANIM_FPS = 10
/** 红色定位光圈：单次收缩周期 */
const FOCUS_RING_CYCLE_MS = 800
/** untilAction：极短保护，避免同一次点击立刻清掉 */
const FOCUS_RING_MIN_MS = 80

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
      currentMapData: null,
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
      pendingFit: false,
      syncingScroll: false,
      scrollTick: 0,
      _raf: 0,
      FLOOR_AUTOTILE_TABLE,
      WALL_AUTOTILE_TABLE,
      WATERFALL_AUTOTILE_TABLE,
    }
  },
  computed: {
    ...mapGetters([
      'zoomRequest',
      'editorMode',
      'mapCharOriginalSize',
      'previewWalkAnim',
      'showHyperlinks',
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
    effectiveShowGrid() {
      return this.showGrid || this.isEventMode
    },
    effectiveShowEvents() {
      return this.showEvents || this.isEventMode
    },
    scrollMetrics() {
      // scrollTick 用于在 offset/zoom/尺寸变化后强制重算
      void this.scrollTick
      if (!this.currentMapData || !this.canvas) {
        return {
          showH: false,
          showV: false,
          contentW: 1,
          contentH: 1,
          hMax: 0,
          vMax: 0,
          hVal: 0,
          vVal: 0,
        }
      }
      const mapW = this.currentMapData.width * this.tileWidth * this.zoom
      const mapH = this.currentMapData.height * this.tileHeight * this.zoom
      const sw = this.canvas.width || 1
      const sh = this.canvas.height || 1
      const showH = mapW > sw + 1
      const showV = mapH > sh + 1
      const hMax = showH ? mapW - sw : 0
      const vMax = showV ? mapH - sh : 0
      const hVal = showH ? Math.max(0, Math.min(hMax, -this.offsetX)) : 0
      const vVal = showV ? Math.max(0, Math.min(vMax, -this.offsetY)) : 0
      return {
        showH,
        showV,
        contentW: Math.max(sw + 1, mapW),
        contentH: Math.max(sh + 1, mapH),
        hMax,
        vMax,
        hVal,
        vVal,
      }
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
      this.needsRedraw = true
      this.renderToCache()
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
      this.render()
    },
    paintTool() {
      this.cancelShape()
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
    this._focusRing = null
    this._focusRaf = 0
    this._focusTimer = 0
    this._pendingFocus = null
    this._mapBgImg = null
    this._mapBgName = ''
    this._rendering = false
    this._panFrame = 0
  },
  beforeUnmount() {
    window.removeEventListener('resize', this._onResize)
    if (this._ro) this._ro.disconnect()
    if (this._raf) cancelAnimationFrame(this._raf)
    if (this._panFrame) cancelAnimationFrame(this._panFrame)
    if (this._focusTimer) clearTimeout(this._focusTimer)
    this.clearFocusRing(true)
    this.stopWalkAnim(false)
  },
  methods: {
    getMapData() {
      return this.currentMapData
    },

    getEventById(id) {
      if (!this.currentMapData || !this.currentMapData.events) return null
      return this.currentMapData.events.find((ev) => ev && ev.id === id) || null
    },

    findEventAt(mx, my) {
      if (!this.currentMapData || !this.currentMapData.events) return null
      return this.currentMapData.events.find((ev) => ev && ev.x === mx && ev.y === my) || null
    },

    refreshEventsLayer() {
      if (!this.currentMapData) return
      const width = this.currentMapData.width
      const height = this.currentMapData.height
      const w = width * this.tileWidth
      const h = height * this.tileHeight
      // 复用离屏画布，避免动画帧反复分配导致内存暴涨崩溃
      if (!this.eventsCache || this.eventsCache.width !== w || this.eventsCache.height !== h) {
        this.eventsCache = document.createElement('canvas')
        this.eventsCache.width = w
        this.eventsCache.height = h
      } else {
        const ectx = this.eventsCache.getContext('2d')
        ectx.clearRect(0, 0, w, h)
      }
      this.renderEventsToCache(this.eventsCache.getContext('2d'))
      this.render()
    },

    upsertEvent(event) {
      if (!this.currentMapData || !event) return
      if (!Array.isArray(this.currentMapData.events)) this.currentMapData.events = [null]
      while (this.currentMapData.events.length <= event.id) {
        this.currentMapData.events.push(null)
      }
      this.currentMapData.events[event.id] = event
      this.selectedEventId = event.id
      this.refreshEventsLayer()
      this.$emit('map-dirty')
    },

    removeEventById(id) {
      if (!this.currentMapData || !this.currentMapData.events) return false
      if (!this.currentMapData.events[id]) return false
      this.currentMapData.events[id] = null
      if (this.selectedEventId === id) this.selectedEventId = 0
      this.refreshEventsLayer()
      this.$emit('map-dirty')
      return true
    },

    cloneEvents() {
      if (!this.currentMapData) return [null]
      return JSON.parse(JSON.stringify(this.currentMapData.events || [null]))
    },

    applyEventsSnapshot(events) {
      if (!this.currentMapData) return
      this.currentMapData.events = JSON.parse(JSON.stringify(events || [null]))
      this.refreshEventsLayer()
      this.$emit('map-dirty')
    },

    getStartSnapshot() {
      return JSON.parse(JSON.stringify(this.startMarkers))
    },

    applyStartSnapshot(markers) {
      if (!markers) return false
      const sys = DataManager.$loadDataSync('System', false, false)
      if (!sys) return false
      const p = markers.player || {}
      sys.startMapId = p.mapId || 0
      sys.startX = p.x || 0
      sys.startY = p.y || 0
      ;['boat', 'ship', 'airship'].forEach((kind) => {
        const m = markers[kind] || {}
        if (!sys[kind]) sys[kind] = {}
        sys[kind].startMapId = m.mapId || 0
        sys[kind].startX = m.x || 0
        sys[kind].startY = m.y || 0
      })
      const ok = DataManager.$saveDataSync('System', sys)
      if (ok) {
        this.loadStartPosition()
        this.render()
      }
      return ok
    },

    loadTilesetsIndex() {
      const arr = DataManager.$loadDataSync('Tilesets', false, false)
      this.tilesets = {}
      if (Array.isArray(arr)) {
        arr.forEach((t) => {
          if (t && t.id) this.tilesets[t.id] = t
        })
      }
    },

    async loadMap(mapId) {
      this.loadError = ''
      this.selectedTile = null
      this.selectedEventId = 0
      this.characterImages = {}
      if (!isNw || !fs || !path || !this.workRoot) {
        this.loadError = '需要 NW.js 工作空间才能加载地图'
        this.$emit('error', this.loadError)
        return
      }
      try {
        if (!Object.keys(this.tilesets).length) this.loadTilesetsIndex()
        const mapFileName = `Map${String(mapId).padStart(3, '0')}.json`
        const mapPath = path.join(this.workRoot, 'data', mapFileName)
        if (!fs.existsSync(mapPath)) {
          this.loadError = `地图文件不存在: ${mapFileName}`
          this.$emit('error', this.loadError)
          return
        }
        this.currentMapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'))
        if (!Array.isArray(this.currentMapData.events)) this.currentMapData.events = [null]
        this.loadStartPosition()
        await this.loadTilesetImages()
        await this.preloadEventCharacters()
        await this.preloadStartCharacters()
        this.loadTilesetFlags()
        this.needsRedraw = true
        const willFocus = !!(
          (this._pendingFocus && this._pendingFocus.mapId === mapId) ||
          (this.focusEventRequest && this.focusEventRequest.mapId === mapId)
        )
        // 有定位请求时不要先 fit，后面会切到实际大小并居中
        this.pendingFit = !willFocus
        this.$nextTick(() => {
          this.resizeCanvas()
          if (!willFocus) this.fitToView()
          else {
            this.zoom = 1
            this.emitZoom()
          }
          this.renderToCache()
          this.render()
          if (this.previewWalkAnim) this.startWalkAnim()
          this.tryPendingFocus(mapId)
          this.$emit('ready', { mapId })
        })
      } catch (e) {
        console.error(e)
        this.loadError = '加载地图失败: ' + e.message
        this.$emit('error', this.loadError)
      }
    },

    tryPendingFocus(mapId) {
      const req = this._pendingFocus || this.focusEventRequest
      if (!req) return
      if (req.mapId && req.mapId !== mapId) return
      this._pendingFocus = null
      // 等 fit/滚动条同步完成后再打光圈，避免首帧被覆盖
      this.$nextTick(() => {
        setTimeout(() => this.applyFocusRequest(req), 32)
      })
    },

    applyFocusRequest(req) {
      if (!req) return
      if (req.mapId && req.mapId !== this.mapId) {
        this._pendingFocus = req
        return
      }
      const ev = this.getEventById(req.eventId)
      if (!ev) {
        this._pendingFocus = req
        return
      }
      this._pendingFocus = null
      this.$store.commit('clearFocusEventRequest')
      this.selectedEventId = ev.id
      this.selectedTile = { x: ev.x, y: ev.y }
      // 定位：先切到实际大小(100%)，再尽量把事件放到视口中心
      this.focusEventAtActualSize(ev.x, ev.y)
      this.$emit('event-select', { id: ev.id, name: ev.name, x: ev.x, y: ev.y })
      this.$nextTick(() => {
        this.focusEventRing(ev.id)
      })
    },

    /** 实际大小 + 尽量居中（靠边时 clamp 后靠左上也可） */
    focusEventAtActualSize(mx, my) {
      if (!this.canvas || !this.currentMapData) return
      this.zoom = 1
      this.emitZoom()
      this.centerOnTile(mx, my)
    },

    centerOnTile(mx, my) {
      if (!this.canvas || !this.currentMapData) return
      const cx = (mx + 0.5) * this.tileWidth * this.zoom
      const cy = (my + 0.5) * this.tileHeight * this.zoom
      this.offsetX = this.canvas.width / 2 - cx
      this.offsetY = this.canvas.height / 2 - cy
      this.velocityX = 0
      this.velocityY = 0
      this.clampOffset()
      this.render()
    },

    focusEventRing(eventId) {
      if (!eventId) return
      if (this._focusTimer) {
        clearTimeout(this._focusTimer)
        this._focusTimer = 0
      }
      const ui = this.editorUi || {}
      const timed = ui.focusRingMode === 'timed'
      const sec = Math.max(0.5, Number(ui.focusRingSeconds) || 2)
      // 先停旧动画再开新环，避免定时器与 RAF 抢清导致崩溃
      this.stopFocusRingAnim()
      this._focusRing = {
        eventId,
        start: Date.now(),
        active: true,
        endAt: timed ? Date.now() + sec * 1000 : 0,
      }
      this.startFocusRingAnim()
      this.render()
    },

    /**
     * @param {boolean} [force] 换地图 / 卸载 / 周期结束后强制清除
     */
    clearFocusRing(force = false) {
      if (!this._focusRing) return
      if (!force) {
        const elapsed = Date.now() - this._focusRing.start
        if (elapsed < FOCUS_RING_MIN_MS) return
      }
      if (this._focusTimer) {
        clearTimeout(this._focusTimer)
        this._focusTimer = 0
      }
      this.stopFocusRingAnim()
      this._focusRing = null
      try {
        this.render()
      } catch (e) {
        console.error(e)
      }
    },

    loadMapBgSkin(name) {
      this._mapBgName = name || ''
      this._mapBgImg = null
      if (!name || !isNw || !fs) {
        this.render()
        return
      }
      const abs = getMapBgSkinPath(name)
      if (!abs || !fs.existsSync(abs)) {
        this.render()
        return
      }
      const img = new Image()
      const token = name
      img.onload = () => {
        if (this._mapBgName !== token) return
        this._mapBgImg = img
        this.render()
      }
      img.onerror = () => {
        if (this._mapBgName !== token) return
        this._mapBgImg = null
        this.render()
      }
      // 文件名已唯一；再加 query 防止偶发 file URL 缓存
      img.src = 'file:///' + abs.replace(/\\/g, '/') + '?t=' + encodeURIComponent(name)
    },

    paintViewportBackground() {
      if (!this.canvas || !this.ctx) return
      const w = this.canvas.width
      const h = this.canvas.height
      if (w < 1 || h < 1) return
      const ui = this.editorUi || {}
      if (isMapEmptyCheckerboard(ui.mapEmptyColor)) {
        const s = 12
        for (let y = 0; y < h; y += s) {
          for (let x = 0; x < w; x += s) {
            this.ctx.fillStyle = ((x / s + y / s) % 2 === 0) ? '#c8c8c8' : '#ffffff'
            this.ctx.fillRect(x, y, s, s)
          }
        }
      } else {
        this.ctx.fillStyle = ui.mapEmptyColor || '#1a1a1a'
        this.ctx.fillRect(0, 0, w, h)
      }
      const img = this._mapBgImg
      if (img && img.complete && img.width) {
        const opacity = Math.max(0, Math.min(1, Number(ui.mapBgSkinOpacity)))
        const alpha = Number.isFinite(opacity) ? opacity : 1
        const scale = Math.max(w / img.width, h / img.height)
        const dw = img.width * scale
        const dh = img.height * scale
        this.ctx.save()
        this.ctx.globalAlpha = alpha
        this.ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
        this.ctx.restore()
      }
    },

    startFocusRingAnim() {
      if (this._focusRaf) return
      const tick = () => {
        const ring = this._focusRing
        if (!ring || !ring.active) {
          this._focusRaf = 0
          return
        }
        // 倒计时到期：播完「当前这一轮收缩到格子」(t→1) 立刻释放，切勿进入下一轮最外圈
        if (ring.endAt && Date.now() >= ring.endAt) {
          const elapsed = Date.now() - ring.start
          const cycleIndex = Math.floor(elapsed / FOCUS_RING_CYCLE_MS)
          const phase = elapsed % FOCUS_RING_CYCLE_MS
          if (ring.finishCycleIndex == null) ring.finishCycleIndex = cycleIndex
          const done =
            cycleIndex > ring.finishCycleIndex ||
            (cycleIndex === ring.finishCycleIndex && phase >= FOCUS_RING_CYCLE_MS - 20)
          if (done) {
            this._focusRaf = 0
            this._focusRing = null
            try {
              this.render()
            } catch (e) {
              console.error(e)
            }
            return
          }
        }
        try {
          this.render()
        } catch (e) {
          console.error(e)
          this._focusRaf = 0
          this._focusRing = null
          return
        }
        this._focusRaf = requestAnimationFrame(tick)
      }
      this._focusRaf = requestAnimationFrame(tick)
    },

    stopFocusRingAnim() {
      if (this._focusRaf) {
        cancelAnimationFrame(this._focusRaf)
        this._focusRaf = 0
      }
    },

    startWalkAnim() {
      this.stopWalkAnim(false)
      if (!this.previewWalkAnim) return
      // 不用 Vue data，避免每帧触发组件重渲染
      this._walkAnimTick = 0
      this._walkLastTs = 0
      const stepMs = Math.round(1000 / WALK_ANIM_FPS)
      const tick = (ts) => {
        if (!this.previewWalkAnim) {
          this._walkRaf = 0
          return
        }
        if (!this._walkLastTs || ts - this._walkLastTs >= stepMs) {
          this._walkLastTs = ts
          this._walkAnimTick = (this._walkAnimTick + 1) | 0
          this.refreshEventsLayer()
        }
        this._walkRaf = requestAnimationFrame(tick)
      }
      this._walkRaf = requestAnimationFrame(tick)
    },

    stopWalkAnim(redraw = true) {
      if (this._walkRaf) {
        cancelAnimationFrame(this._walkRaf)
        this._walkRaf = 0
      }
      if (this._walkTimer) {
        clearInterval(this._walkTimer)
        this._walkTimer = 0
      }
      this._walkAnimTick = 0
      this._walkLastTs = 0
      if (redraw && this.currentMapData) this.refreshEventsLayer()
    },

    animPatternForPage(page) {
      if (!page || !page.image) return 1
      const base = typeof page.image.pattern === 'number' ? page.image.pattern : 1
      if (!this.previewWalkAnim) return base
      if (!page.walkAnime && !page.stepAnime) return base
      return (this._walkAnimTick || 0) % 3
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

    /**
     * @param {'player'|'boat'|'ship'|'airship'} kind
     * @param {number} x
     * @param {number} y
     * @param {{ clear?: boolean }} [opts]
     */
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
        if (img) this.tilesetImages[tilesetName] = img
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
      this.characterImages[name] = img
      return img
    },

    async preloadEventCharacters() {
      const names = new Set()
      ;(this.currentMapData.events || []).forEach((ev) => {
        if (!ev || !ev.pages || !ev.pages[0] || !ev.pages[0].image) return
        const n = ev.pages[0].image.characterName
        if (n) names.add(n)
      })
      for (const n of names) await this.ensureCharacterImage(n)
    },

    async preloadStartCharacters() {
      for (const k of ['boat', 'ship', 'airship']) {
        const n = this.startMarkers[k] && this.startMarkers[k].characterName
        if (n) await this.ensureCharacterImage(n)
      }
    },

    readMapData(x, y, z) {
      if (!this.currentMapData) return 0
      const { width, height, data } = this.currentMapData
      if (x >= 0 && x < width && y >= 0 && y < height) {
        return data[(z * height + y) * width + x] || 0
      }
      return 0
    },

    resolvePaintLayer(tileId, erase) {
      if (erase) {
        if (this.brush && this.brush.isRegion) return 5
        if (this.editLayer === 'auto') return 0
        return Number(this.editLayer) || 0
      }
      if (this.brush && this.brush.isRegion) return 5
      if (this.editLayer !== 'auto' && this.editLayer !== 'Auto') {
        const z = Number(this.editLayer)
        if (z >= 0 && z <= 3) return z
      }
      // auto：A（含 A5/自动图块）下层 0，B–E 上层 2
      return isLowerTile(tileId) ? 0 : 2
    },

    canPaint() {
      return this.paintEnabled && !this.isEventMode && this.currentMapData && this.brush
    },

    beginPaintStroke(erase) {
      this.isPainting = true
      this.paintErase = !!erase
      this.paintLastCell = null
      this.paintBefore = new Map()
      this.paintDirtyCells = new Set()
    },

    endPaintStroke() {
      if (!this.isPainting) return
      const before = this.paintBefore
      this.isPainting = false
      this.paintErase = false
      this.paintLastCell = null
      this.paintBefore = null
      if (!before || !before.size) {
        this.paintDirtyCells = null
        return
      }
      const after = []
      const beforeArr = []
      before.forEach((oldId, key) => {
        const [x, y, z] = key.split(',').map(Number)
        beforeArr.push({ x, y, z, tileId: oldId })
        after.push({ x, y, z, tileId: this.readMapData(x, y, z) })
      })
      this.paintDirtyCells = null
      this.$emit('paint-stroke', { before: beforeArr, after })
      this.$emit('map-dirty')
    },

    applyTilesSnapshot(cells) {
      if (!this.currentMapData || !cells) return
      const dirty = new Set()
      cells.forEach((c) => {
        if (!c) return
        this.writeMapDataRaw(c.x, c.y, c.z, c.tileId)
        dirty.add(`${c.x},${c.y}`)
      })
      this.invalidateMapCells(dirty)
      this.$emit('map-dirty')
    },

    writeMapDataRaw(x, y, z, tileId) {
      if (!this.currentMapData) return
      const { width, height, data } = this.currentMapData
      if (x < 0 || y < 0 || x >= width || y >= height) return
      data[(z * height + y) * width + x] = tileId || 0
    },

    invalidateMapCells(cellKeys) {
      if (!this.currentMapData) return
      if (!this.mapCache || this.needsRedraw) {
        this.needsRedraw = true
        this.renderToCache()
        this.render()
        return
      }
      const ctx = this.mapCache.getContext('2d')
      const seen = new Set()
      cellKeys.forEach((key) => {
        const [xs, ys] = key.split(',')
        const x = Number(xs)
        const y = Number(ys)
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            const k = `${nx},${ny}`
            if (seen.has(k)) continue
            if (!this.inMapBounds(nx, ny)) continue
            seen.add(k)
            ctx.clearRect(nx * this.tileWidth, ny * this.tileHeight, this.tileWidth, this.tileHeight)
            this.paintTileToContext(ctx, nx, ny)
          }
        }
      })
      // region 层可能变化
      const cacheW = this.currentMapData.width * this.tileWidth
      const cacheH = this.currentMapData.height * this.tileHeight
      if (this.regionsCache) {
        this.regionsCache.getContext('2d').clearRect(0, 0, cacheW, cacheH)
        this.renderRegionsToCache(this.regionsCache.getContext('2d'))
      }
      this.render()
    },

    rememberBefore(x, y, z) {
      if (!this.paintBefore) return
      const key = `${x},${y},${z}`
      if (!this.paintBefore.has(key)) {
        this.paintBefore.set(key, this.readMapData(x, y, z))
      }
    },

    paintAt(mx, my) {
      if (!this.canPaint() || !this.inMapBounds(mx, my)) return
      if (this.paintLastCell && this.paintLastCell.x === mx && this.paintLastCell.y === my) return
      this.paintLastCell = { x: mx, y: my }
      const brush = this.brush
      const tiles = (brush && brush.tiles) || [[0]]
      const rows = tiles.length
      const cols = (tiles[0] && tiles[0].length) || 0
      if (!rows || !cols) return
      const dirty = this.paintDirtyCells || new Set()
      const refreshList = []

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tx = mx + c
          const ty = my + r
          if (!this.inMapBounds(tx, ty)) continue
          if (this.paintErase) {
            const ez =
              brush && brush.isRegion
                ? 5
                : this.editLayer === 'auto'
                  ? this.guessEraseLayer(tx, ty)
                  : Number(this.editLayer) || 0
            this.rememberBefore(tx, ty, ez)
            this.writeMapDataRaw(tx, ty, ez, 0)
            dirty.add(`${tx},${ty}`)
            if (ez <= 3) refreshList.push({ x: tx, y: ty, z: ez })
            continue
          }
          const tileId = tiles[r][c]
          if (tileId == null) continue
          const z = this.resolvePaintLayer(tileId, false)
          this.rememberBefore(tx, ty, z)
          // 自动图块先写 kindBase，再统一邻接重算
          this.writeMapDataRaw(tx, ty, z, tileId)
          dirty.add(`${tx},${ty}`)
          if (z <= 3) refreshList.push({ x: tx, y: ty, z })
        }
      }

      // 邻接重算前先记下 3×3 旧值
      refreshList.forEach(({ x, y, z }) => {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (!this.inMapBounds(nx, ny)) continue
            this.rememberBefore(nx, ny, z)
            dirty.add(`${nx},${ny}`)
          }
        }
      })
      const zoneDone = new Set()
      refreshList.forEach(({ x, y, z }) => {
        const zk = `${x},${y},${z}`
        if (zoneDone.has(zk)) return
        zoneDone.add(zk)
        refreshAutotileNeighbors(this.currentMapData, x, y, z)
      })

      this.paintDirtyCells = dirty
      this.invalidateMapCells(dirty)
    },

    guessEraseLayer(x, y) {
      for (const z of [2, 1, 0, 3]) {
        if (this.readMapData(x, y, z)) return z
      }
      return 0
    },

    activePaintTool() {
      const t = this.paintTool || 'pencil'
      if (t === 'rect' || t === 'ellipse' || t === 'fill' || t === 'shadow') return t
      return 'pencil'
    },

    brushSize() {
      const tiles = (this.brush && this.brush.tiles) || [[0]]
      return {
        tiles,
        rows: tiles.length || 1,
        cols: (tiles[0] && tiles[0].length) || 1,
      }
    },

    /** 在 (tx,ty) 铺一格笔刷；锚点用于多格笔刷取模 */
    applyStamp(tx, ty, anchorX, anchorY, erase, dirty, refreshList, layerOverride) {
      if (!this.inMapBounds(tx, ty)) return
      const brush = this.brush
      if (erase) {
        const ez =
          layerOverride != null
            ? layerOverride
            : brush && brush.isRegion
              ? 5
              : this.editLayer === 'auto'
                ? this.guessEraseLayer(tx, ty)
                : Number(this.editLayer) || 0
        this.rememberBefore(tx, ty, ez)
        this.writeMapDataRaw(tx, ty, ez, 0)
        dirty.add(`${tx},${ty}`)
        if (ez <= 3) refreshList.push({ x: tx, y: ty, z: ez })
        return
      }
      const { tiles, rows, cols } = this.brushSize()
      const c = ((tx - anchorX) % cols + cols) % cols
      const r = ((ty - anchorY) % rows + rows) % rows
      const tileId = tiles[r][c]
      if (tileId == null) return
      const z = layerOverride != null ? layerOverride : this.resolvePaintLayer(tileId, false)
      this.rememberBefore(tx, ty, z)
      this.writeMapDataRaw(tx, ty, z, tileId)
      dirty.add(`${tx},${ty}`)
      if (z <= 3) refreshList.push({ x: tx, y: ty, z })
    },

    finishAutotile(dirty, refreshList) {
      refreshList.forEach(({ x, y, z }) => {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (!this.inMapBounds(nx, ny)) continue
            this.rememberBefore(nx, ny, z)
            dirty.add(`${nx},${ny}`)
          }
        }
      })
      const zoneDone = new Set()
      refreshList.forEach(({ x, y, z }) => {
        const zk = `${x},${y},${z}`
        if (zoneDone.has(zk)) return
        zoneDone.add(zk)
        refreshAutotileNeighbors(this.currentMapData, x, y, z)
      })
      this.paintDirtyCells = dirty
      if (dirty.size) this.invalidateMapCells(dirty)
    },

    /** 矩形填充：框内全部格子 */
    rectFill(x0, y0, x1, y1) {
      const minX = Math.min(x0, x1)
      const maxX = Math.max(x0, x1)
      const minY = Math.min(y0, y1)
      const maxY = Math.max(y0, y1)
      const cells = []
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          cells.push({ x, y })
        }
      }
      return cells
    },

    /** 椭圆填充：格子中心落在椭圆内则包含 */
    ellipseFill(x0, y0, x1, y1) {
      const minX = Math.min(x0, x1)
      const maxX = Math.max(x0, x1)
      const minY = Math.min(y0, y1)
      const maxY = Math.max(y0, y1)
      const rx = Math.max(0.5, (maxX - minX) / 2)
      const ry = Math.max(0.5, (maxY - minY) / 2)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const cells = []
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const nx = (x - cx) / rx
          const ny = (y - cy) / ry
          if (nx * nx + ny * ny <= 1.0001) cells.push({ x, y })
        }
      }
      if (!cells.length) cells.push({ x: Math.round(cx), y: Math.round(cy) })
      return cells
    },

    cancelShape() {
      if (!this.isShapeDrag && !this.shapePreview) return
      this.isShapeDrag = false
      this.shapePreview = null
      this.paintErase = false
      this.isDragging = false
      this.render()
    },

    commitShape() {
      const p = this.shapePreview
      const erase = this.paintErase
      this.shapePreview = null
      this.isShapeDrag = false
      this.isDragging = false
      if (!p) {
        this.render()
        return
      }
      const cells =
        p.kind === 'ellipse'
          ? this.ellipseFill(p.x0, p.y0, p.x1, p.y1)
          : this.rectFill(p.x0, p.y0, p.x1, p.y1)
      const anchorX = Math.min(p.x0, p.x1)
      const anchorY = Math.min(p.y0, p.y1)
      this.beginPaintStroke(erase)
      const dirty = this.paintDirtyCells
      const refreshList = []
      cells.forEach((c) => this.applyStamp(c.x, c.y, anchorX, anchorY, erase, dirty, refreshList))
      this.finishAutotile(dirty, refreshList)
      this.endPaintStroke()
    },

    sameFillTile(a, b, z) {
      if (z === 5) return (a || 0) === (b || 0)
      if (isAutotile(a) && isAutotile(b)) return getAutotileKind(a) === getAutotileKind(b)
      return (a || 0) === (b || 0)
    },

    fillLayer(erase) {
      const brush = this.brush
      if (brush && brush.isRegion) return 5
      const { tiles } = this.brushSize()
      const sample = tiles[0][0] || 0
      if (!erase && this.editLayer !== 'auto') {
        const z = Number(this.editLayer)
        if (z >= 0 && z <= 3) return z
      }
      if (erase && this.editLayer !== 'auto' && this.editLayer !== 'Auto') {
        const z = Number(this.editLayer)
        if (z >= 0 && z <= 3) return z
      }
      return this.resolvePaintLayer(sample, false)
    },

    floodFill(sx, sy, erase) {
      if (!this.inMapBounds(sx, sy)) return
      const z = this.fillLayer(erase)
      const seed = this.readMapData(sx, sy, z)
      this.beginPaintStroke(erase)
      const dirty = this.paintDirtyCells
      const refreshList = []
      const queue = [[sx, sy]]
      const seen = new Set([`${sx},${sy}`])
      while (queue.length) {
        const [x, y] = queue.shift()
        if (!this.sameFillTile(this.readMapData(x, y, z), seed, z)) continue
        this.applyStamp(x, y, sx, sy, erase, dirty, refreshList, z)
        ;[
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].forEach(([dx, dy]) => {
          const nx = x + dx
          const ny = y + dy
          if (!this.inMapBounds(nx, ny)) return
          const key = `${nx},${ny}`
          if (seen.has(key)) return
          seen.add(key)
          queue.push([nx, ny])
        })
      }
      this.finishAutotile(dirty, refreshList)
      this.endPaintStroke()
    },

    shadowQuadrant(e) {
      const { mapX, mapY, canvasX, canvasY } = this.clientToMap(e)
      const localX = (canvasX - this.offsetX) / this.zoom - mapX * this.tileWidth
      const localY = (canvasY - this.offsetY) / this.zoom - mapY * this.tileHeight
      const right = localX >= this.tileWidth / 2 ? 1 : 0
      const bottom = localY >= this.tileHeight / 2 ? 1 : 0
      return { mapX, mapY, bit: bottom * 2 + right }
    },

    paintShadowAt(e, erase) {
      const { mapX, mapY, bit } = this.shadowQuadrant(e)
      if (!this.inMapBounds(mapX, mapY)) return
      const key = `${mapX},${mapY},${bit}`
      if (this.paintLastCell && this.paintLastCell.key === key) return
      this.paintLastCell = { key }
      this.rememberBefore(mapX, mapY, 4)
      let bits = this.readMapData(mapX, mapY, 4) & 0x0f
      if (erase) bits &= ~(1 << bit)
      else bits |= 1 << bit
      this.writeMapDataRaw(mapX, mapY, 4, bits)
      const dirty = this.paintDirtyCells || new Set()
      dirty.add(`${mapX},${mapY}`)
      this.paintDirtyCells = dirty
      this.invalidateMapCells(dirty)
    },

    renderShapePreview() {
      const p = this.shapePreview
      if (!p || !this.ctx) return
      const cells =
        p.kind === 'ellipse'
          ? this.ellipseFill(p.x0, p.y0, p.x1, p.y1)
          : this.rectFill(p.x0, p.y0, p.x1, p.y1)
      const tw = this.tileWidth * this.zoom
      const th = this.tileHeight * this.zoom
      const erase = this.paintErase && !p.eyedrop
      const fill = p.eyedrop
        ? 'rgba(80,200,120,0.28)'
        : erase
          ? 'rgba(220,60,60,0.35)'
          : 'rgba(30,144,255,0.35)'
      const stroke = p.eyedrop
        ? 'rgba(40,180,100,0.95)'
        : erase
          ? 'rgba(220,60,60,0.95)'
          : 'rgba(30,144,255,0.95)'
      this.ctx.save()
      this.ctx.fillStyle = fill
      this.ctx.strokeStyle = stroke
      this.ctx.lineWidth = 1
      cells.forEach(({ x, y }) => {
        const sx = this.offsetX + x * tw
        const sy = this.offsetY + y * th
        this.ctx.fillRect(sx, sy, tw, th)
        this.ctx.strokeRect(sx + 0.5, sy + 0.5, Math.max(1, tw - 1), Math.max(1, th - 1))
      })
      this.ctx.restore()
    },

    renderToCache() {
      if (!this.currentMapData) return
      const width = this.currentMapData.width
      const height = this.currentMapData.height

      if (!this.mapCache || this.needsRedraw) {
        this.mapCache = document.createElement('canvas')
        this.mapCache.width = width * this.tileWidth
        this.mapCache.height = height * this.tileHeight
        const cacheCtx = this.mapCache.getContext('2d')
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            this.paintTileToContext(cacheCtx, x, y)
          }
        }
        this.needsRedraw = false
      }

      const cacheW = width * this.tileWidth
      const cacheH = height * this.tileHeight
      if (!this.regionsCache || this.regionsCache.width !== cacheW || this.regionsCache.height !== cacheH) {
        this.regionsCache = document.createElement('canvas')
        this.regionsCache.width = cacheW
        this.regionsCache.height = cacheH
      } else {
        this.regionsCache.getContext('2d').clearRect(0, 0, cacheW, cacheH)
      }
      this.renderRegionsToCache(this.regionsCache.getContext('2d'))

      if (!this.eventsCache || this.eventsCache.width !== cacheW || this.eventsCache.height !== cacheH) {
        this.eventsCache = document.createElement('canvas')
        this.eventsCache.width = cacheW
        this.eventsCache.height = cacheH
      } else {
        this.eventsCache.getContext('2d').clearRect(0, 0, cacheW, cacheH)
      }
      this.renderEventsToCache(this.eventsCache.getContext('2d'))
    },

    layerAlpha(z) {
      if (this.editLayer === 'auto') return 1
      return this.editLayer === z ? 1 : DIM_ALPHA
    },

    paintTileToContext(ctx, mx, my) {
      const tiles = [
        this.readMapData(mx, my, 0),
        this.readMapData(mx, my, 1),
        this.readMapData(mx, my, 2),
        this.readMapData(mx, my, 3),
      ]
      const dx = mx * this.tileWidth
      const dy = my * this.tileHeight
      const originalCtx = this.ctx
      this.ctx = ctx
      for (let z = 0; z < 4; z++) {
        if (!tiles[z]) continue
        ctx.save()
        ctx.globalAlpha = this.layerAlpha(z)
        this.drawTile(tiles[z], dx, dy)
        ctx.restore()
      }
      this.drawShadowBits(ctx, mx, my, dx, dy)
      this.ctx = originalCtx
    },

    drawShadowBits(ctx, mx, my, dx, dy) {
      const bits = this.readMapData(mx, my, 4) & 0x0f
      if (!bits) return
      const dim = this.editLayer !== 'auto' && this.editLayer !== 3
      ctx.save()
      ctx.globalAlpha = dim ? 0.5 * DIM_ALPHA : 0.5
      ctx.fillStyle = '#000'
      const w1 = this.tileWidth / 2
      const h1 = this.tileHeight / 2
      for (let i = 0; i < 4; i++) {
        if (bits & (1 << i)) {
          ctx.fillRect(dx + (i % 2) * w1, dy + Math.floor(i / 2) * h1, w1, h1)
        }
      }
      ctx.restore()
    },

    drawTile(tileId, dx, dy) {
      if (!isVisibleTile(tileId)) return
      if (isAutotile(tileId)) this.drawAutotile(tileId, dx, dy)
      else this.drawNormalTile(tileId, dx, dy)
    },

    drawNormalTile(tileId, dx, dy) {
      const tileset = this.tilesets[this.currentMapData.tilesetId]
      if (!tileset) return
      let setNumber = 0
      if (isTileA5(tileId)) setNumber = 4
      else setNumber = 5 + Math.floor(tileId / 256)
      const w = this.tileWidth
      const h = this.tileHeight
      const sx = (Math.floor(tileId / 128) % 2 * 8 + tileId % 8) * w
      const sy = (Math.floor(tileId % 256 / 8) % 16) * h
      const tilesetName = tileset.tilesetNames[setNumber]
      if (!tilesetName) return
      const img = this.tilesetImages[tilesetName]
      if (!img || !img.complete) return
      if (sx >= 0 && sy >= 0 && sx + w <= img.width && sy + h <= img.height) {
        this.ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h)
      }
    },

    drawAutotile(tileId, dx, dy) {
      const tileset = this.tilesets[this.currentMapData.tilesetId]
      if (!tileset) return
      let autotileTable = this.FLOOR_AUTOTILE_TABLE
      const kind = getAutotileKind(tileId)
      const shape = getAutotileShape(tileId)
      const tx = kind % 8
      const ty = Math.floor(kind / 8)
      let bx = 0
      let by = 0
      let setNumber = 0

      if (isTileA1(tileId)) {
        setNumber = 0
        if (kind === 0) {
          bx = 0
          by = 0
        } else if (kind === 1) {
          bx = 0
          by = 3
        } else if (kind === 2) {
          bx = 6
          by = 0
        } else if (kind === 3) {
          bx = 6
          by = 3
        } else {
          bx = Math.floor(tx / 4) * 8
          by = ty * 6 + Math.floor(tx / 2) % 2 * 3
          if (kind % 2 !== 0) {
            bx += 6
            autotileTable = this.WATERFALL_AUTOTILE_TABLE
          }
        }
      } else if (isTileA2(tileId)) {
        setNumber = 1
        bx = tx * 2
        by = (ty - 2) * 3
      } else if (isTileA3(tileId)) {
        setNumber = 2
        bx = tx * 2
        by = (ty - 6) * 2
        autotileTable = this.WALL_AUTOTILE_TABLE
      } else if (isTileA4(tileId)) {
        setNumber = 3
        bx = tx * 2
        by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0))
        if (ty % 2 === 1) autotileTable = this.WALL_AUTOTILE_TABLE
      }

      const table = autotileTable[shape]
      const tilesetName = tileset.tilesetNames[setNumber]
      if (!tilesetName) return
      const source = this.tilesetImages[tilesetName]
      if (!table || !source || !source.complete) return
      const w1 = this.tileWidth / 2
      const h1 = this.tileHeight / 2
      for (let i = 0; i < 4; i++) {
        const qsx = table[i][0]
        const qsy = table[i][1]
        const sx1 = (bx * 2 + qsx) * w1
        const sy1 = (by * 2 + qsy) * h1
        const dx1 = dx + (i % 2) * w1
        const dy1 = dy + Math.floor(i / 2) * h1
        if (sx1 >= 0 && sy1 >= 0 && sx1 + w1 <= source.width && sy1 + h1 <= source.height) {
          this.ctx.drawImage(source, sx1, sy1, w1, h1, dx1, dy1, w1, h1)
        }
      }
    },

    renderRegionsToCache(ctx) {
      const width = this.currentMapData.width
      const height = this.currentMapData.height
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const regionId = this.readMapData(x, y, 5)
          if (regionId > 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
            ctx.fillRect(x * this.tileWidth, y * this.tileHeight, this.tileWidth, this.tileHeight)
            ctx.fillStyle = 'white'
            ctx.strokeStyle = 'black'
            ctx.lineWidth = 3
            const tx = x * this.tileWidth + this.tileWidth / 2
            const ty = y * this.tileHeight + this.tileHeight / 2
            ctx.strokeText(String(regionId), tx, ty)
            ctx.fillText(String(regionId), tx, ty)
          }
        }
      }
    },

    drawCharacterFrame(ctx, img, image, dx, dy, options = {}) {
      if (!img || !img.complete || !image) return false
      const name = image.characterName || ''
      // $ / !$：单角色表；否则 8 角色（4×2）表
      const big = name.startsWith('$') || name.startsWith('!$')
      const cw = big ? img.width / 3 : img.width / 12
      const ch = big ? img.height / 4 : img.height / 8
      const index = image.characterIndex || 0
      const pattern = typeof image.pattern === 'number' ? image.pattern : 1
      const direction = image.direction || 2
      const col = big ? pattern : (index % 4) * 3 + pattern
      const row = big ? (direction - 2) / 2 : Math.floor(index / 4) * 4 + (direction - 2) / 2
      const sx = col * cw
      const sy = row * ch
      if (!(sx >= 0 && sy >= 0 && sx + cw <= img.width && sy + ch <= img.height)) return false

      const tileW = this.tileWidth
      const tileH = this.tileHeight
      const forceFit = !!options.forceFit
      const useOriginal = !forceFit && this.mapCharOriginalSize
      if (useOriginal) {
        const ox = dx + (tileW - cw) / 2
        const oy = dy + tileH - ch
        ctx.drawImage(img, sx, sy, cw, ch, ox, oy, cw, ch)
        return true
      }
      const box = options.frameBox || { x: dx, y: dy, w: tileW, h: tileH }
      const fit = (this.editorUi && this.editorUi.eventLargeFit) === 'fit'
      ctx.save()
      ctx.beginPath()
      ctx.rect(box.x, box.y, box.w, box.h)
      ctx.clip()
      if (fit) {
        const scale = Math.min(box.w / cw, box.h / ch, 1)
        const dw = cw * scale
        const dh = ch * scale
        const ox = box.x + (box.w - dw) / 2
        const oy = box.y + box.h - dh
        ctx.drawImage(img, sx, sy, cw, ch, ox, oy, dw, dh)
      } else {
        const sw = Math.min(cw, box.w)
        const sh = Math.min(ch, box.h)
        const ssx = sx + (cw - sw) / 2
        const ssy = sy + (ch - sh) / 2
        const ox = box.x + (box.w - sw) / 2
        const oy = box.y + (box.h - sh) / 2
        ctx.drawImage(img, ssx, ssy, sw, sh, ox, oy, sw, sh)
      }
      ctx.restore()
      return true
    },

    /** 白方框内缘，行走图只画在这里，相当于格子内缩一圈 */
    eventInnerBox(x, y) {
      const pad = 6
      return {
        x: x + pad,
        y: y + pad,
        w: Math.max(1, this.tileWidth - pad * 2),
        h: Math.max(1, this.tileHeight - pad * 2),
      }
    },

    drawEventFill(ctx, x, y) {
      const pad = 3
      const ui = this.editorUi || {}
      ctx.save()
      ctx.fillStyle = ui.eventFillColor || 'rgba(0,0,0,0.3)'
      ctx.fillRect(x + pad, y + pad, this.tileWidth - pad * 2, this.tileHeight - pad * 2)
      ctx.restore()
    },

    drawEventFrame(ctx, x, y) {
      const pad = 2
      const x0 = x + pad + 0.5
      const y0 = y + pad + 0.5
      const w = this.tileWidth - pad * 2 - 1
      const h = this.tileHeight - pad * 2 - 1
      ctx.save()
      ctx.lineWidth = 1
      ctx.strokeStyle = '#ffffff'
      ctx.strokeRect(x0, y0, w, h)
      ctx.restore()
    },

    renderEventsToCache(ctx) {
      if (!this.currentMapData.events) return
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      this.currentMapData.events.forEach((event) => {
        if (!event) return
        const x = event.x * this.tileWidth
        const y = event.y * this.tileHeight
        this.drawEventFill(ctx, x, y)
        const page = event.pages && event.pages[0]
        const image = page && page.image
        let drew = false
        if (image && image.tileId > 0) {
          const prev = this.ctx
          this.ctx = ctx
          this.drawTile(image.tileId, x, y)
          this.ctx = prev
          drew = true
        } else if (image && image.characterName) {
          const img = this.characterImages[image.characterName]
          if (img) {
            const drawImage = {
              ...image,
              pattern: this.animPatternForPage(page),
            }
            drew = this.drawCharacterFrame(ctx, img, drawImage, x, y, {
              frameBox: this.eventInnerBox(x, y),
            })
          }
        }
        if (!drew) {
          ctx.fillStyle = 'white'
          ctx.strokeStyle = 'black'
          ctx.lineWidth = 2
          const text = `EV${String(event.id).padStart(3, '0')}`
          const tx = x + this.tileWidth / 2
          const ty = y + this.tileHeight / 2
          ctx.strokeText(text, tx, ty)
          ctx.fillText(text, tx, ty)
        }
        this.drawEventFrame(ctx, x, y)
        if (this.showHyperlinks && isEventRef(event)) {
          const bx = x + this.tileWidth - 15
          const by = y + 2
          ctx.fillStyle = '#409eff'
          ctx.fillRect(bx, by, 13, 13)
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 10px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('链', bx + 6.5, by + 7)
          ctx.font = '12px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
        }
      })
    },

    renderGrid() {
      const width = this.currentMapData.width
      const height = this.currentMapData.height
      const ui = this.editorUi || {}
      this.ctx.strokeStyle = ui.gridColor || 'rgba(255, 255, 255, 0.25)'
      this.ctx.lineWidth = Math.max(1, Number(ui.gridWidth) || 1)
      for (let x = 0; x <= width; x++) {
        this.ctx.beginPath()
        this.ctx.moveTo(x * this.tileWidth, 0)
        this.ctx.lineTo(x * this.tileWidth, height * this.tileHeight)
        this.ctx.stroke()
      }
      for (let y = 0; y <= height; y++) {
        this.ctx.beginPath()
        this.ctx.moveTo(0, y * this.tileHeight)
        this.ctx.lineTo(width * this.tileWidth, y * this.tileHeight)
        this.ctx.stroke()
      }
    },

    renderMapEdge() {
      const ui = this.editorUi || {}
      if (ui.mapEdgeVisible === false) return
      const width = this.currentMapData.width
      const height = this.currentMapData.height
      const w = width * this.tileWidth
      const h = height * this.tileHeight
      this.ctx.save()
      this.ctx.strokeStyle = ui.mapEdgeColor || 'rgba(255,80,80,0.85)'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(0.5, 0.5, Math.max(1, w - 1), Math.max(1, h - 1))
      this.ctx.restore()
    },

    renderSelectedTile() {
      let x = null
      let y = null
      let color = '#ffff00'
      if (this.isEventMode) {
        const ev = this.getEventById(this.selectedEventId)
        if (ev) {
          x = ev.x
          y = ev.y
          color = '#00e5ff'
        } else if (this.selectedTile) {
          x = this.selectedTile.x
          y = this.selectedTile.y
          color = '#00e5ff'
        }
      } else if (this.selectedTile) {
        x = this.selectedTile.x
        y = this.selectedTile.y
      }
      if (x == null || y == null) return
      this.ctx.strokeStyle = color
      this.ctx.lineWidth = 3
      this.ctx.strokeRect(
        x * this.tileWidth + 1.5,
        y * this.tileHeight + 1.5,
        this.tileWidth - 3,
        this.tileHeight - 3,
      )
    },

    renderStartMarker(kind, marker, label, fill, stroke) {
      if (!marker || marker.mapId !== this.mapId || !this.currentMapData) return
      const { x, y } = marker
      if (x < 0 || y < 0 || x >= this.currentMapData.width || y >= this.currentMapData.height) return
      const px = x * this.tileWidth
      const py = y * this.tileHeight
      const w = this.tileWidth
      const h = this.tileHeight
      this.ctx.save()
      this.ctx.fillStyle = fill
      this.ctx.fillRect(px, py, w, h)
      this.ctx.strokeStyle = stroke
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(px + 1, py + 1, w - 2, h - 2)
      let drew = false
      if (kind !== 'player' && marker.characterName) {
        const img = this.characterImages[marker.characterName]
        if (img) {
          drew = this.drawCharacterFrame(
            this.ctx,
            img,
            {
              characterName: marker.characterName,
              characterIndex: marker.characterIndex || 0,
              direction: 2,
              pattern: 1,
            },
            px,
            py,
            { forceFit: true },
          )
        }
      }
      if (!drew) {
        this.ctx.font = 'bold 11px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.strokeStyle = '#000'
        this.ctx.lineWidth = 3
        this.ctx.strokeText(label, px + w / 2, py + h / 2)
        this.ctx.fillStyle = '#fff'
        this.ctx.fillText(label, px + w / 2, py + h / 2)
      } else {
        this.ctx.font = 'bold 10px Arial'
        this.ctx.textAlign = 'left'
        this.ctx.textBaseline = 'top'
        this.ctx.strokeStyle = '#000'
        this.ctx.lineWidth = 2
        this.ctx.strokeText(label, px + 2, py + 2)
        this.ctx.fillStyle = '#fff'
        this.ctx.fillText(label, px + 2, py + 2)
      }
      this.ctx.restore()
    },

    renderStartPosition() {
      this.renderStartMarker('airship', this.startMarkers.airship, 'A', 'rgba(120,180,255,0.3)', '#5090ff')
      this.renderStartMarker('ship', this.startMarkers.ship, 'Sh', 'rgba(80,160,255,0.3)', '#3080ff')
      this.renderStartMarker('boat', this.startMarkers.boat, 'B', 'rgba(60,140,255,0.3)', '#2060ee')
      this.renderStartMarker('player', this.startMarkers.player, 'S', 'rgba(255,64,64,0.35)', '#ff3030')
    },

    render() {
      if (!this.canvas || !this.ctx) return
      // 防止 ResizeObserver / 设置回写 与 RAF 重入同一帧渲染
      if (this._rendering) return
      this._rendering = true
      try {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.paintViewportBackground()
        if (!this.currentMapData || !this.mapCache) return
        this.ctx.save()
        this.ctx.translate(this.offsetX, this.offsetY)
        this.ctx.scale(this.zoom, this.zoom)
        this.ctx.drawImage(this.mapCache, 0, 0)
        if (this.showRegions && this.regionsCache) this.ctx.drawImage(this.regionsCache, 0, 0)
        if (this.effectiveShowEvents && this.eventsCache) {
          this.ctx.save()
          if (!this.isEventMode) this.ctx.globalAlpha = 0.4
          this.ctx.drawImage(this.eventsCache, 0, 0)
          this.ctx.restore()
        }
        if (this.effectiveShowGrid) this.renderGrid()
        this.renderMapEdge()
        this.renderStartPosition()
        this.renderSelectedTile()
        this.ctx.restore()
        this.renderShapePreview()
        this.renderFocusRing()
      } catch (e) {
        console.error(e)
      } finally {
        this._rendering = false
      }
    },

    renderFocusRing() {
      const ring = this._focusRing
      if (!ring || !ring.active || !this.canvas || !this.ctx) return
      const ev = this.getEventById(ring.eventId)
      if (!ev) return
      const elapsed = Date.now() - ring.start
      // 反复收缩：每个周期从视口外缘收到目标格
      const t = (elapsed % FOCUS_RING_CYCLE_MS) / FOCUS_RING_CYCLE_MS
      const ease = t * t * (3 - 2 * t)
      const vw = this.canvas.width
      const vh = this.canvas.height
      if (vw < 2 || vh < 2) return
      const tx = this.offsetX + ev.x * this.tileWidth * this.zoom
      const ty = this.offsetY + ev.y * this.tileHeight * this.zoom
      const tw = Math.max(4, this.tileWidth * this.zoom)
      const th = Math.max(4, this.tileHeight * this.zoom)
      const pad = 4
      const x = pad + (tx - pad) * ease
      const y = pad + (ty - pad) * ease
      const w = vw - pad * 2 - (vw - pad * 2 - tw) * ease
      const h = vh - pad * 2 - (vh - pad * 2 - th) * ease
      const alpha = 0.75 + 0.25 * Math.sin((elapsed / 120) * Math.PI)
      this.ctx.save()
      this.ctx.strokeStyle = `rgba(255, 40, 40, ${alpha})`
      this.ctx.lineWidth = 4
      this.ctx.strokeRect(x + 0.5, y + 0.5, Math.max(2, w), Math.max(2, h))
      this.ctx.strokeStyle = `rgba(255, 120, 120, ${alpha * 0.55})`
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(x + 4.5, y + 4.5, Math.max(2, w - 8), Math.max(2, h - 8))
      this.ctx.restore()
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

    schedulePanFrame() {
      if (this._panFrame) return
      this._panFrame = requestAnimationFrame(() => {
        this._panFrame = 0
        this.applyPanPosition()
      })
    },

    applyPanPosition() {
      if (this._panX == null || this._panY == null) return
      this.offsetX = this._panX
      this.offsetY = this._panY
      this.clampOffset()
      this.render()
    },

    flushPanFrame() {
      if (this._panFrame) {
        cancelAnimationFrame(this._panFrame)
        this._panFrame = 0
      }
      this.applyPanPosition()
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
      this.onMouseUp(e)
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

    emitZoom() {
      this.$store.commit('setZoomPercent', Math.round(this.zoom * 100))
    },

    setZoom(newZoom, anchorX, anchorY) {
      const z = Math.max(0.1, Math.min(5, newZoom))
      if (typeof anchorX === 'number' && typeof anchorY === 'number') {
        this.offsetX = anchorX - (anchorX - this.offsetX) * (z / this.zoom)
        this.offsetY = anchorY - (anchorY - this.offsetY) * (z / this.zoom)
      }
      this.zoom = z
      this.clampOffset()
      this.render()
      this.emitZoom()
    },

    onWheel(e) {
      this.clearFocusRing()
      // Ctrl+滚轮：缩放；否则平移
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        const rect = this.canvas.getBoundingClientRect()
        this.setZoom(this.zoom * delta, e.clientX - rect.left, e.clientY - rect.top)
        return
      }
      this.velocityX = 0
      this.velocityY = 0
      // deltaMode: 0=pixel, 1=line, 2=page
      let dx = e.deltaX
      let dy = e.deltaY
      if (e.deltaMode === 1) {
        dx *= 16
        dy *= 16
      } else if (e.deltaMode === 2) {
        dx *= 100
        dy *= 100
      }
      if (e.shiftKey && !e.deltaX) {
        dx = dy
        dy = 0
      }
      this.offsetX -= dx
      this.offsetY -= dy
      this.clampOffset()
      this.render()
    },

    zoomIn() {
      this.setZoom(this.zoom * 1.2)
    },

    zoomOut() {
      this.setZoom(this.zoom / 1.2)
    },

    clampOffset() {
      if (!this.currentMapData || !this.canvas) return
      const mapWidth = this.currentMapData.width * this.tileWidth * this.zoom
      const mapHeight = this.currentMapData.height * this.tileHeight * this.zoom
      const screenWidth = this.canvas.width
      const screenHeight = this.canvas.height
      let clamped = false
      this.boundaryDirections = { top: false, right: false, bottom: false, left: false }

      if (mapWidth <= screenWidth) {
        this.offsetX = (screenWidth - mapWidth) / 2
      } else {
        const maxOffsetX = 0
        const minOffsetX = screenWidth - mapWidth
        if (this.offsetX > maxOffsetX) {
          this.boundaryDirections.left = true
          clamped = true
          if (this.boundaryFeedback === 'bounce') this.offsetX = maxOffsetX
        } else if (this.offsetX < minOffsetX) {
          this.boundaryDirections.right = true
          clamped = true
          if (this.boundaryFeedback === 'bounce') this.offsetX = minOffsetX
        }
      }

      if (mapHeight <= screenHeight) {
        this.offsetY = (screenHeight - mapHeight) / 2
      } else {
        const maxOffsetY = 0
        const minOffsetY = screenHeight - mapHeight
        if (this.offsetY > maxOffsetY) {
          this.boundaryDirections.top = true
          clamped = true
          if (this.boundaryFeedback === 'bounce') this.offsetY = maxOffsetY
        } else if (this.offsetY < minOffsetY) {
          this.boundaryDirections.bottom = true
          clamped = true
          if (this.boundaryFeedback === 'bounce') this.offsetY = minOffsetY
        }
      }

      if (this.boundaryFeedback === 'bounce' && clamped) {
        this.velocityX = 0
        this.velocityY = 0
      }
      this.bumpScroll()
    },

    bumpScroll() {
      this.scrollTick += 1
      this.$nextTick(() => this.syncScrollbarsFromOffset())
    },

    syncScrollbarsFromOffset() {
      if (this.syncingScroll) return
      this.syncingScroll = true
      const m = this.scrollMetrics
      const hEl = this.$refs.hScroll
      const vEl = this.$refs.vScroll
      if (hEl && m.showH && Math.abs(hEl.scrollLeft - m.hVal) > 0.5) {
        hEl.scrollLeft = m.hVal
      }
      if (vEl && m.showV && Math.abs(vEl.scrollTop - m.vVal) > 0.5) {
        vEl.scrollTop = m.vVal
      }
      requestAnimationFrame(() => {
        this.syncingScroll = false
      })
    },

    onHScroll() {
      if (this.syncingScroll || !this.currentMapData || !this.canvas) return
      const m = this.scrollMetrics
      if (!m.showH) return
      this.clearFocusRing()
      this.syncingScroll = true
      this.offsetX = -this.$refs.hScroll.scrollLeft
      this.velocityX = 0
      this.velocityY = 0
      this.render()
      this.syncingScroll = false
    },

    onVScroll() {
      if (this.syncingScroll || !this.currentMapData || !this.canvas) return
      const m = this.scrollMetrics
      if (!m.showV) return
      this.clearFocusRing()
      this.syncingScroll = true
      this.offsetY = -this.$refs.vScroll.scrollTop
      this.velocityX = 0
      this.velocityY = 0
      this.render()
      this.syncingScroll = false
    },

    resetView() {
      this.zoom = 1
      this.offsetX = 0
      this.offsetY = 0
      this.clampOffset()
      this.render()
      this.emitZoom()
    },

    /** 将整张地图缩放到视口内并居中 */
    fitToView() {
      if (!this.currentMapData || !this.canvas) {
        this.resetView()
        return
      }
      const mapW = this.currentMapData.width * this.tileWidth
      const mapH = this.currentMapData.height * this.tileHeight
      const pad = 16
      const vw = Math.max(1, this.canvas.width - pad * 2)
      const vh = Math.max(1, this.canvas.height - pad * 2)
      const z = Math.min(5, Math.max(0.1, Math.min(vw / mapW, vh / mapH)))
      this.zoom = z
      this.offsetX = (this.canvas.width - mapW * z) / 2
      this.offsetY = (this.canvas.height - mapH * z) / 2
      this.velocityX = 0
      this.velocityY = 0
      this.bumpScroll()
      this.render()
      this.emitZoom()
    },

    startInertia() {
      const friction = 0.95
      const threshold = 0.1
      const animate = () => {
        if (
          !this.isDragging &&
          !this.isPanning &&
          !this.draggingEventId &&
          (Math.abs(this.velocityX) > threshold || Math.abs(this.velocityY) > threshold)
        ) {
          this.offsetX += this.velocityX
          this.offsetY += this.velocityY
          this.clampOffset()
          this.velocityX *= friction
          this.velocityY *= friction
          this.render()
        }
        this._raf = requestAnimationFrame(animate)
      }
      this._raf = requestAnimationFrame(animate)
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
