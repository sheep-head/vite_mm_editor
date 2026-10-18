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
    <div class="picker-head">
      <span class="col-id">ID</span>
      <span class="col-name">名称</span>
    </div>
    <div ref="listEl" class="picker-list" @scroll="onScroll">
      <div class="picker-spacer" :style="{ height: totalH + 'px' }">
        <div
          v-for="r in visibleRows"
          :key="r.id"
          class="picker-row"
          :class="{ active: selected && selected.id === r.id }"
          :style="{ top: r._top + 'px' }"
          @click="selected = r"
          @dblclick="confirm">
          <span class="col-id">{{ r.id }}</span>
          <span class="col-name">{{ r.name }}</span>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!selected" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'

const ROW_H = 28
const OVERSCAN = 8
const cache = Object.create(null)

export function clearIdNamePickerCache(fileName) {
  if (fileName) delete cache[fileName]
  else Object.keys(cache).forEach((k) => delete cache[k])
}

function loadCachedRows(key, builder) {
  if (cache[key]) return cache[key]
  const rows = builder()
  cache[key] = rows
  return rows
}

export default {
  name: 'IdNamePickerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    /** switch | variable | item | weapon | armor | actor | skill | class | state | enemy | troop | tileset | commonEvent | map | animation */
    type: { type: String, required: true },
    modelId: { type: Number, default: 1 },
    /** 列表首行，例如 { id: 0, name: '全体' } */
    leading: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      query: '',
      rows: [],
      selected: null,
      scrollTop: 0,
      viewportH: 360,
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
    totalH() {
      return Math.max(this.filtered.length * ROW_H, this.viewportH)
    },
    visibleRows() {
      const list = this.filtered
      const start = Math.max(0, Math.floor(this.scrollTop / ROW_H) - OVERSCAN)
      const end = Math.min(list.length, Math.ceil((this.scrollTop + this.viewportH) / ROW_H) + OVERSCAN)
      const out = []
      for (let i = start; i < end; i++) {
        out.push({ ...list[i], _top: i * ROW_H })
      }
      return out
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.query = ''
        this.scrollTop = 0
        this.loadRows()
        this.selected = this.rows.find((r) => r.id === this.modelId) || null
        this.$nextTick(() => {
          const el = this.$refs.listEl
          if (el) {
            this.viewportH = el.clientHeight || 360
            const idx = this.filtered.findIndex((r) => this.selected && r.id === this.selected.id)
            if (idx >= 0) {
              el.scrollTop = Math.max(0, idx * ROW_H - this.viewportH / 2)
              this.scrollTop = el.scrollTop
            } else {
              el.scrollTop = 0
            }
          }
        })
      },
    },
    query() {
      this.scrollTop = 0
      this.$nextTick(() => {
        if (this.$refs.listEl) this.$refs.listEl.scrollTop = 0
      })
    },
  },
  methods: {
    onScroll(e) {
      this.scrollTop = e.target.scrollTop
    },
    loadRows() {
      try {
        const applyLeading = (rows) => {
          if (!this.leading || this.leading.id == null) return rows
          return [{ id: this.leading.id, name: this.leading.name || '' }, ...rows]
        }
        if (this.type === 'switch' || this.type === 'variable') {
          const key = this.type === 'switch' ? 'System.switches' : 'System.variables'
          this.rows = loadCachedRows(key, () => {
            const sys = DataManager.$loadDataSync('System', false, false) || {}
            const arr = this.type === 'switch' ? sys.switches : sys.variables
            const out = []
            if (Array.isArray(arr)) {
              for (let i = 1; i < arr.length; i++) out.push({ id: i, name: arr[i] || '' })
            }
            return out
          })
          this.rows = applyLeading(this.rows)
          return
        }
        if (
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
          const fileName = fileMap[this.type]
          this.rows = loadCachedRows(fileName, () => {
            const list = DataManager.$loadDataSync(fileName, false, false) || []
            const out = []
            list.forEach((it) => {
              if (it && it.id) out.push({ id: it.id, name: it.name || '' })
            })
            return out
          })
          this.rows = applyLeading(this.rows)
          return
        }
        if (this.type === 'commonEvent') {
          this.rows = loadCachedRows('CommonEvents', () => {
            const list = DataManager.$loadDataSync('CommonEvents', false, false) || []
            const out = []
            list.forEach((ev) => {
              if (ev && ev.id) out.push({ id: ev.id, name: ev.name || '' })
            })
            return out
          })
          this.rows = applyLeading(this.rows)
          return
        }
        if (this.type === 'map') {
          this.rows = loadCachedRows('MapInfos', () => {
            const infos = DataManager.$loadDataSync('MapInfos', false, false) || []
            const out = []
            infos.forEach((info, i) => {
              if (info && i > 0) out.push({ id: i, name: info.name || `Map${String(i).padStart(3, '0')}` })
            })
            return out
          })
          this.rows = applyLeading(this.rows)
          return
        }
        this.rows = []
      } catch (e) {
        console.error(e)
        this.rows = []
      }
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
.picker-head {
  display: flex;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 4px 8px;
  border: 1px solid var(--el-border-color);
  border-bottom: none;
  background: var(--el-fill-color-light);
}
.picker-list {
  height: 360px;
  overflow: auto;
  border: 1px solid var(--el-border-color);
  position: relative;
}
.picker-spacer {
  position: relative;
  width: 100%;
}
.picker-row {
  position: absolute;
  left: 0;
  right: 0;
  height: 28px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 13px;
  cursor: pointer;
  box-sizing: border-box;
}
.picker-row:hover {
  background: var(--el-fill-color-light);
}
.picker-row.active {
  background: var(--el-color-primary);
  color: #fff;
}
.col-id {
  width: 64px;
  flex-shrink: 0;
}
.col-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
