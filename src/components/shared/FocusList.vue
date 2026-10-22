<template>
  <div
    ref="root"
    class="focus-list"
    :class="[listClass, { 'is-striped': striped }]"
    tabindex="0"
    @keydown="onKeydown"
    @contextmenu.prevent="onContextMenu">
    <div
      v-for="(item, i) in items"
      :key="rowKey(item, i)"
      class="focus-list-row"
      :class="[{ active: focusIndex === i }, rowClass ? rowClass(item, i) : null]"
      :data-index="i"
      @click="onRowClick(i, $event)"
      @dblclick="$emit('activate', i)">
      <slot :item="item" :index="i" :active="focusIndex === i" />
    </div>
    <div v-if="!items.length && emptyText" class="focus-list-empty">{{ emptyText }}</div>
  </div>
</template>

<script>
export default {
  name: 'FocusList',
  props: {
    /** 行数据；仅用于渲染，导航用 length */
    items: { type: Array, default: () => [] },
    modelValue: { type: Number, default: 0 },
    striped: { type: Boolean, default: true },
    emptyText: { type: String, default: '' },
    listClass: { type: [String, Array, Object], default: '' },
    /** (item, index) => string|object|array */
    rowClass: { type: Function, default: null },
    /** (item, index) => key */
    getKey: { type: Function, default: null },
    /** 是否响应 Delete / Backspace */
    allowRemove: { type: Boolean, default: true },
    /** 是否响应 Insert */
    allowInsert: { type: Boolean, default: true },
    /** 空列表时 Enter 是否仍发 activate(-1) 或 0 */
    activateWhenEmpty: { type: Boolean, default: true },
  },
  emits: ['update:modelValue', 'activate', 'remove', 'insert', 'contextmenu', 'row-click'],
  computed: {
    focusIndex: {
      get() {
        const max = Math.max(0, this.items.length - 1)
        const v = Number(this.modelValue) || 0
        if (!this.items.length) return 0
        return Math.max(0, Math.min(v, max))
      },
      set(v) {
        this.$emit('update:modelValue', v)
      },
    },
  },
  methods: {
    rowKey(item, i) {
      if (this.getKey) return this.getKey(item, i)
      if (item && typeof item === 'object' && item.id != null) return item.id
      return i
    },
    focus() {
      this.$refs.root && this.$refs.root.focus()
    },
    setFocus(i) {
      const max = Math.max(0, this.items.length - 1)
      this.focusIndex = this.items.length ? Math.max(0, Math.min(i, max)) : 0
    },
    onRowClick(i, e) {
      this.setFocus(i)
      this.$emit('row-click', i, e)
    },
    onContextMenu(e) {
      const row = e.target.closest('.focus-list-row')
      if (row) {
        const i = Number(row.getAttribute('data-index'))
        if (!Number.isNaN(i)) this.setFocus(i)
      }
      this.$emit('contextmenu', { index: this.focusIndex, event: e })
    },
    onKeydown(e) {
      const max = Math.max(0, this.items.length - 1)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!this.items.length) return
        this.focusIndex = Math.min(max, this.focusIndex + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (!this.items.length) return
        this.focusIndex = Math.max(0, this.focusIndex - 1)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (!this.items.length) {
          if (this.activateWhenEmpty) this.$emit('activate', -1)
          return
        }
        this.$emit('activate', this.focusIndex)
      } else if (this.allowRemove && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        if (!this.items.length) return
        this.$emit('remove', this.focusIndex)
      } else if (this.allowInsert && e.key === 'Insert') {
        e.preventDefault()
        this.$emit('insert')
      }
    },
  },
}
</script>

<style scoped>
.focus-list {
  outline: none;
  overflow: auto;
  border: 1px solid var(--app-border, #dcdfe6);
  background: #fff;
  min-height: 0;
}
.focus-list-row {
  padding: 3px 8px;
  font-size: 12px;
  cursor: default;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.focus-list.is-striped .focus-list-row:nth-child(even) {
  background: #f4f7fb;
}
.focus-list-row.active {
  background: #2a5db0 !important;
  color: #fff;
}
.focus-list-empty {
  padding: 12px 8px;
  color: #909399;
  font-size: 12px;
  text-align: center;
}
</style>
