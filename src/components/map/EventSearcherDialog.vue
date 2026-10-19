<template>
  <el-dialog
    :model-value="modelValue"
    title="事件查找器"
    width="720px"
    append-to-body
    destroy-on-close
    @update:model-value="onVisible">
    <el-form size="small" label-width="72px" @submit.prevent>
      <el-form-item label="查找类型">
        <el-radio-group v-model="searchType">
          <el-radio value="name">事件名</el-radio>
          <el-radio value="switch">开关</el-radio>
          <el-radio value="variable">变量</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="searchType === 'name'" label="名称">
        <div class="es-name-row">
          <el-input
            v-model="nameQuery"
            :placeholder="useRegex ? '正则表达式' : '支持包含匹配'"
            clearable
            @keyup.enter="runSearch" />
          <el-checkbox v-model="useRegex">正则匹配</el-checkbox>
        </div>
      </el-form-item>
      <el-form-item v-else-if="searchType === 'switch'" label="开关">
        <id-name-field v-model="switchId" type="switch" width="240px" />
      </el-form-item>
      <el-form-item v-else label="变量">
        <id-name-field v-model="variableId" type="variable" width="240px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="searching" :disabled="!canSearch" @click="runSearch">
          查找
        </el-button>
        <span class="es-hint">结果 {{ results.length }} 条</span>
      </el-form-item>
    </el-form>

    <el-table :data="results" size="small" height="320" highlight-current-row @row-dblclick="locate">
      <el-table-column prop="mapId" label="地图" width="70" />
      <el-table-column prop="mapName" label="地图名" min-width="100" show-overflow-tooltip />
      <el-table-column prop="eventId" label="EV" width="60" />
      <el-table-column prop="eventName" label="事件名" min-width="100" show-overflow-tooltip />
      <el-table-column label="坐标" width="80">
        <template #default="{ row }">{{ row.x }},{{ row.y }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="匹配" min-width="120" show-overflow-tooltip />
      <el-table-column label="操作" width="72" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="locate(row)">定位</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script>
import { mapGetters } from 'vuex'
import { ElMessage } from 'element-plus'
import IdNameField from '@/components/database/shared/IdNameField.vue'
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'

function frameYield() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

export default {
  name: 'EventSearcherDialog',
  components: { IdNameField },
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      searchType: 'name',
      nameQuery: '',
      useRegex: false,
      switchId: 1,
      variableId: 1,
      searching: false,
      results: [],
      _token: 0,
    }
  },
  computed: {
    ...mapGetters(['mapInfos']),
    workRoot() {
      try {
        return DataManager.$config && DataManager.$config.workSpace
      } catch (e) {
        return ''
      }
    },
    canSearch() {
      if (this.searchType === 'name') return !!(this.nameQuery || '').trim()
      return true
    },
  },
  beforeUnmount() {
    this.cancelSearch()
  },
  methods: {
    onVisible(v) {
      if (!v) this.cancelSearch()
      this.$emit('update:modelValue', v)
    },
    cancelSearch() {
      this._token += 1
      this.searching = false
    },
    mapNameOf(id) {
      const list = this.mapInfos
      if (!Array.isArray(list)) return ''
      const m = list.find((x) => x && x.id === id)
      return (m && m.name) || ''
    },
    listMapFiles() {
      if (!isNw || !fs || !path || !this.workRoot) return []
      const dir = path.join(this.workRoot, 'data')
      if (!fs.existsSync(dir)) return []
      return fs
        .readdirSync(dir)
        .filter((f) => /^Map\d{3}\.json$/i.test(f))
        .map((f) => {
          const id = parseInt(f.replace(/\D/g, ''), 10)
          return { id, file: path.join(dir, f) }
        })
        .filter((x) => x.id > 0)
        .sort((a, b) => a.id - b.id)
    },
    matchSwitch(ev, sid) {
      if (!ev || !ev.pages) return null
      for (let pi = 0; pi < ev.pages.length; pi++) {
        const p = ev.pages[pi]
        const c = p && p.conditions
        if (c) {
          if (c.switch1Valid && c.switch1Id === sid) return `页${pi + 1}出现条件开关`
          if (c.switch2Valid && c.switch2Id === sid) return `页${pi + 1}出现条件开关`
        }
        for (const cmd of (p && p.list) || []) {
          if (!cmd) continue
          if (cmd.code === 121) {
            const a = cmd.parameters || []
            if (sid >= a[0] && sid <= a[1]) return `页${pi + 1}开关操作`
          }
          if (cmd.code === 111 && cmd.parameters && cmd.parameters[0] === 0 && cmd.parameters[1] === sid) {
            return `页${pi + 1}条件分歧·开关`
          }
        }
      }
      return null
    },
    matchVariable(ev, vid) {
      if (!ev || !ev.pages) return null
      for (let pi = 0; pi < ev.pages.length; pi++) {
        const p = ev.pages[pi]
        const c = p && p.conditions
        if (c && c.variableValid && c.variableId === vid) return `页${pi + 1}出现条件变量`
        for (const cmd of (p && p.list) || []) {
          if (!cmd) continue
          if (cmd.code === 122) {
            const a = cmd.parameters || []
            if (vid >= a[0] && vid <= a[1]) return `页${pi + 1}变量操作`
          }
          if (cmd.code === 111 && cmd.parameters && cmd.parameters[0] === 1 && cmd.parameters[1] === vid) {
            return `页${pi + 1}条件分歧·变量`
          }
        }
      }
      return null
    },
    matchName(ev, q, regex) {
      const nm = String(ev.name || '')
      if (regex) {
        try {
          if (regex.test(nm)) return '名称正则'
        } catch (e) {
          return null
        }
        return null
      }
      if (nm.toLowerCase().includes(q)) return '名称包含'
      return null
    },
    async runSearch() {
      if (!this.canSearch) return
      let regex = null
      const q = (this.nameQuery || '').trim()
      if (this.searchType === 'name' && this.useRegex) {
        try {
          regex = new RegExp(q)
        } catch (e) {
          ElMessage.error('正则表达式无效')
          return
        }
      }
      const token = ++this._token
      this.searching = true
      this.results = []
      const files = this.listMapFiles()
      const nameQ = q.toLowerCase()
      try {
        for (const { id: mapId, file } of files) {
          if (token !== this._token) return
          let text
          try {
            text = await readFileAsync(file)
          } catch (e) {
            continue
          }
          if (token !== this._token) return
          let data
          try {
            data = JSON.parse(text)
          } catch (e) {
            continue
          }
          const mapName = this.mapNameOf(mapId) || data.displayName || ''
          for (const ev of data.events || []) {
            if (!ev || token !== this._token) continue
            let reason = null
            if (this.searchType === 'name') reason = this.matchName(ev, nameQ, regex)
            else if (this.searchType === 'switch') reason = this.matchSwitch(ev, this.switchId)
            else reason = this.matchVariable(ev, this.variableId)
            if (!reason) continue
            this.results.push({
              mapId,
              mapName,
              eventId: ev.id,
              eventName: ev.name || '',
              x: ev.x,
              y: ev.y,
              reason,
            })
            await frameYield()
            if (token !== this._token) return
          }
        }
      } finally {
        if (token === this._token) this.searching = false
      }
    },
    locate(row) {
      if (!row) return
      this.$store.commit('setEditorMode', 'event')
      this.$store.commit('setShowEvents', true)
      this.$store.commit('setSelectedMapId', row.mapId)
      this.$store.dispatch('requestFocusEvent', { mapId: row.mapId, eventId: row.eventId })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.es-hint {
  margin-left: 12px;
  color: var(--app-text-muted);
  font-size: 12px;
}
.es-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.es-name-row .el-input {
  flex: 1;
}
</style>
