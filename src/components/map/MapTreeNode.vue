<template>
  <li class="map-tree-node">
    <div
      class="map-tree-row"
      :class="{ active: selectedId === node.id }"
      :style="{ paddingLeft: 8 + depth * 14 + 'px' }"
      @click="$emit('select', node.id)">
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
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)" />
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
  },
  emits: ['select', 'toggle'],
  computed: {
    hasChildren() {
      return this.node.children && this.node.children.length > 0
    },
    expanded() {
      return !!this.expandedIds[this.node.id]
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
}
.map-tree-row:hover {
  background: var(--app-hover-bg);
}
.map-tree-row.active {
  color: var(--app-active-color);
  background: var(--app-hover-bg);
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
