<template>
  <div
    class="workspace-page"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop">
    <div class="workspace-card">
      <h1>选择工作空间</h1>
      <p class="hint">请选择 RPG Maker MZ 游戏工程根目录（需包含 audio、js、img、index.html）</p>
      <p v-if="currentPath" class="current">当前：{{ currentPath }}</p>
      <div class="actions">
        <el-button type="primary" size="large" @click="pickFolder">选择文件夹</el-button>
        <el-button v-if="canCancel" size="large" @click="cancelChange">取消</el-button>
      </div>
      <p class="drag-tip">或将文件夹拖拽到此窗口</p>
    </div>

    <div v-show="dragging" class="drop-mask">
      <div class="drop-mask-inner">
        <div class="drop-title">松开以选择工作空间</div>
        <div class="drop-sub">将校验 audio / js / img / index.html</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ElMessage } from 'element-plus'
import { isNw, path as nwPath, fs as nwFs } from '@/utils/nw'
import { applyWorkspace, getCurrentWorkspace, hasValidWorkspace } from '@/utils/appSettings'
import { reloadStoreData } from '@/store'

export default {
  name: 'WorkspaceSelect',
  data() {
    return {
      dragging: false,
      dragDepth: 0,
      currentPath: getCurrentWorkspace() || '',
    }
  },
  computed: {
    canCancel() {
      return this.$route.query.change === '1' && hasValidWorkspace()
    }
  },
  methods: {
    cancelChange() {
      this.$router.replace('/base/Items').catch(() => true)
    },
    onDragEnter() {
      this.dragDepth += 1
      this.dragging = true
    },
    onDragOver() {
      this.dragging = true
    },
    onDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (this.dragDepth === 0) {
        this.dragging = false
      }
    },
    resolveDropPath(e) {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
      if (!file || !file.path) return null
      let dirPath = file.path
      try {
        if (nwFs && nwPath && nwFs.existsSync(dirPath) && nwFs.statSync(dirPath).isFile()) {
          dirPath = nwPath.dirname(dirPath)
        }
      } catch (err) {
        /* ignore */
      }
      return dirPath
    },
    onDrop(e) {
      this.dragging = false
      this.dragDepth = 0
      const dirPath = this.resolveDropPath(e)
      if (!dirPath) {
        ElMessage.error('无法获取拖入路径，请改用「选择文件夹」')
        return
      }
      this.commitWorkspace(dirPath)
    },
    pickFolder() {
      if (!isNw) {
        ElMessage.error('请在 NW.js 中运行以选择本地文件夹')
        return
      }
      try {
        const input = document.createElement('input')
        input.type = 'file'
        input.setAttribute('nwdirectory', '')
        input.style.display = 'none'
        document.body.appendChild(input)
        input.addEventListener('change', () => {
          const file = input.files && input.files[0]
          const dirPath = file && file.path
          if (input.parentNode) {
            document.body.removeChild(input)
          }
          if (dirPath) {
            this.commitWorkspace(dirPath)
          }
        })
        input.click()
      } catch (err) {
        console.log(err)
        ElMessage.error('打开文件夹选择器失败')
      }
    },
    commitWorkspace(dirPath) {
      const result = applyWorkspace(dirPath)
      if (!result.ok) {
        const miss = (result.missing || []).join('、')
        ElMessage.error(miss ? `不是合法工作空间，缺少：${miss}` : '不是合法工作空间')
        return
      }
      this.currentPath = result.workSpace
      reloadStoreData()
      ElMessage.success('工作空间已设置')
      // 换工程后整页重载，清空 keep-alive 脏状态，避免 deactivate / 数据串台
      window.location.hash = '#/base/Items'
      window.location.reload()
    },
  },
}
</script>

<style scoped>
.workspace-page {
  position: relative;
  height: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-bg);
  color: var(--app-text);
  box-sizing: border-box;
  padding: 24px;
}

.workspace-card {
  width: min(520px, 100%);
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--app-shadow-soft);
  padding: 36px 32px;
  text-align: center;
}

.workspace-card h1 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
}

.hint {
  margin: 0 0 16px;
  color: var(--app-text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.current {
  margin: 0 0 20px;
  font-size: 13px;
  word-break: break-all;
  color: var(--app-active-color);
}

.actions {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.drag-tip {
  margin: 0;
  font-size: 13px;
  color: var(--app-text-muted);
}

.drop-mask {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: rgba(15, 17, 21, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-mask-inner {
  border: 2px dashed rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  padding: 48px 64px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  text-align: center;
}

.drop-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 10px;
}

.drop-sub {
  font-size: 14px;
  opacity: 0.85;
}
</style>
