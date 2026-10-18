<template>
  <div class="jt-wrap">
    <div v-if="isRoot" class="jt-toolbar">
      <el-button size="small" text @click="expandAll(true)">全部展开</el-button>
      <el-button size="small" text @click="expandAll(false)">全部折叠</el-button>
    </div>
    <div class="jt-node" :style="{ paddingLeft: depth * 14 + 'px' }">
      <span v-if="expandable" class="jt-toggle" @click="toggle">{{ open ? '▼' : '▶' }}</span>
      <span v-else class="jt-toggle spacer" />
      <span v-if="label != null" class="jt-key">{{ label }}: </span>
      <span v-if="!expandable" :class="'jt-val jt-' + valueKind">{{ displayValue }}</span>
      <span v-else class="jt-summary">{{ summary }}</span>
    </div>
    <template v-if="expandable && open">
      <json-tree-view
        v-for="child in children"
        :key="child.key"
        :data="child.value"
        :label="child.label"
        :depth="depth + 1"
        :expansion="store"
        :expand-gen="gen" />
    </template>
  </div>
</template>

<script>
export default {
  name: 'JsonTreeView',
  props: {
    data: { default: null },
    label: { type: [String, Number], default: null },
    depth: { type: Number, default: 0 },
    expansion: { type: Object, default: null },
    expandGen: { type: Number, default: 0 },
  },
  data() {
    return {
      localExpansion: Object.create(null),
      localGen: 0,
      open: this.depth < 2,
    }
  },
  computed: {
    isRoot() {
      return this.depth === 0
    },
    store() {
      return this.expansion || this.localExpansion
    },
    gen() {
      return this.isRoot ? this.localGen : this.expandGen
    },
    path() {
      return `${this.depth}:${this.label != null ? this.label : 'root'}`
    },
    type() {
      if (this.data === null) return 'null'
      if (Array.isArray(this.data)) return 'array'
      return typeof this.data
    },
    expandable() {
      return this.type === 'object' || this.type === 'array'
    },
    children() {
      if (this.type === 'array') {
        return this.data.map((v, i) => ({ key: i, label: String(i), value: v }))
      }
      if (this.type === 'object' && this.data) {
        return Object.keys(this.data).map((k) => ({ key: k, label: k, value: this.data[k] }))
      }
      return []
    },
    summary() {
      if (this.type === 'array') return `Array(${this.data.length})`
      if (this.type === 'object') return `{${Object.keys(this.data || {}).length}}`
      return ''
    },
    valueKind() {
      if (this.data === null) return 'null'
      return typeof this.data
    },
    displayValue() {
      if (this.data === null) return 'null'
      if (typeof this.data === 'string') return JSON.stringify(this.data)
      return String(this.data)
    },
  },
  created() {
    const v = this.store[this.path]
    if (typeof v === 'boolean') this.open = v
  },
  watch: {
    expandGen() {
      const v = this.store[this.path]
      if (typeof v === 'boolean') this.open = v
    },
  },
  methods: {
    toggle() {
      this.open = !this.open
      this.store[this.path] = this.open
    },
    expandAll(open) {
      const walk = (val, path, depth) => {
        this.store[path] = open
        if (Array.isArray(val)) {
          val.forEach((v, i) => {
            if (v && typeof v === 'object') walk(v, `${depth + 1}:${i}`, depth + 1)
          })
        } else if (val && typeof val === 'object') {
          Object.keys(val).forEach((k) => {
            const v = val[k]
            if (v && typeof v === 'object') walk(v, `${depth + 1}:${k}`, depth + 1)
          })
        }
      }
      walk(this.data, '0:root', 0)
      this.open = open
      this.localGen += 1
    },
  },
}
</script>

<style scoped>
.jt-toolbar {
  margin-bottom: 4px;
}
.jt-node {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
}
.jt-toggle {
  display: inline-block;
  width: 14px;
  cursor: pointer;
  color: #888;
  user-select: none;
}
.jt-toggle.spacer {
  cursor: default;
}
.jt-key {
  color: #881391;
}
.jt-summary {
  color: #888;
}
.jt-string {
  color: #c41a16;
}
.jt-number {
  color: #1c00cf;
}
.jt-boolean {
  color: #0b6e0b;
}
.jt-null {
  color: #808080;
}
</style>
