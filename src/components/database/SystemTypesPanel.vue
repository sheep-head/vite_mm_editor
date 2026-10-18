<template>
  <div class="types-grid">
    <div v-for="col in columns" :key="col.key" class="types-col">
      <db-group-box :title="col.label">
        <el-scrollbar class="types-scroll">
          <ul>
            <li
              v-for="row in rows(col.key)"
              :key="row.index"
              :class="{ active: selected[col.key] === row.index }"
              @click="selected[col.key] = row.index">
              {{ pad(row.index) }} {{ row.name || '(空)' }}
            </li>
          </ul>
        </el-scrollbar>
        <el-input
          v-if="selected[col.key] > 0"
          :model-value="data[col.key][selected[col.key]]"
          size="small"
          class="types-name"
          @update:model-value="(v) => setName(col.key, v)" />
        <el-button size="small" class="types-max" @click="changeMax(col)">更改最大值…</el-button>
      </db-group-box>
    </div>
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'

const COLUMNS = [
  { key: 'elements', label: '属性' },
  { key: 'skillTypes', label: '技能类型' },
  { key: 'weaponTypes', label: '武器类型' },
  { key: 'armorTypes', label: '防具类型' },
  { key: 'equipTypes', label: '装备类型' },
]

export default {
  name: 'SystemTypesPanel',
  components: { DbGroupBox },
  props: {
    data: { type: Object, required: true },
  },
  data() {
    return {
      columns: COLUMNS,
      selected: {
        elements: 1,
        skillTypes: 1,
        weaponTypes: 1,
        armorTypes: 1,
        equipTypes: 1,
      },
    }
  },
  methods: {
    pad(n) {
      return String(n).padStart(2, '0')
    },
    rows(key) {
      const arr = this.data[key] || []
      const out = []
      for (let i = 1; i < arr.length; i++) out.push({ index: i, name: arr[i] })
      return out
    },
    setName(key, v) {
      const i = this.selected[key]
      if (!i) return
      this.data[key].splice(i, 1, v)
    },
    async changeMax(col) {
      const arr = this.data[col.key]
      const cur = Math.max(0, arr.length - 1)
      const input = window.prompt(`${col.label} 最大值`, String(cur))
      if (input == null) return
      const n = Math.max(1, parseInt(input, 10) || cur)
      if (n === cur) return
      if (n < cur && !window.confirm(`将删除 ${col.label} 第 ${n + 1}～${cur} 项，继续？`)) return
      const next = arr.slice(0, n + 1)
      while (next.length < n + 1) next.push('')
      if (next.length === 0) next.push('')
      this.data[col.key] = next
      if (this.selected[col.key] > n) this.selected[col.key] = n
    },
  },
}
</script>

<style scoped>
.types-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  height: 100%;
  min-height: 420px;
}
.types-col {
  min-width: 0;
  display: flex;
}
.types-col :deep(.db-group) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.types-col :deep(.db-group-body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.types-scroll {
  flex: 1;
  min-height: 240px;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  padding: 2px 6px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
li.active {
  background: var(--el-color-primary);
  color: #fff;
}
.types-name {
  margin-top: 6px;
}
.types-max {
  margin-top: 6px;
  width: 100%;
}
</style>
