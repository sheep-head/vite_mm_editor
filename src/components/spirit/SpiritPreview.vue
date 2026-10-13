<template>
  <div class="spirit-preview">
    <canvas ref="canvas" :width="size" :height="size"></canvas>
    <div v-if="!hasImage" class="hint">请选择图片后可预览</div>
    <div v-else-if="trailHint" class="trail-hint">{{ trailHint }}</div>
  </div>
</template>
<script>
import { config, path, fs, isNw } from '@/utils/nw'
import { normalizeImagePath, resolveTrail } from '@/utils/spiritDefaults'
import { buildOutlineCanvas } from '@/utils/spiritOutline'

export default {
  name: 'SpiritPreview',
  props: {
    spirit: { type: Object, default: null },
    trailsLib: { type: Object, default: () => ({}) },
    size: { type: Number, default: 220 },
    /** 拖尾演示移动，默认开 */
    demoMove: { type: Boolean, default: true },
    /** 预览是否播 SE */
    playSfx: { type: Boolean, default: true },
  },
  data() {
    return {
      img: null,
      tailImg: null,
      hasImage: false,
      loadedPath: '',
      loadedTailPath: '',
      frame: 0,
      tick: 0,
      phase: 0,
      raf: 0,
      outlineCache: null,
      outlineCacheKey: '',
      ghosts: [],
      trailTimer: 0,
      history: [],
      tailFrame: 0,
      tailTick: 0,
      sfxTimer: 0,
      sfxFrameFired: {},
      audioEl: null,
    }
  },
  computed: {
    imagePath() {
      if (!this.spirit || !this.spirit.sprite) return ''
      return normalizeImagePath(this.spirit.sprite)
    },
    resolved() {
      return resolveTrail(this.spirit && this.spirit.trail, this.trailsLib || {})
    },
    trailHint() {
      const t = this.resolved
      if (!t.enabled) return ''
      if (!this.demoMove) return '勾选演示移动可见拖尾'
      return t.mode === 'tail' ? '尾巴跟随演示' : '残影演示中'
    },
    tailImagePath() {
      const t = this.resolved
      if (!t.enabled || t.mode !== 'tail') return ''
      return normalizeImagePath(t.sprite || {})
    },
  },
  watch: {
    imagePath(val) {
      this.outlineCache = null
      this.outlineCacheKey = ''
      this.reloadImage(val)
    },
    tailImagePath(val) {
      this.reloadTailImage(val)
    },
    'spirit.outline': {
      deep: true,
      handler() {
        this.outlineCache = null
        this.outlineCacheKey = ''
      },
    },
    'spirit.trail': {
      deep: true,
      handler() {
        this.resetTrailState()
      },
    },
    trailsLib: {
      deep: true,
      handler() {
        this.resetTrailState()
      },
    },
    demoMove() {
      this.resetTrailState()
    },
  },
  mounted() {
    this.reloadImage(this.imagePath)
    this.reloadTailImage(this.tailImagePath)
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      this.updateAnim()
      this.draw()
    }
    this.raf = requestAnimationFrame(loop)
  },
  beforeUnmount() {
    cancelAnimationFrame(this.raf)
    if (this.audioEl) {
      try {
        this.audioEl.pause()
      } catch (e) {
        /* ignore */
      }
    }
  },
  methods: {
    resetTrailState() {
      this.ghosts = []
      this.history = []
      this.trailTimer = 0
      this.sfxTimer = 0
      this.sfxFrameFired = {}
      this.tailFrame = 0
      this.tailTick = 0
    },
    resolveAbsPath(relPath) {
      if (!relPath || !config || !config.workSpace || !path) return null
      const base = path.join(config.workSpace, 'img', ...relPath.split('/').filter(Boolean))
      const exts = ['.png', '.PNG', '.jpg', '.jpeg', '.gif', '.webp']
      if (!isNw || !fs) return base + '.png'
      for (const ext of exts) {
        const p = base + ext
        if (fs.existsSync(p)) return p
      }
      return null
    },
    resolveSePath(name) {
      if (!name || !config || !config.workSpace || !path) return null
      const base = path.join(config.workSpace, 'audio', 'se', name)
      const exts = ['.ogg', '.OGG', '.m4a', '.wav', '.mp3']
      if (!isNw || !fs) return base + '.ogg'
      for (const ext of exts) {
        if (fs.existsSync(base + ext)) return base + ext
      }
      return null
    },
    toFileUrl(abs) {
      const normalized = String(abs).replace(/\\/g, '/')
      return /^[A-Za-z]:/.test(normalized) ? `file:///${normalized}` : `file://${normalized}`
    },
    reloadImage(relPath) {
      if (!relPath) {
        this.img = null
        this.hasImage = false
        this.loadedPath = ''
        this.frame = 0
        this.tick = 0
        this.outlineCache = null
        return
      }
      if (relPath === this.loadedPath && this.img) return
      const abs = this.resolveAbsPath(relPath)
      if (!abs) {
        this.img = null
        this.hasImage = false
        this.loadedPath = ''
        this.outlineCache = null
        return
      }
      const image = new Image()
      const targetPath = relPath
      image.onload = () => {
        if (this.imagePath !== targetPath) return
        this.img = image
        this.hasImage = true
        this.loadedPath = targetPath
        this.frame = 0
        this.tick = 0
        this.outlineCache = null
        this.outlineCacheKey = ''
      }
      image.onerror = () => {
        if (this.imagePath !== targetPath) return
        this.img = null
        this.hasImage = false
        this.loadedPath = ''
        this.outlineCache = null
      }
      image.src = this.toFileUrl(abs)
    },
    reloadTailImage(relPath) {
      if (!relPath) {
        this.tailImg = null
        this.loadedTailPath = ''
        return
      }
      if (relPath === this.loadedTailPath && this.tailImg) return
      const abs = this.resolveAbsPath(relPath)
      if (!abs) {
        this.tailImg = null
        this.loadedTailPath = ''
        return
      }
      const image = new Image()
      const target = relPath
      image.onload = () => {
        if (this.tailImagePath !== target) return
        this.tailImg = image
        this.loadedTailPath = target
      }
      image.onerror = () => {
        if (this.tailImagePath !== target) return
        this.tailImg = null
        this.loadedTailPath = ''
      }
      image.src = this.toFileUrl(abs)
    },
    playTrailSe(sfx) {
      if (!this.playSfx || !sfx || !sfx.name) return
      const abs = this.resolveSePath(sfx.name)
      if (!abs) return
      try {
        if (!this.audioEl) this.audioEl = new Audio()
        this.audioEl.volume = Math.max(0, Math.min(1, (sfx.volume != null ? sfx.volume : 90) / 100))
        this.audioEl.src = this.toFileUrl(abs)
        this.audioEl.currentTime = 0
        this.audioEl.play().catch(() => {})
      } catch (e) {
        /* ignore */
      }
    },
    updateAnim() {
      const sp = (this.spirit && this.spirit.sprite) || {}
      const wait = Math.max(1, Number(sp.frameWait) || 8)
      const frames = Math.max(1, Number(sp.frames) || 1)
      const rows = Math.max(1, Number(sp.rows) || 1)
      const total = frames * rows
      this.tick += 1
      if (this.tick >= wait) {
        this.tick = 0
        this.frame = (this.frame + 1) % total
      }
      this.phase += 0.08

      const trail = this.resolved
      const moving = !!(trail.enabled && this.demoMove)
      const W = this.size
      const H = this.size
      const cx0 = W / 2
      const cy0 = H / 2
      // 演示位移：水平椭圆
      let ox = 0
      let oy = 0
      if (moving) {
        ox = Math.sin(this.phase * 0.55) * Math.min(48, W * 0.22)
        oy = Math.cos(this.phase * 0.55) * Math.min(18, H * 0.08)
      }
      this._demoX = cx0 + ox
      this._demoY = cy0 + oy

      if (trail.enabled && moving) {
        if (trail.mode === 'tail') {
          this.history.push({ x: this._demoX, y: this._demoY })
          const gap = Math.max(1, Number(trail.segmentGap) || 2)
          const segs = Math.max(1, Number(trail.segments) || 5)
          const maxLen = segs * gap + 8
          while (this.history.length > maxLen) this.history.shift()
          const tsp = trail.sprite || {}
          const tw = Math.max(1, Number(tsp.frameWait) || 8)
          this.tailTick += 1
          if (this.tailTick >= tw) {
            this.tailTick = 0
            const tf = Math.max(1, (Number(tsp.frames) || 1) * (Number(tsp.rows) || 1))
            this.tailFrame = (this.tailFrame + 1) % tf
          }
        } else {
          this.trailTimer += 1
          if (this.trailTimer >= (Number(trail.interval) || 3)) {
            this.trailTimer = 0
            const life = trail.life != null ? Math.max(1, Number(trail.life)) : 24
            this.ghosts.push({
              x: this._demoX,
              y: this._demoY,
              frame: this.frame,
              life,
              maxLife: life,
            })
            const max = trail.max != null ? Math.max(1, Number(trail.max)) : 8
            while (this.ghosts.length > max) this.ghosts.shift()
          }
        }
      }
      for (let i = this.ghosts.length - 1; i >= 0; i--) {
        this.ghosts[i].life -= 1
        if (this.ghosts[i].life <= 0) this.ghosts.splice(i, 1)
      }

      // sfx
      const sfx = trail.sfx
      if (trail.enabled && sfx && sfx.enabled && sfx.name) {
        const okWhen =
          sfx.when === 'always' ||
          (sfx.when === 'moving' && moving) ||
          (sfx.when === 'idle' && !moving)
        if (okWhen) {
          let fire = false
          if (sfx.interval > 0) {
            this.sfxTimer += 1
            if (this.sfxTimer >= sfx.interval) {
              this.sfxTimer = 0
              fire = true
            }
          }
          const fi = trail.mode === 'tail' ? this.tailFrame : this.frame
          if (Array.isArray(sfx.frames) && sfx.frames.includes(fi)) {
            if (!this.sfxFrameFired[fi]) {
              this.sfxFrameFired[fi] = true
              fire = true
            }
          } else {
            this.sfxFrameFired = {}
          }
          if (fire) this.playTrailSe(sfx)
        }
      }
    },
    getOutline(sx, sy, fw, fh) {
      const ol = (this.spirit && this.spirit.outline) || {}
      if (ol.enabled === false) return null
      const key = [
        this.frame,
        fw,
        fh,
        sx,
        sy,
        ol.expand,
        ol.color,
        ol.opacity,
        ol.alphaThreshold,
        this.loadedPath,
      ].join('|')
      if (this.outlineCacheKey === key && this.outlineCache) return this.outlineCache
      const built = buildOutlineCanvas(this.img, sx, sy, fw, fh, ol)
      this.outlineCacheKey = key
      this.outlineCache = built
      return built
    },
    drawGrid(ctx, W, H) {
      const step = 16
      ctx.fillStyle = '#1a1d24'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = '#2a2f3a'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x <= W; x += step) {
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, H)
      }
      for (let y = 0; y <= H; y += step) {
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(W, y + 0.5)
      }
      ctx.stroke()
      const cx = Math.floor(W / 2) + 0.5
      const cy = Math.floor(H / 2) + 0.5
      ctx.strokeStyle = '#6b7380'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(W, cy)
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, H)
      ctx.stroke()
    },
    drawSpriteAt(ctx, img, frameIndex, spriteCfg, cx, cy, opacity, scaleMul) {
      if (!img || !spriteCfg) return
      let fw = Math.max(1, Number(spriteCfg.frameW) || img.height)
      let fh = Math.max(1, Number(spriteCfg.frameH) || img.height)
      const cols = Math.max(1, Number(spriteCfg.frames) || 1)
      const col = frameIndex % cols
      const row = Math.floor(frameIndex / cols)
      let sx = col * fw
      let sy = row * fh
      if (sx >= img.width) sx = Math.max(0, img.width - fw)
      if (sy >= img.height) sy = Math.max(0, img.height - fh)
      fw = Math.max(1, Math.min(fw, img.width - sx))
      fh = Math.max(1, Math.min(fh, img.height - sy))
      let scale = (Number(spriteCfg.scale) || 1) * (scaleMul != null ? scaleMul : 1)
      const ax = Number(spriteCfg.anchorX)
      const ay = Number(spriteCfg.anchorY)
      const anchorX = Number.isFinite(ax) ? ax : 0.5
      const anchorY = Number.isFinite(ay) ? ay : 1
      const dw = fw * scale
      const dh = fh * scale
      const dx = cx - dw * anchorX
      const dy2 = cy - dh * anchorY
      ctx.globalAlpha = opacity
      ctx.drawImage(img, sx, sy, fw, fh, dx, dy2, dw, dh)
    },
    draw() {
      const canvas = this.$refs.canvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const W = this.size
      const H = this.size
      ctx.clearRect(0, 0, W, H)
      this.drawGrid(ctx, W, H)

      if (!this.img || !this.spirit) return
      const sp = this.spirit.sprite || {}
      const ft = this.spirit.float || {}
      const fx = this.spirit.fx || {}
      const trail = this.resolved

      let dy = 0
      if (ft.enabled !== false) {
        dy = Math.sin(this.phase * (Number(ft.speed) || 0.08) / 0.08) * (Number(ft.amplitude) || 6)
      }

      const cx = this._demoX != null ? this._demoX : W / 2
      const cy = (this._demoY != null ? this._demoY : H / 2) + dy

      ctx.save()
      ctx.imageSmoothingEnabled = false

      // 先画拖尾
      if (trail.enabled) {
        if (trail.mode === 'tail' && this.history.length) {
          const gap = Math.max(1, Number(trail.segmentGap) || 2)
          const segs = Math.max(1, Number(trail.segments) || 5)
          const tsp = trail.sprite || {}
          const img = this.tailImg || this.img
          for (let i = segs - 1; i >= 0; i--) {
            const hi = this.history.length - 1 - (i + 1) * gap
            if (hi < 0) continue
            const h = this.history[hi]
            const fade = 1 - (i + 1) / (segs + 1)
            const baseOp = trail.opacity != null ? Number(trail.opacity) : 180
            const op = (baseOp / 255) * (0.35 + 0.65 * fade)
            this.drawSpriteAt(ctx, img, this.tailFrame, tsp.path ? tsp : sp, h.x, h.y + dy * 0.3, op, trail.scale)
          }
        } else {
          for (let g = 0; g < this.ghosts.length; g++) {
            const ghost = this.ghosts[g]
            const baseOp = trail.opacity != null ? Number(trail.opacity) : 120
            const op = (baseOp / 255) * (ghost.life / ghost.maxLife)
            this.drawSpriteAt(ctx, this.img, ghost.frame, sp, ghost.x, ghost.y, op, trail.scale)
          }
        }
      }

      // 本体
      let scale = Number(sp.scale) || 1
      if (fx.scalePulse) {
        scale *= 1 + Math.sin(this.phase * 1.3) * Number(fx.scalePulse)
      }
      let opacity = 1
      if (fx.opacityPulse) {
        opacity = Math.max(0.2, 1 - (Math.sin(this.phase * 1.3) * 0.5 + 0.5) * (Number(fx.opacityPulse) / 255))
      }

      let fw = Math.max(1, Number(sp.frameW) || this.img.height)
      let fh = Math.max(1, Number(sp.frameH) || this.img.height)
      const cols = Math.max(1, Number(sp.frames) || 1)
      const col = this.frame % cols
      const row = Math.floor(this.frame / cols)
      let sx = col * fw
      let sy = row * fh
      if (sx >= this.img.width) sx = Math.max(0, this.img.width - fw)
      if (sy >= this.img.height) sy = Math.max(0, this.img.height - fh)
      fw = Math.max(1, Math.min(fw, this.img.width - sx))
      fh = Math.max(1, Math.min(fh, this.img.height - sy))

      const ax = Number(sp.anchorX)
      const ay = Number(sp.anchorY)
      const anchorX = Number.isFinite(ax) ? ax : 0.5
      const anchorY = Number.isFinite(ay) ? ay : 1
      const dw = fw * scale
      const dh = fh * scale
      const dx = cx - dw * anchorX
      const dy2 = cy - dh * anchorY

      if (fx.flipBySide) {
        const flip = Math.sin(this.phase * 0.2) < 0
        if (flip) {
          ctx.translate(cx, 0)
          ctx.scale(-1, 1)
          ctx.translate(-cx, 0)
        }
      }

      const outline = this.getOutline(sx, sy, fw, fh)
      if (outline && outline.canvas) {
        const pad = outline.pad || 0
        const ow = outline.width * scale
        const oh = outline.height * scale
        const oax = outline.width > 0 ? (fw * anchorX + pad) / outline.width : anchorX
        const oay = outline.height > 0 ? (fh * anchorY + pad) / outline.height : anchorY
        const odx = cx - ow * oax
        const ody = cy - oh * oay
        ctx.globalAlpha = 1
        ctx.drawImage(outline.canvas, 0, 0, outline.width, outline.height, odx, ody, ow, oh)
      }

      ctx.globalAlpha = opacity
      ctx.drawImage(this.img, sx, sy, fw, fh, dx, dy2, dw, dh)
      ctx.restore()
    },
  },
}
</script>
<style scoped>
.spirit-preview {
  position: relative;
  display: inline-block;
  border: 1px solid var(--app-border, #414243);
  border-radius: 8px;
  overflow: hidden;
  background: #141414;
}
.hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a3a6ad;
  font-size: 13px;
  pointer-events: none;
}
.trail-hint {
  position: absolute;
  left: 6px;
  bottom: 4px;
  font-size: 11px;
  color: #9aa3b2;
  pointer-events: none;
  text-shadow: 0 1px 2px #000;
}
</style>
