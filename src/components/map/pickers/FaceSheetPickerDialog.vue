<template>
  <el-dialog
    :model-value="modelValue"
    title="选择脸图"
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
            class="sheet-item"
            :class="{ active: selectedName === '' }"
            @click="selectName('')">
            （无）
          </div>
          <div
            v-for="n in filtered"
            :key="n"
            class="sheet-item"
            :class="{ active: selectedName === n }"
            @click="selectName(n)">
            {{ n }}
          </div>
        </el-scrollbar>
      </aside>
      <div class="sheet-preview">
        <div class="sheet-preview-box">
          <canvas
            ref="canvas"
            class="sheet-canvas"
            :class="{ single: maxIndex === 0 }"
            @click="onCanvasClick"
            @dblclick="confirm" />
        </div>
        <div class="sheet-meta">
          <span v-if="maxIndex > 0">索引 {{ selectedIndex }}</span>
          <span v-else-if="selectedName">整张（$ 单格脸图）</span>
          <el-input-number
            v-if="maxIndex > 0"
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
import {
  listImageNames,
  imageAbsPath,
  loadImageFile,
  faceSheetLayout,
  paintFaceSheet,
  hitFaceIndex,
} from '@/utils/imgAssets'

export default {
  name: 'FaceSheetPickerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    modelName: { type: String, default: '' },
    modelIndex: { type: Number, default: 0 },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      query: '',
      names: [],
      selectedName: '',
      selectedIndex: 0,
      maxIndex: 0,
    }
  },
  created() {
    this.img = null
  },
  computed: {
    filtered() {
      const q = (this.query || '').trim().toLowerCase()
      if (!q) return this.names
      return this.names.filter((n) => n.toLowerCase().includes(q))
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      async handler(v) {
        if (!v) return
        this.query = ''
        this.names = listImageNames('faces')
        this.selectedName = this.modelName || ''
        this.selectedIndex = this.modelIndex || 0
        await this.reloadImage()
        this.$nextTick(() => this.scrollToSelected())
      },
    },
    selectedIndex() {
      this.paint()
    },
  },
  methods: {
    scrollToSelected() {
      const root = this.$refs.scroll && this.$refs.scroll.$el
      if (!root) return
      const sel = root.querySelector('.sheet-item.active')
      if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'center', behavior: 'auto' })
    },
    async selectName(n) {
      this.selectedName = n
      this.selectedIndex = 0
      await this.reloadImage()
    },
    async reloadImage() {
      this.img = null
      this.maxIndex = 0
      if (!this.selectedName) {
        this.paint()
        return
      }
      const abs = imageAbsPath('faces', this.selectedName)
      const loaded = await loadImageFile(abs)
      this.img = loaded ? markRaw(loaded) : null
      if (this.img) {
        const layout = faceSheetLayout(this.img, this.selectedName)
        this.maxIndex = layout.maxIndex
        this.selectedIndex = this.maxIndex === 0 ? 0 : Math.min(this.selectedIndex, this.maxIndex)
      }
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
        ctx.fillText(this.selectedName ? '加载失败' : '（无图像）', 20, 40)
        return
      }
      paintFaceSheet(canvas, this.img, this.selectedName, this.selectedIndex, 480, 320)
    },
    onCanvasClick(e) {
      if (!this.img || !this.selectedName || this.maxIndex === 0) return
      const idx = hitFaceIndex(this.img, this.selectedName, this.$refs.canvas, e.clientX, e.clientY)
      if (idx >= 0) this.selectedIndex = idx
    },
    confirm() {
      this.$emit('confirm', {
        name: this.selectedName || '',
        index: this.selectedName ? (this.maxIndex === 0 ? 0 : this.selectedIndex) : 0,
      })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.sheet-picker {
  display: flex;
  gap: 12px;
  min-height: 280px;
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
  max-height: 320px;
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
  min-height: 160px;
  max-height: 320px;
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
