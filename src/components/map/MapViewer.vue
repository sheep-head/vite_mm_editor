<template>
  <div class="map-viewer">
    <div class="map-stage">
      <div ref="canvasContainer" class="canvas-container">
        <canvas
          ref="canvas"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @mouseleave="onMouseUp"
          @dblclick="onDblClick"
          @wheel.prevent="onWheel"
          @contextmenu="onContextMenu" />
        <div v-if="!mapId" class="map-empty">请从左侧地图列表选择地图</div>
        <div v-else-if="loadError" class="map-empty">{{ loadError }}</div>
      </div>
      <div
        v-show="scrollMetrics.showV"
        ref="vScroll"
        class="map-scroll map-scroll-v"
        @scroll="onVScroll">
        <div class="map-scroll-spacer" :style="{ height: scrollMetrics.contentH + 'px' }" />
      </div>
    </div>
    <div class="map-scroll-row" v-show="scrollMetrics.showH || scrollMetrics.showV">
      <div
        v-show="scrollMetrics.showH"
        ref="hScroll"
        class="map-scroll map-scroll-h"
        @scroll="onHScroll">
        <div class="map-scroll-spacer" :style="{ width: scrollMetrics.contentW + 'px' }" />
      </div>
      <div v-show="scrollMetrics.showV" class="map-scroll-corner" />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
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
} from './mapAutotile'
import { isEventRef } from './eventRef'

const DIM_ALPHA = 0.35
const WALK_ANIM_FPS = 10
/** 红色定位光圈：单次收缩周期 */
const FOCUS_RING_CYCLE_MS = 800
/** 启动后至少播放这么久，期间禁止被 scroll/click 取消 */
const FOCUS_RING_MIN_MS = 2000

export default {
  name: 'MapViewer',
  props: {
    mapId: { type: Number, default: 0 },
    projectPath: { type: String, default: '' },
    editLayer: { type: [String, Number], default: 'auto' },
    showGrid: { type: Boolean, default: false },
    showRegions: { type: Boolean, default: false },
    showEvents: { type: Boolean, default: true },
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
      this.render()
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
    this._pendingFocus = null
  },
  beforeUnmount() {
    window.removeEventListener('resize', this._onResize)
    if (this._ro) this._ro.disconnect()
    if (this._raf) cancelAnimationFrame(this._raf)
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
      this._focusRing = {
        eventId,
        start: Date.now(),
        active: true,
      }
      this.startFocusRingAnim()
      this.render()
    },

    /**
     * @param {boolean} [force] 换地图 / 卸载时强制清除；否则启动后 2 秒内不可取消
     */
    clearFocusRing(force = false) {
      if (!this._focusRing) return
      if (!force) {
        const elapsed = Date.now() - this._focusRing.start
        if (elapsed < FOCUS_RING_MIN_MS) return
      }
      this._focusRing = null
      this.stopFocusRingAnim()
      this.render()
    },

    startFocusRingAnim() {
      if (this._focusRaf) return
      const tick = () => {
        if (!this._focusRing || !this._focusRing.active) {
          this._focusRaf = 0
          return
        }
        this.render()
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
      this.ctx = originalCtx
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
      let dw = cw
      let dh = ch
      if (!useOriginal) {
        const scale = Math.min(tileW / cw, tileH / ch, 1)
        dw = cw * scale
        dh = ch * scale
      }
      const ox = dx + (tileW - dw) / 2
      const oy = dy + tileH - dh
      ctx.drawImage(img, sx, sy, cw, ch, ox, oy, dw, dh)
      return true
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
        ctx.fillStyle = 'rgba(0, 200, 80, 0.22)'
        ctx.fillRect(x, y, this.tileWidth, this.tileHeight)
        const page = event.pages && event.pages[0]
        const image = page && page.image
        let drew = false
        if (image && image.characterName) {
          const img = this.characterImages[image.characterName]
          if (img) {
            const drawImage = {
              ...image,
              pattern: this.animPatternForPage(page),
            }
            drew = this.drawCharacterFrame(ctx, img, drawImage, x, y)
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
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      this.ctx.lineWidth = 1
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
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      if (!this.currentMapData || !this.mapCache) return
      this.ctx.save()
      this.ctx.translate(this.offsetX, this.offsetY)
      this.ctx.scale(this.zoom, this.zoom)
      this.ctx.drawImage(this.mapCache, 0, 0)
      if (this.showRegions && this.regionsCache) this.ctx.drawImage(this.regionsCache, 0, 0)
      if (this.effectiveShowEvents && this.eventsCache) this.ctx.drawImage(this.eventsCache, 0, 0)
      if (this.effectiveShowGrid) this.renderGrid()
      this.renderStartPosition()
      this.renderSelectedTile()
      this.ctx.restore()
      this.renderFocusRing()
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
        this.lastMoveTime = Date.now()
        e.preventDefault()
        return
      }
      if (e.button === 2) return

      if (e.button === 0) this.clearFocusRing()

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

    onMouseMove(e) {
      if (!this.isDragging) return

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
      const dt = now - this.lastMoveTime
      if (dt > 0) {
        this.velocityX = ((newOffsetX - this.offsetX) / dt) * 16
        this.velocityY = ((newOffsetY - this.offsetY) / dt) * 16
      }
      this.lastMoveTime = now
      this.offsetX = newOffsetX
      this.offsetY = newOffsetY
      this.clampOffset()
      this.render()
    },

    onMouseUp(e) {
      if (!this.isDragging) return
      const wasPanning = this.isPanning
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
      // Ctrl+右键用于平移，不弹出菜单
      if (e.ctrlKey || this.hasDragged) return
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
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const rect = this.canvas.getBoundingClientRect()
      this.setZoom(this.zoom * delta, e.clientX - rect.left, e.clientY - rect.top)
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
  background: #1a1a1a;
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
  background: var(--app-surface-2, #2a2a2a);
  flex-shrink: 0;
}
.map-scroll-v {
  width: 14px;
  overflow-x: hidden;
  overflow-y: scroll;
}
.map-scroll-row {
  display: flex;
  flex-shrink: 0;
  height: 14px;
}
.map-scroll-h {
  flex: 1;
  min-width: 0;
  height: 14px;
  overflow-x: scroll;
  overflow-y: hidden;
}
.map-scroll-corner {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  background: var(--app-surface-2, #2a2a2a);
  border-left: 1px solid var(--app-border, #444);
  border-top: 1px solid var(--app-border, #444);
  box-sizing: border-box;
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
