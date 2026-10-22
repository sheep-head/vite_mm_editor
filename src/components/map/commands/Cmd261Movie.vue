<template>
  <el-dialog
    :model-value="modelValue"
    title="播放影像"
    width="400px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="movie-list" tabindex="0" @keydown="onKey">
      <div
        v-for="row in rows"
        :key="row.name || '__none'"
        class="movie-row"
        :class="{ active: selectedName === row.name }"
        @click="selectedName = row.name"
        @dblclick="ok">
        {{ row.label }}
      </div>
      <div v-if="loadError" class="movie-err">{{ loadError }}</div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'

const MOVIE_EXT = ['.webm', '.mp4', '.ogv', '.ogg', '.avi', '.mkv']

export default {
  name: 'Cmd261Movie',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      rows: [{ name: '', label: '(无)' }],
      selectedName: '',
      loadError: '',
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.selectedName = ((this.command && this.command.parameters) || [''])[0] || ''
        this.loadRows()
      },
    },
  },
  methods: {
    loadRows() {
      this.loadError = ''
      const out = [{ name: '', label: '(无)' }]
      try {
        if (!isNw || !fs || !path) {
          this.rows = out
          this.loadError = '仅 NW.js 可浏览 movies'
          return
        }
        const root = DataManager.$config && DataManager.$config.workSpace
        if (!root) {
          this.rows = out
          this.loadError = '未设置工作空间'
          return
        }
        const dir = path.join(root, 'movies')
        if (!fs.existsSync(dir)) {
          this.rows = out
          return
        }
        fs.readdirSync(dir).forEach((name) => {
          const ext = path.extname(name).toLowerCase()
          if (!MOVIE_EXT.includes(ext)) return
          const abs = path.join(dir, name)
          if (!fs.statSync(abs).isFile()) return
          const stem = path.basename(name, ext)
          out.push({ name: stem, label: stem })
        })
        out.sort((a, b) => {
          if (!a.name) return -1
          if (!b.name) return 1
          return a.name.localeCompare(b.name)
        })
      } catch (e) {
        console.error(e)
        this.loadError = '读取 movies 失败'
      }
      this.rows = out
      if (!this.rows.some((r) => r.name === this.selectedName)) {
        this.selectedName = ''
      }
    },
    onKey(e) {
      const i = this.rows.findIndex((r) => r.name === this.selectedName)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = this.rows[Math.min(this.rows.length - 1, Math.max(0, i) + 1)]
        if (next) this.selectedName = next.name
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = this.rows[Math.max(0, (i < 0 ? 0 : i) - 1)]
        if (prev) this.selectedName = prev.name
      } else if (e.key === 'Enter') {
        e.preventDefault()
        this.ok()
      }
    },
    ok() {
      this.$emit('confirm', [
        {
          code: 261,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.selectedName || ''],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.movie-list {
  height: 320px;
  overflow: auto;
  border: 1px solid var(--app-border, #c0c4cc);
  outline: none;
}
.movie-row {
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}
.movie-row:nth-child(even) {
  background: #f2f3f5;
}
.movie-row.active,
.movie-row.active:nth-child(even) {
  background: #2a5db0;
  color: #fff;
}
.movie-err {
  padding: 12px;
  color: #c00;
  font-size: 13px;
}
</style>
