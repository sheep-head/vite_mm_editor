<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="640px"
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
          <canvas ref="canvas" class="sheet-canvas" @dblclick="confirm" />
        </div>
        <div class="sheet-meta">
          <span v-if="imageSizeText" class="sheet-size">{{ imageSizeText }}</span>
          <template v-if="showHue">
            <span>色相</span>
            <el-slider v-model="hue" :min="0" :max="360" style="flex: 1; margin: 0 12px" />
            <el-input-number v-model="hue" :min="0" :max="360" size="small" controls-position="right" />
          </template>
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
  listBattlerNames,
  resolveBattlerAbsPath,
  imageAbsPath,
  loadImageFile,
  fitCanvasToImage,
} from '@/utils/imgAssets'

export default {
  name: 'BattlerPickerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    modelName: { type: String, default: '' },
    modelHue: { type: Number, default: 0 },
    /** enemies | sv_actors | sv_enemies */
    folder: { type: String, default: 'enemies' },
    showHue: { type: Boolean, default: true },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      query: '',
      names: [],
      selectedName: '',
      hue: 0,
      imageSizeText: '',
    }
  },
  created() {
    this.img = null
  },
  computed: {
    title() {
      const map = {
        enemies: '选择敌人战斗图',
        sv_actors: '选择 SV 角色',
        sv_enemies: '选择 SV 敌人',
        animations: '选择一个图像',
        tilesets: '选择图块图像',
      }
      return map[this.folder] || '选择图像'
    },
    filtered() {
      const q = (this.query || '').trim().toLowerCase()
      if (!q) return this.names
      return this.names.filter((n) => n.toLowerCase().includes(q))
    },
    useBattlerFallback() {
      return this.folder === 'enemies' || this.folder === 'sv_enemies'
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      async handler(v) {
        if (!v) return
        this.query = ''
        this.names = this.useBattlerFallback
          ? listBattlerNames(this.folder)
          : listImageNames(this.folder)
        this.selectedName = this.modelName || ''
        this.hue = this.modelHue || 0
        await this.reloadImage()
        this.$nextTick(() => this.scrollToSelected())
      },
    },
    hue() {
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
      await this.reloadImage()
    },
    async reloadImage() {
      this.img = null
      this.imageSizeText = ''
      if (!this.selectedName) {
        this.paint()
        return
      }
      const abs = this.useBattlerFallback
        ? resolveBattlerAbsPath(this.selectedName, this.folder)
        : imageAbsPath(this.folder, this.selectedName)
      const loaded = await loadImageFile(abs)
      this.img = loaded ? markRaw(loaded) : null
      this.imageSizeText = this.img ? `${this.img.width} × ${this.img.height}` : ''
      this.$nextTick(() => this.paint())
    },
    paint() {
      const canvas = this.$refs.canvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!this.img) {
        canvas.width = 240
        canvas.height = 160
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#888'
        ctx.font = '14px sans-serif'
        ctx.fillText(this.selectedName ? '加载失败' : '（无图像）', 20, 40)
        return
      }
      const { dw, dh } = fitCanvasToImage(canvas, this.img, 360, 360)
      const s = 8
      for (let y = 0; y < dh; y += s) {
        for (let x = 0; x < dw; x += s) {
          ctx.fillStyle = (x / s + y / s) % 2 === 0 ? '#ccc' : '#fff'
          ctx.fillRect(x, y, s, s)
        }
      }
      ctx.save()
      if (this.hue) ctx.filter = `hue-rotate(${this.hue}deg)`
      ctx.drawImage(this.img, 0, 0, dw, dh)
      ctx.restore()
    },
    confirm() {
      this.$emit('confirm', {
        name: this.selectedName || '',
        hue: this.hue || 0,
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
  min-height: 320px;
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
  max-height: 360px;
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
  max-height: 360px;
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
}
.sheet-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  flex-wrap: wrap;
}
.sheet-size {
  color: var(--app-text-muted, #909399);
  font-variant-numeric: tabular-nums;
}
</style>
