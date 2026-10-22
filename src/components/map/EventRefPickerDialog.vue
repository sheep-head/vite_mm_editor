<template>
  <el-dialog
    :model-value="modelValue"
    title="选择超链接模板事件"
    width="560px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="onVisible">
    <div class="erp-bar">
      <span class="erp-hint">模板地图 Map{{ String(mapId).padStart(3, '0') }}</span>
      <el-input
        v-model="query"
        size="small"
        clearable
        placeholder="筛选 ID / 名称"
        style="width: 220px" />
    </div>
    <el-table
      ref="table"
      :data="filtered"
      size="small"
      height="360"
      highlight-current-row
      empty-text="Map015 上没有事件"
      @current-change="onCurrent"
      @row-dblclick="onDblClick">
      <el-table-column prop="id" label="EV" width="70">
        <template #default="{ row }">{{ String(row.id).padStart(3, '0') }}</template>
      </el-table-column>
      <el-table-column prop="name" label="事件名" min-width="160" show-overflow-tooltip />
      <el-table-column label="坐标" width="90">
        <template #default="{ row }">{{ row.x }},{{ row.y }}</template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="onVisible(false)">取消</el-button>
      <el-button type="primary" :disabled="!selectedId" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { REF_TEMPLATE_MAP_ID, listTemplateEvents } from './eventRef'

export default {
  name: 'EventRefPickerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    refId: { type: Number, default: 0 },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      mapId: REF_TEMPLATE_MAP_ID,
      query: '',
      rows: [],
      selectedId: 0,
    }
  },
  computed: {
    filtered() {
      const q = (this.query || '').trim().toLowerCase()
      if (!q) return this.rows
      return this.rows.filter((r) => {
        const id = String(r.id)
        const name = String(r.name || '').toLowerCase()
        return id.includes(q) || name.includes(q) || String(r.id).padStart(3, '0').includes(q)
      })
    },
  },
  watch: {
    modelValue(v) {
      if (v) this.reload()
    },
  },
  methods: {
    onVisible(v) {
      this.$emit('update:modelValue', v)
    },
    reload() {
      this.query = ''
      this.rows = listTemplateEvents()
      this.selectedId = Number(this.refId) || 0
      this.$nextTick(() => this.syncCurrentRow())
    },
    syncCurrentRow() {
      const table = this.$refs.table
      if (!table) return
      const row = this.rows.find((r) => r.id === this.selectedId) || null
      table.setCurrentRow(row)
    },
    onCurrent(row) {
      this.selectedId = row && row.id ? row.id : 0
    },
    onDblClick(row) {
      if (!row || !row.id) return
      this.selectedId = row.id
      this.confirm()
    },
    confirm() {
      if (!this.selectedId) return
      this.$emit('confirm', this.selectedId)
      this.onVisible(false)
    },
  },
}
</script>

<style scoped>
.erp-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.erp-hint {
  font-size: 12px;
  color: #909399;
}
</style>
