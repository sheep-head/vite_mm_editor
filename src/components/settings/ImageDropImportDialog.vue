<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="480px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-upload
      drag
      :auto-upload="false"
      :show-file-list="false"
      accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
      :on-change="onPick">
      <div class="drop-inner">
        <p>{{ fileName || '点击选择，或把图片拖到这里' }}</p>
        <p class="drop-sub">PNG / JPG / WebP / GIF / BMP</p>
      </div>
    </el-upload>
    <div v-if="previewUrl" class="preview">
      <img :src="previewUrl" alt="" />
    </div>
    <div class="op-row">
      <span>不透明度</span>
      <el-slider v-model="opacity" :min="0" :max="1" :step="0.05" style="flex: 1" />
      <span>{{ Math.round(opacity * 100) }}%</span>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!pickedPath" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { getDataPath } from '@/utils/appSettings'
import { fs, path, isNw } from '@/utils/nw'

export default {
  name: 'ImageDropImportDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '导入图片' },
    filePrefix: { type: String, default: 'skin' },
    modelOpacity: { type: Number, default: 1 },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      pickedPath: '',
      fileName: '',
      previewUrl: '',
      opacity: 1,
    }
  },
  watch: {
    modelValue(v) {
      if (!v) return
      this.pickedPath = ''
      this.fileName = ''
      this.previewUrl = ''
      this.opacity = typeof this.modelOpacity === 'number' ? this.modelOpacity : 1
    },
  },
  methods: {
    onPick(uploadFile) {
      const raw = uploadFile && uploadFile.raw
      const p = raw && raw.path
      if (!p) {
        ElMessage.error('无法读取文件路径（需在 NW.js 中使用）')
        return
      }
      this.pickedPath = p
      this.fileName = uploadFile.name || p
      this.previewUrl = 'file:///' + p.replace(/\\/g, '/')
    },
    confirm() {
      if (!isNw || !fs || !path) {
        ElMessage.warning('仅 NW.js 环境可导入')
        return
      }
      const dir = getDataPath()
      if (!dir || !this.pickedPath) return
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const ext = path.extname(this.pickedPath) || '.png'
        const name = `${this.filePrefix}-${Date.now()}${ext.toLowerCase()}`
        fs.copyFileSync(this.pickedPath, path.join(dir, name))
        this.$emit('confirm', { name, opacity: this.opacity })
        this.$emit('update:modelValue', false)
      } catch (e) {
        console.error(e)
        ElMessage.error('导入失败')
      }
    },
  },
}
</script>

<style scoped>
.drop-inner {
  padding: 12px 0;
  text-align: center;
}
.drop-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.preview {
  margin-top: 8px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 16px 16px;
}
.preview img {
  max-width: 100%;
  max-height: 120px;
}
.op-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 13px;
}
</style>
