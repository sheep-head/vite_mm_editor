import { markRaw } from 'vue'
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
} from '@/components/map/mapAutotile'
import { tileSetOfId } from '@/utils/imgAssets'
import { isEventRef, getEventDisplayPage } from '@/components/map/eventRef'
import {
  DIM_ALPHA,
  WALK_ANIM_FPS,
  FOCUS_RING_CYCLE_MS,
  VIEW_BUF_MAX_EDGE,
  VIEW_BUF_PAD_TILES,
  VIEW_BUF_MAX_TILES,
} from './constants'

export const renderMethods = {
  releaseMapCaches() {
    this._cachePainting = false
    this._cacheMetrics = null
    this.invalidateViewBuf()
    const drop = (c) => {
      if (!c) return
      try {
        c.width = 1
        c.height = 1
      } catch (e) {
        /* ignore */
      }
    }
    if (this._bufRaf) cancelAnimationFrame(this._bufRaf)
    this._bufRaf = 0
    if (this._fillRaf) clearTimeout(this._fillRaf)
    this._fillRaf = 0
    this._fill = null
    this._bufJob = null
    this._bufToken += 1
    drop(this.mapCache)
    drop(this.eventsCache)
    drop(this.regionsCache)
    this._viewBufMeta = null
    if (this._viewBuf) {
      const ctx = this._viewBuf.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, this._viewBuf.width, this._viewBuf.height)
    }
    this._mapPaintReady = false
    this._mapPaintTw = 0
    this._mapPaintTh = 0
    this.mapCache = null
    this.eventsCache = null
    this.regionsCache = null
  },

  acquireViewBuf() {
    if (this._viewBuf) return this._viewBuf
    const canvas = document.createElement('canvas')
    canvas.width = VIEW_BUF_MAX_EDGE
    canvas.height = VIEW_BUF_MAX_EDGE
    this._viewBuf = canvas
    return canvas
  },

  invalidateViewBuf() {
    this._viewBufDirty = true
  },

  cacheTw() {
    return this._bufTw || this.tileWidth
  },

  cacheTh() {
    return this._bufTh || this.tileHeight
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
      if (this.currentMapData) {
        if (!this._walkLastTs || ts - this._walkLastTs >= stepMs) {
          this._walkLastTs = ts
          this._walkAnimTick = (this._walkAnimTick + 1) | 0
          if (this._focusBase) this._focusBase.mapId = 0
          this.render()
        }
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

  visibleTileRange(pad = 2) {
    if (!this.currentMapData || !this.canvas) return null
    const tw = this.tileWidth * this.zoom
    const th = this.tileHeight * this.zoom
    if (!(tw > 0) || !(th > 0)) return null
    let x0 = Math.floor(-this.offsetX / tw) - pad
    let y0 = Math.floor(-this.offsetY / th) - pad
    let x1 = Math.ceil((-this.offsetX + this.canvas.width) / tw) + pad
    let y1 = Math.ceil((-this.offsetY + this.canvas.height) / th) + pad
    x0 = Math.max(0, x0)
    y0 = Math.max(0, y0)
    x1 = Math.min(this.currentMapData.width - 1, x1)
    y1 = Math.min(this.currentMapData.height - 1, y1)
    if (x1 < x0 || y1 < y0) return null
    return { x0, y0, x1, y1 }
  },

  ensureViewBuf(vis) {
    if (!vis || !this.currentMapData) return null
    const mapW = this.currentMapData.width
    const mapH = this.currentMapData.height
    const layerKey = String(this.editLayer)
    const visCount = Math.max(1, vis.x1 - vis.x0 + 1) * Math.max(1, vis.y1 - vis.y0 + 1)
    const pad = visCount > VIEW_BUF_MAX_TILES ? 0 : VIEW_BUF_PAD_TILES
    const x0 = Math.max(0, vis.x0 - pad)
    const y0 = Math.max(0, vis.y0 - pad)
    const x1 = Math.min(mapW - 1, vis.x1 + pad)
    const y1 = Math.min(mapH - 1, vis.y1 + pad)
    const tilesW = Math.max(1, x1 - x0 + 1)
    const tilesH = Math.max(1, y1 - y0 + 1)
    let scale = Math.min(
      1,
      VIEW_BUF_MAX_EDGE / (tilesW * this.tileWidth),
      VIEW_BUF_MAX_EDGE / (tilesH * this.tileHeight)
    )
    if (!Number.isFinite(scale) || scale <= 0) scale = 1
    let tw = Math.max(1, Math.floor(this.tileWidth * scale))
    let th = Math.max(1, Math.floor(this.tileHeight * scale))
    while (tilesW * tw > VIEW_BUF_MAX_EDGE && tw > 1) tw -= 1
    while (tilesH * th > VIEW_BUF_MAX_EDGE && th > 1) th -= 1

    const meta = this._viewBufMeta
    const zoom = this.zoom
    if (this._interacting) {
      if (this._viewBuf && meta && meta.zoom === zoom) return meta
      return null
    }
    if (this._bufJob) return meta
    if (
      this._viewBuf &&
      !this._viewBufDirty &&
      meta &&
      meta.layerKey === layerKey &&
      meta.zoom === zoom &&
      meta.tw >= tw &&
      meta.th >= th &&
      vis.x0 >= meta.x0 &&
      vis.x1 <= meta.x1 &&
      vis.y0 >= meta.y0 &&
      vis.y1 <= meta.y1
    ) {
      return meta
    }

    const cw = Math.max(1, tilesW * tw)
    const ch = Math.max(1, tilesH * th)
    if (cw > VIEW_BUF_MAX_EDGE || ch > VIEW_BUF_MAX_EDGE) return null

    const canvas = this.acquireViewBuf()
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, cw, ch)
    const token = ++this._bufToken
    if (this._bufRaf) cancelAnimationFrame(this._bufRaf)
    this._bufJob = { x0, y0, x1, y1, y: y0, tw, th, layerKey, token, loadToken: this._loadToken }
    this._viewBufMeta = { x0, y0, x1, y1, tw, th, layerKey, zoom }
    this._viewBufDirty = true
    this.stepViewBuf()
    return this._viewBufMeta
  },

  stepViewBuf() {
    const job = this._bufJob
    if (!job || job.token !== this._bufToken) return
    const canvas = this._viewBuf
    const ctx = canvas && canvas.getContext('2d')
    if (!ctx) {
      this._bufJob = null
      return
    }
    const yEnd = Math.min(job.y1, job.y + 3)
    this._bufTw = job.tw
    this._bufTh = job.th
    try {
      for (let y = job.y; y <= yEnd; y++) {
        for (let x = job.x0; x <= job.x1; x++) {
          this.paintTileToContext(ctx, x, y, job.x0, job.y0)
        }
      }
    } finally {
      this._bufTw = 0
      this._bufTh = 0
    }
    job.y = yEnd + 1
    if (job.y <= job.y1 && job.token === this._bufToken) {
      this._bufRaf = requestAnimationFrame(() => {
        this._bufRaf = 0
        this.stepViewBuf()
        this.render()
      })
      return
    }
    this._bufJob = null
    this._viewBufDirty = false
    if (job.loadToken === this._loadToken) this.mapLoading = false
    this.render()
  },

  noteInteract() {
    this._interacting = true
    this._bufToken += 1
    this._bufJob = null
    if (this._bufRaf) cancelAnimationFrame(this._bufRaf)
    this._bufRaf = 0
    if (this._interactTimer) clearTimeout(this._interactTimer)
    this._interactTimer = setTimeout(() => {
      this._interactTimer = 0
      this._interacting = false
      this.render()
    }, 90)
  },

  renderToCache() {
    this.invalidateViewBuf()
  },

  layerAlpha(z) {
    if (this.editLayer === 'auto') return 1
    return this.editLayer === z ? 1 : DIM_ALPHA
  },

  paintTileToContext(ctx, mx, my, originX = 0, originY = 0, absX, absY) {
    if (!ctx || !this.currentMapData) return
    const tiles = [
      this.readMapData(mx, my, 0),
      this.readMapData(mx, my, 1),
      this.readMapData(mx, my, 2),
      this.readMapData(mx, my, 3),
    ]
    const tw = this.cacheTw()
    const th = this.cacheTh()
    const dx = absX != null ? absX : (mx - originX) * tw
    const dy = absY != null ? absY : (my - originY) * th
    const originalCtx = this.ctx
    this.ctx = ctx
    try {
      for (let z = 0; z < 4; z++) {
        if (!tiles[z]) continue
        ctx.save()
        ctx.globalAlpha = this.layerAlpha(z)
        this.drawTile(tiles[z], dx, dy)
        ctx.restore()
      }
      this.drawShadowBits(ctx, mx, my, dx, dy)
    } finally {
      this.ctx = originalCtx
    }
  },

  drawShadowBits(ctx, mx, my, dx, dy) {
    const bits = this.readMapData(mx, my, 4) & 0x0f
    if (!bits) return
    const dim = this.editLayer !== 'auto' && this.editLayer !== 3
    ctx.save()
    ctx.globalAlpha = dim ? 0.5 * DIM_ALPHA : 0.5
    ctx.fillStyle = '#000'
    const dw = this.cacheTw()
    const dh = this.cacheTh()
    const hw = Math.ceil(dw / 2)
    const hh = Math.ceil(dh / 2)
    const rects = [
      [dx, dy, hw, hh],
      [dx + dw - hw, dy, hw, hh],
      [dx, dy + dh - hh, hw, hh],
      [dx + dw - hw, dy + dh - hh, hw, hh],
    ]
    for (let i = 0; i < 4; i++) {
      if (bits & (1 << i)) ctx.fillRect(rects[i][0], rects[i][1], rects[i][2], rects[i][3])
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
    if (!tileset || !this.ctx) return
    let setNumber = 0
    if (isTileA5(tileId)) setNumber = 4
    else setNumber = 5 + Math.floor(tileId / 256)
    // 源图始终按 48 取样，目标可按缓存缩放
    const sw = this.tileWidth
    const sh = this.tileHeight
    const dw = this.cacheTw()
    const dh = this.cacheTh()
    const sx = (Math.floor(tileId / 128) % 2 * 8 + tileId % 8) * sw
    const sy = (Math.floor(tileId % 256 / 8) % 16) * sh
    const tilesetName = tileset.tilesetNames[setNumber]
    if (!tilesetName) return
    const img = this.tilesetImages[tilesetName]
    if (!img || !img.complete) return
    if (sx >= 0 && sy >= 0 && sx + sw <= img.width && sy + sh <= img.height) {
      this.ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    }
  },

  drawAutotile(tileId, dx, dy) {
    const tileset = this.tilesets[this.currentMapData.tilesetId]
    if (!tileset || !this.ctx) return
    // 使用模块常量，禁止放进 data() 做响应式（绘制时深层依赖收集会直接卡死）
    let autotileTable = FLOOR_AUTOTILE_TABLE
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
          autotileTable = WATERFALL_AUTOTILE_TABLE
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
      autotileTable = WALL_AUTOTILE_TABLE
    } else if (isTileA4(tileId)) {
      setNumber = 3
      bx = tx * 2
      by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0))
      if (ty % 2 === 1) autotileTable = WALL_AUTOTILE_TABLE
    }

    const table = autotileTable[shape]
    const tilesetName = tileset.tilesetNames[setNumber]
    if (!tilesetName) return
    const source = this.tilesetImages[tilesetName]
    if (!table || !source || !source.complete) return
    const sw1 = this.tileWidth / 2
    const sh1 = this.tileHeight / 2
    const dw = this.cacheTw()
    const dh = this.cacheTh()
    const hw = Math.ceil(dw / 2)
    const hh = Math.ceil(dh / 2)
    const rects = [
      [dx, dy, hw, hh],
      [dx + dw - hw, dy, hw, hh],
      [dx, dy + dh - hh, hw, hh],
      [dx + dw - hw, dy + dh - hh, hw, hh],
    ]
    for (let i = 0; i < 4; i++) {
      const qsx = table[i][0]
      const qsy = table[i][1]
      const sx1 = (bx * 2 + qsx) * sw1
      const sy1 = (by * 2 + qsy) * sh1
      const r = rects[i]
      if (sx1 >= 0 && sy1 >= 0 && sx1 + sw1 <= source.width && sy1 + sh1 <= source.height) {
        this.ctx.drawImage(source, sx1, sy1, sw1, sh1, r[0], r[1], r[2], r[3])
      }
    }
  },

  renderRegionsToCache(ctx) {
    if (!ctx || !this.currentMapData) return
    const width = this.currentMapData.width
    const height = this.currentMapData.height
    const tw = this.cacheTw()
    const th = this.cacheTh()
    ctx.font = Math.max(10, Math.round(20 * (tw / this.tileWidth))) + 'px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const regionId = this.readMapData(x, y, 5)
        if (regionId > 0) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
          ctx.fillRect(x * tw, y * th, tw, th)
          ctx.fillStyle = 'white'
          ctx.strokeStyle = 'black'
          ctx.lineWidth = 3
          const tx = x * tw + tw / 2
          const ty = y * th + th / 2
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

    const tileW = options.tileW || this.tileWidth
    const tileH = options.tileH || this.tileHeight
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

  eventInnerBox(x, y) {
    const tw = this.cacheTw()
    const th = this.cacheTh()
    const pad = Math.max(1, Math.round(6 * (tw / this.tileWidth)))
    return {
      x: x + pad,
      y: y + pad,
      w: Math.max(1, tw - pad * 2),
      h: Math.max(1, th - pad * 2),
    }
  },

  drawEventFill(ctx, x, y) {
    const tw = this.cacheTw()
    const th = this.cacheTh()
    const pad = Math.max(1, Math.round(3 * (tw / this.tileWidth)))
    const ui = this.editorUi || {}
    ctx.save()
    ctx.fillStyle = ui.eventFillColor || 'rgba(0,0,0,0.3)'
    ctx.fillRect(x + pad, y + pad, tw - pad * 2, th - pad * 2)
    ctx.restore()
  },

  drawEventFrame(ctx, x, y) {
    const tw = this.cacheTw()
    const th = this.cacheTh()
    const pad = Math.max(1, Math.round(2 * (tw / this.tileWidth)))
    const x0 = x + pad + 0.5
    const y0 = y + pad + 0.5
    const w = tw - pad * 2 - 1
    const h = th - pad * 2 - 1
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = '#ffffff'
    ctx.strokeRect(x0, y0, w, h)
    ctx.restore()
  },

  renderEventsToCache(ctx) {
    if (!ctx || !this.currentMapData || !this.currentMapData.events) return
    const tw = this.cacheTw()
    const th = this.cacheTh()
    const useTpl = this.useHyperlinkImages
    ctx.font = Math.max(9, Math.round(12 * (tw / this.tileWidth))) + 'px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    this.currentMapData.events.forEach((event) => {
      if (!event) return
      const x = event.x * tw
      const y = event.y * th
      this.drawEventFill(ctx, x, y)
      const page = getEventDisplayPage(event, useTpl)
      const image = page && page.image
      let drew = false
      if (image && image.tileId > 0) {
        const prev = this.ctx
        this.ctx = ctx
        try {
          this.drawTile(image.tileId, x, y)
        } finally {
          this.ctx = prev
        }
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
            tileW: tw,
            tileH: th,
          })
        }
      }
      if (!drew) {
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        const text = `EV${String(event.id).padStart(3, '0')}`
        const tx = x + tw / 2
        const ty = y + th / 2
        ctx.strokeText(text, tx, ty)
        ctx.fillText(text, tx, ty)
      }
      this.drawEventFrame(ctx, x, y)
      if (this.showHyperlinks && isEventRef(event)) {
        const mark = Math.max(8, Math.round(13 * (tw / this.tileWidth)))
        const bx = x + tw - mark - 2
        const by = y + 2
        ctx.fillStyle = '#409eff'
        ctx.fillRect(bx, by, mark, mark)
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.max(8, mark - 3)}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('链', bx + mark / 2, by + mark / 2)
        ctx.font = Math.max(9, Math.round(12 * (tw / this.tileWidth))) + 'px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
      }
    })
  },

  renderRegionsInView(ctx, range) {
    if (!ctx || !range || !this.currentMapData) return
    const tilesW = range.x1 - range.x0 + 1
    const tilesH = range.y1 - range.y0 + 1
    // 缩放过远时区域层逐格绘制会卡死，直接跳过
    if (tilesW * tilesH > VIEW_BUF_MAX_TILES) return
    const tw = this.tileWidth
    const th = this.tileHeight
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let y = range.y0; y <= range.y1; y++) {
      for (let x = range.x0; x <= range.x1; x++) {
        const regionId = this.readMapData(x, y, 5)
        if (!(regionId > 0)) continue
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
        ctx.fillRect(x * tw, y * th, tw, th)
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 3
        const tx = x * tw + tw / 2
        const ty = y * th + th / 2
        ctx.strokeText(String(regionId), tx, ty)
        ctx.fillText(String(regionId), tx, ty)
      }
    }
  },

  renderEventsInView(ctx, range) {
    if (!ctx || !range || !this.currentMapData || !this.currentMapData.events) return
    const tw = this.tileWidth
    const th = this.tileHeight
    const useTpl = this.useHyperlinkImages
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    this.currentMapData.events.forEach((event) => {
      if (!event) return
      if (event.x < range.x0 || event.x > range.x1 || event.y < range.y0 || event.y > range.y1) return
      const x = event.x * tw
      const y = event.y * th
      this.drawEventFill(ctx, x, y)
      const page = getEventDisplayPage(event, useTpl)
      const image = page && page.image
      let drew = false
      if (image && image.tileId > 0) {
        const prev = this.ctx
        this.ctx = ctx
        try {
          this.drawTile(image.tileId, x, y)
        } finally {
          this.ctx = prev
        }
        drew = true
      } else if (image && image.characterName) {
        const img = this.characterImages[image.characterName]
        if (img) {
          drew = this.drawCharacterFrame(
            ctx,
            img,
            { ...image, pattern: this.animPatternForPage(page) },
            x,
            y,
            { frameBox: this.eventInnerBox(x, y), tileW: tw, tileH: th }
          )
        }
      }
      if (!drew) {
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        const text = `EV${String(event.id).padStart(3, '0')}`
        ctx.strokeText(text, x + tw / 2, y + th / 2)
        ctx.fillText(text, x + tw / 2, y + th / 2)
      }
      this.drawEventFrame(ctx, x, y)
      if (this.showHyperlinks && isEventRef(event)) {
        const bx = x + tw - 15
        const by = y + 2
        ctx.fillStyle = '#409eff'
        ctx.fillRect(bx, by, 13, 13)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 10px Arial'
        ctx.fillText('链', bx + 6.5, by + 7)
        ctx.font = '12px Arial'
      }
    })
  },

  renderGrid(range) {
    const width = this.currentMapData.width
    const height = this.currentMapData.height
    const ui = this.editorUi || {}
    this.ctx.strokeStyle = ui.gridColor || 'rgba(255, 255, 255, 0.25)'
    this.ctx.lineWidth = Math.max(1, Number(ui.gridWidth) || 1)
    const x0 = range ? range.x0 : 0
    const y0 = range ? range.y0 : 0
    const x1 = range ? range.x1 + 1 : width
    const y1 = range ? range.y1 + 1 : height
    const cols = x1 - x0
    const rows = y1 - y0
    // 缩放过远时网格线过多，按步进抽稀
    const step = Math.max(1, Math.ceil(Math.max(cols, rows) / 256))
    for (let x = x0; x <= x1; x += step) {
      this.ctx.beginPath()
      this.ctx.moveTo(x * this.tileWidth, y0 * this.tileHeight)
      this.ctx.lineTo(x * this.tileWidth, y1 * this.tileHeight)
      this.ctx.stroke()
    }
    for (let y = y0; y <= y1; y += step) {
      this.ctx.beginPath()
      this.ctx.moveTo(x0 * this.tileWidth, y * this.tileHeight)
      this.ctx.lineTo(x1 * this.tileWidth, y * this.tileHeight)
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

  /** 静态选中框（事件/点击格）；不含跟随鼠标的笔刷框 */
  renderStaticSelectedTile() {
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
      // 绘制模式有 hover 笔刷框时，不再叠 1×1 黄框
      if (this.shouldDrawBrushHover()) return
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

  shouldDrawBrushHover() {
    return (
      !this.isEventMode &&
      typeof this.canPaint === 'function' &&
      this.canPaint() &&
      !!this.hoverTile &&
      !this.isEyedrop &&
      !this.isShapeDrag
    )
  },

  /** 笔刷悬停框：左上角锚定 hoverTile，尺寸同 brushSize */
  renderBrushHover() {
    if (!this.shouldDrawBrushHover()) return
    const { rows, cols } = this.brushSize()
    const x = this.hoverTile.x
    const y = this.hoverTile.y
    const tw = this.tileWidth
    const th = this.tileHeight
    this.ctx.strokeStyle = '#ffff00'
    this.ctx.lineWidth = 3
    this.ctx.strokeRect(x * tw + 1.5, y * th + 1.5, cols * tw - 3, rows * th - 3)
  },

  renderSelectedTile() {
    this.renderStaticSelectedTile()
    this.renderBrushHover()
  },

  captureHoverBase() {
    if (!this.canvas) return
    if (!this._hoverBase) this._hoverBase = { canvas: document.createElement('canvas') }
    const base = this._hoverBase
    const c = base.canvas
    if (c.width !== this.canvas.width || c.height !== this.canvas.height) {
      c.width = this.canvas.width
      c.height = this.canvas.height
    }
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.canvas, 0, 0)
    base.w = this.canvas.width
    base.h = this.canvas.height
    base.zoom = this.zoom
    base.ox = this.offsetX
    base.oy = this.offsetY
    base.mapId = this.mapId
  },

  invalidateHoverBase() {
    if (this._hoverBase) this._hoverBase.mapId = 0
  },

  tryBlitHoverBase() {
    const base = this._hoverBase
    if (!base || !base.canvas || base.mapId !== this.mapId) return false
    if (base.zoom !== this.zoom || base.ox !== this.offsetX || base.oy !== this.offsetY) return false
    if (base.w !== this.canvas.width || base.h !== this.canvas.height) return false
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.drawImage(base.canvas, 0, 0)
    return true
  },

  /** 仅刷新笔刷悬停框：复用上一帧地图快照，避免每格全量 paintVisibleTiles */
  renderHoverOverlay() {
    if (!this.canvas || !this.ctx) return
    if (this._rendering) return
    if (!this.tryBlitHoverBase()) {
      this.render()
      return
    }
    this._rendering = true
    try {
      this.ctx.save()
      this.ctx.translate(this.offsetX, this.offsetY)
      this.ctx.scale(this.zoom, this.zoom)
      this.renderBrushHover()
      this.ctx.restore()
      this.renderFocusRing()
    } catch (e) {
      console.error(e)
    } finally {
      this._rendering = false
    }
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

  paintVisibleTiles(range) {
    if (!range || !this.currentMapData || !this.ctx) return
    const z = this.zoom
    const tw = this.tileWidth
    const th = this.tileHeight
    const prevTw = this._bufTw
    const prevTh = this._bufTh
    this.ctx.imageSmoothingEnabled = z < 0.999
    try {
      for (let y = range.y0; y <= range.y1; y++) {
        const y0 = Math.round(this.offsetY + y * th * z)
        const y1 = Math.round(this.offsetY + (y + 1) * th * z)
        const dh = Math.max(1, y1 - y0)
        for (let x = range.x0; x <= range.x1; x++) {
          const x0 = Math.round(this.offsetX + x * tw * z)
          const x1 = Math.round(this.offsetX + (x + 1) * tw * z)
          const dw = Math.max(1, x1 - x0)
          this._bufTw = dw
          this._bufTh = dh
          this.paintTileToContext(this.ctx, x, y, 0, 0, x0, y0)
        }
      }
    } finally {
      this._bufTw = prevTw
      this._bufTh = prevTh
    }
  },

  tryBlitFocusBase() {
    const ring = this._focusRing
    const base = this._focusBase
    if (!ring || !ring.active || !base || !base.canvas) return false
    if (base.mapId !== this.mapId || base.zoom !== this.zoom) return false
    if (base.ox !== this.offsetX || base.oy !== this.offsetY) return false
    if (base.w !== this.canvas.width || base.h !== this.canvas.height) return false
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.drawImage(base.canvas, 0, 0)
    return true
  },

  captureFocusBase() {
    const ring = this._focusRing
    if (!ring || !ring.active || !this.canvas) return
    if (!this._focusBase) this._focusBase = { canvas: document.createElement('canvas') }
    const base = this._focusBase
    const c = base.canvas
    if (c.width !== this.canvas.width || c.height !== this.canvas.height) {
      c.width = this.canvas.width
      c.height = this.canvas.height
    }
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.canvas, 0, 0)
    base.w = this.canvas.width
    base.h = this.canvas.height
    base.zoom = this.zoom
    base.ox = this.offsetX
    base.oy = this.offsetY
    base.mapId = this.mapId
  },

  captureSnap() {
    const src = this.canvas
    if (!src || src.width < 2 || src.height < 2) return
    if (!this._snap) this._snap = document.createElement('canvas')
    if (this._snap.width !== src.width || this._snap.height !== src.height) {
      this._snap.width = src.width
      this._snap.height = src.height
    }
    const ctx = this._snap.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(src, 0, 0)
    this._snapOffsetX = this.offsetX
    this._snapOffsetY = this.offsetY
    this._snapZoom = this.zoom
  },

  tryBlitShift() {
    const snap = this._snap
    if (!this._useShift || !snap || this._snapZoom !== this.zoom) return false
    if (snap.width !== this.canvas.width || snap.height !== this.canvas.height) return false
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.paintViewportBackground()
    this.ctx.drawImage(snap, this.offsetX - this._snapOffsetX, this.offsetY - this._snapOffsetY)
    return true
  },

  settlePaint() {
    if (this._settleTimer) clearTimeout(this._settleTimer)
    this._settleTimer = setTimeout(() => {
      this._settleTimer = 0
      if (this.isPanning || this._coasting) return
      this._useShift = false
      this.render()
    }, 80)
  },

  render() {
    if (!this.canvas || !this.ctx) return
    // 防止 ResizeObserver / 设置回写 与 RAF 重入同一帧渲染
    if (this._rendering) return
    this._rendering = true
    try {
      if (this.tryBlitFocusBase()) {
        this.renderFocusRing()
        return
      }
      if (this.tryBlitShift()) return
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.paintViewportBackground()
      if (!this.currentMapData) return
      const range = this.visibleTileRange(1)
      this.paintVisibleTiles(range)
      this.ctx.save()
      this.ctx.translate(this.offsetX, this.offsetY)
      this.ctx.scale(this.zoom, this.zoom)
      if (range) {
        if (this.showRegions) this.renderRegionsInView(this.ctx, range)
        if (this.effectiveShowEvents) {
          this.ctx.save()
          if (!this.isEventMode) this.ctx.globalAlpha = 0.4
          this.renderEventsInView(this.ctx, range)
          this.ctx.restore()
        }
      }
      if (this.effectiveShowGrid) this.renderGrid(range)
      this.renderMapEdge()
      this.renderStartPosition()
      this.renderStaticSelectedTile()
      this.ctx.restore()
      this.renderShapePreview()
      // 快照不含笔刷悬停框，供 mousemove 只叠框
      this.captureHoverBase()
      this.ctx.save()
      this.ctx.translate(this.offsetX, this.offsetY)
      this.ctx.scale(this.zoom, this.zoom)
      this.renderBrushHover()
      this.ctx.restore()
      this.captureFocusBase()
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
    const t = this.focusRingSample(ring)
    if (t == null) return
    const ease = t * t * (3 - 2 * t)
    const elapsed = Date.now() - ring.start
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
}
