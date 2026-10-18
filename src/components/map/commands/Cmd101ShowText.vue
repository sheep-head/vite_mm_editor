<template>
  <el-dialog
    :model-value="modelValue"
    title="显示文字"
    width="560px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="top-row">
      <div class="face-col">
        <div class="face-label">脸图:</div>
        <canvas
          ref="faceCv"
          class="face-preview"
          width="144"
          height="144"
          title="点击选择脸图"
          @click="facePickerVisible = true" />
      </div>
      <div class="text-col">
        <div class="face-label">文本:</div>
        <el-input v-model="text" type="textarea" :rows="8" class="text-area" />
      </div>
    </div>
    <div class="mid-row">
      <span class="mid-lab">名称:</span>
      <el-input v-model="speakerName" size="small" style="width: 140px" />
      <span class="mid-lab">背景:</span>
      <el-select v-model="background" size="small" style="width: 100px">
        <el-option :value="0" label="窗口" />
        <el-option :value="1" label="暗淡" />
        <el-option :value="2" label="透明" />
      </el-select>
      <span class="mid-lab">窗口位置:</span>
      <el-select v-model="positionType" size="small" style="width: 100px">
        <el-option :value="0" label="顶部" />
        <el-option :value="1" label="中间" />
        <el-option :value="2" label="底部" />
      </el-select>
      <el-button size="small" @click="previewVisible = true">预览...</el-button>
    </div>
    <template #footer>
      <div class="ft">
        <el-checkbox v-model="batchInput">批量输入</el-checkbox>
        <span class="ft-sp" />
        <el-button @click="$emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" @click="ok">确定</el-button>
      </div>
    </template>
    <face-sheet-picker-dialog
      v-model="facePickerVisible"
      :model-name="faceName"
      :model-index="faceIndex"
      @confirm="onFacePicked" />
    <el-dialog v-model="previewVisible" title="预览" width="420px" append-to-body :close-on-click-modal="false">
      <div class="preview-box" :class="'bg-' + background">
        <canvas ref="previewFace" class="preview-face" width="96" height="96" />
        <div class="preview-body">
          <div v-if="speakerName" class="preview-name">{{ speakerName }}</div>
          <pre class="preview-text">{{ text || ' ' }}</pre>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script>
import FaceSheetPickerDialog from '../pickers/FaceSheetPickerDialog.vue'
import { faceSheetLayout, imageAbsPath, loadImageFile } from '@/utils/imgAssets'

export default {
  name: 'Cmd101ShowText',
  components: { FaceSheetPickerDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      faceName: '',
      faceIndex: 0,
      background: 0,
      positionType: 2,
      speakerName: '',
      text: '',
      batchInput: false,
      facePickerVisible: false,
      previewVisible: false,
      _faceImg: null,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.syncFromCommand()
        this.$nextTick(() => this.paintFace())
      },
    },
    faceName() {
      this.loadFace()
    },
    faceIndex() {
      this.paintFace()
    },
    previewVisible(v) {
      if (v) this.$nextTick(() => this.paintPreviewFace())
    },
  },
  methods: {
    onFacePicked({ name, index }) {
      this.faceName = name || ''
      this.faceIndex = index || 0
    },
    syncFromCommand() {
      const c = this.command
      this.batchInput = false
      if (c && c.code === 101) {
        const p = c.parameters || ['', 0, 0, 2, '']
        this.faceName = p[0] || ''
        this.faceIndex = p[1] || 0
        this.background = p[2] || 0
        this.positionType = p[3] ?? 2
        this.speakerName = p[4] || ''
        const lines = Array.isArray(c._extraLines) ? [...c._extraLines] : []
        this.text = lines.join('\n')
      } else {
        this.faceName = ''
        this.faceIndex = 0
        this.background = 0
        this.positionType = 2
        this.speakerName = ''
        this.text = ''
      }
      this.loadFace()
    },
    async loadFace() {
      this._faceImg = null
      if (!this.faceName) {
        this.paintFace()
        return
      }
      const img = await loadImageFile(imageAbsPath('faces', this.faceName))
      this._faceImg = img
      this.paintFace()
      if (this.previewVisible) this.paintPreviewFace()
    },
    paintFace() {
      this.drawFaceOn(this.$refs.faceCv, 144)
    },
    paintPreviewFace() {
      this.drawFaceOn(this.$refs.previewFace, 96)
    },
    drawFaceOn(canvas, size) {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, size, size)
      const s = 8
      for (let y = 0; y < size; y += s) {
        for (let x = 0; x < size; x += s) {
          ctx.fillStyle = ((x / s + y / s) | 0) % 2 === 0 ? '#c8c8c8' : '#eee'
          ctx.fillRect(x, y, s, s)
        }
      }
      const img = this._faceImg
      if (!img || !img.width) return
      const layout = faceSheetLayout(img, this.faceName)
      let sx = 0
      let sy = 0
      let sw = layout.cw
      let sh = layout.ch
      if (!layout.single && layout.maxIndex > 0) {
        const idx = Math.max(0, Math.min(this.faceIndex, layout.maxIndex))
        sx = (idx % layout.cols) * layout.cw
        sy = Math.floor(idx / layout.cols) * layout.ch
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)
    },
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const lines = String(this.text || '').split(/\r?\n/)
      const head = [this.faceName, this.faceIndex, this.background, this.positionType, this.speakerName]
      const commands = []
      if (this.batchInput) {
        const rows = lines.length ? lines : ['']
        rows.forEach((line) => {
          commands.push({ code: 101, indent, parameters: [...head] })
          commands.push({ code: 401, indent, parameters: [line] })
        })
      } else {
        commands.push({ code: 101, indent, parameters: head })
        if (!lines.length || (lines.length === 1 && lines[0] === '')) {
          commands.push({ code: 401, indent, parameters: [''] })
        } else {
          lines.forEach((line) => {
            commands.push({ code: 401, indent, parameters: [line] })
          })
        }
      }
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.top-row {
  display: flex;
  gap: 12px;
}
.face-col {
  flex: 0 0 auto;
}
.text-col {
  flex: 1;
  min-width: 0;
}
.face-label {
  font-size: 13px;
  margin-bottom: 4px;
}
.face-preview {
  width: 144px;
  height: 144px;
  border: 1px solid var(--app-border, #ccc);
  cursor: pointer;
  image-rendering: pixelated;
}
.text-area :deep(textarea) {
  font-family: inherit;
}
.mid-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.mid-lab {
  font-size: 13px;
}
.ft {
  display: flex;
  align-items: center;
  width: 100%;
}
.ft-sp {
  flex: 1;
}
.preview-box {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid #333;
  background: #1a1a2e;
  color: #fff;
  min-height: 120px;
}
.preview-box.bg-1 {
  background: rgba(0, 0, 0, 0.55);
}
.preview-box.bg-2 {
  background: transparent;
  border-style: dashed;
  color: #222;
}
.preview-face {
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
}
.preview-name {
  font-weight: 600;
  margin-bottom: 4px;
}
.preview-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}
</style>
