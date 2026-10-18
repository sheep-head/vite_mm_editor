<template>
  <div class="icon-field">
    <canvas
      ref="preview"
      width="32"
      height="32"
      class="icon-preview"
      title="点击选择图标"
      @click="open = true" />
    <el-input-number
      :model-value="modelValue"
      :min="0"
      :controls="false"
      size="small"
      class="icon-num"
      @update:model-value="onNum" />
    <el-button size="small" @click="open = true">…</el-button>

    <el-dialog
      v-model="open"
      title="选择图标"
      width="560px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false">
      <div class="icon-toolbar">
        <span>索引 {{ draft }}</span>
        <el-button size="small" @click="draft = 0">无</el-button>
      </div>
      <el-scrollbar max-height="420px">
        <canvas
          ref="sheet"
          class="icon-sheet"
          @click="onSheetClick"
          @mousemove="onSheetMove" />
      </el-scrollbar>
      <template #footer>
        <el-button @click="open = false">取消</el-button>
        <el-button type="primary" @click="confirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { imageAbsPath, loadImageFile } from '@/utils/imgAssets'

const CELL = 32

export default {
  name: 'IconPickerField',
  props: {
    modelValue: { type: Number, default: 0 },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      open: false,
      draft: 0,
      _img: null,
      _cols: 16,
      _rows: 1,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler() {
        this.$nextTick(() => this.paintPreview())
      },
    },
    open(v) {
      if (v) {
        this.draft = this.modelValue || 0
        this.$nextTick(() => this.ensureSheet().then(() => this.paintSheet()))
      }
    },
  },
  mounted() {
    this.ensureSheet().then(() => this.paintPreview())
  },
  methods: {
    onNum(v) {
      this.$emit('update:modelValue', Math.max(0, Number(v) || 0))
    },
    async ensureSheet() {
      if (this._img) return this._img
      const abs = imageAbsPath('system', 'IconSet')
      this._img = await loadImageFile(abs)
      if (this._img) {
        this._cols = Math.max(1, Math.floor(this._img.width / CELL))
        this._rows = Math.max(1, Math.floor(this._img.height / CELL))
      }
      return this._img
    },
    paintPreview() {
      const canvas = this.$refs.preview
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, CELL, CELL)
      ctx.fillStyle = '#ddd'
      ctx.fillRect(0, 0, CELL, CELL)
      const idx = this.modelValue || 0
      if (!this._img || idx <= 0) return
      const col = idx % this._cols
      const row = Math.floor(idx / this._cols)
      ctx.drawImage(this._img, col * CELL, row * CELL, CELL, CELL, 0, 0, CELL, CELL)
    },
    paintSheet() {
      const canvas = this.$refs.sheet
      if (!canvas || !this._img) return
      canvas.width = this._img.width
      canvas.height = this._img.height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(this._img, 0, 0)
      const idx = this.draft || 0
      if (idx > 0) {
        const col = idx % this._cols
        const row = Math.floor(idx / this._cols)
        ctx.strokeStyle = '#2a5db0'
        ctx.lineWidth = 2
        ctx.strokeRect(col * CELL, row * CELL, CELL, CELL)
      }
    },
    onSheetClick(e) {
      const canvas = this.$refs.sheet
      if (!canvas || !this._img) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      const col = Math.floor(x / CELL)
      const row = Math.floor(y / CELL)
      if (col < 0 || row < 0 || col >= this._cols || row >= this._rows) return
      this.draft = row * this._cols + col
      this.paintSheet()
    },
    onSheetMove() {
      /* reserved for hover highlight */
    },
    confirm() {
      this.$emit('update:modelValue', this.draft || 0)
      this.open = false
      this.$nextTick(() => this.paintPreview())
    },
  },
}
</script>

<style scoped>
.icon-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.icon-preview {
  width: 32px;
  height: 32px;
  border: 1px solid var(--app-border);
  cursor: pointer;
  image-rendering: pixelated;
  background: #eee;
}
.icon-num {
  width: 72px;
}
.icon-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}
.icon-sheet {
  display: block;
  max-width: 100%;
  cursor: crosshair;
  image-rendering: pixelated;
  border: 1px solid var(--app-border);
}
</style>
