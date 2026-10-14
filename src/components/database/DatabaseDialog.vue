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
          <database-system-panel
            v-if="tab.kind === 'system' && activeTab === tab.name"
            :ref="(el) => setPanelRef(tab.name, el)"
            @dirty-change="(d) => onDirty(tab.name, d)" />
          <database-array-panel
            v-else-if="tab.kind !== 'system' && activeTab === tab.name"
            :ref="(el) => setPanelRef(tab.name, el)"
            :file-name="tab.fileName"
            :fields="tab.fields"
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
import DatabaseArrayPanel from './DatabaseArrayPanel.vue'
import DatabaseSystemPanel from './DatabaseSystemPanel.vue'
import { DATABASE_TABS } from './dbFieldPresets'

export default {
  name: 'DatabaseDialog',
  components: { DatabaseArrayPanel, DatabaseSystemPanel },
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
    }
  },
  computed: {
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
    async beforeLeaveTab(activeName, oldName) {
      if (!oldName || !this.dirtyMap[oldName]) return true
      try {
        await this.$confirm('当前页有未保存更改，切换将丢失未保存内容。是否继续？', '提示', {
          type: 'warning',
          confirmButtonText: '继续切换',
          cancelButtonText: '取消',
        })
        const panel = this.panelRefs[oldName]
        if (panel && typeof panel.reload === 'function') panel.reload()
        this.dirtyMap = { ...this.dirtyMap, [oldName]: false }
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
      this.$emit('update:modelValue', true)
    },
  },
}
</script>

<style scoped>
.db-dialog-body {
  height: min(78vh, 720px);
  min-height: 420px;
}
.db-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
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
