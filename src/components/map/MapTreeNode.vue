<template>
  <li class="map-tree-node">
    <div
      class="map-tree-row"
      :class="{
        active: selectedId === node.id,
        'drop-before': dropPos === 'before',
        'drop-after': dropPos === 'after',
        'drop-into': dropPos === 'into',
        dragging: dragId === node.id,
      }"
      :style="{ paddingLeft: 8 + depth * 14 + 'px' }"
      draggable="true"
      @click="$emit('select', node.id)"
      @contextmenu.prevent.stop="$emit('menu', { id: node.id, x: $event.clientX, y: $event.clientY })"
      @dragstart="onDragStart"
      @dragend="$emit('drag-end')"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop">
      <span
        v-if="hasChildren"
        class="map-tree-twist"
        @click.stop="$emit('toggle', node.id)">
        {{ expanded ? '▼' : '▶' }}
      </span>
      <span v-else class="map-tree-twist spacer" />
      <span class="map-tree-text">{{ node.id }}:{{ node.name }}</span>
    </div>
    <ul v-if="hasChildren && expanded" class="map-tree-children">
      <map-tree-node
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        :expanded-ids="expandedIds"
        :drag-id="dragId"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @menu="$emit('menu', $event)"
        @drag-start="$emit('drag-start', $event)"
        @drag-end="$emit('drag-end')"
        @drop-move="$emit('drop-move', $event)" />
    </ul>
  </li>
</template>

<script>
export default {
  name: 'MapTreeNode',
  props: {
    node: { type: Object, required: true },
    depth: { type: Number, default: 0 },
    selectedId: { type: Number, default: 0 },
    expandedIds: { type: Object, default: () => ({}) },
    dragId: { type: Number, default: 0 },
  },
  emits: ['select', 'toggle', 'menu', 'drag-start', 'drag-end', 'drop-move'],
  data() {
    return { dropPos: '' }
  },
  computed: {
    hasChildren() {
      return this.node.children && this.node.children.length > 0
    },
    expanded() {
      return !!this.expandedIds[this.node.id]
    },
  },
  methods: {
    onDragStart(e) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(this.node.id))
      this.$emit('drag-start', this.node.id)
    },
    onDragOver(e) {
      if (!this.dragId || this.dragId === this.node.id) {
        this.dropPos = ''
        return
      }
      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const ratio = y / Math.max(1, rect.height)
      if (ratio < 0.28) this.dropPos = 'before'
      else if (ratio > 0.72) this.dropPos = 'after'
      else this.dropPos = 'into'
    },
    onDragLeave() {
      this.dropPos = ''
    },
    onDrop(e) {
      const pos = this.dropPos || 'into'
      this.dropPos = ''
      const from = Number(e.dataTransfer.getData('text/plain')) || this.dragId
      if (!from || from === this.node.id) return
      this.$emit('drop-move', { fromId: from, toId: this.node.id, pos })
    },
  },
}
</script>

<style scoped>
.map-tree-node {
  list-style: none;
}
.map-tree-children {
  list-style: none;
  margin: 0;
  padding: 0;
}
.map-tree-row {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 8px;
  height: 24px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  position: relative;
  user-select: none;
}
.map-tree-row:hover {
  background: var(--app-hover-bg);
}
.map-tree-row.active {
  color: var(--app-active-color);
  background: var(--app-hover-bg);
}
.map-tree-row.dragging {
  opacity: 0.45;
}
.map-tree-row.drop-before::before,
.map-tree-row.drop-after::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 2px;
  background: var(--app-active-color, #409eff);
}
.map-tree-row.drop-before::before {
  top: 0;
}
.map-tree-row.drop-after::after {
  bottom: 0;
}
.map-tree-row.drop-into {
  outline: 1px solid var(--app-active-color, #409eff);
  outline-offset: -1px;
  background: rgba(64, 158, 255, 0.12);
}
.map-tree-twist {
  width: 14px;
  flex-shrink: 0;
  font-size: 10px;
  text-align: center;
  color: var(--app-text-muted);
  user-select: none;
}
.map-tree-twist.spacer {
  visibility: hidden;
}
.map-tree-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
