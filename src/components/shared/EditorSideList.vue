<template>
  <div class="list-slider editor-side-list">
    <div v-if="showSearch" class="side-search">
      <el-input
        :model-value="searchWord"
        size="small"
        clearable
        placeholder="请输入内容"
        class="input-with-select"
        @update:model-value="$emit('update:searchWord', $event)"
        @clear="$emit('clear-search')"
        @keyup.enter="$emit('search')">
        <template #append>
          <el-button @click="$emit('search')">
            <yt-icon name="el-icon-search" />
          </el-button>
        </template>
      </el-input>
    </div>
    <div class="item-list" @scroll="onScroll">
      <ul>
        <li
          v-for="row in rows"
          :key="row.key"
          tabindex="0"
          data-editor-list-item
          :title="row.title"
          :style="row.color ? { color: row.color } : undefined"
          :class="{ active: row.active }"
          @click="onClick(row.item, $event)"
          @contextmenu.prevent.stop="onCtx(row.item, $event)">
          <slot name="label" :item="row.item" :index="row.index">
            {{ row.label }}
          </slot>
        </li>
      </ul>
    </div>
    <popup-context-menu
      :visible="menu.visible"
      :x="menu.x"
      :y="menu.y"
      @update:visible="(v) => (menu.visible = v)">
      <template #default="{ action }">
        <li @click="action(() => $emit('clear'))">清空</li>
        <li @click="action(() => $emit('delete'))">删除</li>
        <li @click="action(() => $emit('copy'))">复制</li>
        <li @click="action(() => $emit('paste'))">粘贴</li>
      </template>
    </popup-context-menu>
    <el-button class="add-item-btn" @click="$emit('add')">{{ addText }}</el-button>
  </div>
</template>

<script>
import PopupContextMenu from './PopupContextMenu.vue'

export default {
  name: 'EditorSideList',
  components: { PopupContextMenu },
  props: {
    items: { type: Array, default: () => [] },
    currentId: { type: [Number, String], default: null },
    /** 列表标题字段：n / name */
    labelKey: { type: String, default: 'name' },
    /** 显示序号起点：传真等用 1，Map 用 0（与原 index 一致） */
    indexBase: { type: Number, default: 1 },
    showSearch: { type: Boolean, default: false },
    searchWord: { type: String, default: '' },
    addText: { type: String, default: 'add + ' },
  },
  emits: [
    'select',
    'add',
    'clear',
    'delete',
    'copy',
    'paste',
    'search',
    'clear-search',
    'update:searchWord',
    'scroll',
  ],
  data() {
    return {
      menu: { visible: false, x: 0, y: 0 },
    }
  },
  computed: {
    rows() {
      const out = []
      const list = this.items || []
      for (let index = 0; index < list.length; index++) {
        const item = list[index]
        if (!item) continue
        const title = item[this.labelKey] != null ? String(item[this.labelKey]) : ''
        const num = this.indexBase === 0 ? index : index + this.indexBase
        out.push({
          key: item.id != null ? item.id : index,
          item,
          index,
          title,
          color: item.c || '',
          active: this.currentId != null && item.id === this.currentId,
          label: `${num}:${title}`,
        })
      }
      return out
    },
  },
  methods: {
    onScroll() {
      this.menu.visible = false
      this.$emit('scroll')
    },
    onClick(item, e) {
      this.$emit('select', item)
      if (e && e.currentTarget && e.currentTarget.focus) e.currentTarget.focus()
    },
    onCtx(item, e) {
      this.$emit('select', item)
      if (e && e.currentTarget && e.currentTarget.focus) e.currentTarget.focus()
      this.menu = { visible: true, x: e.clientX, y: e.clientY }
    },
  },
}
</script>

<style scoped>
.side-search {
  padding: 6px 6px 0;
  flex-shrink: 0;
}
</style>
