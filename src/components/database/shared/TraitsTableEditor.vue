<template>
  <div class="traits-ed">
    <div class="tools">
      <el-button size="small" @click="add">添加</el-button>
      <el-button size="small" :disabled="selected < 0" @click="edit">编辑</el-button>
      <el-button size="small" :disabled="selected < 0" @click="remove">删除</el-button>
    </div>
    <el-table
      :data="list"
      size="small"
      max-height="220"
      highlight-current-row
      @current-change="onCurrent"
      @row-dblclick="(row) => editRow(row)">
      <el-table-column label="类型" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ formatTraitType(row) }}</template>
      </el-table-column>
      <el-table-column label="内容" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ formatTraitContent(row) }}</template>
      </el-table-column>
    </el-table>
    <trait-edit-dialog v-model="dialogOpen" :trait="editTrait" @confirm="onConfirm" />
  </div>
</template>

<script>
import TraitEditDialog from './TraitEditDialog.vue'
import { formatTraitType, formatTraitContent } from './traitEffectFormat'

export default {
  name: 'TraitsTableEditor',
  components: { TraitEditDialog },
  props: {
    modelValue: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      selected: -1,
      dialogOpen: false,
      editTrait: null,
      editIndex: -1,
    }
  },
  computed: {
    list() {
      return Array.isArray(this.modelValue) ? this.modelValue : []
    },
  },
  methods: {
    formatTraitType,
    formatTraitContent,
    ensureArray() {
      if (!Array.isArray(this.modelValue)) {
        this.$emit('update:modelValue', [])
      }
    },
    onCurrent(row) {
      this.selected = row ? this.list.indexOf(row) : -1
    },
    add() {
      this.editIndex = -1
      this.editTrait = { code: 11, dataId: 1, value: 1 }
      this.dialogOpen = true
    },
    edit() {
      if (this.selected < 0) return
      this.editRow(this.list[this.selected])
    },
    editRow(row) {
      this.editIndex = this.list.indexOf(row)
      this.editTrait = { ...row }
      this.dialogOpen = true
    },
    remove() {
      if (this.selected < 0) return
      const next = this.list.slice()
      next.splice(this.selected, 1)
      this.$emit('update:modelValue', next)
      this.selected = -1
    },
    onConfirm(trait) {
      const next = this.list.slice()
      if (this.editIndex >= 0) next[this.editIndex] = trait
      else next.push(trait)
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
