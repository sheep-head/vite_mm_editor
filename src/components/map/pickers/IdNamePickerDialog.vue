<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-input v-model="query" size="small" clearable placeholder="搜索 ID / 名称" class="picker-search" />
    <el-table
      :data="filtered"
      size="small"
      height="360"
      highlight-current-row
      @current-change="onCurrent"
      @row-dblclick="confirm">
      <el-table-column prop="id" label="ID" width="72" />
      <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
    </el-table>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!selected" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'

export default {
  name: 'IdNamePickerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    /** switch | variable | item | weapon | armor | actor | skill | class | state | enemy | troop | tileset | commonEvent | map | animation */
    type: { type: String, required: true },
    modelId: { type: Number, default: 1 },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      query: '',
      rows: [],
      selected: null,
    }
  },
  computed: {
    title() {
      const map = {
        switch: '开关选择',
        variable: '变量选择',
        item: '物品选择',
        weapon: '武器选择',
        armor: '防具选择',
        actor: '角色选择',
        skill: '技能选择',
        class: '职业选择',
        state: '状态选择',
        enemy: '敌人选择',
        troop: '敌群选择',
        tileset: '图块组选择',
        commonEvent: '共通事件选择',
        map: '地图选择',
        animation: '动画选择',
      }
      return map[this.type] || '选择'
    },
    filtered() {
      const q = (this.query || '').trim().toLowerCase()
      if (!q) return this.rows
      return this.rows.filter(
        (r) => String(r.id).includes(q) || String(r.name || '').toLowerCase().includes(q),
      )
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.query = ''
        this.loadRows()
        this.selected = this.rows.find((r) => r.id === this.modelId) || null
      },
    },
  },
  methods: {
    loadRows() {
      const out = []
      try {
        if (this.type === 'switch' || this.type === 'variable') {
          const sys = DataManager.$loadDataSync('System', false, false) || {}
          const arr = this.type === 'switch' ? sys.switches : sys.variables
          if (Array.isArray(arr)) {
            for (let i = 1; i < arr.length; i++) {
              out.push({ id: i, name: arr[i] || '' })
            }
          }
        } else if (
          this.type === 'item' ||
          this.type === 'weapon' ||
          this.type === 'armor' ||
          this.type === 'actor' ||
          this.type === 'animation' ||
          this.type === 'skill' ||
          this.type === 'class' ||
          this.type === 'state' ||
          this.type === 'enemy' ||
          this.type === 'troop' ||
          this.type === 'tileset'
        ) {
          const fileMap = {
            item: 'Items',
            weapon: 'Weapons',
            armor: 'Armors',
            actor: 'Actors',
            animation: 'Animations',
            skill: 'Skills',
            class: 'Classes',
            state: 'States',
            enemy: 'Enemies',
            troop: 'Troops',
            tileset: 'Tilesets',
          }
          const list = DataManager.$loadDataSync(fileMap[this.type], false, false) || []
          list.forEach((it) => {
            if (it && it.id) out.push({ id: it.id, name: it.name || '' })
          })
        } else if (this.type === 'commonEvent') {
          const list = DataManager.$loadDataSync('CommonEvents', false, false) || []
          list.forEach((ev) => {
            if (ev && ev.id) out.push({ id: ev.id, name: ev.name || '' })
          })
        } else if (this.type === 'map') {
          const infos = DataManager.$loadDataSync('MapInfos', false, false) || []
          infos.forEach((info, i) => {
            if (info && i > 0) out.push({ id: i, name: info.name || `Map${String(i).padStart(3, '0')}` })
          })
        }
      } catch (e) {
        console.error(e)
      }
      this.rows = out
    },
    onCurrent(row) {
      this.selected = row
    },
    confirm() {
      if (!this.selected) return
      this.$emit('confirm', this.selected.id)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.picker-search {
  margin-bottom: 8px;
}
</style>
