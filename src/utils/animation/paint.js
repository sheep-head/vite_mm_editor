import { animationSheetLayout } from '@/utils/imgAssets'

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
      this.playing = false
      this.playFrameSrc = ''
      this._playUrls = []
      this.$nextTick(() => this.schedulePaint())
    },
    /** 离屏 canvas 画一帧，不碰 Vue 托管的 canvas */
    renderFrameToOffscreen(cells, w = 400, h = 300) {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      ctx.fillStyle = '#1a2744'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(100,140,200,0.25)'
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      if (this.showTarget) {
        ctx.strokeStyle = '#7ec8e3'
        ctx.strokeRect(w / 2 - 24, h / 2 - 40, 48, 80)
      }
      this.drawCellsOnCtx(ctx, cells, w, h)
      try {
        return canvas.toDataURL('image/png')
      } catch (e) {
        console.error('[anim bake]', e)
        return ''
      }
    },
    drawCellsOnCtx(ctx, cells, w, h) {
      if (!ctx || !Array.isArray(cells)) return
      for (const cell of cells) {
        if (!cell || !Array.isArray(cell)) continue
        let pattern = Number(cell[0])
        if (!Number.isFinite(pattern) || pattern < 0) continue
        let img = this._img1
        if (pattern >= 100) {
          img = this._img2
          pattern -= 100
        }
        if (!img || !img.width || !img.height) continue
        const layout = animationSheetLayout(img)
        const cellSize = layout.cell || img.height
        if (!(cellSize > 0) || !(layout.cols > 0)) continue
        const maxPattern = layout.cols * Math.max(1, Math.floor(img.height / cellSize)) - 1
        if (pattern > maxPattern) continue
        const col = pattern % layout.cols
        const row = Math.floor(pattern / layout.cols)
        const sx = col * cellSize
        const sy = row * cellSize
        if (sx + cellSize > img.width + 0.5 || sy + cellSize > img.height + 0.5) continue
        const scale = Math.max(0.01, (Number(cell[3]) || 100) / 100)
        const dw = cellSize * scale
        const dh = cellSize * scale
        if (!Number.isFinite(dw) || !Number.isFinite(dh) || dw < 1 || dh < 1) continue
        const dx = w / 2 + (Number(cell[1]) || 0)
        const dy = h / 2 + (Number(cell[2]) || 0)
        ctx.save()
        const opacity = cell[6] != null ? Number(cell[6]) : 255
        ctx.globalAlpha = Math.max(0, Math.min(1, (Number.isFinite(opacity) ? opacity : 255) / 255))
        ctx.translate(dx, dy)
        const rot = Number(cell[4]) || 0
        if (rot) ctx.rotate((rot * Math.PI) / 180)
        if (cell[5]) ctx.scale(-1, 1)
        try {
          ctx.drawImage(img, sx, sy, cellSize, cellSize, -dw / 2, -dh / 2, dw, dh)
        } catch (e) {
          /* skip bad cell */
        }
        ctx.restore()
      }
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
        if (gen !== this._playGen) return
        const frames = this.frames
        if (!frames.length) {
          this.$message.warning('没有可播放的帧')
          return
        }
        // 先全部烘焙成 dataURL，播放时只换 <img src>，避免定时器里反复 drawImage
        const urls = []
        const emptyUrl = this.renderFrameToOffscreen([])
        for (let i = 0; i < frames.length; i++) {
          if (gen !== this._playGen) return
          const cells = Array.isArray(frames[i]) ? frames[i] : []
          if (!cells.length) {
            urls.push(emptyUrl)
          } else {
            const plain = cells.map((c) => (Array.isArray(c) ? c.slice() : c))
            urls.push(this.renderFrameToOffscreen(plain))
          }
          // 让出一帧，降低连续 GPU 调用触发原生崩溃的概率
          await new Promise((r) => requestAnimationFrame(r))
        }
        this._playUrls = urls
        this.playing = true
        let i = 0
        const step = () => {
          if (gen !== this._playGen) return
          this.playFrameSrc = urls[i] || ''
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
        ctx.fillStyle = '#1a2744'
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = 'rgba(100,140,200,0.25)'
        for (let x = 0; x < w; x += 32) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
        }
        for (let y = 0; y < h; y += 32) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }
        if (this.showTarget) {
          ctx.strokeStyle = '#7ec8e3'
          ctx.strokeRect(w / 2 - 24, h / 2 - 40, 48, 80)
        }
        const cells = this.currentCells
        const plain = Array.isArray(cells) ? cells.map((c) => (Array.isArray(c) ? c.slice() : c)) : []
        this.drawCellsOnCtx(ctx, plain, w, h)
      } catch (e) {
        console.error('[anim paint]', e)
      }
    }
}
