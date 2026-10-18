<template>
  <div class="ts" v-if="modelValue">
    <div class="ts-mid">
      <db-group-box title="基本设置">
        <el-form label-width="56px" size="small">
          <el-form-item label="名称">
            <el-input v-model="modelValue.name" />
          </el-form-item>
          <el-form-item label="模式">
            <el-select v-model="modelValue.mode" style="width: 140px">
              <el-option :value="0" label="世界类型" />
              <el-option :value="1" label="区域类型" />
            </el-select>
          </el-form-item>
        </el-form>
        <div class="slot" v-for="s in slots" :key="s.index">
          <span class="slot-lab">{{ s.label }}</span>
          <el-input :model-value="nameAt(s.index)" readonly />
          <el-button size="small" @click="openPick(s.index)">...</el-button>
        </div>
      </db-group-box>
    </div>
    <div class="ts-view">
      <div class="ts-tools">
        <el-button
          v-for="t in tools"
          :key="t.id"
          size="small"
          :type="tool === t.id ? 'primary' : 'default'"
          @click="onTool(t.id)">
          {{ t.label }}
        </el-button>
      </div>
      <div class="ts-canvas-wrap">
        <canvas
          ref="cv"
          class="ts-cv"
          @click="onCanvasClick"
          @mousedown.prevent />
      </div>
      <el-radio-group v-model="page" size="small" class="ts-pages">
        <el-radio-button value="A">A</el-radio-button>
        <el-radio-button value="B">B</el-radio-button>
        <el-radio-button value="C">C</el-radio-button>
        <el-radio-button value="D">D</el-radio-button>
        <el-radio-button value="E">E</el-radio-button>
      </el-radio-group>
      <el-form label-width="40px" size="small">
        <el-form-item label="备注">
          <el-input v-model="modelValue.note" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
    </div>
    <el-dialog v-model="pickVisible" title="选择图块图像" width="360px" append-to-body>
      <el-input v-model="pickQuery" size="small" clearable placeholder="搜索" />
      <el-scrollbar max-height="320px">
        <div class="pick-item" @click="applyName('')">(无)</div>
        <div v-for="n in filteredNames" :key="n" class="pick-item" @click="applyName(n)">{{ n }}</div>
      </el-scrollbar>
    </el-dialog>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import DbGroupBox from './shared/DbGroupBox.vue'
import { listImageNames, imageAbsPath, loadImageFile, tileIdFromCell, TILE_PX } from '@/utils/imgAssets'
import {
  FLOOR_AUTOTILE_TABLE,
  WALL_AUTOTILE_TABLE,
  WATERFALL_AUTOTILE_TABLE,
  isTileA1,
  isTileA2,
  isTileA3,
  isTileA4,
  getAutotileKind,
} from '@/components/map/mapAutotile'

const SLOTS = [
  { index: 0, label: 'A1' },
  { index: 1, label: 'A2' },
  { index: 2, label: 'A3' },
  { index: 3, label: 'A4' },
  { index: 4, label: 'A5' },
  { index: 5, label: 'B' },
  { index: 6, label: 'C' },
  { index: 7, label: 'D' },
  { index: 8, label: 'E' },
]
const FLAG_LEN = 8192
const CELL = 48
const A_KIND_COUNTS = [16, 32, 16, 48]
const A_KIND_BASE = [2048, 2816, 4352, 5888]
/** 自动图块预览用「整格」形状 */
const FLOOR_PREVIEW_SHAPE = 46
const WALL_PREVIEW_SHAPE = 15
const WATERFALL_PREVIEW_SHAPE = 3

export default {
  name: 'TilesetEditorPanel',
  components: { DbGroupBox },
  props: { modelValue: { type: Object, required: true } },
  data() {
    return {
      slots: SLOTS,
      page: 'A',
      tool: 'pass',
      tools: [
        { id: 'pass', label: '通行' },
        { id: 'pass4', label: '通行(四方向)' },
        { id: 'ladder', label: '梯子' },
        { id: 'bush', label: '草木繁茂处' },
        { id: 'counter', label: '柜台' },
        { id: 'damage', label: '有害地形' },
        { id: 'terrain', label: '地形标志' },
      ],
      pickVisible: false,
      pickIndex: 0,
      pickQuery: '',
      names: [],
      hitBoxes: [],
      paintGen: 0,
    }
  },
  computed: {
    filteredNames() {
      const q = (this.pickQuery || '').trim().toLowerCase()
      if (!q) return this.names
      return this.names.filter((n) => n.toLowerCase().includes(q))
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler() {
        this.ensureShape()
        this.repaint()
      },
    },
    page() {
      this.repaint()
    },
    tool() {
      this.repaint()
    },
  },
  methods: {
    onTool(id) {
      this.tool = id
    },
    ensureShape() {
      const m = this.modelValue
      if (!m) return
      if (!Array.isArray(m.tilesetNames)) m.tilesetNames = []
      while (m.tilesetNames.length < 9) m.tilesetNames.push('')
      if (!Array.isArray(m.flags)) m.flags = []
      if (m.flags.length < FLAG_LEN) {
        const next = m.flags.slice()
        while (next.length < FLAG_LEN) next.push(0)
        m.flags = next
      }
      if (m.mode == null) m.mode = 0
      if (m.note == null) m.note = ''
    },
    nameAt(i) {
      return (this.modelValue.tilesetNames && this.modelValue.tilesetNames[i]) || ''
    },
    openPick(i) {
      this.pickIndex = i
      this.pickQuery = ''
      this.names = listImageNames('tilesets')
      this.pickVisible = true
    },
    applyName(n) {
      this.modelValue.tilesetNames.splice(this.pickIndex, 1, n || '')
      this.pickVisible = false
      this.repaint()
    },
    flagOf(id) {
      const f = this.modelValue.flags
      if (!f || id < 0 || id >= f.length) return 0
      return f[id] | 0
    },
    setFlag(id, value) {
      if (!this.modelValue.flags || id < 0 || id >= this.modelValue.flags.length) return
      this.modelValue.flags.splice(id, 1, value | 0)
    },
    /** A 页自动图块：同一种类全部形状一起写 */
    writeFlagRange(kindBase, value, shapeCount = 48) {
      for (let i = 0; i < shapeCount; i++) this.setFlag(kindBase + i, value)
    },
    applyFlagAt(hit, localX, localY) {
      const id = hit.id
      let f = this.flagOf(id)
      if (this.tool === 'pass') {
        const blocked = (f & 0x0f) === 0x0f && (f & 0x10) === 0
        const star = (f & 0x10) !== 0
        if (!blocked && !star) f = (f & ~0x1f) | 0x0f
        else if (blocked) f = (f & ~0x0f) | 0x10
        else f = f & ~0x1f
      } else if (this.tool === 'pass4') {
        const bit = this.edgeBit(localX, localY, hit.w, hit.h)
        if (bit == null) return
        f ^= bit
      } else if (this.tool === 'ladder') f ^= 0x20
      else if (this.tool === 'bush') f ^= 0x40
      else if (this.tool === 'counter') f ^= 0x80
      else if (this.tool === 'damage') f ^= 0x100
      else if (this.tool === 'terrain') {
        const tag = (((f >> 12) & 15) + 1) % 8
        f = (f & 0x0fff) | ((tag & 15) << 12)
      }
      if (hit.kindBase != null) this.writeFlagRange(hit.kindBase, f)
      else this.setFlag(id, f)
      this.repaint()
    },
    edgeBit(lx, ly, w, h) {
      const cx = w / 2
      const cy = h / 2
      const dx = lx - cx
      const dy = ly - cy
      if (Math.abs(dx) < w * 0.12 && Math.abs(dy) < h * 0.12) return null
      if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? 0x08 : 0x01
      return dx < 0 ? 0x02 : 0x04
    },
    async repaint() {
      const gen = ++this.paintGen
      await this.$nextTick()
      const canvas = this.$refs.cv
      const m = this.modelValue
      if (!canvas || !m || gen !== this.paintGen) return
      this.hitBoxes = []
      const ctx = canvas.getContext('2d')
      if (this.page === 'A') await this.paintA(canvas, ctx, gen)
      else await this.paintSheet(canvas, ctx, this.page, gen)
    },
    async loadSlot(index) {
      const name = this.nameAt(index)
      if (!name) return null
      const img = await loadImageFile(imageAbsPath('tilesets', name))
      return img ? markRaw(img) : null
    },
    fillChecker(ctx, w, h, s = 8) {
      for (let y = 0; y < h; y += s) {
        for (let x = 0; x < w; x += s) {
          ctx.fillStyle = ((x / s + y / s) | 0) % 2 === 0 ? '#ccc' : '#fff'
          ctx.fillRect(x, y, Math.min(s, w - x), Math.min(s, h - y))
        }
      }
    },
    async paintSheet(canvas, ctx, page, gen) {
      const slotMap = { B: 5, C: 6, D: 7, E: 8 }
      const img = await this.loadSlot(slotMap[page])
      if (gen !== this.paintGen) return
      // 最多 8 列：原图左 8 列一块、右 8 列接到下方（与 tileId +128 块一致）
      const dispCols = 8
      const imgCols = img ? Math.max(1, Math.floor(img.width / TILE_PX)) : 0
      const imgRows = img ? Math.max(1, Math.floor(img.height / TILE_PX)) : 0
      const blocks = img ? Math.max(1, Math.ceil(imgCols / dispCols)) : 0
      const dispRows = imgRows * blocks
      const cw = CELL
      const ch = CELL
      canvas.width = dispCols * cw
      canvas.height = Math.max(dispRows * ch, ch)
      this.fillChecker(ctx, canvas.width, canvas.height)
      if (!img) return
      for (let block = 0; block < blocks; block++) {
        for (let r = 0; r < imgRows; r++) {
          for (let c = 0; c < dispCols; c++) {
            const srcCol = block * dispCols + c
            if (srcCol >= imgCols) continue
            const sx = srcCol * TILE_PX
            const sy = r * TILE_PX
            const x = c * cw
            const y = (block * imgRows + r) * ch
            if (sx + TILE_PX <= img.width && sy + TILE_PX <= img.height) {
              ctx.drawImage(img, sx, sy, TILE_PX, TILE_PX, x, y, cw, ch)
            }
            const id = tileIdFromCell(page, srcCol, r)
            this.hitBoxes.push({ x, y, w: cw, h: ch, id })
            this.drawOverlay(ctx, x, y, cw, ch, id)
          }
        }
      }
    },
    async paintA(canvas, ctx, gen) {
      const parts = []
      for (let i = 0; i < 5; i++) parts.push(await this.loadSlot(i))
      if (gen !== this.paintGen) return

      const cell = CELL
      const cols = 8
      const sections = []
      let y = 0
      // 只排已指定图像的分区，空槽不占可编辑格（与原版一致）
      for (let i = 0; i < 4; i++) {
        if (!parts[i]) continue
        const count = A_KIND_COUNTS[i]
        const rows = Math.ceil(count / cols)
        const h = rows * cell
        sections.push({ type: 'kind', index: i, img: parts[i], y, h, rows, cell, count })
        y += h
      }
      const a5 = parts[4]
      if (a5) {
        const a5Rows = Math.max(1, Math.floor(a5.height / TILE_PX))
        const a5H = a5Rows * cell
        sections.push({ type: 'a5', img: a5, y, h: a5H, rows: a5Rows, cell })
        y += a5H
      }

      canvas.width = cols * cell
      canvas.height = Math.max(cell, y)
      this.fillChecker(ctx, canvas.width, canvas.height)

      for (const sec of sections) {
        if (sec.type === 'a5') this.paintA5Section(ctx, sec)
        else this.paintKindSection(ctx, sec)
      }
    },
    paintKindSection(ctx, sec) {
      const { index, img, y: oy, cell, count } = sec
      const cols = 8
      const base = A_KIND_BASE[index]
      for (let k = 0; k < count; k++) {
        const c = k % cols
        const r = Math.floor(k / cols)
        const x = c * cell
        const y = oy + r * cell
        const kindBase = base + k * 48
        if (img) this.drawAutotilePreview(ctx, img, kindBase, x, y, cell)
        this.hitBoxes.push({ x, y, w: cell, h: cell, id: kindBase, kindBase })
        this.drawOverlay(ctx, x, y, cell, cell, kindBase)
      }
    },
    paintA5Section(ctx, sec) {
      const { img, y: oy, cell, rows } = sec
      const cols = 8
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cell
          const y = oy + r * cell
          const id = 1536 + c + r * 8
          if (img) {
            const sx = c * TILE_PX
            const sy = r * TILE_PX
            if (sx + TILE_PX <= img.width && sy + TILE_PX <= img.height) {
              ctx.drawImage(img, sx, sy, TILE_PX, TILE_PX, x, y, cell, cell)
            }
          }
          this.hitBoxes.push({ x, y, w: cell, h: cell, id })
          this.drawOverlay(ctx, x, y, cell, cell, id)
        }
      }
    },
    /** 与 MapViewer.drawAutotile 同源，固定预览形状 */
    drawAutotilePreview(ctx, source, tileId, dx, dy, size) {
      let table = FLOOR_AUTOTILE_TABLE
      let shape = FLOOR_PREVIEW_SHAPE
      const kind = getAutotileKind(tileId)
      const tx = kind % 8
      const ty = Math.floor(kind / 8)
      let bx = 0
      let by = 0

      if (isTileA1(tileId)) {
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
      } else {
        return
      }

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
    drawOverlay(ctx, x, y, w, h, id) {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
      const f = this.flagOf(id)
      if (this.tool === 'pass4') {
        this.drawPass4Arrows(ctx, x, y, w, h, f)
        return
      }
      const text = this.symbol(f)
      if (!text) return
      ctx.font = `bold ${Math.max(10, Math.floor(w * 0.42))}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.fillStyle = text === '×' ? '#c0392b' : text === '☆' ? '#d4a017' : '#1a1a1a'
      ctx.strokeText(text, x + w / 2, y + h / 2)
      ctx.fillText(text, x + w / 2, y + h / 2)
    },
    drawPass4Arrows(ctx, x, y, w, h, f) {
      const cx = x + w / 2
      const cy = y + h / 2
      const len = Math.min(w, h) * 0.28
      const draw = (ox, oy, ex, ey) => {
        ctx.beginPath()
        ctx.moveTo(cx + ox, cy + oy)
        ctx.lineTo(cx + ex, cy + ey)
        ctx.stroke()
      }
      ctx.strokeStyle = '#1a1a1a'
      ctx.fillStyle = '#1a1a1a'
      ctx.lineWidth = Math.max(1.5, w * 0.04)
      ctx.lineCap = 'round'
      // 挡住的一侧不画：bit 置位 = 该方向不可通行
      if ((f & 0x08) === 0) {
        draw(0, len * 0.2, 0, -len)
        this.drawArrowHead(ctx, cx, cy - len, 0)
      }
      if ((f & 0x01) === 0) {
        draw(0, -len * 0.2, 0, len)
        this.drawArrowHead(ctx, cx, cy + len, 2)
      }
      if ((f & 0x02) === 0) {
        draw(len * 0.2, 0, -len, 0)
        this.drawArrowHead(ctx, cx - len, cy, 3)
      }
      if ((f & 0x04) === 0) {
        draw(-len * 0.2, 0, len, 0)
        this.drawArrowHead(ctx, cx + len, cy, 1)
      }
    },
    drawArrowHead(ctx, tipX, tipY, dir) {
      const s = 4
      ctx.beginPath()
      if (dir === 0) {
        ctx.moveTo(tipX, tipY)
        ctx.lineTo(tipX - s, tipY + s)
        ctx.lineTo(tipX + s, tipY + s)
      } else if (dir === 2) {
        ctx.moveTo(tipX, tipY)
        ctx.lineTo(tipX - s, tipY - s)
        ctx.lineTo(tipX + s, tipY - s)
      } else if (dir === 3) {
        ctx.moveTo(tipX, tipY)
        ctx.lineTo(tipX + s, tipY - s)
        ctx.lineTo(tipX + s, tipY + s)
      } else {
        ctx.moveTo(tipX, tipY)
        ctx.lineTo(tipX - s, tipY - s)
        ctx.lineTo(tipX - s, tipY + s)
      }
      ctx.closePath()
      ctx.fill()
    },
    symbol(f) {
      if (this.tool === 'ladder') return (f & 0x20) ? '梯' : ''
      if (this.tool === 'bush') return (f & 0x40) ? '草' : ''
      if (this.tool === 'counter') return (f & 0x80) ? '柜' : ''
      if (this.tool === 'damage') return (f & 0x100) ? '害' : ''
      if (this.tool === 'terrain') {
        const tag = (f >> 12) & 15
        return tag ? String(tag) : ''
      }
      if (f & 0x10) return '☆'
      if ((f & 0x0f) === 0x0f) return '×'
      if ((f & 0x0f) === 0) return '○'
      return '◆'
    },
    onCanvasClick(e) {
      const canvas = this.$refs.cv
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (canvas.width / rect.width)
      const y = (e.clientY - rect.top) * (canvas.height / rect.height)
      const hit = this.hitBoxes.find((b) => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h)
      if (!hit) return
      this.applyFlagAt(hit, x - hit.x, y - hit.y)
    },
  },
}
</script>

<style scoped>
.ts {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 8px;
  height: 100%;
  min-height: 0;
}
.ts-mid, .ts-view {
  min-width: 0;
  min-height: 0;
}
.ts-view {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ts-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ts-canvas-wrap {
  flex: 1;
  min-height: 200px;
  overflow: auto;
  background: #e8e8e8;
  border: 1px solid var(--el-border-color);
}
.ts-cv {
  display: block;
}
.slot {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
}
.slot-lab {
  font-size: 12px;
}
.pick-item {
  padding: 4px 8px;
  cursor: pointer;
  font-size: 13px;
}
.pick-item:hover {
  background: var(--el-fill-color-light);
}
</style>
