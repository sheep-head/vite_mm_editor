<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-input v-model="query" size="small" clearable placeholder="搜索文件名" class="picker-search" />
    <el-table
      :data="filtered"
      size="small"
      height="360"
      highlight-current-row
      @current-change="onCurrent"
      @row-dblclick="confirm">
      <el-table-column prop="name" label="文件名" min-width="200" show-overflow-tooltip />
    </el-table>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!selected" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'

const AUDIO_EXT = ['.ogg', '.m4a', '.mp3', '.wav']

export default {
  name: 'AudioFilePickerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    /** bgm | bgs | me | se */
    folder: { type: String, default: 'bgm' },
    modelName: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { query: '', rows: [], selected: null }
  },
  computed: {
    title() {
      return `选择音频 (${this.folder})`
    },
    filtered() {
      const q = (this.query || '').trim().toLowerCase()
      if (!q) return this.rows
      return this.rows.filter((r) => String(r.name || '').toLowerCase().includes(q))
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.query = ''
        this.loadRows()
        this.selected = this.rows.find((r) => r.name === this.modelName) || null
      },
    },
  },
  methods: {
    loadRows() {
      const out = []
      try {
        if (!isNw || !fs || !path) {
          this.rows = out
          return
        }
        const root = DataManager.$config && DataManager.$config.workSpace
        if (!root) {
          this.rows = out
          return
        }
        const dir = path.join(root, 'audio', this.folder)
        if (!fs.existsSync(dir)) {
          this.rows = out
          return
        }
        fs.readdirSync(dir).forEach((name) => {
          const ext = path.extname(name).toLowerCase()
          if (!AUDIO_EXT.includes(ext)) return
          const abs = path.join(dir, name)
          if (!fs.statSync(abs).isFile()) return
          out.push({ name: path.basename(name, ext) })
        })
        out.sort((a, b) => a.name.localeCompare(b.name))
      } catch (e) {
        console.error(e)
      }
      this.rows = out
    },
    onCurrent(row) {
      this.selected = row
    },
    confirm() {
      if (!this.selected) return
      this.$emit('confirm', this.selected.name)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.picker-search {
  margin-bottom: 8px;
}
</style>
