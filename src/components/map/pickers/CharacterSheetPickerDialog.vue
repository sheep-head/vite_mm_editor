<template>
  <el-dialog
    :model-value="modelValue"
    title="选择行走图"
    width="720px"
    top="6vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="sheet-picker">
      <aside class="sheet-list">
        <el-input v-model="query" size="small" clearable placeholder="搜索文件名" />
        <el-scrollbar ref="scroll" class="sheet-scroll">
          <div
            v-for="row in filtered"
            :key="row.key"
            class="sheet-item"
            :class="{ active: selectedKey === row.key }"
            :data-name="row.key"
            @click="selectRow(row)">
            {{ row.label }}
          </div>
        </el-scrollbar>
      </aside>
      <div class="sheet-preview">
        <div class="sheet-preview-box">
          <canvas
            ref="canvas"
            class="sheet-canvas"
            :class="{ single: !frameMode && !tileMode && maxIndex === 0 }"
            @click="onCanvasClick"
            @dblclick="confirm" />
        </div>
        <div class="sheet-meta">
          <span v-if="tileMode">图块 {{ tileLabel }}</span>
          <span v-else-if="frameMode">{{ frameLabel }}</span>
          <span v-else-if="maxIndex > 0">索引 {{ selectedIndex }} / {{ maxIndex }}</span>
          <span v-else-if="selectedName">整张（$ 大角色）</span>
          <el-input-number
            v-if="!frameMode && maxIndex > 0"
            v-model="selectedIndex"
            :min="0"
            :max="maxIndex"
            size="small"
            controls-position="right" />
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'
import DataManager from '@/utils/DataManager'
import {
  listImageNames,
  imageAbsPath,
  loadImageFile,
  characterSheetLayout,
  paintCharacterSheet,
  paintTileSheet,
  hitCharacterIndex,
  hitTileCell,
  isBigCharacter,
  cellFromCharacter,
  characterFromCell,
  tileSetOfId,
  tileIdToCell,
  tileIdFromCell,
} from '@/utils/imgAssets'

export default {
  name: 'CharacterSheetPickerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    modelName: { type: String, default: '' },
    modelIndex: { type: Number, default: 0 },
    /** 事件页选图：可点选某一帧，并附带当前地图图块 B–E */
    pickFrame: { type: Boolean, default: false },
    modelPattern: { type: Number, default: 1 },
    modelDirection: { type: Number, default: 2 },
    modelTileId: { type: Number, default: 0 },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      query: '',
      rows: [],
      selectedKey: '',
      selectedName: '',
      selectedIndex: 0,
      maxIndex: 0,
      frameMode: false,
      tileMode: false,
      tileSet: '',
      tileCol: 0,
      tileRow: 0,
      big: false,
    }
  },
  created() {
    this.img = null
  },
  computed: {
    ...mapGetters(['selectedMapId', 'editorUi']),
    filtered() {
      const q = (this.query || '').trim().toLowerCase()
      if (!q) return this.rows
      return this.rows.filter((r) => String(r.label).toLowerCase().includes(q))
    },
    pickStroke() {
      const ui = this.editorUi || {}
      return {
        stroke: ui.charPickColor || 'rgba(42,93,176,1)',
        lineWidth: ui.charPickWidth || 3,
      }
    },
    frameLabel() {
      const info = characterFromCell(this.big, this.selectedIndex)
      const dir = { 2: '下', 4: '左', 6: '右', 8: '上' }[info.direction] || ''
      return `索引 ${info.index}，图案 ${info.pattern}，朝向 ${dir}`
    },
    tileLabel() {
      return `${this.tileSet} (${this.tileCol},${this.tileRow})`
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      async handler(v) {
        if (!v) return
        this.query = ''
        this.rows = this.buildRows()
        const tileSet = this.pickFrame ? tileSetOfId(this.modelTileId) : ''
        if (tileSet) {
          this.selectedKey = 'tile:' + tileSet
          this.selectedName = ''
          const cell = tileIdToCell(this.modelTileId)
          this.tileSet = tileSet
          this.tileCol = cell.col
          this.tileRow = cell.row
        } else {
          this.selectedKey = this.modelName || ''
          this.selectedName = this.modelName || ''
          this.selectedIndex = this.pickFrame
            ? cellFromCharacter(isBigCharacter(this.modelName), this.modelIndex, this.modelPattern, this.modelDirection)
            : (this.modelIndex || 0)
        }
        this._nameChanged = false
        await this.reloadImage()
        this.$nextTick(() => this.scrollToSelected())
      },
    },
    selectedIndex() {
      if (!this.tileMode) this.paint()
    },
    tileCol() {
      if (this.tileMode) this.paint()
    },
    tileRow() {
      if (this.tileMode) this.paint()
    },
  },
  methods: {
    buildRows() {
      const rows = [{ key: '', label: '（无）', kind: 'none' }]
      listImageNames('characters').forEach((n) => {
        rows.push({ key: n, label: n, kind: 'char', name: n })
      })
      if (this.pickFrame) rows.push(...this.tileRows())
      return rows
    },
    tileRows() {
      const out = []
      try {
        const id = this.selectedMapId
        if (!id) return out
        const map = DataManager.$loadDataSync(`Map${String(id).padStart(3, '0')}`, false, false)
        const tilesets = DataManager.$loadDataSync('Tilesets', false, false) || []
        const ts = map && tilesets[map.tilesetId]
        const names = (ts && ts.tilesetNames) || []
        ;[
          ['B', 5],
          ['C', 6],
          ['D', 7],
          ['E', 8],
        ].forEach(([set, i]) => {
          if (!names[i]) return
          out.push({
            key: 'tile:' + set,
            label: `[图块 ${set}]`,
            kind: 'tile',
            set,
            file: names[i],
          })
        })
      } catch (e) {
        console.error(e)
      }
      return out
    },
    scrollToSelected() {
      const root = this.$refs.scroll && this.$refs.scroll.$el
      if (!root) return
      const wrap = root.querySelector('.el-scrollbar__wrap') || root
      const sel = root.querySelector('.sheet-item.active')
      if (sel && sel.scrollIntoView) {
        sel.scrollIntoView({ block: 'center', behavior: 'auto' })
      } else if (wrap) {
        wrap.scrollTop = 0
      }
    },
    async selectRow(row) {
      this.selectedKey = row.key
      this._nameChanged = true
      if (row.kind === 'tile') {
        this.selectedName = ''
        this.tileSet = row.set
        this.tileCol = 0
        this.tileRow = 0
      } else {
        this.selectedName = row.name || ''
        this.tileMode = false
        this.selectedIndex = 0
      }
      await this.reloadImage()
    },
    currentRow() {
      return this.rows.find((r) => r.key === this.selectedKey) || null
    },
    async reloadImage() {
      this.img = null
      this.maxIndex = 0
      this.frameMode = false
      const row = this.currentRow()
      if (!row || row.kind === 'none') {
        this.tileMode = false
        this.paint()
        return
      }
      if (row.kind === 'tile') {
        this.tileMode = true
        this.tileSet = row.set
        const abs = imageAbsPath('tilesets', row.file)
        const loaded = await loadImageFile(abs)
        this.img = loaded ? markRaw(loaded) : null
        this._nameChanged = false
        this.$nextTick(() => this.paint())
        return
      }
      this.tileMode = false
      const abs = imageAbsPath('characters', row.name)
      const loaded = await loadImageFile(abs)
      this.img = loaded ? markRaw(loaded) : null
      if (this.img) {
        const layout = characterSheetLayout(this.img, row.name)
        this.big = layout.big
        this.frameMode = !!this.pickFrame
        if (this.frameMode) {
          this.maxIndex = layout.big ? 11 : 95
          if (this._nameChanged) this.selectedIndex = layout.big ? 1 : 1
          this.selectedIndex = Math.max(0, Math.min(this.maxIndex, this.selectedIndex))
        } else {
          this.maxIndex = layout.maxIndex
          if (this._nameChanged) this.selectedIndex = 0
          this.selectedIndex = this.maxIndex === 0 ? 0 : Math.min(this.selectedIndex, this.maxIndex)
        }
      }
      this._nameChanged = false
      this.$nextTick(() => this.paint())
    },
    paint() {
      const canvas = this.$refs.canvas
      if (!canvas) return
      if (!this.img) {
        canvas.width = 240
        canvas.height = 120
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#888'
        ctx.font = '14px sans-serif'
        ctx.fillText(this.selectedKey ? '加载失败' : '（无图像）', 20, 40)
        return
      }
      if (this.tileMode) {
        paintTileSheet(canvas, this.img, this.tileCol, this.tileRow, 480, 480, this.pickStroke)
        return
      }
      paintCharacterSheet(canvas, this.img, this.selectedName, this.selectedIndex, 480, 480, {
        selectFrame: this.frameMode,
        ...this.pickStroke,
      })
    },
    onCanvasClick(e) {
      if (!this.img) return
      if (this.tileMode) {
        const cell = hitTileCell(this.img, this.$refs.canvas, e.clientX, e.clientY)
        this.tileCol = cell.col
        this.tileRow = cell.row
        return
      }
      if (!this.selectedName) return
      if (!this.frameMode && this.maxIndex === 0) return
      const idx = hitCharacterIndex(this.img, this.selectedName, this.$refs.canvas, e.clientX, e.clientY, {
        selectFrame: this.frameMode,
      })
      if (idx >= 0) this.selectedIndex = idx
    },
    confirm() {
      if (this.tileMode && this.tileSet) {
        this.$emit('confirm', {
          name: '',
          index: 0,
          tileId: tileIdFromCell(this.tileSet, this.tileCol, this.tileRow),
        })
      } else if (this.frameMode && this.selectedName) {
        const frame = characterFromCell(this.big, this.selectedIndex)
        this.$emit('confirm', { name: this.selectedName, tileId: 0, ...frame })
      } else {
        this.$emit('confirm', {
          name: this.selectedName || '',
          index: this.selectedName ? (this.maxIndex === 0 ? 0 : this.selectedIndex) : 0,
          tileId: 0,
        })
      }
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.sheet-picker {
  display: flex;
  gap: 12px;
  min-height: 360px;
}
.sheet-list {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sheet-scroll {
  flex: 1;
  border: 1px solid var(--app-border);
  border-radius: 4px;
  max-height: 460px;
}
.sheet-item {
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sheet-item:hover {
  background: var(--app-hover-bg);
}
.sheet-item.active {
  color: var(--app-active-color);
  background: var(--app-hover-bg);
}
.sheet-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.sheet-preview-box {
  flex: 1;
  min-height: 200px;
  max-height: 480px;
  overflow: auto;
  border: 1px solid var(--app-border);
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: pointer;
}
.sheet-canvas.single {
  cursor: default;
}
.sheet-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
</style>
