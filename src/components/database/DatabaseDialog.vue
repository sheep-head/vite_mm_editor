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
    @update:model-value="onVisibleChange">
    <div class="db-dialog-body">
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
          <database-array-panel
            v-else-if="tab.kind !== 'system' && activeTab === tab.name"
            :ref="(el) => setPanelRef(tab.name, el)"
            :file-name="tab.fileName"
            :fields="tab.fields"
            :editor="tab.editor || ''"
            @dirty-change="(d) => onDirty(tab.name, d)" />
        </el-tab-pane>
      </el-tabs>
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
import SystemSectionPanel from './SystemSectionPanel.vue'
import { DATABASE_TABS } from './dbFieldPresets'
import { SYSTEM_TAB_NAMES, systemState, resetSystemSession } from './shared/systemSession'
import { getMapBgSkinPath } from '@/utils/appSettings'
import { fs } from '@/utils/nw'

export default {
  name: 'DatabaseDialog',
  components: { DatabaseArrayPanel, SystemSectionPanel },
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
  },
  methods: {
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
  height: min(78vh, 720px);
  min-height: 420px;
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
