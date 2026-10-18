<template>
  <div class="ppt">
    <div v-for="node in nodes" :key="node.name" class="ppt-node">
      <div class="ppt-row" :style="{ paddingLeft: depth * 14 + 'px' }">
        <button
          v-if="expandable(node)"
          type="button"
          class="ppt-twist"
          @click="toggle(node)">
          {{ isOpen(node) ? '▼' : '▶' }}
        </button>
        <span v-else class="ppt-twist ppt-twist-sp" />
        <span class="ppt-name" :title="node.desc || node.name">{{ node.text || node.name }}</span>
        <div class="ppt-val">
          <template v-if="!node.group && !node.typeInfo.array && node.typeInfo.kind !== 'struct'">
            <el-switch
              v-if="node.typeInfo.kind === 'boolean'"
              :model-value="boolOf(node)"
              @change="setBool(node, $event)" />
            <el-input-number
              v-else-if="node.typeInfo.kind === 'number'"
              :model-value="numOf(node)"
              :min="numLimit(node.min)"
              :max="numLimit(node.max)"
              size="small"
              controls-position="right"
              @change="setPrim(node, $event)" />
            <el-select
              v-else-if="node.typeInfo.kind === 'select'"
              :model-value="strOf(node)"
              size="small"
              filterable
              @change="setPrim(node, $event)">
              <el-option
                v-for="op in node.options"
                :key="op.value + op.label"
                :label="op.label"
                :value="op.value" />
            </el-select>
            <el-select
              v-else-if="node.typeInfo.kind === 'combo'"
              :model-value="strOf(node)"
              size="small"
              filterable
              allow-create
              default-first-option
              @change="setPrim(node, $event)">
              <el-option
                v-for="op in node.options"
                :key="op.value + op.label"
                :label="op.label"
                :value="op.value" />
            </el-select>
            <el-input
              v-else-if="node.typeInfo.kind === 'note' || node.typeInfo.kind === 'multiline_string'"
              :model-value="strOf(node)"
              type="textarea"
              :rows="3"
              size="small"
              @update:model-value="setPrim(node, $event)" />
            <el-input
              v-else
              :model-value="strOf(node)"
              size="small"
              @update:model-value="setPrim(node, $event)" />
          </template>
          <span v-else-if="node.typeInfo && node.typeInfo.array" class="ppt-hint">{{ arrayHint(node) }}</span>
          <span v-else-if="node.typeInfo && node.typeInfo.kind === 'struct'" class="ppt-hint">结构</span>
        </div>
      </div>

      <div v-if="isOpen(node) && node.typeInfo && node.typeInfo.kind === 'struct' && !node.typeInfo.array && structBags[node.name]">
        <plugin-param-tree
          :nodes="structNodes(node)"
          :bag="structBags[node.name]"
          :structs="structs"
          :depth="depth + 1"
          :collapse-list="collapseList"
          @dirty="commitStruct(node)" />
      </div>

      <div v-else-if="isOpen(node) && node.typeInfo && node.typeInfo.array" class="ppt-array">
        <div v-for="(item, i) in arrayOf(node)" :key="node.name + '-' + i" class="ppt-array-item">
          <div class="ppt-row" :style="{ paddingLeft: (depth + 1) * 14 + 'px' }">
            <span class="ppt-name">#{{ i }}</span>
            <div class="ppt-val">
              <el-input
                v-if="node.typeInfo.kind !== 'struct'"
                :model-value="item"
                size="small"
                @update:model-value="setArrayItem(node, i, $event)" />
              <el-button size="small" text type="danger" @click="removeArrayItem(node, i)">删除</el-button>
            </div>
          </div>
          <plugin-param-tree
            v-if="node.typeInfo.kind === 'struct' && arrayStructBags[node.name] && arrayStructBags[node.name][i]"
            :nodes="structNodes(node)"
            :bag="arrayStructBags[node.name][i]"
            :structs="structs"
            :depth="depth + 2"
            :collapse-list="collapseList"
            @dirty="commitArrayStruct(node, i)" />
        </div>
        <div class="ppt-row" :style="{ paddingLeft: (depth + 1) * 14 + 'px' }">
          <el-button size="small" @click="addArrayItem(node)">添加</el-button>
        </div>
      </div>

      <plugin-param-tree
        v-else-if="isOpen(node) && node.children && node.children.length"
        :nodes="node.children"
        :bag="bag"
        :structs="structs"
        :depth="depth + 1"
        :collapse-list="collapseList"
        @dirty="$emit('dirty')" />
    </div>
  </div>
</template>

<script>
import {
  buildParamTree,
  readJsonArray,
  readJsonObject,
  structFieldDefaults,
} from '@/utils/pluginMeta'

export default {
  name: 'PluginParamTree',
  props: {
    nodes: { type: Array, default: () => [] },
    bag: { type: Object, required: true },
    structs: { type: Object, default: () => ({}) },
    depth: { type: Number, default: 0 },
    collapseList: { type: Array, default: null },
  },
  emits: ['dirty'],
  data() {
    return {
      openMap: {},
      structBags: {},
      arrayStructBags: {},
    }
  },
  created() {
    this.nodes.forEach((node) => {
      if (!this.isOpen(node)) return
      this.prepare(node)
    })
  },
  methods: {
    prepare(node) {
      const info = (node && node.typeInfo) || {}
      if (info.kind === 'struct' && !info.array) this.ensureStruct(node)
      if (info.array && info.kind === 'struct') this.syncArrayStructs(node)
    },
    expandable(node) {
      if (!node) return false
      if (node.children && node.children.length) return true
      if (node.group) return true
      const info = node.typeInfo || {}
      return info.kind === 'struct' || !!info.array
    },
    isOpen(node) {
      if (Object.prototype.hasOwnProperty.call(this.openMap, node.name)) return this.openMap[node.name]
      if (this.depth === 0 && Array.isArray(this.collapseList)) return !this.collapseList.includes(node.name)
      return false
    },
    toggle(node) {
      const next = !this.isOpen(node)
      this.openMap[node.name] = next
      if (this.depth === 0 && Array.isArray(this.collapseList)) {
        const i = this.collapseList.indexOf(node.name)
        if (!next && i < 0) this.collapseList.push(node.name)
        if (next && i >= 0) this.collapseList.splice(i, 1)
      }
      if (next) this.prepare(node)
    },
    strOf(node) {
      const v = this.bag[node.name]
      if (v == null) return node.default || ''
      return String(v)
    },
    boolOf(node) {
      const v = this.strOf(node)
      return v !== 'false' && v !== '0'
    },
    numOf(node) {
      const n = Number(this.strOf(node))
      return Number.isFinite(n) ? n : 0
    },
    numLimit(v) {
      if (v == null || v === '') return undefined
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    },
    setPrim(node, value) {
      this.bag[node.name] = value == null ? '' : String(value)
      this.$emit('dirty')
    },
    setBool(node, value) {
      this.setPrim(node, value ? 'true' : 'false')
    },
    structNodes(node) {
      const name = node.typeInfo && node.typeInfo.struct
      const fields = (this.structs && name && this.structs[name]) || []
      return buildParamTree(fields)
    },
    ensureStruct(node) {
      if (this.structBags[node.name]) return
      const raw = this.bag[node.name] || node.default || '{}'
      const base = structFieldDefaults((this.structs && this.structs[node.typeInfo.struct]) || [])
      this.structBags[node.name] = { ...base, ...readJsonObject(raw) }
    },
    commitStruct(node) {
      const obj = this.structBags[node.name]
      if (!obj) return
      this.bag[node.name] = JSON.stringify(obj)
      this.$emit('dirty')
    },
    arrayOf(node) {
      return readJsonArray(this.bag[node.name] || node.default || '[]')
    },
    arrayHint(node) {
      return this.arrayOf(node).length + ' 项'
    },
    writeArray(node, arr) {
      this.bag[node.name] = JSON.stringify(arr)
      this.$emit('dirty')
    },
    setArrayItem(node, index, value) {
      const arr = this.arrayOf(node)
      arr[index] = value == null ? '' : String(value)
      this.writeArray(node, arr)
    },
    removeArrayItem(node, index) {
      const arr = this.arrayOf(node)
      arr.splice(index, 1)
      const key = node.name
      if (this.arrayStructBags[key]) this.arrayStructBags[key].splice(index, 1)
      this.writeArray(node, arr)
    },
    addArrayItem(node) {
      const arr = this.arrayOf(node)
      if (node.typeInfo.kind === 'struct') {
        const obj = structFieldDefaults((this.structs && this.structs[node.typeInfo.struct]) || [])
        arr.push(JSON.stringify(obj))
        if (!this.arrayStructBags[node.name]) this.arrayStructBags[node.name] = []
        this.arrayStructBags[node.name].push({ ...obj })
      } else if (node.typeInfo.kind === 'boolean') arr.push('false')
      else if (node.typeInfo.kind === 'number') arr.push('0')
      else arr.push('')
      this.writeArray(node, arr)
      this.openMap[node.name] = true
    },
    syncArrayStructs(node) {
      const baseFields = (this.structs && this.structs[node.typeInfo.struct]) || []
      const base = structFieldDefaults(baseFields)
      const arr = this.arrayOf(node)
      this.arrayStructBags[node.name] = arr.map((raw) => ({ ...base, ...readJsonObject(raw) }))
    },
    commitArrayStruct(node, index) {
      const obj = this.arrayStructBags[node.name] && this.arrayStructBags[node.name][index]
      if (!obj) return
      const arr = this.arrayOf(node)
      arr[index] = JSON.stringify(obj)
      this.bag[node.name] = JSON.stringify(arr)
      this.$emit('dirty')
    },
  },
}
</script>

<style scoped>
.ppt-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-height: 28px;
  padding: 2px 4px;
}
.ppt-twist {
  width: 18px;
  flex: 0 0 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--app-muted, #666);
  padding: 0;
  line-height: 24px;
}
.ppt-twist-sp {
  display: inline-block;
}
.ppt-name {
  flex: 0 0 42%;
  min-width: 0;
  line-height: 24px;
  word-break: break-all;
}
.ppt-val {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ppt-val :deep(.el-input),
.ppt-val :deep(.el-select),
.ppt-val :deep(.el-input-number) {
  width: 100%;
}
.ppt-hint {
  color: var(--app-muted, #888);
  font-size: 12px;
  line-height: 24px;
}
</style>
