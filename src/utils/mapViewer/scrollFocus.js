import {
  FOCUS_RING_CYCLE_MS,
  FOCUS_RING_MIN_MS,
  FIT_MAX_VISIBLE_TILES,
  SCROLL_RANGE_MAX,
} from './constants'

export const scrollFocusComputed = {
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
        hTrack: 0,
        vTrack: 0,
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
    // 小溢出：track=hMax → 滑块大；大地图：track 封顶避免几十万 px spacer 拖垮缩放
    const hTrack = hMax > 0 ? Math.min(hMax, SCROLL_RANGE_MAX) : 0
    const vTrack = vMax > 0 ? Math.min(vMax, SCROLL_RANGE_MAX) : 0
    const hRatio = hMax > 0 ? Math.max(0, Math.min(1, -this.offsetX / hMax)) : 0
    const vRatio = vMax > 0 ? Math.max(0, Math.min(1, -this.offsetY / vMax)) : 0
    return {
      showH,
      showV,
      contentW: showH ? sw + hTrack : 1,
      contentH: showV ? sh + vTrack : 1,
      hMax,
      vMax,
      hTrack,
      vTrack,
      hVal: hRatio * hTrack,
      vVal: vRatio * vTrack,
    }
  },
}

export const scrollFocusMethods = {
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

  focusRingSample(ring, now = Date.now()) {
    if (!ring) return null
    const cycle = FOCUS_RING_CYCLE_MS
    const elapsed = Math.max(0, now - ring.start)
    if (!(ring.endAt && now >= ring.endAt)) {
      return (elapsed % cycle) / cycle
    }
    if (ring.finishAt == null) {
      const phase = elapsed % cycle
      ring.finishAt = phase < 40 ? now : ring.start + (elapsed - phase) + cycle
    }
    if (now >= ring.finishAt) return null
    const shown = Math.min(elapsed, ring.finishAt - ring.start - 1)
    return (shown % cycle) / cycle
  },

  startFocusRingAnim() {
    if (this._focusRaf) return
    const tick = () => {
      const ring = this._focusRing
      if (!ring || !ring.active) {
        this._focusRaf = 0
        return
      }
      if (this.focusRingSample(ring) == null) {
        this._focusRaf = 0
        this._focusRing = null
        if (this._focusBase) this._focusBase.mapId = 0
        try {
          this.render()
        } catch (e) {
          console.error(e)
        }
        return
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
    if (!m.showH || !m.hMax || !m.hTrack) return
    this.clearFocusRing()
    this.syncingScroll = true
    const ratio = Math.max(0, Math.min(1, (this.$refs.hScroll.scrollLeft || 0) / m.hTrack))
    this.offsetX = -ratio * m.hMax
    this.velocityX = 0
    this.velocityY = 0
    this.render()
    this.syncingScroll = false
  },

  onVScroll() {
    if (this.syncingScroll || !this.currentMapData || !this.canvas) return
    const m = this.scrollMetrics
    if (!m.showV || !m.vMax || !m.vTrack) return
    this.clearFocusRing()
    this.syncingScroll = true
    const ratio = Math.max(0, Math.min(1, (this.$refs.vScroll.scrollTop || 0) / m.vTrack))
    this.offsetY = -ratio * m.vMax
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

  safeFitZoom(mapW, mapH, vw, vh) {
    let z = Math.min(5, Math.max(0.05, Math.min(vw / mapW, vh / mapH)))
    if (!Number.isFinite(z) || z <= 0) z = 0.1
    const tw = this.tileWidth
    const th = this.tileHeight
    // (vw/(tw*z))*(vh/(th*z)) <= FIT_MAX_VISIBLE_TILES  →  z >= sqrt(...)
    const zFloor = Math.sqrt((vw * vh) / (tw * th * FIT_MAX_VISIBLE_TILES))
    if (Number.isFinite(zFloor) && zFloor > z) z = zFloor
    return Math.min(5, Math.max(0.05, z))
  },

  fitToView(opts = {}) {
    const doRender = !opts || opts.render !== false
    if (!this.currentMapData || !this.canvas) {
      if (doRender) this.resetView()
      return
    }
    const mapW = this.currentMapData.width * this.tileWidth
    const mapH = this.currentMapData.height * this.tileHeight
    const pad = 16
    const vw = Math.max(1, this.canvas.width - pad * 2)
    const vh = Math.max(1, this.canvas.height - pad * 2)
    const z = this.safeFitZoom(mapW, mapH, vw, vh)
    this.zoom = z
    this.offsetX = (this.canvas.width - mapW * z) / 2
    this.offsetY = (this.canvas.height - mapH * z) / 2
    this.velocityX = 0
    this.velocityY = 0
    this.bumpScroll()
    this.emitZoom()
    if (doRender) this.render()
  },

  startInertia() {
    const friction = 0.95
    const threshold = 0.1
    const animate = () => {
      const moving =
        !this.isDragging &&
        !this.isPanning &&
        !this.draggingEventId &&
        (Math.abs(this.velocityX) > threshold || Math.abs(this.velocityY) > threshold)
      if (moving) {
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
}
