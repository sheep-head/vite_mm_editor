import { animationSheetLayout, animationSheetPatternCount, toFileUrl } from '@/utils/imgAssets'
import { fs, path, isNw } from '@/utils/nw'
import DataManager from '@/utils/DataManager'

const MV_CELL = 192
const MV_COLS = 5
const AUDIO_EXT = ['.ogg', '.m4a', '.mp3', '.wav']
/** 与编辑器预览 canvas 一致 */
export const ANIM_PREVIEW_W = 720
export const ANIM_PREVIEW_H = 520

export const animationPaintMethods = {
  schedulePaint() {
    if (this._paintScheduled || this.playing) return
    this._paintScheduled = true
    requestAnimationFrame(() => {
      this._paintScheduled = false
      if (!this.playing) this.paintMvFrame()
    })
  },

  stopPlay() {
    this._playGen = (this._playGen || 0) + 1
    if (this._playTimer) {
      clearTimeout(this._playTimer)
      this._playTimer = 0
    }
    this.stopPreviewSe()
    this.playing = false
    this.playFrameSrc = ''
    this._playUrls = []
    this.$nextTick(() => this.schedulePaint())
  },

  stopPreviewSe() {
    const list = this._previewSeList || []
    for (const el of list) {
      try {
        el.pause()
        el.removeAttribute('src')
        el.load()
      } catch (e) {
        /* ignore */
      }
    }
    this._previewSeList = []
  },

  resolveSeAbsPath(name) {
    if (!name || !isNw || !fs || !path) return ''
    const root = DataManager.$config && DataManager.$config.workSpace
    if (!root) return ''
    const base = path.join(root, 'audio', 'se', name)
    for (const ext of AUDIO_EXT) {
      const p = base + ext
      if (fs.existsSync(p)) return p
    }
    if (fs.existsSync(base)) return base
    return ''
  },

  playPreviewSe(se) {
    if (!se || !se.name) return
    const abs = this.resolveSeAbsPath(se.name)
    if (!abs) return
    const el = new Audio()
    el.preload = 'auto'
    el.src = toFileUrl(abs)
    const vol = Number(se.volume)
    el.volume = Math.max(0, Math.min(1, (Number.isFinite(vol) ? vol : 90) / 100))
    const pitch = Number(se.pitch)
    el.playbackRate = Math.max(0.5, Math.min(1.5, (Number.isFinite(pitch) ? pitch : 100) / 100))
    if (!this._previewSeList) this._previewSeList = []
    this._previewSeList.push(el)
    el.play().catch(() => {})
  },

  /** 当前动画帧上生效的闪光/隐藏（按 MV 帧索引衰减） */
  flashStateAtFrame(frameIndex) {
    const timings = (this.modelValue && Array.isArray(this.modelValue.timings))
      ? this.modelValue.timings
      : []
    let hideTarget = false
    let targetFlash = null
    let screenFlash = null
    for (const t of timings) {
      if (!t) continue
      const start = Number(t.frame) || 0
      const dur = Math.max(1, Number(t.flashDuration) || 1)
      const scope = Number(t.flashScope) || 0
      if (!scope) continue
      if (frameIndex < start || frameIndex >= start + dur) continue
      const remain = start + dur - frameIndex
      const color = Array.isArray(t.flashColor) ? t.flashColor : [255, 255, 255, 255]
      const intensity = Math.max(0, Math.min(255, (Number(color[3]) || 0) * (remain / dur)))
      if (scope === 3) {
        hideTarget = true
      } else if (scope === 1) {
        targetFlash = {
          r: Number(color[0]) || 0,
          g: Number(color[1]) || 0,
          b: Number(color[2]) || 0,
          a: intensity,
        }
      } else if (scope === 2) {
        screenFlash = {
          r: Number(color[0]) || 0,
          g: Number(color[1]) || 0,
          b: Number(color[2]) || 0,
          a: intensity,
        }
      }
    }
    return { hideTarget, targetFlash, screenFlash }
  },

  /** 离屏 canvas 画一帧，不碰 Vue 托管的 canvas */
  renderFrameToOffscreen(cells, w = ANIM_PREVIEW_W, h = ANIM_PREVIEW_H, frameIndex = -1) {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    const flash = frameIndex >= 0 ? this.flashStateAtFrame(frameIndex) : null
    this.paintMvBackdrop(ctx, w, h)
    if (!flash || !flash.hideTarget) {
      this.drawTargetBattler(ctx, w, h, flash && flash.targetFlash)
    }
    this.drawCellsOnCtx(ctx, cells, w, h)
    if (flash && flash.screenFlash) this.drawScreenFlash(ctx, w, h, flash.screenFlash)
    try {
      return canvas.toDataURL('image/png')
    } catch (e) {
      console.error('[anim bake]', e)
      return ''
    }
  },

  drawScreenFlash(ctx, w, h, flash) {
    if (!flash || flash.a <= 0) return
    ctx.save()
    ctx.globalAlpha = flash.a / 255
    ctx.fillStyle = `rgb(${flash.r},${flash.g},${flash.b})`
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  },

  paintMvBackdrop(ctx, w, h) {
    ctx.fillStyle = '#1a2744'
    ctx.fillRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    // MV：浅绿十字准星 + 中心参考框
    ctx.strokeStyle = 'rgba(120, 220, 140, 0.85)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, h)
    ctx.moveTo(0, cy)
    ctx.lineTo(w, cy)
    ctx.stroke()
    const boxW = Math.min(200, w * 0.36)
    const boxH = Math.min(160, h * 0.38)
    ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH)
  },

  /** flash: {r,g,b,a} 仅叠在怪物图非透明像素上（等同 MV setBlendColor） */
  drawTargetBattler(ctx, w, h, flash) {
    if (!this.showTarget) return
    const img = this._targetImg
    if (!img || !img.width) {
      ctx.strokeStyle = '#7ec8e3'
      ctx.strokeRect(w / 2 - 24, h / 2 - 40, 48, 80)
      return
    }
    // SV 角色表：画中间站立格近似；整图敌人则等比缩小
    const maxH = 140
    const maxW = 120
    let sw = img.width
    let sh = img.height
    let sx = 0
    let sy = 0
    // 常见 SV：3×6 或 9×6 格；取第一行中间站立
    if (img.width % 9 === 0 && img.height % 6 === 0) {
      const cw = img.width / 9
      const ch = img.height / 6
      sx = cw
      sy = 0
      sw = cw
      sh = ch
    } else if (img.width % 3 === 0 && img.height % 4 === 0 && img.width / 3 < img.width * 0.5) {
      const cw = img.width / 3
      const ch = img.height / 4
      sx = cw
      sy = 0
      sw = cw
      sh = ch
    }
    const scale = Math.min(maxW / sw, maxH / sh, 1)
    const dw = Math.max(1, Math.round(sw * scale))
    const dh = Math.max(1, Math.round(sh * scale))
    // 预览始终居中对齐十字准星
    const dx = w / 2 - dw / 2
    const dy = h / 2 - dh / 2
    const hue = Number(this._targetHue) || 0
    const needFlash = flash && flash.a > 0
    if (!needFlash) {
      ctx.save()
      if (hue) ctx.filter = `hue-rotate(${hue}deg)`
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
      ctx.restore()
      return
    }
    // 离屏：先画怪物，再用 source-atop 只给实体像素上色
    const off = document.createElement('canvas')
    off.width = dw
    off.height = dh
    const octx = off.getContext('2d')
    if (!octx) return
    octx.save()
    if (hue) octx.filter = `hue-rotate(${hue}deg)`
    octx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)
    octx.restore()
    octx.globalCompositeOperation = 'source-atop'
    octx.fillStyle = `rgba(${flash.r},${flash.g},${flash.b},${flash.a / 255})`
    octx.fillRect(0, 0, dw, dh)
    ctx.drawImage(off, dx, dy)
  },

  mvCellSource(patternIn, whichSheet) {
    let pattern = patternIn
    let img = whichSheet === 2 ? this._img2 : this._img1
    let hue =
      whichSheet === 2
        ? (this.modelValue && this.modelValue.animation2Hue) || 0
        : (this.modelValue && this.modelValue.animation1Hue) || 0
    if (!img || !img.width) return null
    const layout = animationSheetLayout(img)
    const cellSize = layout.cell || MV_CELL
    const cols = layout.cols || MV_COLS
    if (pattern < 0) return null
    const col = pattern % cols
    const row = Math.floor(pattern / cols)
    const sx = col * cellSize
    const sy = row * cellSize
    if (sx + cellSize > img.width + 0.5 || sy + cellSize > img.height + 0.5) return null
    return { img, sx, sy, cellSize, hue: Number(hue) || 0 }
  },

  /** 单元格屏幕布局：中心、尺寸、轴对齐包围盒（含旋转） */
  cellLayout(cell, w, h) {
    if (!cell || !Array.isArray(cell)) return null
    let pattern = Number(cell[0])
    if (!Number.isFinite(pattern) || pattern < 0) return null
    let which = 1
    if (pattern >= 100) {
      which = 2
      pattern -= 100
    }
    const src = this.mvCellSource(pattern, which)
    const cellSize = src ? src.cellSize : MV_CELL
    const scale = Math.max(0.01, (Number(cell[3]) || 100) / 100)
    const dw = cellSize * scale
    const dh = cellSize * scale
    if (!Number.isFinite(dw) || !Number.isFinite(dh) || dw < 1 || dh < 1) return null
    const cx = w / 2 + (Number(cell[1]) || 0)
    const cy = h / 2 + (Number(cell[2]) || 0)
    const rot = ((Number(cell[4]) || 0) * Math.PI) / 180
    const hw = dw / 2
    const hh = dh / 2
    const corners = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ]
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [lx, ly] of corners) {
      const rx = lx * cos - ly * sin
      const ry = lx * sin + ly * cos
      const px = cx + rx
      const py = cy + ry
      if (px < minX) minX = px
      if (py < minY) minY = py
      if (px > maxX) maxX = px
      if (py > maxY) maxY = py
    }
    return {
      cx,
      cy,
      dw,
      dh,
      rot,
      src,
      bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    }
  },

  /**
   * @param {number} [alphaMul=1] 整体透明度倍率（上一帧残影约 0.35）
   */
  drawCellsOnCtx(ctx, cells, w, h, alphaMul = 1) {
    if (!ctx || !Array.isArray(cells)) return
    const mul = Math.max(0, Math.min(1, Number(alphaMul) || 1))
    for (const cell of cells) {
      const layout = this.cellLayout(cell, w, h)
      if (!layout || !layout.src) continue
      const { img, sx, sy, cellSize, hue } = layout.src
      const { cx, cy, dw, dh, rot } = layout
      ctx.save()
      const opacity = cell[6] != null ? Number(cell[6]) : 255
      ctx.globalAlpha =
        Math.max(0, Math.min(1, (Number.isFinite(opacity) ? opacity : 255) / 255)) * mul
      if (hue) ctx.filter = `hue-rotate(${hue}deg)`
      ctx.translate(cx, cy)
      if (rot) ctx.rotate(rot)
      if (cell[5]) ctx.scale(-1, 1)
      try {
        ctx.drawImage(img, sx, sy, cellSize, cellSize, -dw / 2, -dh / 2, dw, dh)
      } catch (e) {
        /* skip bad cell */
      }
      ctx.restore()
    }
  },

  /** 上一帧残影：黑色框（无选中高亮），半透明显示 */
  drawGhostOverlays(ctx, cells, w, h) {
    if (!ctx || !Array.isArray(cells)) return
    for (let i = 0; i < cells.length; i++) {
      const layout = this.cellLayout(cells[i], w, h)
      if (!layout) continue
      const b = layout.bounds
      ctx.save()
      ctx.globalAlpha = 0.55
      ctx.filter = 'none'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1.5
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, Math.max(1, b.w - 1), Math.max(1, b.h - 1))
      const label = String(i + 1)
      ctx.font = 'bold 12px Consolas, monospace'
      ctx.textBaseline = 'top'
      const tw = ctx.measureText(label).width + 4
      const th = 14
      const lx = b.x
      const ly = Math.max(0, b.y - th)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(lx, ly, tw, th)
      ctx.fillStyle = 'rgba(220,220,220,0.75)'
      ctx.fillText(label, lx + 2, ly + 1)
      ctx.restore()
    }
  },

  /** 编辑态图层框：灰框/白选中框 + 左上角序号（不进入播放 bake） */
  drawCellOverlays(ctx, cells, w, h) {
    if (!ctx || !Array.isArray(cells)) return
    const layouts = []
    for (let i = 0; i < cells.length; i++) {
      const layout = this.cellLayout(cells[i], w, h)
      layouts.push(layout)
      if (!layout) continue
      const b = layout.bounds
      const selected = i === this.cellSel
      ctx.save()
      ctx.globalAlpha = 1
      ctx.filter = 'none'
      if (selected) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2.5
      } else {
        ctx.strokeStyle = 'rgba(180, 180, 180, 0.9)'
        ctx.lineWidth = 1
      }
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, Math.max(1, b.w - 1), Math.max(1, b.h - 1))
      const label = String(i + 1)
      ctx.font = 'bold 12px Consolas, monospace'
      ctx.textBaseline = 'top'
      const tw = ctx.measureText(label).width + 4
      const th = 14
      const lx = b.x
      const ly = Math.max(0, b.y - th)
      ctx.fillStyle = selected ? 'rgba(0,0,0,0.75)' : 'rgba(40,40,40,0.7)'
      ctx.fillRect(lx, ly, tw, th)
      ctx.fillStyle = selected ? '#fff' : '#ddd'
      ctx.fillText(label, lx + 2, ly + 1)
      ctx.restore()
    }
    this._cellLayouts = layouts
  },

  /** 从上到下命中 cell，返回下标；未命中 -1 */
  hitTestCellAt(x, y) {
    const cells = this.currentCells
    if (!Array.isArray(cells) || !cells.length) return -1
    const w = this.previewW || ANIM_PREVIEW_W
    const h = this.previewH || ANIM_PREVIEW_H
    for (let i = cells.length - 1; i >= 0; i--) {
      const layout = this.cellLayout(cells[i], w, h)
      if (!layout) continue
      const b = layout.bounds
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i
    }
    return -1
  },

  async playMvPreview() {
    if (this._playTimer) {
      clearTimeout(this._playTimer)
      this._playTimer = 0
    }
    const gen = (this._playGen || 0) + 1
    this._playGen = gen
    try {
      await this.loadMvImages()
      await this.loadTargetBattler()
      if (gen !== this._playGen) return
      const frames = this.frames
      if (!frames.length) {
        this.$message.warning('没有可播放的帧')
        return
      }
      const urls = []
      for (let i = 0; i < frames.length; i++) {
        if (gen !== this._playGen) return
        const cells = Array.isArray(frames[i]) ? frames[i] : []
        const plain = cells.map((c) => (Array.isArray(c) ? c.slice() : c))
        urls.push(this.renderFrameToOffscreen(plain, ANIM_PREVIEW_W, ANIM_PREVIEW_H, i))
        await new Promise((r) => requestAnimationFrame(r))
      }
      const timings = Array.isArray(this.modelValue && this.modelValue.timings)
        ? this.modelValue.timings
        : []
      const seByFrame = {}
      for (const t of timings) {
        if (!t || !t.se || !t.se.name) continue
        const fi = Number(t.frame) || 0
        if (!seByFrame[fi]) seByFrame[fi] = []
        seByFrame[fi].push(t.se)
      }
      this._playUrls = urls
      this.playing = true
      let i = 0
      const step = () => {
        if (gen !== this._playGen) return
        this.playFrameSrc = urls[i] || ''
        this.frameIndex = i
        const ses = seByFrame[i]
        if (ses) {
          for (const se of ses) this.playPreviewSe(se)
        }
        i += 1
        if (i >= urls.length) {
          this.frameIndex = frames.length - 1
          this.playing = false
          this.playFrameSrc = ''
          this._playTimer = 0
          this.$nextTick(() => this.schedulePaint())
          return
        }
        this._playTimer = setTimeout(step, 1000 / 15)
      }
      step()
    } catch (e) {
      console.error('[anim play]', e)
      if (gen === this._playGen) {
        this.stopPlay()
        this.$message.error('播放失败（已阻止原生崩溃路径，请看控制台）')
      }
    }
  },

  getCtx() {
    const canvas = this.$refs.mvCanvas
    if (!canvas || this.isMz || this.playing) return null
    if (!this._ctx2d || this._ctx2d.canvas !== canvas) {
      this._ctx2d = canvas.getContext('2d', { willReadFrequently: false })
    }
    return this._ctx2d
  },

  paintMvFrame() {
    if (this.playing) return
    try {
      const canvas = this.$refs.mvCanvas
      const ctx = this.getCtx()
      if (!canvas || !ctx) return
      const w = canvas.width
      const h = canvas.height
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, w, h)
      this.paintMvBackdrop(ctx, w, h)
      this.drawTargetBattler(ctx, w, h)
      // MV：当前帧下方半透明显示上一帧（黑框残影）
      if (this.frameIndex > 0) {
        const prev = this.frames[this.frameIndex - 1]
        if (Array.isArray(prev) && prev.length) {
          const ghost = prev.map((c) => (Array.isArray(c) ? c.slice() : c))
          this.drawCellsOnCtx(ctx, ghost, w, h, 0.35)
          this.drawGhostOverlays(ctx, ghost, w, h)
        }
      }
      const cells = this.currentCells
      const plain = Array.isArray(cells) ? cells.map((c) => (Array.isArray(c) ? c.slice() : c)) : []
      this.drawCellsOnCtx(ctx, plain, w, h)
      this.drawCellOverlays(ctx, plain, w, h)
      this.paintPatternRibbon()
    } catch (e) {
      console.error('[anim paint]', e)
    }
  },

  /** 底部图案条：按图高算格数（与引擎一致）；图2 从 100 起 */
  paintPatternRibbon() {
    const canvas = this.$refs.patternRibbon
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cell = 96
    const patterns = []
    if (this._img1) {
      const n1 = animationSheetPatternCount(this._img1)
      for (let i = 0; i < n1; i++) patterns.push({ pattern: i, which: 1 })
    }
    if (this._img2) {
      const n2 = animationSheetPatternCount(this._img2)
      for (let i = 0; i < n2; i++) patterns.push({ pattern: 100 + i, which: 2 })
    }
    const n = Math.max(1, patterns.length)
    canvas.width = n * cell
    canvas.height = cell
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const checker = 10
    for (let i = 0; i < patterns.length; i++) {
      const px = i * cell
      for (let y = 0; y < cell; y += checker) {
        for (let x = 0; x < cell; x += checker) {
          ctx.fillStyle = ((x / checker + y / checker) % 2 === 0) ? '#ccc' : '#fff'
          ctx.fillRect(px + x, y, checker, checker)
        }
      }
      const p = patterns[i]
      const local = p.pattern >= 100 ? p.pattern - 100 : p.pattern
      const src = this.mvCellSource(local, p.which)
      if (src) {
        ctx.save()
        if (src.hue) ctx.filter = `hue-rotate(${src.hue}deg)`
        ctx.drawImage(src.img, src.sx, src.sy, src.cellSize, src.cellSize, px, 0, cell, cell)
        ctx.restore()
      }
      if (this.ribbonSelPattern === p.pattern) {
        ctx.strokeStyle = '#111'
        ctx.lineWidth = 2
        ctx.strokeRect(px + 1, 1, cell - 2, cell - 2)
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 1
        ctx.strokeRect(px + 0.5, 0.5, cell - 1, cell - 1)
      }
      // 右下角显示 1-based（官方编辑器习惯）；写入 cell 仍用 0-based
      const label = String(p.pattern + 1)
      ctx.save()
      ctx.font = 'bold 13px Consolas, monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      const pad = 3
      const tw = ctx.measureText(label).width + pad * 2
      const th = 15
      const bx = px + cell - 1
      const by = cell - 1
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(bx - tw, by - th, tw, th)
      ctx.fillStyle = '#fff'
      ctx.fillText(label, bx - pad, by - 1)
      ctx.restore()
    }
    this._ribbonPatterns = patterns
    this._ribbonCell = cell
  },

  onPatternRibbonClick(e) {
    const canvas = this.$refs.patternRibbon
    if (!canvas || !this._ribbonPatterns || !this._ribbonPatterns.length) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / Math.max(1, rect.width)
    const x = (e.clientX - rect.left) * scaleX
    const idx = Math.floor(x / (this._ribbonCell || 96))
    const entry = this._ribbonPatterns[idx]
    if (!entry) return
    this.applyRibbonPattern(entry.pattern)
  },

  applyRibbonPattern(pattern) {
    if (!this.modelValue || !Array.isArray(this.modelValue.frames)) return
    let f = this.modelValue.frames[this.frameIndex]
    if (!Array.isArray(f)) {
      f = []
      this.modelValue.frames[this.frameIndex] = f
    }
    const sel = this.cellSel
    if (sel >= 0 && f[sel] && Array.isArray(f[sel])) {
      f[sel][0] = pattern
    } else {
      f.push([pattern, 0, 0, 100, 0, 0, 255, 1])
      this.cellSel = f.length - 1
    }
    this.ribbonSelPattern = pattern
    this.schedulePaint()
  },
}
