<template>
  <div
    ref="wrap"
    class="mpc"
    :class="{ panning }"
    @wheel.prevent="onWheel"
    @contextmenu.prevent>
    <canvas
      ref="canvas"
      @mousedown="onDown"
      @click="onClick" />
    <div v-if="loading" class="mpc-mask">加载中…</div>
    <div v-else-if="error" class="mpc-mask err">{{ error }}</div>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'
import { fs, path, isNw } from '@/utils/nw'
import {
  TILE,
  workRoot,
  loadTilesetBundle,
  paintMapToCanvas,
  loadCharacterImage,
  drawCharacterSimple,
  drawMapEventMarker,
  eventInnerBox,
  drawEventFill,
  drawEventFrame,
} from '@/utils/mapTilePaint'
import { getEventDisplayPage } from './eventRef'

function frameYield() {
  return new Promise((r) => requestAnimationFrame(() => r()))
}

export default {
  name: 'MapPreviewCanvas',
  props: {
    mapId: { type: Number, default: 0 },
    selectedX: { type: Number, default: -1 },
    selectedY: { type: Number, default: -1 },
    showEvents: { type: Boolean, default: true },
    /** 叠绘角色 { x, y, characterName, characterIndex, direction, pattern } */
    overlayActor: { type: Object, default: null },
    selectable: { type: Boolean, default: true },
  },
  emits: ['pick', 'loaded'],
  data() {
    return {
      loading: false,
      error: '',
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      panning: false,
    }
  },
  computed: {
    ...mapGetters(['editorUi', 'mapCharOriginalSize', 'showHyperlinks', 'showHyperlinkImages']),
    useHyperlinkImages() {
      return !!(this.showHyperlinks && this.showHyperlinkImages)
    },
    eventStyle() {
      const ui = this.editorUi || {}
      return {
        fillColor: ui.eventFillColor || 'rgba(0,0,0,0.3)',
        largeFit: ui.eventLargeFit === 'fit' ? 'fit' : 'center',
        originalSize: !!this.mapCharOriginalSize,
        useHyperlinkImages: this.useHyperlinkImages,
        showHyperlinkMark: !!this.showHyperlinks,
      }
    },
  },
  watch: {
    mapId: {
      immediate: true,
      handler(id) {
        this.load(id)
      },
    },
    selectedX() {
      this.requestPaint()
    },
    selectedY() {
      this.requestPaint()
    },
    showEvents() {
      this.requestPaint()
    },
    showHyperlinks() {
      this.onHyperlinkDisplayChange()
    },
    showHyperlinkImages() {
      this.onHyperlinkDisplayChange()
    },
    eventStyle: {
      deep: true,
      handler() {
        this.requestPaint()
      },
    },
    overlayActor: {
      handler() {
        this.syncOverlay()
      },
    },
  },
  beforeCreate() {
    this._token = 0
    this._dead = false
    this._map = null
    this._flags = []
    this._cache = null
    this._charImgs = Object.create(null)
    this._viewTouched = false
    this._paintQueued = false
    this._paintRaf = 0
    this._panX = 0
    this._panY = 0
  },
  created() {
    this._onWinMove = (e) => this.onPanMove(e)
    this._onWinUp = () => this.endPan()
  },
  mounted() {
    this._ro = new ResizeObserver(() => {
      this.resize()
      if (!this._viewTouched) this.fitView(false)
      this.requestPaint()
    })
    if (this.$refs.wrap) this._ro.observe(this.$refs.wrap)
  },
  beforeUnmount() {
    this._dead = true
    this._token += 1
    this.endPan()
    if (this._paintRaf) cancelAnimationFrame(this._paintRaf)
    if (this._ro) this._ro.disconnect()
  },
  methods: {
    getMap() {
      return this._map
    },
    getFlags() {
      return this._flags
    },
    requestPaint() {
      if (this._dead || this._paintQueued) return
      this._paintQueued = true
      this._paintRaf = requestAnimationFrame(() => {
        this._paintQueued = false
        this._paintRaf = 0
        if (this._dead) return
        try {
          this.paint()
        } catch (e) {
          console.error(e)
        }
      })
    },
    async syncOverlay() {
      const a = this.overlayActor
      const token = this._token
      try {
        if (a && a.characterName && !this._charImgs[a.characterName]) {
          const img = await loadCharacterImage(a.characterName)
          if (this._dead || token !== this._token) return
          if (img) this._charImgs[a.characterName] = img
        }
      } catch (e) {
        console.error(e)
      }
      if (!this._dead && token === this._token) this.requestPaint()
    },
    resize() {
      const wrap = this.$refs.wrap
      const canvas = this.$refs.canvas
      if (!wrap || !canvas) return
      const w = Math.max(1, wrap.clientWidth)
      const h = Math.max(1, wrap.clientHeight)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    },
    fitView(paintNow = true) {
      const canvas = this.$refs.canvas
      const map = this._map
      if (!canvas || !map || !map.width || !map.height) return
      this.resize()
      const mw = map.width * TILE
      const mh = map.height * TILE
      const z = Math.min(canvas.width / mw, canvas.height / mh)
      if (!Number.isFinite(z) || z <= 0) return
      this.zoom = Math.max(0.02, Math.min(4, z))
      this.offsetX = (canvas.width - mw * this.zoom) / 2
      this.offsetY = (canvas.height - mh * this.zoom) / 2
      if (paintNow) this.requestPaint()
    },
    async load(mapId) {
      const token = ++this._token
      this.loading = true
      this.error = ''
      this._map = null
      this._cache = null
      this._charImgs = Object.create(null)
      this._viewTouched = false
      if (!mapId) {
        this.loading = false
        this.requestPaint()
        return
      }
      try {
        await this.$nextTick()
        if (token !== this._token) return
        const root = workRoot()
        if (!isNw || !fs || !path || !root) {
          this.error = '需要工作空间'
          this.loading = false
          return
        }
        const file = path.join(root, 'data', `Map${String(mapId).padStart(3, '0')}.json`)
        if (!fs.existsSync(file)) {
          this.error = '地图不存在'
          this.loading = false
          return
        }
        const text = await new Promise((resolve, reject) => {
          const finish = (err, data) => {
            if (!err && data != null) {
              resolve(data)
              return
            }
            try {
              resolve(fs.readFileSync(file, 'utf-8'))
            } catch (e2) {
              reject(err || e2)
            }
          }
          if (typeof fs.readFile === 'function') fs.readFile(file, 'utf-8', finish)
          else finish(null, null)
        })
        if (token !== this._token) return
        const map = JSON.parse(text)
        const { tileset, images, flags } = await loadTilesetBundle(map.tilesetId || 1)
        if (token !== this._token) return
        const cache = await paintMapToCanvas(map, tileset, images, async () => {
          if (token !== this._token) return false
          await frameYield()
          if (token !== this._token) return false
        })
        if (token !== this._token) return
        this._map = markRaw(map)
        this._flags = flags || []
        this._cache = cache
        this.loading = false
        this.resize()
        this.fitView()
        this.$emit('loaded', { map: this._map, flags: this._flags })
        requestAnimationFrame(() => {
          if (this._dead || token !== this._token || this._viewTouched) return
          this.resize()
          this.fitView()
        })
        if (this.showEvents || (this.overlayActor && this.overlayActor.characterName)) {
          this.preloadChars(token)
        }
      } catch (e) {
        if (token !== this._token) return
        console.error(e)
        this.error = '加载失败'
        this.loading = false
        this.requestPaint()
      }
    },
    onHyperlinkDisplayChange() {
      if (this.showEvents && this._map) {
        this.preloadChars(this._token)
      } else {
        this.requestPaint()
      }
    },
    async preloadChars(token) {
      const map = this._map
      if (!map) return
      const names = new Set()
      const useTpl = this.useHyperlinkImages
      if (this.showEvents) {
        ;(map.events || []).forEach((ev) => {
          if (!ev) return
          const page = getEventDisplayPage(ev, useTpl)
          const img = page && page.image
          if (img && img.characterName) names.add(img.characterName)
        })
      }
      if (this.overlayActor && this.overlayActor.characterName) {
        names.add(this.overlayActor.characterName)
      }
      for (const n of names) {
        if (this._dead || token !== this._token) return
        if (!this._charImgs[n]) {
          const img = await loadCharacterImage(n)
          if (img) this._charImgs[n] = img
        }
      }
      if (!this._dead && token === this._token) this.requestPaint()
    },
    clamp() {
      const map = this._map
      const canvas = this.$refs.canvas
      if (!map || !canvas) return
      const mw = map.width * TILE * this.zoom
      const mh = map.height * TILE * this.zoom
      if (mw <= canvas.width) this.offsetX = (canvas.width - mw) / 2
      else this.offsetX = Math.min(0, Math.max(canvas.width - mw, this.offsetX))
      if (mh <= canvas.height) this.offsetY = (canvas.height - mh) / 2
      else this.offsetY = Math.min(0, Math.max(canvas.height - mh, this.offsetY))
    },
    paint() {
      const canvas = this.$refs.canvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#2a2a2a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const map = this._map
      if (!this._cache || !map) return
      this.clamp()
      const dw = map.width * TILE * this.zoom
      const dh = map.height * TILE * this.zoom
      ctx.drawImage(this._cache, this.offsetX, this.offsetY, dw, dh)
      ctx.save()
      ctx.translate(this.offsetX, this.offsetY)
      ctx.scale(this.zoom, this.zoom)
      if (this.showEvents) this.paintEvents(ctx)
      this.paintOverlay(ctx)
      if (this.selectedX >= 0 && this.selectedY >= 0) {
        ctx.strokeStyle = '#ff3b30'
        ctx.lineWidth = 2 / this.zoom
        ctx.strokeRect(
          this.selectedX * TILE + 1,
          this.selectedY * TILE + 1,
          TILE - 2,
          TILE - 2
        )
      }
      ctx.restore()
    },
    paintEvents(ctx) {
      const map = this._map
      if (!map) return
      const style = this.eventStyle
      const useTpl = this.useHyperlinkImages
      ;(map.events || []).forEach((ev) => {
        if (!ev || !ev.id) return
        const page = getEventDisplayPage(ev, useTpl)
        const image = page && page.image
        const img = image && image.characterName ? this._charImgs[image.characterName] : null
        drawMapEventMarker(ctx, ev, img, style)
      })
    },
    paintOverlay(ctx) {
      const a = this.overlayActor
      if (!a) return
      const x = (Number(a.x) || 0) * TILE
      const y = (Number(a.y) || 0) * TILE
      const style = this.eventStyle
      drawEventFill(ctx, x, y, 'rgba(47, 128, 237, 0.35)')
      const dir = a.direction || 2
      const image = {
        characterName: a.characterName || '',
        characterIndex: a.characterIndex || 0,
        direction: dir,
        pattern: a.pattern != null ? a.pattern : 1,
      }
      const img = a.characterName ? this._charImgs[a.characterName] : null
      let drew = false
      if (img && image.characterName) {
        drew = drawCharacterSimple(ctx, img, image, x, y, TILE, TILE, {
          frameBox: eventInnerBox(x, y),
          largeFit: style.largeFit,
          originalSize: style.originalSize,
        })
      }
      if (!drew) {
        ctx.save()
        ctx.fillStyle = '#1d4ed8'
        ctx.beginPath()
        if (dir === 4) {
          ctx.moveTo(x + 10, y + TILE / 2)
          ctx.lineTo(x + 22, y + 14)
          ctx.lineTo(x + 22, y + TILE - 14)
        } else if (dir === 6) {
          ctx.moveTo(x + TILE - 10, y + TILE / 2)
          ctx.lineTo(x + TILE - 22, y + 14)
          ctx.lineTo(x + TILE - 22, y + TILE - 14)
        } else if (dir === 8) {
          ctx.moveTo(x + TILE / 2, y + 10)
          ctx.lineTo(x + 14, y + 22)
          ctx.lineTo(x + TILE - 14, y + 22)
        } else {
          ctx.moveTo(x + TILE / 2, y + TILE - 10)
          ctx.lineTo(x + 14, y + TILE - 22)
          ctx.lineTo(x + TILE - 14, y + TILE - 22)
        }
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      drawEventFrame(ctx, x, y)
    },
    clientToTile(e) {
      const canvas = this.$refs.canvas
      const map = this._map
      if (!canvas || !map) return null
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const x = Math.floor((cx - this.offsetX) / (TILE * this.zoom))
      const y = Math.floor((cy - this.offsetY) / (TILE * this.zoom))
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null
      return { x, y }
    },
    onDown(e) {
      if (e.button === 2 && (e.ctrlKey || e.metaKey)) {
        this.panning = true
        this._viewTouched = true
        this._panX = e.clientX
        this._panY = e.clientY
        window.addEventListener('mousemove', this._onWinMove)
        window.addEventListener('mouseup', this._onWinUp)
        e.preventDefault()
      }
    },
    onPanMove(e) {
      if (!this.panning) return
      const dx = e.clientX - this._panX
      const dy = e.clientY - this._panY
      this._panX = e.clientX
      this._panY = e.clientY
      this.offsetX += dx
      this.offsetY += dy
      this.requestPaint()
    },
    endPan() {
      if (!this.panning && !this._onWinMove) return
      this.panning = false
      window.removeEventListener('mousemove', this._onWinMove)
      window.removeEventListener('mouseup', this._onWinUp)
    },
    onClick(e) {
      if (e.button !== 0 || !this.selectable) return
      const t = this.clientToTile(e)
      if (!t) return
      this.$emit('pick', t)
    },
    onWheel(e) {
      if (!this._map) return
      const before = this.zoom
      const next = Math.max(0.02, Math.min(4, this.zoom * (e.deltaY > 0 ? 0.9 : 1.1)))
      if (next === before) return
      const canvas = this.$refs.canvas
      if (!canvas) return
      this._viewTouched = true
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const mx = (cx - this.offsetX) / before
      const my = (cy - this.offsetY) / before
      this.zoom = next
      this.offsetX = cx - mx * next
      this.offsetY = cy - my * next
      this.requestPaint()
    },
  },
}
</script>

<style scoped>
.mpc {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #2a2a2a;
  border: 1px solid var(--app-border, #444);
}
.mpc canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}
.mpc.panning canvas {
  cursor: grabbing;
}
.mpc-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 13px;
  pointer-events: none;
}
.mpc-mask.err {
  color: #ff8a80;
}
</style>
