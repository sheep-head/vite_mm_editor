<template>
  <el-dialog
    :model-value="modelValue"
    title="指定场所"
    width="92vw"
    top="2vh"
    class="map-preview-dlg"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="md">
      <aside class="md-list">
        <el-input v-model="query" size="small" clearable placeholder="筛选地图" />
        <div ref="rows" class="md-rows">
          <div
            v-for="row in visibleRows"
            :key="row.id"
            class="md-row"
            :class="{ on: localMapId === row.id }"
            :data-map-id="row.id"
            :style="{ paddingLeft: 6 + row.depth * 14 + 'px' }"
            @click="selectMap(row.id)">
            <span
              class="twist"
              @click.stop="row.hasChildren && toggle(row.id)">
              {{ row.hasChildren ? (row.open ? '▼' : '▶') : '' }}
            </span>
            <span class="id">{{ String(row.id).padStart(3, '0') }}</span>
            <span class="name">{{ row.name || '' }}</span>
          </div>
        </div>
      </aside>
      <div class="md-preview">
        <div class="md-bar">
          <span>地图 {{ localMapId }} · ({{ localX }}, {{ localY }})</span>
          <el-checkbox v-model="showEvents" size="small">显示事件</el-checkbox>
        </div>
        <div class="md-preview-body">
          <map-preview-canvas
            ref="preview"
            :map-id="localMapId"
            :selected-x="localX"
            :selected-y="localY"
            :show-events="showEvents"
            @pick="onPick" />
        </div>
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
import MapPreviewCanvas from './MapPreviewCanvas.vue'

export default {
  name: 'MapDesignationDialog',
  components: { MapPreviewCanvas },
  props: {
    modelValue: { type: Boolean, default: false },
    mapId: { type: Number, default: 1 },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      query: '',
      tree: [],
      infos: [],
      expanded: {},
      localMapId: 1,
      localX: 0,
      localY: 0,
      showEvents: true,
    }
  },
  computed: {
    visibleRows() {
      const q = (this.query || '').trim().toLowerCase()
      const out = []
      const matchNode = (node) => {
        if (String(node.id).includes(q) || String(node.name || '').toLowerCase().includes(q)) return true
        return (node.children || []).some(matchNode)
      }
      const walk = (nodes, depth, parentOpen) => {
        if (!parentOpen) return
        nodes.forEach((node) => {
          if (q && !matchNode(node)) return
          const hasChildren = !!(node.children && node.children.length)
          const open = q ? true : !!this.expanded[node.id]
          out.push({
            id: node.id,
            name: node.name || '',
            depth,
            hasChildren,
            open,
          })
          if (hasChildren && open) walk(node.children, depth + 1, true)
        })
      }
      walk(this.tree, 0, true)
      return out
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.localMapId = this.mapId || 1
        this.localX = Math.max(0, this.x || 0)
        this.localY = Math.max(0, this.y || 0)
        this.loadMaps()
      },
    },
  },
  methods: {
    loadMaps() {
      let infos = []
      try {
        infos = DataManager.$loadDataSync('MapInfos', false, false) || []
      } catch (e) {
        infos = []
      }
      this.infos = infos
      const byParent = new Map()
      infos.forEach((m) => {
        if (!m || !m.id) return
        const pid = m.parentId || 0
        if (!byParent.has(pid)) byParent.set(pid, [])
        byParent.get(pid).push(m)
      })
      byParent.forEach((arr) => {
        arr.sort((a, b) => (a.order || 0) - (b.order || 0) || a.id - b.id)
      })
      const walk = (parentId) =>
        (byParent.get(parentId) || []).map((m) => ({
          id: m.id,
          name: m.name || '',
          children: walk(m.id),
        }))
      this.tree = walk(0)
      const expanded = {}
      infos.forEach((m) => {
        if (m && m.id && m.expanded) expanded[m.id] = true
      })
      let cur = infos[this.localMapId]
      const guard = new Set()
      while (cur && cur.parentId && !guard.has(cur.id)) {
        guard.add(cur.id)
        expanded[cur.parentId] = true
        cur = infos[cur.parentId]
      }
      this.expanded = expanded
      this.$nextTick(() => this.scrollToSelected())
    },
    scrollToSelected() {
      const box = this.$refs.rows
      if (!box) return
      const el = box.querySelector(`[data-map-id="${this.localMapId}"]`)
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' })
    },
    toggle(id) {
      this.expanded = { ...this.expanded, [id]: !this.expanded[id] }
    },
    selectMap(id) {
      this.localMapId = id
    },
    onPick({ x, y }) {
      this.localX = x
      this.localY = y
    },
    confirm() {
      this.$emit('confirm', {
        mapId: this.localMapId,
        x: this.localX,
        y: this.localY,
      })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.md {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 10px;
  height: calc(100vh - 168px);
  max-height: calc(100vh - 168px);
  min-height: 0;
  overflow: hidden;
}
.md-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.md-rows {
  flex: 1 1 auto;
  height: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--app-border, #ddd);
  background: #fff;
}
.md-row {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 12px;
}
.md-row .twist {
  flex: 0 0 14px;
  width: 14px;
  text-align: center;
  color: #606266;
}
.md-row:nth-child(even) {
  background: #f4f7fb;
}
.md-row.on {
  background: #2a5db0;
  color: #fff;
}
.md-row.on .twist {
  color: #fff;
}
.md-row .id {
  flex: 0 0 36px;
  opacity: 0.8;
}
.md-row .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.md-preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.md-preview-body {
  flex: 1 1 auto;
  height: 0;
  min-height: 0;
  overflow: auto;
}
.md-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  flex-shrink: 0;
}
.md-preview-body :deep(.mpc) {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>

<style>
.map-preview-dlg.el-dialog,
.map-preview-dlg .el-dialog {
  margin-top: 2vh !important;
  max-height: 96vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.map-preview-dlg .el-dialog__header {
  flex-shrink: 0;
}
.map-preview-dlg .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding-top: 8px;
  padding-bottom: 8px;
}
.map-preview-dlg .el-dialog__footer {
  flex-shrink: 0;
}
</style>
