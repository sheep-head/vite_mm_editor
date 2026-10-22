<template>
  <div class="image-asset-picker">
    <div class="picker-row">
      <el-input :model-value="displayPath" readonly placeholder="未选择图片" class="path-input" />
      <span v-if="currentSizeText" class="size-badge" title="当前图片尺寸">{{ currentSizeText }}</span>
      <el-button type="primary" @click="openBrowse">从 img 选择</el-button>
      <el-button @click="openImport">选择导入</el-button>
    </div>
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFilePicked" />

    <el-dialog v-model="browseVisible" title="选择图片（仅 img 目录）" width="640px" append-to-body>
      <div class="browse-body">
        <div class="folder-list">
          <div
            v-for="f in folders"
            :key="f"
            :class="['folder-item', currentFolder === f ? 'active' : '']"
            @click="selectFolder(f)">
            {{ f }}/
          </div>
          <div v-if="!folders.length" class="empty">img 下无子目录</div>
        </div>
        <div class="file-list">
          <div
            v-for="file in files"
            :key="file.name"
            :class="['file-item', selectedName === file.stem ? 'active' : '']"
            @click="onSelectBrowseFile(file)"
            @dblclick="confirmBrowse">
            <img v-if="file.preview" :src="file.preview" alt="" />
            <span>{{ file.name }}</span>
          </div>
          <div v-if="!files.length" class="empty">当前目录无图片</div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-size">{{ browseSizeText || ' ' }}</span>
        <el-button @click="browseVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedName" @click="confirmBrowse">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="importVisible"
      title="导入图片"
      width="420px"
      append-to-body
      @closed="onImportClosed">
      <div class="upload-box" @click="triggerImport">
        <div class="upload-icon">＋</div>
        <p>点击选择本地图片</p>
        <p class="upload-hint">或拖拽文件到窗口任意位置</p>
      </div>
    </el-dialog>

    <!-- 确认导入（预览新图） -->
    <el-dialog v-model="confirmVisible" title="确认导入" width="440px" append-to-body>
      <div class="confirm-import">
        <div class="preview-frame single">
          <img v-if="pendingNewUrl" :src="pendingNewUrl" alt="新图片" @load="onPendingNewLoad" />
        </div>
        <p v-if="pendingNewSizeText" class="size-line">尺寸 {{ pendingNewSizeText }}</p>
        <p class="confirm-path">将导入到 <code>img/{{ pendingDestRel }}</code></p>
      </div>
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button type="primary" @click="onConfirmImport">导入</el-button>
      </template>
    </el-dialog>

    <!-- 同名覆盖（左旧右新） -->
    <el-dialog v-model="overwriteVisible" title="同名确认" width="560px" append-to-body>
      <div class="overwrite-compare">
        <div class="preview-col">
          <div class="preview-label">当前（旧）</div>
          <div class="preview-frame">
            <img v-if="pendingOldUrl" :src="pendingOldUrl" alt="旧图片" @load="onPendingOldLoad" />
          </div>
          <p v-if="pendingOldSizeText" class="size-line">{{ pendingOldSizeText }}</p>
        </div>
        <div class="preview-arrow">
          <span class="arrow-text">覆盖后</span>
          <span class="arrow-symbol">→</span>
        </div>
        <div class="preview-col">
          <div class="preview-label">新图片</div>
          <div class="preview-frame">
            <img v-if="pendingNewUrl" :src="pendingNewUrl" alt="新图片" @load="onPendingNewLoad" />
          </div>
          <p v-if="pendingNewSizeText" class="size-line">{{ pendingNewSizeText }}</p>
        </div>
      </div>
      <p class="confirm-path">目标已存在 <code>img/{{ pendingDestRel }}</code>，是否覆盖？</p>
      <template #footer>
        <el-button @click="overwriteVisible = false">取消</el-button>
        <el-button type="warning" @click="onConfirmOverwrite">覆盖</el-button>
      </template>
    </el-dialog>

    <Teleport to="body">
      <div v-if="importVisible && windowDragging" class="drop-overlay">
        <div class="drop-overlay-inner">松开以导入图片</div>
      </div>
    </Teleport>
  </div>
</template>
<script>
import { ElMessage } from 'element-plus'
import { fs, path, config, isNw } from '@/utils/nw'
import { normalizeImagePath } from '@/utils/spiritDefaults'

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']

export default {
  name: 'ImageAssetPicker',
  props: {
    modelValue: { type: String, default: '' },
    lockFolder: { type: String, default: '' },
    importFolder: { type: String, default: 'pictures' },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      browseVisible: false,
      importVisible: false,
      confirmVisible: false,
      overwriteVisible: false,
      folders: [],
      currentFolder: '',
      files: [],
      selectedName: '',
      windowDragging: false,
      dragDepth: 0,
      pendingSrcPath: '',
      pendingDestPath: '',
      pendingDestRel: '',
      pendingStem: '',
      pendingDestFolder: '',
      pendingNewUrl: '',
      pendingOldUrl: '',
      currentSizeText: '',
      browseSizeText: '',
      pendingNewSizeText: '',
      pendingOldSizeText: '',
      _sizeToken: 0,
    }
  },
  computed: {
    displayPath() {
      const p = normalizeImagePath(this.modelValue)
      return p ? `img/${p}` : ''
    },
    imgRoot() {
      if (!config || !config.workSpace || !path) return null
      return path.join(config.workSpace, 'img')
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        this.refreshCurrentSize(v)
      },
    },
  },
  methods: {
    formatSize(w, h) {
      if (!w || !h) return ''
      return `${w} × ${h}`
    },
    probeImageSize(urlOrAbs) {
      return new Promise((resolve) => {
        if (!urlOrAbs) {
          resolve('')
          return
        }
        const img = new Image()
        img.onload = () => resolve(this.formatSize(img.naturalWidth, img.naturalHeight))
        img.onerror = () => resolve('')
        img.src = String(urlOrAbs).startsWith('file:') || String(urlOrAbs).startsWith('http')
          ? urlOrAbs
          : this.toFileUrl(urlOrAbs)
      })
    },
    resolveRelAbs(rel) {
      const clean = normalizeImagePath(rel)
      if (!clean || !this.imgRoot || !path) return ''
      const base = path.join(this.imgRoot, clean)
      if (fs && fs.existsSync(base)) return base
      for (const ext of IMAGE_EXT) {
        const p = base + ext
        if (fs && fs.existsSync(p)) return p
      }
      return ''
    },
    async refreshCurrentSize(rel) {
      const token = ++this._sizeToken
      const abs = this.resolveRelAbs(rel)
      if (!abs) {
        this.currentSizeText = ''
        return
      }
      const text = await this.probeImageSize(abs)
      if (token === this._sizeToken) this.currentSizeText = text
    },
    async refreshBrowseSize() {
      this.browseSizeText = ''
      if (!this.selectedName || !this.currentFolder) return
      const file = this.files.find((f) => f.stem === this.selectedName)
      if (!file) return
      const abs = path.join(this.imgRoot, this.currentFolder, file.name)
      const text = await this.probeImageSize(abs)
      if (this.selectedName === file.stem) {
        this.browseSizeText = text ? `尺寸 ${text}` : ''
      }
    },
    onSelectBrowseFile(file) {
      this.selectedName = file.stem
      this.refreshBrowseSize()
    },
    onPendingNewLoad(e) {
      const el = e && e.target
      this.pendingNewSizeText = el ? this.formatSize(el.naturalWidth, el.naturalHeight) : ''
    },
    onPendingOldLoad(e) {
      const el = e && e.target
      this.pendingOldSizeText = el ? this.formatSize(el.naturalWidth, el.naturalHeight) : ''
    },
    toFileUrl(abs) {
      const normalized = String(abs).replace(/\\/g, '/')
      // bust cache for overwrite preview of same path
      const url = /^[A-Za-z]:/.test(normalized) ? `file:///${normalized}` : `file://${normalized}`
      return `${url}?t=${Date.now()}`
    },
    parsePath(rel) {
      const clean = normalizeImagePath(rel)
      if (!clean) return { folder: this.lockFolder || 'pictures', stem: '' }
      const parts = clean.split('/').filter(Boolean)
      const stem = parts.pop() || ''
      const folder = parts.join('/') || (this.lockFolder || 'pictures')
      return { folder, stem }
    },
    openBrowse() {
      if (!isNw || !this.imgRoot || !fs.existsSync(this.imgRoot)) {
        ElMessage.error('无法访问工作空间 img 目录')
        return
      }
      this.folders = this.listImgFolders()
      const parsed = this.parsePath(this.modelValue)
      const start = this.lockFolder || parsed.folder || (this.folders[0] || '')
      this.currentFolder = start
      this.selectedName = parsed.stem
      this.browseSizeText = ''
      this.loadFiles()
      this.browseVisible = true
      this.$nextTick(() => this.refreshBrowseSize())
    },
    listImgFolders() {
      if (this.lockFolder) return [this.lockFolder]
      const root = this.imgRoot
      return fs.readdirSync(root).filter((name) => {
        try {
          return fs.statSync(path.join(root, name)).isDirectory()
        } catch (e) {
          return false
        }
      }).sort()
    },
    selectFolder(f) {
      this.currentFolder = f
      this.selectedName = ''
      this.browseSizeText = ''
      this.loadFiles()
    },
    loadFiles() {
      this.files = []
      if (!this.currentFolder) return
      const dir = path.join(this.imgRoot, this.currentFolder)
      if (!fs.existsSync(dir)) return
      const list = []
      fs.readdirSync(dir).forEach((name) => {
        const ext = path.extname(name).toLowerCase()
        if (!IMAGE_EXT.includes(ext)) return
        const abs = path.join(dir, name)
        if (!fs.statSync(abs).isFile()) return
        list.push({
          name,
          stem: path.basename(name, ext),
          preview: this.toFileUrl(abs),
        })
      })
      this.files = list.sort((a, b) => a.name.localeCompare(b.name))
    },
    confirmBrowse() {
      if (!this.selectedName) return
      this.$emit('update:modelValue', `${this.currentFolder}/${this.selectedName}`)
      this.browseVisible = false
    },
    openImport() {
      this.importVisible = true
      this.bindWindowDrag(true)
    },
    onImportClosed() {
      this.bindWindowDrag(false)
      this.windowDragging = false
      this.dragDepth = 0
    },
    bindWindowDrag(on) {
      const fn = on ? 'addEventListener' : 'removeEventListener'
      window[fn]('dragenter', this.onWinDragEnter)
      window[fn]('dragover', this.onWinDragOver)
      window[fn]('dragleave', this.onWinDragLeave)
      window[fn]('drop', this.onWinDrop)
    },
    onWinDragEnter(e) {
      e.preventDefault()
      this.dragDepth += 1
      this.windowDragging = true
    },
    onWinDragOver(e) {
      e.preventDefault()
    },
    onWinDragLeave(e) {
      e.preventDefault()
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (!this.dragDepth) this.windowDragging = false
    },
    onWinDrop(e) {
      e.preventDefault()
      this.windowDragging = false
      this.dragDepth = 0
      if (!this.importVisible) return
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
      if (!file || !file.path) {
        ElMessage.error('无法获取拖入路径')
        return
      }
      this.importFromPath(file.path)
    },
    triggerImport() {
      this.$refs.fileInput.click()
    },
    onFilePicked(e) {
      const file = e.target.files && e.target.files[0]
      e.target.value = ''
      if (!file || !file.path) {
        ElMessage.error('请在 NW.js 中选择本地文件')
        return
      }
      this.importFromPath(file.path)
    },
    importFromPath(srcPath) {
      if (!isNw || !this.imgRoot) {
        ElMessage.error('无法导入：非 NW.js 或未设置工作空间')
        return
      }
      const base = path.basename(srcPath)
      const ext = path.extname(base).toLowerCase()
      if (!IMAGE_EXT.includes(ext)) {
        ElMessage.error('请选择图片文件')
        return
      }
      const destFolder = this.lockFolder || this.importFolder || 'pictures'
      const destDir = path.join(this.imgRoot, destFolder)
      const destPath = path.join(destDir, base)
      const stem = path.basename(base, ext)
      this.pendingSrcPath = srcPath
      this.pendingDestPath = destPath
      this.pendingDestFolder = destFolder
      this.pendingStem = stem
      this.pendingDestRel = `${destFolder}/${base}`
      this.pendingNewUrl = this.toFileUrl(srcPath)
      this.pendingOldUrl = ''
      this.pendingNewSizeText = ''
      this.pendingOldSizeText = ''
      this.confirmVisible = true
    },
    onConfirmImport() {
      this.confirmVisible = false
      const destDir = path.dirname(this.pendingDestPath)
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }
      if (fs.existsSync(this.pendingDestPath)) {
        this.pendingOldUrl = this.toFileUrl(this.pendingDestPath)
        this.pendingOldSizeText = ''
        this.overwriteVisible = true
        return
      }
      this.doCopy()
    },
    onConfirmOverwrite() {
      this.overwriteVisible = false
      this.doCopy()
    },
    doCopy() {
      try {
        fs.copyFileSync(this.pendingSrcPath, this.pendingDestPath)
        this.$emit('update:modelValue', `${this.pendingDestFolder}/${this.pendingStem}`)
        this.importVisible = false
        ElMessage.success('导入成功')
      } catch (err) {
        console.log(err)
        ElMessage.error('导入失败')
      }
    },
  },
  beforeUnmount() {
    this.bindWindowDrag(false)
  },
}
</script>
<style scoped>
.picker-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.path-input {
  flex: 1;
}
.size-badge {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--app-text-muted, #909399);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.dialog-size {
  flex: 1;
  text-align: left;
  font-size: 12px;
  color: var(--app-text-muted, #909399);
  font-variant-numeric: tabular-nums;
}
.size-line {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--app-text-muted, #909399);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.browse-body {
  display: flex;
  height: 360px;
  gap: 12px;
}
.folder-list {
  width: 140px;
  overflow: auto;
  border-right: 1px solid var(--app-border, #dcdfe6);
  padding-right: 8px;
}
.folder-item {
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
}
.folder-item.active,
.folder-item:hover {
  background: var(--app-hover-bg, #ecf5ff);
}
.file-list {
  flex: 1;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  align-content: start;
}
.file-item {
  border: 1px solid var(--app-border, #dcdfe6);
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  text-align: center;
  font-size: 12px;
}
.file-item.active {
  border-color: var(--app-active-color, #409eff);
}
.file-item img {
  display: block;
  max-width: 100%;
  max-height: 64px;
  margin: 0 auto 4px;
  object-fit: contain;
  image-rendering: pixelated;
}
.empty {
  color: var(--app-text-muted, #909399);
  font-size: 13px;
  padding: 12px;
}
.upload-box {
  border: 1px dashed var(--app-border, #dcdfe6);
  border-radius: 10px;
  padding: 36px 16px;
  text-align: center;
  cursor: pointer;
  background: var(--app-surface-2, #f7f8fb);
  color: var(--app-text-muted, #909399);
}
.upload-box:hover {
  border-color: var(--app-active-color, #409eff);
  color: var(--app-active-color, #409eff);
}
.upload-icon {
  font-size: 32px;
  line-height: 1;
  margin-bottom: 8px;
}
.upload-hint {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.85;
}
.drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.drop-overlay-inner {
  border: 2px dashed #fff;
  border-radius: 16px;
  padding: 48px 64px;
  color: #fff;
  font-size: 20px;
  background: rgba(0, 0, 0, 0.25);
}
.confirm-import {
  text-align: center;
}
.preview-frame {
  background: #1a1d24;
  border: 1px solid var(--app-border, #414243);
  border-radius: 8px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}
.preview-frame.single {
  max-width: 280px;
  margin: 0 auto 12px;
}
.preview-frame img {
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
  image-rendering: pixelated;
}
.confirm-path {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--app-text-muted, #909399);
  text-align: center;
}
.confirm-path code {
  font-size: 12px;
  word-break: break-all;
}
.overwrite-compare {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.preview-col {
  flex: 1;
  min-width: 0;
}
.preview-label {
  font-size: 12px;
  color: var(--app-text-muted, #909399);
  margin-bottom: 6px;
  text-align: center;
}
.preview-arrow {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  color: var(--app-active-color, #409eff);
}
.arrow-text {
  font-size: 12px;
  white-space: nowrap;
}
.arrow-symbol {
  font-size: 22px;
  line-height: 1;
  font-weight: 600;
}
:deep(.el-dialog__footer) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>
