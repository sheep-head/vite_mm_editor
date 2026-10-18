<template>
  <div class="terms">
    <db-group-box title="基本状态" class="terms-basic">
      <div class="field-grid cols-2">
        <template v-for="pair in basicPairs" :key="pair[0]">
          <div class="field">
            <span class="field-lab">{{ pair[1] }}</span>
            <el-input
              :model-value="basicAt(pair[0])"
              size="small"
              @update:model-value="(v) => setBasic(pair[0], v)" />
          </div>
          <div class="field">
            <span class="field-lab">{{ pair[1] }}（缩写）</span>
            <el-input
              :model-value="basicAt(pair[0] + 1)"
              size="small"
              @update:model-value="(v) => setBasic(pair[0] + 1, v)" />
          </div>
        </template>
      </div>
    </db-group-box>

    <db-group-box title="能力值" class="terms-params">
      <div class="field-grid cols-2">
        <div v-for="(label, i) in paramRows" :key="i" class="field">
          <span class="field-lab">{{ label }}</span>
          <el-input
            :model-value="paramAt(i)"
            size="small"
            @update:model-value="(v) => setParam(i, v)" />
        </div>
      </div>
    </db-group-box>

    <db-group-box title="指令" class="terms-cmd">
      <div class="field-grid cols-4">
        <div v-for="[key, label] in commandFields" :key="key" class="field">
          <span class="field-lab">{{ label }}</span>
          <el-input
            :model-value="commandAt(key)"
            size="small"
            @update:model-value="(v) => setCommand(key, v)" />
        </div>
      </div>
    </db-group-box>

    <db-group-box title="信息" class="terms-msg">
      <el-scrollbar class="msg-scroll">
        <table class="msg-table">
          <thead>
            <tr>
              <th class="msg-type">类型</th>
              <th>文本</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in messageRows" :key="row.key">
              <td class="msg-type">{{ row.label }}</td>
              <td>
                <el-input
                  :model-value="row.text"
                  size="small"
                  @update:model-value="(v) => setMessage(row.key, v)" />
              </td>
            </tr>
          </tbody>
        </table>
      </el-scrollbar>
    </db-group-box>
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import { COMMAND_FIELDS, BASIC_PAIRS, PARAM_LABELS, MESSAGE_FIELDS } from './shared/termKeys'

export default {
  name: 'SystemTermsPanel',
  components: { DbGroupBox },
  props: {
    data: { type: Object, required: true },
  },
  data() {
    return {
      commandFields: COMMAND_FIELDS,
    }
  },
  computed: {
    terms() {
      return this.data.terms
    },
    basicPairs() {
      const len = (this.terms.basic || []).length
      const pairs = BASIC_PAIRS.filter((p) => p[0] < Math.max(len, 8) || p[0] < len)
      const known = new Set(BASIC_PAIRS.map((p) => p[0]))
      const max = Math.max(len, 8)
      for (let i = 0; i < max; i += 2) {
        if (!known.has(i) && i < len) pairs.push([i, `基本${i}`])
      }
      return pairs
    },
    paramRows() {
      const n = Math.max((this.terms.params || []).length, 8)
      const labels = []
      for (let i = 0; i < n; i++) labels.push(PARAM_LABELS[i] || `能力${i}`)
      return labels
    },
    messageRows() {
      const msg = this.terms.messages || {}
      const known = new Set()
      const rows = MESSAGE_FIELDS.map(([key, label]) => {
        known.add(key)
        return { key, label, text: msg[key] || '' }
      })
      Object.keys(msg).forEach((key) => {
        if (known.has(key)) return
        rows.push({ key, label: key, text: msg[key] || '' })
      })
      return rows
    },
  },
  methods: {
    basicAt(i) {
      return (this.terms.basic && this.terms.basic[i]) || ''
    },
    setBasic(i, v) {
      const arr = this.terms.basic
      while (arr.length <= i) arr.push('')
      arr.splice(i, 1, v)
    },
    paramAt(i) {
      return (this.terms.params && this.terms.params[i]) || ''
    },
    setParam(i, v) {
      const arr = this.terms.params
      while (arr.length <= i) arr.push('')
      arr.splice(i, 1, v)
    },
    commandAt(key) {
      return this.terms.commands[key] || ''
    },
    setCommand(key, v) {
      this.terms.commands[key] = v
    },
    setMessage(key, v) {
      this.terms.messages[key] = v
    },
  },
}
</script>

<style scoped>
.terms {
  display: grid;
  grid-template-columns: minmax(240px, 1.1fr) minmax(220px, 1fr) minmax(280px, 1.35fr);
  grid-template-rows: auto 1fr;
  gap: 8px;
  height: 100%;
  min-height: 480px;
  min-width: 0;
}
.terms-basic {
  grid-column: 1;
  grid-row: 1;
}
.terms-params {
  grid-column: 2;
  grid-row: 1;
}
.terms-cmd {
  grid-column: 1 / 3;
  grid-row: 2;
  min-height: 0;
}
.terms-msg {
  grid-column: 3;
  grid-row: 1 / 3;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.terms-msg :deep(.db-group-body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.field-grid {
  display: grid;
  gap: 6px 10px;
}
.field-grid.cols-2 {
  grid-template-columns: 1fr 1fr;
}
.field-grid.cols-4 {
  grid-template-columns: repeat(4, 1fr);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.field-lab {
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.2;
}
.msg-scroll {
  flex: 1;
  min-height: 0;
  height: 100%;
}
.msg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.msg-table th,
.msg-table td {
  padding: 3px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  vertical-align: middle;
}
.msg-table th {
  text-align: left;
  color: var(--el-text-color-secondary);
  font-weight: 500;
  position: sticky;
  top: 0;
  background: var(--el-bg-color);
  z-index: 1;
}
.msg-type {
  width: 112px;
  white-space: nowrap;
  color: var(--el-text-color-regular);
}
</style>
