<template>
  <el-dialog
    :model-value="modelValue"
    title="选择一个插件"
    width="720px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="load">
    <div class="pcp">
      <div class="pcp-left">
        <div
          class="pcp-item"
          :class="{ active: selectedName === '' }"
          @click="select('')"
          @dblclick="confirm">
          (无)
        </div>
        <template v-for="group in groups" :key="group.path">
          <div v-if="group.path" class="pcp-group">{{ group.path }}</div>
          <div
            v-for="name in group.names"
            :key="group.path + '/' + name"
            class="pcp-item"
            :class="{ active: selectedName === name }"
            @click="select(name)"
            @dblclick="confirm">
            {{ name }}
          </div>
        </template>
        <div v-if="!groups.length && !loadError" class="pcp-empty">没有插件</div>
      </div>
      <div class="pcp-right">
        <div class="pcp-label">说明</div>
        <pre class="pcp-desc">{{ descText }}</pre>
        <div class="pcp-label">帮助</div>
        <pre class="pcp-help">{{ helpText }}</pre>
      </div>
    </div>
    <div v-if="loadError" class="pcp-err">{{ loadError }}</div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
import { parsePluginSource } from '@/utils/pluginMeta'

export default {
  name: 'PluginCommandPickerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    pluginName: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      groups: [],
      selectedName: '',
      metaCache: {},
      loadError: '',
    }
  },
  computed: {
    selectedMeta() {
      if (!this.selectedName) return null
      return this.metaCache[this.selectedName] || null
    },
    descText() {
      if (!this.selectedName) return '（不选择插件）'
      const meta = this.selectedMeta
      if (!meta) return `未找到插件文件“${this.selectedName}.js”。`
      return meta.plugindesc || '（没有说明）'
    },
    helpText() {
      if (!this.selectedName) return ''
      const meta = this.selectedMeta
      if (!meta) return ''
      return meta.help || '（没有帮助）'
    },
  },
  watch: {
    modelValue(v) {
      if (v) this.selectedName = this.pluginName || ''
    },
  },
  methods: {
    workspace() {
      return (DataManager.$config && DataManager.$config.workSpace) || ''
    },
    load() {
      this.groups = []
      this.metaCache = {}
      this.loadError = ''
      this.selectedName = this.pluginName || ''
      if (!isNw || !fs || !path) {
        this.loadError = '仅 NW.js 环境可浏览插件'
        return
      }
      const root = this.workspace()
      if (!root) {
        this.loadError = '未设置工作空间'
        return
      }
      const dir = path.join(root, 'js', 'plugins')
      if (!fs.existsSync(dir)) {
        this.loadError = '未找到 js/plugins'
        return
      }
      try {
        const found = []
        this.walk(dir, '', found)
        found.sort((a, b) => {
          const pa = a.rel || ''
          const pb = b.rel || ''
          if (pa !== pb) return pa.localeCompare(pb)
          return a.name.localeCompare(b.name)
        })
        const map = new Map()
        found.forEach((item) => {
          const key = item.rel || ''
          if (!map.has(key)) map.set(key, { path: key, names: [] })
          map.get(key).names.push(item.name)
          this.metaCache[item.name] = item.meta
        })
        this.groups = Array.from(map.values())
      } catch (e) {
        console.error(e)
        this.loadError = '读取插件目录失败'
      }
    },
    walk(absDir, rel, out) {
      const entries = fs.readdirSync(absDir)
      entries.forEach((entry) => {
        const abs = path.join(absDir, entry)
        let st
        try {
          st = fs.statSync(abs)
        } catch (e) {
          return
        }
        if (st.isDirectory()) {
          const nextRel = rel ? rel + '/' + entry : entry
          this.walk(abs, nextRel, out)
          return
        }
        if (!/\.js$/i.test(entry)) return
        const name = entry.replace(/\.js$/i, '')
        let meta = null
        try {
          meta = parsePluginSource(fs.readFileSync(abs, 'utf8'))
        } catch (e) {
          console.error(e)
        }
        out.push({ name, rel, meta })
      })
    },
    select(name) {
      this.selectedName = name || ''
    },
    confirm() {
      this.$emit('confirm', this.selectedName || '')
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.pcp {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 12px;
  height: 420px;
}
.pcp-left {
  border: 1px solid var(--app-border, #ddd);
  overflow: auto;
  font-size: 13px;
}
.pcp-group {
  padding: 4px 8px;
  background: var(--app-surface, #f5f5f5);
  color: var(--app-muted, #666);
  font-weight: 600;
  position: sticky;
  top: 0;
}
.pcp-item {
  padding: 4px 10px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pcp-item.active {
  background: #2a5db0;
  color: #fff;
}
.pcp-empty {
  padding: 16px;
  color: var(--app-muted, #888);
  text-align: center;
}
.pcp-right {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--app-border, #ddd);
  padding: 8px;
}
.pcp-label {
  font-size: 12px;
  color: var(--app-muted, #666);
  margin-bottom: 4px;
}
.pcp-desc,
.pcp-help {
  margin: 0 0 10px;
  padding: 6px;
  background: var(--app-surface, #fafafa);
  border: 1px solid var(--app-border, #eee);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  font-family: Consolas, 'Microsoft YaHei', monospace;
  overflow: auto;
}
.pcp-desc {
  max-height: 80px;
}
.pcp-help {
  flex: 1;
  min-height: 0;
}
.pcp-err {
  margin-top: 8px;
  color: #c00;
  font-size: 13px;
}
</style>
