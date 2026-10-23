<template>
  <el-dialog
    :model-value="modelValue"
    title="数据库"
    width="92%"
    top="4vh"
    class="db-dialog"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="onVisibleChange"
    @opened="onDialogOpened">
    <div class="db-dialog-body" :style="bodyStyle">
      <div class="db-dialog-main">
        <div v-if="dbSkinUrl" class="db-skin" :style="dbSkinStyle" />
        <el-tabs
          v-model="activeTab"
          type="card"
          class="db-tabs"
          :before-leave="beforeLeaveTab">
          <el-tab-pane
            v-for="tab in tabs"
            :key="tab.name"
            :label="tabLabel(tab)"
            :name="tab.name"
            lazy>
            <system-section-panel
              v-if="tab.kind === 'system' && activeTab === tab.name"
              :ref="(el) => setPanelRef(tab.name, el)"
              :section="tab.section" />
            <database-extra-panel
              v-else-if="tab.kind === 'extra' && activeTab === tab.name"
              :ref="(el) => setPanelRef(tab.name, el)"
              @dirty-change="(d) => onDirty(tab.name, d)" />
            <database-array-panel
              v-else-if="tab.kind !== 'system' && tab.kind !== 'extra' && activeTab === tab.name"
              :ref="(el) => setPanelRef(tab.name, el)"
              :file-name="tab.fileName"
              :fields="tab.fields"
              :editor="tab.editor || ''"
              @dirty-change="(d) => onDirty(tab.name, d)" />
          </el-tab-pane>
        </el-tabs>
      </div>
      <div
        class="db-resize-s"
        title="拖拽调整高度"
        @pointerdown="onResizeStart" />
    </div>
    <template #footer>
      <div class="db-footer">
        <span class="db-dirty" v-if="currentDirty">未保存更改</span>
        <span class="db-dirty-spacer" v-else />
        <el-button @click="reloadCurrent">重新加载</el-button>
        <el-button type="primary" @click="saveCurrent">保存当前页</el-button>
        <el-button @click="requestClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { mapGetters } from 'vuex'
import DatabaseArrayPanel from './DatabaseArrayPanel.vue'
import DatabaseExtraPanel from './DatabaseExtraPanel.vue'
import SystemSectionPanel from './SystemSectionPanel.vue'
import { DATABASE_TABS } from './dbFieldPresets'
import { SYSTEM_TAB_NAMES, systemState, resetSystemSession } from './shared/systemSession'
import { getMapBgSkinPath } from '@/utils/appSettings'
import { fs } from '@/utils/nw'

const MIN_BODY_H = 360
/** 标题栏 + 边距 + footer 大约占用 */
const CHROME_RESERVE = 150

function defaultBodyHeight(maxH) {
  const vh = window.innerHeight || 800
  return Math.max(MIN_BODY_H, Math.min(Math.round(vh * 0.78), 720, maxH))
}

export default {
  name: 'DatabaseDialog',
  components: { DatabaseArrayPanel, DatabaseExtraPanel, SystemSectionPanel },
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      tabs: DATABASE_TABS,
      activeTab: 'Actors',
      dirtyMap: {},
      panelRefs: {},
      switching: false,
      systemBridge: systemState,
      bodyHeight: 0,
      _resize: null,
      _viewportKey: '',
    }
  },
  computed: {
    ...mapGetters(['editorUi']),
    dbSkinUrl() {
      const name = this.editorUi && this.editorUi.dbBgSkin
      if (!name || !fs) return ''
      const p = getMapBgSkinPath(name)
      if (!p || !fs.existsSync(p)) return ''
      return 'file:///' + String(p).replace(/\\/g, '/') + '?t=' + encodeURIComponent(name)
    },
    dbSkinStyle() {
      const op = this.editorUi && typeof this.editorUi.dbBgSkinOpacity === 'number'
        ? this.editorUi.dbBgSkinOpacity
        : 1
      return {
        backgroundImage: `url("${this.dbSkinUrl}")`,
        opacity: op,
      }
    },
    currentDirty() {
      return !!this.dirtyMap[this.activeTab]
    },
    bodyStyle() {
      const h = this.bodyHeight || MIN_BODY_H
      return {
        height: h + 'px',
        minHeight: MIN_BODY_H + 'px',
      }
    },
  },
  mounted() {
    this.syncBodyHeight(false)
    this._onWinResize = () => this.onViewportChange()
    window.addEventListener('resize', this._onWinResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this._onWinResize)
    this.detachResizeListeners()
  },
  methods: {
    maxBodyHeight() {
      const vh = window.innerHeight || 800
      const vw = window.innerWidth || 1200
      const top = Math.round(vh * 0.04)
      // 窄屏再多留一点，避免贴边溢出
      const sidePad = vw < 900 ? 24 : 8
      return Math.max(MIN_BODY_H, vh - top - CHROME_RESERVE - sidePad)
    },
    /** 保存偏好钳制到当前视口可用范围；无偏好则用默认自适应高度 */
    preferredBodyHeight() {
      const saved = this.editorUi && Number(this.editorUi.dbDialogHeight)
      const maxH = this.maxBodyHeight()
      if (Number.isFinite(saved) && saved > 0) {
        return Math.max(MIN_BODY_H, Math.min(Math.round(saved), maxH))
      }
      return defaultBodyHeight(maxH)
    },
    syncBodyHeight(persistClamp) {
      const next = this.preferredBodyHeight()
      this.bodyHeight = next
      this._viewportKey = `${window.innerWidth}x${window.innerHeight}`
      if (persistClamp) this.persistIfClamped(next)
    },
    /** 视口变小导致显示高度被钳制时，把偏好改成当前可用高度（自适应修正） */
    persistIfClamped(effectiveH) {
      const saved = this.editorUi && Number(this.editorUi.dbDialogHeight)
      if (!Number.isFinite(saved) || saved <= 0) return
      if (effectiveH < saved) {
        this.$store.dispatch('updateEditorUi', { dbDialogHeight: effectiveH })
      }
    },
    onDialogOpened() {
      this.syncBodyHeight(false)
    },
    onViewportChange() {
      const key = `${window.innerWidth}x${window.innerHeight}`
      const maxH = this.maxBodyHeight()
      if (key === this._viewportKey) {
        if (this.bodyHeight > maxH) {
          this.bodyHeight = maxH
          this.persistIfClamped(maxH)
        }
        return
      }
      this._viewportKey = key
      // 屏幕宽高变化：按偏好重算并钳制；若超出则写回自适应后的高度
      const next = this.preferredBodyHeight()
      this.bodyHeight = next
      this.persistIfClamped(next)
    },
    onResizeStart(e) {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      this._resize = {
        startY: e.clientY,
        startH: this.bodyHeight || this.preferredBodyHeight(),
      }
      document.body.classList.add('db-dialog-resizing')
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId)
      } catch (err) {
        /* ignore */
      }
      window.addEventListener('pointermove', this.onResizeMove)
      window.addEventListener('pointerup', this.onResizeEnd)
      window.addEventListener('pointercancel', this.onResizeEnd)
    },
    onResizeMove(e) {
      if (!this._resize) return
      const dy = e.clientY - this._resize.startY
      const maxH = this.maxBodyHeight()
      this.bodyHeight = Math.max(MIN_BODY_H, Math.min(this._resize.startH + dy, maxH))
    },
    onResizeEnd() {
      if (!this._resize) return
      this._resize = null
      this.detachResizeListeners()
      document.body.classList.remove('db-dialog-resizing')
      const h = Math.round(this.bodyHeight)
      this.bodyHeight = h
      this.$store.dispatch('updateEditorUi', { dbDialogHeight: h })
    },
    detachResizeListeners() {
      window.removeEventListener('pointermove', this.onResizeMove)
      window.removeEventListener('pointerup', this.onResizeEnd)
      window.removeEventListener('pointercancel', this.onResizeEnd)
      document.body.classList.remove('db-dialog-resizing')
    },
    tabLabel(tab) {
      const mark = this.dirtyMap[tab.name] ? ' *' : ''
      return tab.label + mark
    },
    setPanelRef(name, el) {
      if (el) this.panelRefs[name] = el
      else delete this.panelRefs[name]
    },
    onDirty(name, dirty) {
      this.dirtyMap = { ...this.dirtyMap, [name]: dirty }
    },
    currentPanel() {
      return this.panelRefs[this.activeTab]
    },
    async confirmLeaveDirty() {
      if (!this.currentDirty) return true
      try {
        await this.$confirm('当前页有未保存更改，是否放弃？', '提示', {
          type: 'warning',
          confirmButtonText: '放弃',
          cancelButtonText: '取消',
        })
        return true
      } catch (e) {
        return false
      }
    },
    isSystemTab(name) {
      return SYSTEM_TAB_NAMES.includes(name)
    },
    async beforeLeaveTab(activeName, oldName) {
      if (this.isSystemTab(activeName) && this.isSystemTab(oldName)) return true
      if (!oldName || !this.dirtyMap[oldName]) return true
      try {
        await this.$confirm('当前页有未保存更改，切换将丢失未保存内容。是否继续？', '提示', {
          type: 'warning',
          confirmButtonText: '继续切换',
          cancelButtonText: '取消',
        })
        if (this.isSystemTab(oldName)) {
          resetSystemSession()
          const patch = {}
          SYSTEM_TAB_NAMES.forEach((n) => {
            patch[n] = false
          })
          this.dirtyMap = { ...this.dirtyMap, ...patch }
        } else {
          const panel = this.panelRefs[oldName]
          if (panel && typeof panel.reload === 'function') panel.reload()
          this.dirtyMap = { ...this.dirtyMap, [oldName]: false }
        }
        return true
      } catch (e) {
        return false
      }
    },
    saveCurrent() {
      const panel = this.currentPanel()
      if (panel && typeof panel.save === 'function') {
        panel.save()
      }
    },
    reloadCurrent() {
      const panel = this.currentPanel()
      if (panel && typeof panel.reload === 'function') {
        panel.reload()
      }
    },
    async requestClose() {
      const ok = await this.confirmLeaveDirty()
      if (!ok) return
      this.$emit('update:modelValue', false)
    },
    async onVisibleChange(v) {
      if (!v) {
        const ok = await this.confirmLeaveDirty()
        if (!ok) return
        this.$emit('update:modelValue', false)
        return
      }
      resetSystemSession()
      this.$emit('update:modelValue', true)
    },
  },
  watch: {
    modelValue(v) {
      if (v) this.$nextTick(() => this.syncBodyHeight(false))
    },
    'systemBridge.dirty'(d) {
      const patch = {}
      SYSTEM_TAB_NAMES.forEach((n) => {
        patch[n] = !!d
      })
      this.dirtyMap = { ...this.dirtyMap, ...patch }
    },
  },
}
</script>

<style scoped>
.db-dialog-body {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}
.db-dialog-main {
  flex: 1;
  min-height: 0;
  position: relative;
}
.db-skin {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  pointer-events: none;
  z-index: 0;
}
.db-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}
.db-tabs :deep(.el-tabs__header) {
  flex-shrink: 0;
  margin-bottom: 0;
}
.db-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.db-tabs :deep(.el-tab-pane) {
  height: 100%;
}
.db-resize-s {
  flex-shrink: 0;
  height: 16px;
  cursor: ns-resize;
  position: relative;
  z-index: 5;
  touch-action: none;
  user-select: none;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.08));
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
.db-resize-s::before,
.db-resize-s::after {
  content: '';
  position: absolute;
  left: 50%;
  width: 48px;
  height: 3px;
  margin-left: -24px;
  border-radius: 2px;
  background: rgba(100, 100, 100, 0.55);
  transition: background 0.15s ease;
}
.db-resize-s::before {
  top: 4px;
}
.db-resize-s::after {
  top: 9px;
}
.db-resize-s:hover {
  background: linear-gradient(to bottom, rgba(64, 158, 255, 0.08), rgba(64, 158, 255, 0.16));
}
.db-resize-s:hover::before,
.db-resize-s:hover::after {
  background: rgba(64, 158, 255, 0.85);
}
.db-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.db-dirty {
  color: #e6a23c;
  font-size: 13px;
  margin-right: auto;
}
.db-dirty-spacer {
  margin-right: auto;
}
</style>

<style>
/* 拖拽改高时禁止选中文字 */
body.db-dialog-resizing {
  cursor: ns-resize !important;
  user-select: none !important;
}
</style>
