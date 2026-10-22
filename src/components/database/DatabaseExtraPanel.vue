<template>
  <div class="db-extra">
    <aside class="db-extra-nav">
      <button
        v-for="m in modules"
        :key="m.id"
        type="button"
        class="db-extra-nav-item"
        :class="{ on: activeId === m.id }"
        @click="selectModule(m.id)">
        {{ m.label }}
      </button>
    </aside>
    <div class="db-extra-body">
      <component
        :is="activeComp"
        :key="panelKey"
        ref="panel"
        class="db-extra-panel"
        @dirty-change="onPanelDirty" />
    </div>
  </div>
</template>

<script>
import FaxPanel from './extra/fax/Fax.vue'
import TownFaxPanel from './extra/fax/TownFax.vue'
import CavePanel from './extra/fax/Cave.vue'
import MapPanel from './extra/fax/Map.vue'
import ConfigPanel from './extra/fax/Config.vue'
import TankDataPanel from './extra/tank/TankData.vue'
import TankShellPanel from './extra/tank/TankShell.vue'
import SpiritPanel from './extra/spirit/SpiritCompanion.vue'

const MODULES = [
  { id: 'fax', label: '传真', comp: 'FaxPanel' },
  { id: 'townFax', label: '城镇时空机', comp: 'TownFaxPanel' },
  { id: 'cave', label: '洞穴设定', comp: 'CavePanel' },
  { id: 'map', label: '地图设定', comp: 'MapPanel' },
  { id: 'config', label: '小地图设定', comp: 'ConfigPanel' },
  { id: 'tank', label: '战车数据', comp: 'TankDataPanel' },
  { id: 'shell', label: '战车炮弹', comp: 'TankShellPanel' },
  { id: 'spirit', label: '精灵伴游', comp: 'SpiritPanel' },
]

export default {
  name: 'DatabaseExtraPanel',
  components: {
    FaxPanel,
    TownFaxPanel,
    CavePanel,
    MapPanel,
    ConfigPanel,
    TankDataPanel,
    TankShellPanel,
    SpiritPanel,
  },
  emits: ['dirty-change'],
  data() {
    return {
      modules: MODULES,
      activeId: 'fax',
      panelKey: 0,
      dirty: false,
    }
  },
  computed: {
    activeComp() {
      const m = this.modules.find((x) => x.id === this.activeId)
      return (m && m.comp) || 'FaxPanel'
    },
  },
  methods: {
    onPanelDirty(v) {
      this.dirty = !!v
      this.$emit('dirty-change', this.dirty)
    },
    async selectModule(id) {
      if (id === this.activeId) return
      if (this.dirty) {
        try {
          await this.$confirm('当前扩展模块有未保存更改，切换将丢失未保存内容。是否继续？', '提示', {
            type: 'warning',
            confirmButtonText: '继续切换',
            cancelButtonText: '取消',
          })
        } catch (e) {
          return
        }
      }
      this.activeId = id
      this.panelKey += 1
      this.dirty = false
      this.$emit('dirty-change', false)
    },
    save() {
      const p = this.$refs.panel
      if (p && typeof p.$onSave === 'function') {
        p.$onSave()
      } else if (p && typeof p.save === 'function') {
        p.save()
      }
      this.$nextTick(() => {
        this.dirty = !!(p && p.changed)
        this.$emit('dirty-change', this.dirty)
      })
    },
    reload() {
      this.panelKey += 1
      this.dirty = false
      this.$emit('dirty-change', false)
    },
    isDirty() {
      return this.dirty
    },
  },
}
</script>

<style scoped>
.db-extra {
  display: flex;
  height: 100%;
  min-height: 0;
  background: rgba(255, 255, 255, 0.92);
}
.db-extra-nav {
  width: 132px;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
  padding: 6px 0;
  background: #fafafa;
}
.db-extra-nav-item {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 8px 12px;
  font-size: 13px;
  color: #303133;
  cursor: pointer;
}
.db-extra-nav-item:hover {
  background: #ecf5ff;
}
.db-extra-nav-item.on {
  background: #409eff;
  color: #fff;
}
.db-extra-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}
.db-extra-panel {
  height: 100%;
  min-height: 0;
  overflow: auto;
}
.db-extra-body :deep(.full-height),
.db-extra-body :deep(.spirit-page) {
  height: 100%;
  min-height: 0;
}
.db-extra-body :deep(.el-container.full-height) {
  height: 100%;
}
</style>
