<template>
  <div class="effects-ed">
    <div class="tools">
      <el-button size="small" @click="add">添加</el-button>
      <el-button size="small" :disabled="selected < 0" @click="edit">编辑</el-button>
      <el-button size="small" :disabled="selected < 0" @click="remove">删除</el-button>
    </div>
    <el-table
      :data="list"
      size="small"
      max-height="200"
      highlight-current-row
      @current-change="onCurrent"
      @row-dblclick="(row) => editRow(row)">
      <el-table-column label="类型" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ formatEffectType(row) }}</template>
      </el-table-column>
      <el-table-column label="内容" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ formatEffectContent(row) }}</template>
      </el-table-column>
    </el-table>
    <effect-edit-dialog v-model="dialogOpen" :effect="editEffect" @confirm="onConfirm" />
  </div>
</template>

<script>
import EffectEditDialog from './EffectEditDialog.vue'
import { formatEffectType, formatEffectContent } from './traitEffectFormat'

export default {
  name: 'EffectsTableEditor',
  components: { EffectEditDialog },
  props: {
    modelValue: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      selected: -1,
      dialogOpen: false,
      editEffect: null,
      editIndex: -1,
    }
  },
  computed: {
    list() {
      return Array.isArray(this.modelValue) ? this.modelValue : []
    },
  },
  methods: {
    formatEffectType,
    formatEffectContent,
    onCurrent(row) {
      this.selected = row ? this.list.indexOf(row) : -1
    },
    add() {
      this.editIndex = -1
      this.editEffect = { code: 11, dataId: 0, value1: 0, value2: 0 }
      this.dialogOpen = true
    },
    edit() {
      if (this.selected < 0) return
      this.editRow(this.list[this.selected])
    },
    editRow(row) {
      this.editIndex = this.list.indexOf(row)
      this.editEffect = { ...row }
      this.dialogOpen = true
    },
    remove() {
      if (this.selected < 0) return
      const next = this.list.slice()
      next.splice(this.selected, 1)
      this.$emit('update:modelValue', next)
      this.selected = -1
    },
    onConfirm(effect) {
      const next = this.list.slice()
      if (this.editIndex >= 0) next[this.editIndex] = effect
      else next.push(effect)
      this.$emit('update:modelValue', next)
    },
  },
}
</script>

<style scoped>
.tools {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
</style>
