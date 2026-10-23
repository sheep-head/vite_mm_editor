<template>
  <div class="tp">
    <div v-if="!tilesetId" class="tp-empty">无图块集</div>
    <div v-else-if="page === 'R'" class="tp-region-wrap" ref="regionWrap">
      <canvas
        ref="cv"
        class="tp-cv"
        @mousedown="onRegionDown"
        @mousemove="onRegionMove"
        @mouseup="onPointerUp"
        @mouseleave="onPointerUp" />
    </div>
    <div v-else class="tp-sheet-wrap" ref="sheetWrap">
      <canvas
        ref="cv"
        class="tp-cv"
        @mousedown="onSheetDown"
        @mousemove="onSheetMove"
        @mouseup="onPointerUp"
        @mouseleave="onPointerUp" />
    </div>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'
import DataManager from '@/utils/DataManager'
import { imageAbsPath, loadImageFile, tileIdFromCell, TILE_PX } from '@/utils/imgAssets'
import {
  FLOOR_AUTOTILE_TABLE,
  WALL_AUTOTILE_TABLE,
  WATERFALL_AUTOTILE_TABLE,
  isTileA1,
  isTileA2,
  isTileA3,
  isTileA4,
  getAutotileKind,
} from './mapAutotile'

const CELL = 36
const A_KIND_COUNTS = [16, 32, 16, 48]
const A_KIND_BASE = [2048, 2816, 4352, 5888]
const FLOOR_PREVIEW_SHAPE = 46
const WALL_PREVIEW_SHAPE = 15
const WATERFALL_PREVIEW_SHAPE = 3
const REGION_COLS = 8

function regionColor(id) {
  if (id <= 0) return 'rgba(80,80,80,0.35)'
  const h = ((id * 47) % 360)
  return `hsla(${h}, 70%, 45%, 0.85)`
}

export default {
  name: 'TilePalette',
  props: {
    tilesetId: { type: Number, default: 0 },
    modelValue: { type: Object, default: null },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      hitBoxes: [],
      paintGen: 0,
      drag: null,
      sel: null,
      _baseCanvas: null,
      _pendingBrush: null,
      _pendingBrush: null,
    }
  },
  computed: {
    ...mapGetters(['paletteTab']),
    page() {
      return this.paletteTab || 'A'
    },
  },
  watch: {
    tilesetId: {
      immediate: true,
      handler() {
        this.sel = null
        this.repaint()
      },
    },
    page() {
      this.sel = null
      this.repaint()
    },
  },
  mounted() {
    this.repaint()
  },
  methods: {
    prepareBrush(brush) {
      this._pendingBrush = brush || null
    },
    applyBrush(brush) {
      const b = brush || this._pendingBrush
      if (!b || !b.tiles || !b.tiles.length) return
      if (b.page && b.page !== this.page) {
        this._pendingBrush = b
        return
      }
      if (!this.hitBoxes.length) {
        this._pendingBrush = b
        return
      }
      this._pendingBrush = null
      const tiles = b.tiles
      const rows = tiles.length
      const cols = (tiles[0] && tiles[0].length) || 0
      if (!cols) return
      let anchor = null
      for (let r = 0; r < rows && !anchor; r++) {
        for (let c = 0; c < cols; c++) {
          if (tiles[r][c]) {
            anchor = { r, c, id: tiles[r][c] }
            break
          }
        }
      }
      if (!anchor) return
      const origins = this.hitBoxes.filter((h) => h.id === anchor.id)
      let sel = null
      for (let i = 0; i < origins.length; i++) {
        const o = origins[i]
        const x0 = o.col - anchor.c
        const y0 = o.row - anchor.r
        let ok = true
        for (let r = 0; r < rows && ok; r++) {
          for (let c = 0; c < cols && ok; c++) {
            const hit = this.hitAtCell(x0 + c, y0 + r)
            if (!hit || hit.id !== tiles[r][c]) ok = false
          }
        }
        if (ok) {
          sel = { x0, y0, x1: x0 + cols - 1, y1: y0 + rows - 1 }
          break
        }
      }
      if (sel) this.sel = sel
      this.drawSelection()
    },
    emitBrush() {
      if (!this.sel) return
      const { x0, y0, x1, y1 } = this.sel
      const minX = Math.min(x0, x1)
      const maxX = Math.max(x0, x1)
      const minY = Math.min(y0, y1)
      const maxY = Math.max(y0, y1)
      const tiles = []
      let isAutotileKind = false
      let isRegion = this.page === 'R'
      for (let r = minY; r <= maxY; r++) {
        const row = []
        for (let c = minX; c <= maxX; c++) {
          const hit = this.hitAtCell(c, r)
          const id = hit ? hit.id : 0
          if (hit && hit.kindBase != null) isAutotileKind = true
          row.push(id)
        }
        tiles.push(row)
      }
      const brush = {
        page: this.page,
        tiles,
        isAutotileKind,
        isRegion,
        cols: maxX - minX + 1,
        rows: maxY - minY + 1,
      }
      this.$emit('update:modelValue', brush)
    },
    hitAtCell(col, row) {
      return this.hitBoxes.find((h) => h.col === col && h.row === row) || null
    },
    hitAtPixel(px, py) {
      return this.hitBoxes.find(
        (h) => px >= h.x && px < h.x + h.w && py >= h.y && py < h.y + h.h
      ) || null
    },
    nameAt(index) {
      const arr = DataManager.$loadDataSync('Tilesets', false, false)
      const t = arr && arr[this.tilesetId]
      const names = (t && t.tilesetNames) || []
      return names[index] || ''
    },
    async loadSlot(index) {
      const name = this.nameAt(index)
      if (!name) return null
      const img = await loadImageFile(imageAbsPath('tilesets', name))
      return img ? markRaw(img) : null
    },
    fillChecker(ctx, w, h, s = 6) {
      for (let y = 0; y < h; y += s) {
        for (let x = 0; x < w; x += s) {
          ctx.fillStyle = ((x / s + y / s) | 0) % 2 === 0 ? '#c8c8c8' : '#eee'
          ctx.fillRect(x, y, Math.min(s, w - x), Math.min(s, h - y))
        }
      }
    },
    async repaint() {
      const gen = ++this.paintGen
      await this.$nextTick()
      const canvas = this.$refs.cv
      if (!canvas || !this.tilesetId || gen !== this.paintGen) return
      this.hitBoxes = []
      const ctx = canvas.getContext('2d')
      if (this.page === 'R') await this.paintRegions(canvas, ctx, gen)
      else if (this.page === 'A') await this.paintA(canvas, ctx, gen)
      else await this.paintSheet(canvas, ctx, this.page, gen)
      if (gen !== this.paintGen) return
      this._baseCanvas = document.createElement('canvas')
      this._baseCanvas.width = canvas.width
      this._baseCanvas.height = canvas.height
      this._baseCanvas.getContext('2d').drawImage(canvas, 0, 0)
      if (this._pendingBrush) {
        this.applyBrush(this._pendingBrush)
      } else if (!this.sel && this.hitBoxes.length) {
        const h = this.hitBoxes[0]
        this.sel = { x0: h.col, y0: h.row, x1: h.col, y1: h.row }
        this.emitBrush()
      }
      this.drawSelection()
    },
    drawSelection() {
      const canvas = this.$refs.cv
      if (!canvas || !this._baseCanvas) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(this._baseCanvas, 0, 0)
      if (!this.sel) return
      const { x0, y0, x1, y1 } = this.sel
      const minX = Math.min(x0, x1)
      const maxX = Math.max(x0, x1)
      const minY = Math.min(y0, y1)
      const maxY = Math.max(y0, y1)
      const a = this.hitAtCell(minX, minY)
      const b = this.hitAtCell(maxX, maxY)
      if (!a || !b) return
      const x = a.x
      const y = a.y
      const w = b.x + b.w - a.x
      const h = b.y + b.h - a.y
      ctx.save()
      ctx.strokeStyle = '#1e90ff'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
      ctx.fillStyle = 'rgba(30,144,255,0.18)'
      ctx.fillRect(x, y, w, h)
      ctx.restore()
    },
    async paintRegions(canvas, ctx, gen) {
      const cols = REGION_COLS
      const rows = Math.ceil(256 / cols)
      canvas.width = cols * CELL
      canvas.height = rows * CELL
      if (gen !== this.paintGen) return
      this.fillChecker(ctx, canvas.width, canvas.height)
      for (let id = 0; id < 256; id++) {
        const c = id % cols
        const r = Math.floor(id / cols)
        const x = c * CELL
        const y = r * CELL
        ctx.fillStyle = regionColor(id)
        ctx.fillRect(x, y, CELL, CELL)
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1)
        if (id > 0) {
          ctx.fillStyle = '#fff'
          ctx.font = '11px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(id), x + CELL / 2, y + CELL / 2)
        }
        this.hitBoxes.push({ x, y, w: CELL, h: CELL, id, col: c, row: r })
      }
    },
    async paintSheet(canvas, ctx, page, gen) {
      const slotMap = { B: 5, C: 6, D: 7, E: 8 }
      const img = await this.loadSlot(slotMap[page])
      if (gen !== this.paintGen) return
      const dispCols = 8
      const imgCols = img ? Math.max(1, Math.floor(img.width / TILE_PX)) : 0
      const imgRows = img ? Math.max(1, Math.floor(img.height / TILE_PX)) : 0
      const blocks = img ? Math.max(1, Math.ceil(imgCols / dispCols)) : 0
      const dispRows = Math.max(1, imgRows * blocks)
      canvas.width = dispCols * CELL
      canvas.height = dispRows * CELL
      this.fillChecker(ctx, canvas.width, canvas.height)
      if (!img) return
      for (let block = 0; block < blocks; block++) {
        for (let r = 0; r < imgRows; r++) {
          for (let c = 0; c < dispCols; c++) {
            const srcCol = block * dispCols + c
            if (srcCol >= imgCols) continue
            const sx = srcCol * TILE_PX
            const sy = r * TILE_PX
            const x = c * CELL
            const y = (block * imgRows + r) * CELL
            if (sx + TILE_PX <= img.width && sy + TILE_PX <= img.height) {
              ctx.drawImage(img, sx, sy, TILE_PX, TILE_PX, x, y, CELL, CELL)
            }
            const id = tileIdFromCell(page, srcCol, r)
            const col = c
            const row = block * imgRows + r
            this.hitBoxes.push({ x, y, w: CELL, h: CELL, id, col, row })
          }
        }
      }
    },
    async paintA(canvas, ctx, gen) {
      const parts = []
      for (let i = 0; i < 5; i++) parts.push(await this.loadSlot(i))
      if (gen !== this.paintGen) return
      const cols = 8
      const sections = []
      let y = 0
      for (let i = 0; i < 4; i++) {
        if (!parts[i]) continue
        const count = A_KIND_COUNTS[i]
        const rows = Math.ceil(count / cols)
        const h = rows * CELL
        sections.push({ type: 'kind', index: i, img: parts[i], y, h, rows, count })
        y += h
      }
      const a5 = parts[4]
      if (a5) {
        const a5Rows = Math.max(1, Math.floor(a5.height / TILE_PX))
        sections.push({ type: 'a5', img: a5, y, h: a5Rows * CELL, rows: a5Rows })
        y += a5Rows * CELL
      }
      canvas.width = cols * CELL
      canvas.height = Math.max(CELL, y)
      this.fillChecker(ctx, canvas.width, canvas.height)
      let rowOffset = 0
      for (const sec of sections) {
        if (sec.type === 'a5') {
          this.paintA5Section(ctx, sec, rowOffset)
          rowOffset += sec.rows
        } else {
          this.paintKindSection(ctx, sec, rowOffset)
          rowOffset += sec.rows
        }
      }
    },
    paintKindSection(ctx, sec, rowOffset) {
      const { index, img, y: oy, count } = sec
      const cols = 8
      const base = A_KIND_BASE[index]
      for (let k = 0; k < count; k++) {
        const c = k % cols
        const r = Math.floor(k / cols)
        const x = c * CELL
        const y = oy + r * CELL
        const kindBase = base + k * 48
        if (img) this.drawAutotilePreview(ctx, img, kindBase, x, y, CELL)
        this.hitBoxes.push({
          x, y, w: CELL, h: CELL, id: kindBase, kindBase,
          col: c, row: rowOffset + r,
        })
      }
    },
    paintA5Section(ctx, sec, rowOffset) {
      const { img, y: oy, rows } = sec
      const cols = 8
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * CELL
          const y = oy + r * CELL
          const id = 1536 + c + r * 8
          if (img) {
            const sx = c * TILE_PX
            const sy = r * TILE_PX
            if (sx + TILE_PX <= img.width && sy + TILE_PX <= img.height) {
              ctx.drawImage(img, sx, sy, TILE_PX, TILE_PX, x, y, CELL, CELL)
            }
          }
          this.hitBoxes.push({ x, y, w: CELL, h: CELL, id, col: c, row: rowOffset + r })
        }
      }
    },
    drawAutotilePreview(ctx, source, tileId, dx, dy, size) {
      let table = FLOOR_AUTOTILE_TABLE
      let shape = FLOOR_PREVIEW_SHAPE
      const kind = getAutotileKind(tileId)
      const tx = kind % 8
      const ty = Math.floor(kind / 8)
      let bx = 0
      let by = 0
      if (isTileA1(tileId)) {
        if (kind === 0) { bx = 0; by = 0 }
        else if (kind === 1) { bx = 0; by = 3 }
        else if (kind === 2) { bx = 6; by = 0 }
        else if (kind === 3) { bx = 6; by = 3 }
        else {
          bx = Math.floor(tx / 4) * 8
          by = ty * 6 + (Math.floor(tx / 2) % 2) * 3
          if (kind % 2 !== 0) {
            bx += 6
            table = WATERFALL_AUTOTILE_TABLE
            shape = WATERFALL_PREVIEW_SHAPE
          }
        }
      } else if (isTileA2(tileId)) {
        bx = tx * 2
        by = (ty - 2) * 3
      } else if (isTileA3(tileId)) {
        bx = tx * 2
        by = (ty - 6) * 2
        table = WALL_AUTOTILE_TABLE
        shape = WALL_PREVIEW_SHAPE
      } else if (isTileA4(tileId)) {
        bx = tx * 2
        by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0))
        if (ty % 2 === 1) {
          table = WALL_AUTOTILE_TABLE
          shape = WALL_PREVIEW_SHAPE
        }
      } else return
      const quads = table[shape]
      if (!quads) return
      const w1 = size / 2
      const h1 = size / 2
      const srcW1 = TILE_PX / 2
      const srcH1 = TILE_PX / 2
      for (let i = 0; i < 4; i++) {
        const qsx = quads[i][0]
        const qsy = quads[i][1]
        const sx1 = (bx * 2 + qsx) * srcW1
        const sy1 = (by * 2 + qsy) * srcH1
        const dx1 = dx + (i % 2) * w1
        const dy1 = dy + Math.floor(i / 2) * h1
        if (sx1 >= 0 && sy1 >= 0 && sx1 + srcW1 <= source.width && sy1 + srcH1 <= source.height) {
          ctx.drawImage(source, sx1, sy1, srcW1, srcH1, dx1, dy1, w1, h1)
        }
      }
    },
    onSheetDown(e) {
      const hit = this.hitAtPixel(e.offsetX, e.offsetY)
      if (!hit) return
      this.drag = { col: hit.col, row: hit.row }
      this.sel = { x0: hit.col, y0: hit.row, x1: hit.col, y1: hit.row }
      this.drawSelection()
    },
    onSheetMove(e) {
      if (!this.drag) return
      const hit = this.hitAtPixel(e.offsetX, e.offsetY)
      if (!hit) return
      this.sel = { x0: this.drag.col, y0: this.drag.row, x1: hit.col, y1: hit.row }
      this.drawSelection()
    },
    onRegionDown(e) {
      this.onSheetDown(e)
    },
    onRegionMove(e) {
      this.onSheetMove(e)
    },
    onPointerUp() {
      if (!this.drag) return
      this.drag = null
      this.emitBrush()
      this.drawSelection()
    },
  },
}
</script>

<style scoped>
.tp {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--app-surface, #f5f5f5);
  /* 覆盖全局 index.css 的 4px，图块预览需要正常宽度滚动条 */
}
.tp::-webkit-scrollbar {
  width: 16px;
  height: 16px;
}
.tp::-webkit-scrollbar-track {
  background: var(--app-scrollbar-track, rgba(0, 0, 0, 0.06));
}
.tp::-webkit-scrollbar-thumb {
  background: var(--app-scrollbar-thumb, rgba(0, 0, 0, 0.18));
  border-radius: 4px;
}
.tp-empty {
  padding: 16px;
  color: var(--app-muted, #888);
  font-size: 13px;
}
.tp-sheet-wrap,
.tp-region-wrap {
  display: inline-block;
  min-width: 100%;
}
.tp-cv {
  display: block;
  cursor: crosshair;
  image-rendering: pixelated;
}
</style>
