<template>
  <el-dialog
    :model-value="modelValue"
    :title="titleText"
    width="720px"
    top="8vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="pic-picker">
      <aside v-if="showFolderPane" class="pic-folders">
        <div
          v-for="f in folders"
          :key="f"
          class="pic-row"
          :class="{ active: currentFolder === f }"
          @click="selectFolder(f)">
          {{ f }}/
        </div>
        <div v-if="!folders.length" class="pic-empty-hint">无目录</div>
      </aside>
      <div class="pic-files">
        <div
          v-for="row in fileRows"
          :key="row.name === '' ? '__none' : row.name"
          class="pic-row"
          :class="{ active: selectedName === row.name }"
          @click="selectFile(row)"
          @dblclick="confirm">
          {{ row.label }}
        </div>
        <div v-if="!fileRows.length" class="pic-empty-hint">无图片</div>
      </div>
      <div class="pic-preview">
        <div class="pic-preview-box">
          <img v-if="previewUrl" :src="previewUrl" alt="" @load="onPreviewLoad" />
          <span v-else class="pic-empty">{{ selectedName ? '加载失败' : '未选择' }}</span>
        </div>
        <div v-if="imageSizeText" class="pic-size">{{ imageSizeText }}</div>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
import { IMAGE_EXT, imageAbsPath, toFileUrl } from '@/utils/imgAssets'

export default {
  name: 'PictureNamePickerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    modelName: { type: String, default: '' },
    folder: { type: String, default: 'pictures' },
    dialogTitle: { type: String, default: '' },
    allowNone: { type: Boolean, default: false },
    /** 是否显示左侧目录栏（扫 img 子目录）；false 时只列 folder */
    showFolders: { type: Boolean, default: true },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      folders: [],
      currentFolder: '',
      fileRows: [],
      selectedName: '',
      previewUrl: '',
      imageSizeText: '',
    }
  },
  computed: {
    titleText() {
      return this.dialogTitle || '选择一个图像'
    },
    showFolderPane() {
      return this.showFolders && this.folders.length > 1
    },
    imgRoot() {
      if (!isNw || !fs || !path) return null
      const root = DataManager.$config && DataManager.$config.workSpace
      if (!root) return null
      return path.join(root, 'img')
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.boot()
      },
    },
  },
  methods: {
    boot() {
      this.selectedName = this.modelName || ''
      this.previewUrl = ''
      this.imageSizeText = ''
      this.loadFolders()
      const start = this.folder || this.folders[0] || 'pictures'
      this.currentFolder = this.folders.includes(start) ? start : this.folders[0] || start
      this.loadFiles()
      if (this.selectedName && !this.fileRows.some((r) => r.name === this.selectedName)) {
        // 当前名不在默认目录时，尝试在各目录中定位
        for (const f of this.folders) {
          if (this.fileExistsIn(f, this.selectedName)) {
            this.currentFolder = f
            this.loadFiles()
            break
          }
        }
      }
      this.refreshPreview()
    },
    loadFolders() {
      this.folders = []
      if (!this.imgRoot || !fs.existsSync(this.imgRoot)) {
        if (this.folder) this.folders = [this.folder]
        return
      }
      if (!this.showFolders) {
        this.folders = [this.folder || 'pictures']
        return
      }
      try {
        this.folders = fs
          .readdirSync(this.imgRoot)
          .filter((name) => {
            try {
              return fs.statSync(path.join(this.imgRoot, name)).isDirectory()
            } catch (e) {
              return false
            }
          })
          .sort((a, b) => a.localeCompare(b))
        if (this.folder && !this.folders.includes(this.folder)) {
          this.folders.unshift(this.folder)
        }
      } catch (e) {
        console.error(e)
        this.folders = this.folder ? [this.folder] : []
      }
    },
    fileExistsIn(folder, stem) {
      if (!stem || !this.imgRoot) return false
      return !!imageAbsPath(folder, stem)
    },
    loadFiles() {
      const out = []
      if (this.allowNone) out.push({ name: '', label: '(无)' })
      if (!this.imgRoot || !this.currentFolder) {
        this.fileRows = out
        return
      }
      const dir = path.join(this.imgRoot, this.currentFolder)
      try {
        if (!fs.existsSync(dir)) {
          this.fileRows = out
          return
        }
        fs.readdirSync(dir).forEach((name) => {
          const ext = path.extname(name).toLowerCase()
          if (!IMAGE_EXT.includes(ext)) return
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
      }
      this.fileRows = out
    },
    selectFolder(f) {
      this.currentFolder = f
      this.selectedName = this.allowNone ? '' : (this.fileRows[0] && this.fileRows[0].name) || ''
      this.loadFiles()
      if (!this.allowNone && this.fileRows.length) {
        const first = this.fileRows.find((r) => r.name) || this.fileRows[0]
        this.selectedName = first ? first.name : ''
      }
      this.refreshPreview()
    },
    selectFile(row) {
      this.selectedName = row ? row.name : ''
      this.refreshPreview()
    },
    refreshPreview() {
      this.previewUrl = ''
      this.imageSizeText = ''
      if (!this.selectedName) return
      const abs = imageAbsPath(this.currentFolder || this.folder || 'pictures', this.selectedName)
      if (!abs) return
      this.previewUrl = toFileUrl(abs) + '?t=' + Date.now()
    },
    onPreviewLoad(e) {
      const el = e && e.target
      this.imageSizeText = el ? `${el.naturalWidth} × ${el.naturalHeight}` : ''
    },
    confirm() {
      this.$emit('confirm', this.selectedName || '')
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.pic-picker {
  display: grid;
  grid-template-columns: 160px 180px minmax(0, 1fr);
  gap: 10px;
  height: 380px;
}
.pic-picker:has(.pic-folders:only-child),
.pic-picker.no-folders {
  grid-template-columns: 200px minmax(0, 1fr);
}
/* 无目录栏时两列：文件 | 预览 */
.pic-picker:not(:has(.pic-folders)) {
  grid-template-columns: 220px minmax(0, 1fr);
}
.pic-folders,
.pic-files {
  border: 1px solid var(--app-border, #dcdfe6);
  overflow: auto;
  background: #fff;
  min-width: 0;
}
.pic-row {
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pic-row:nth-child(even) {
  background: #f4f7fb;
}
.pic-row.active {
  background: #2a5db0 !important;
  color: #fff;
}
.pic-empty-hint {
  padding: 16px 8px;
  text-align: center;
  color: #909399;
  font-size: 12px;
}
.pic-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  border: 1px solid var(--app-border, #dcdfe6);
  background: #1a1d24;
  padding: 8px;
}
.pic-preview-box {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}
.pic-preview-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}
.pic-empty {
  color: #909399;
  font-size: 13px;
}
.pic-size {
  flex-shrink: 0;
  text-align: center;
  font-size: 12px;
  color: #c0c4cc;
  font-variant-numeric: tabular-nums;
}
</style>
