import {
  isAutotile,
  getAutotileKind,
  isLowerTile,
  refreshAutotileNeighbors,
} from '@/components/map/mapAutotile'
import { tileSetOfId } from '@/utils/imgAssets'

export const paintMethods = {
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

  invalidateMapCells() {
    if (this._focusBase) this._focusBase.mapId = 0
    if (this._hoverBase) this._hoverBase.mapId = 0
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
}
