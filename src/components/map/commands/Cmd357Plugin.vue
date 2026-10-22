<template>
  <el-dialog
    :model-value="modelValue"
    title="插件指令"
    width="640px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px" class="cmd357">
      <el-form-item label="插件名称">
        <div class="cmd357-row">
          <el-input :model-value="pluginName" readonly placeholder="（无）" />
          <el-button @click="pickerVisible = true">...</el-button>
        </div>
      </el-form-item>
      <el-form-item label="指令名称">
        <el-select
          v-model="commandName"
          filterable
          allow-create
          default-first-option
          clearable
          placeholder="选择或输入指令"
          style="width: 100%"
          @change="onCommandChange">
          <el-option
            v-for="c in commands"
            :key="c.name"
            :label="commandOptionLabel(c)"
            :value="c.name" />
        </el-select>
      </el-form-item>
      <div v-if="commandDesc" class="cmd357-desc">{{ commandDesc }}</div>
      <div class="cmd357-args-label">参数</div>
      <div class="cmd357-args">
        <plugin-param-tree
          v-if="argNodes.length"
          :nodes="argNodes"
          :bag="argsBag"
          :structs="structs" />
        <div v-else class="cmd357-empty">
          {{ pluginName ? (commandName ? '这个指令没有参数。' : '请选择指令。') : '请先选择插件。' }}
        </div>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <plugin-command-picker-dialog
      v-model="pickerVisible"
      :plugin-name="pluginName"
      @confirm="onPluginPicked" />
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
import { buildParamTree, parsePluginSource } from '@/utils/pluginMeta'
import PluginParamTree from '@/components/plugins/PluginParamTree.vue'
import PluginCommandPickerDialog from '../pickers/PluginCommandPickerDialog.vue'

function emptyArgs(fields) {
  const o = {}
  ;(fields || []).forEach((f) => {
    if (!f || f.group) return
    o[f.name] = f.default != null ? String(f.default) : ''
  })
  return o
}

function readArgsObject(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = {}
    Object.keys(raw).forEach((k) => {
      o[k] = raw[k] == null ? '' : String(raw[k])
    })
    return o
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return readArgsObject(JSON.parse(raw))
    } catch (e) {
      return {}
    }
  }
  return {}
}

export default {
  name: 'Cmd357Plugin',
  components: { PluginParamTree, PluginCommandPickerDialog },
  props: {
    modelValue: Boolean,
    command: Object,
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      pluginName: '',
      commandName: '',
      meta: null,
      argsBag: {},
      pickerVisible: false,
      loadNote: '',
    }
  },
  computed: {
    commands() {
      return (this.meta && this.meta.commands) || []
    },
    currentCommand() {
      return this.commands.find((c) => c.name === this.commandName) || null
    },
    commandDesc() {
      const c = this.currentCommand
      return (c && c.desc) || ''
    },
    commandText() {
      const c = this.currentCommand
      if (c) return c.text || c.name || this.commandName
      return this.commandName || ''
    },
    argFields() {
      return (this.currentCommand && this.currentCommand.args) || []
    },
    argNodes() {
      return buildParamTree(this.argFields)
    },
    structs() {
      return (this.meta && this.meta.structs) || {}
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.resetFromCommand()
      },
    },
  },
  methods: {
    workspace() {
      return (DataManager.$config && DataManager.$config.workSpace) || ''
    },
    resetFromCommand() {
      const p = (this.command && this.command.parameters) || []
      this.pluginName = p[0] != null ? String(p[0]) : ''
      this.commandName = p[1] != null ? String(p[1]) : ''
      const saved = readArgsObject(p[3] != null ? p[3] : p[2])
      this.meta = null
      this.argsBag = { ...saved }
      if (this.pluginName) this.loadMeta(this.pluginName, saved)
      else this.argsBag = { ...saved }
    },
    findPluginFile(name) {
      if (!isNw || !fs || !path || !name) return null
      const root = this.workspace()
      if (!root) return null
      const base = path.join(root, 'js', 'plugins')
      const direct = path.join(base, name + '.js')
      if (fs.existsSync(direct)) return direct
      const stack = [base]
      while (stack.length) {
        const dir = stack.pop()
        let entries
        try {
          entries = fs.readdirSync(dir)
        } catch (e) {
          continue
        }
        for (const entry of entries) {
          const abs = path.join(dir, entry)
          let st
          try {
            st = fs.statSync(abs)
          } catch (e) {
            continue
          }
          if (st.isDirectory()) stack.push(abs)
          else if (entry.toLowerCase() === (name + '.js').toLowerCase()) return abs
        }
      }
      return null
    },
    loadMeta(name, preserveArgs) {
      this.loadNote = ''
      if (!name) {
        this.meta = null
        return
      }
      if (!isNw || !fs) {
        this.loadNote = '仅 NW.js 可读取插件头'
        this.meta = null
        return
      }
      const file = this.findPluginFile(name)
      if (!file) {
        this.loadNote = `未找到 ${name}.js`
        this.meta = null
        return
      }
      try {
        this.meta = parsePluginSource(fs.readFileSync(file, 'utf8'))
      } catch (e) {
        console.error(e)
        this.meta = null
        this.loadNote = '解析插件失败'
        return
      }
      if (!this.commandName && this.commands.length) {
        this.commandName = this.commands[0].name
      }
      this.applyArgsDefaults(preserveArgs)
    },
    applyArgsDefaults(preserveArgs) {
      const base = emptyArgs(this.argFields)
      const keep = preserveArgs && typeof preserveArgs === 'object' ? preserveArgs : this.argsBag
      const next = { ...base }
      Object.keys(keep || {}).forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(next, k) || !this.argFields.length) {
          next[k] = keep[k] == null ? '' : String(keep[k])
        }
      })
      // 无 @arg 定义时仍保留已存键值，便于手改插件
      if (!this.argFields.length) {
        Object.keys(keep || {}).forEach((k) => {
          next[k] = keep[k] == null ? '' : String(keep[k])
        })
      }
      this.argsBag = next
    },
    commandOptionLabel(c) {
      if (!c) return ''
      if (c.text && c.text !== c.name) return `${c.text} (${c.name})`
      return c.text || c.name
    },
    onPluginPicked(name) {
      this.pluginName = name || ''
      this.commandName = ''
      this.argsBag = {}
      if (this.pluginName) this.loadMeta(this.pluginName, {})
      else this.meta = null
    },
    onCommandChange() {
      this.applyArgsDefaults({})
    },
    buildArgsObject() {
      const o = {}
      const fields = this.argFields
      if (fields.length) {
        fields.forEach((f) => {
          if (!f || f.group) return
          const v = this.argsBag[f.name]
          o[f.name] = v == null ? '' : String(v)
        })
      } else {
        Object.keys(this.argsBag || {}).forEach((k) => {
          if (k === '__collapsed') return
          o[k] = this.argsBag[k] == null ? '' : String(this.argsBag[k])
        })
      }
      return o
    },
    buildContLines(argsObj) {
      const lines = []
      const fields = this.argFields
      if (fields.length) {
        fields.forEach((f) => {
          if (!f || f.group) return
          const label = f.text || f.name
          const val = argsObj[f.name] != null ? String(argsObj[f.name]) : ''
          lines.push(`${label} = ${val}`)
        })
      } else {
        Object.keys(argsObj).forEach((k) => {
          lines.push(`${k} = ${argsObj[k]}`)
        })
      }
      return lines
    },
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const argsObj = this.buildArgsObject()
      const display = this.commandText || this.commandName || ''
      const commands = [
        {
          code: 357,
          indent,
          parameters: [this.pluginName || '', this.commandName || '', display, argsObj],
        },
      ]
      this.buildContLines(argsObj).forEach((line) => {
        commands.push({ code: 657, indent, parameters: [line] })
      })
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.cmd357-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.cmd357-row .el-input {
  flex: 1;
}
.cmd357-desc {
  margin: -4px 0 10px 72px;
  padding: 6px 8px;
  background: var(--app-surface, #f7f7f7);
  border: 1px solid var(--app-border, #eee);
  font-size: 12px;
  color: var(--app-muted, #555);
  white-space: pre-wrap;
  max-height: 72px;
  overflow: auto;
}
.cmd357-args-label {
  margin: 0 0 6px 72px;
  font-size: 13px;
  color: var(--app-muted, #666);
}
.cmd357-args {
  margin-left: 72px;
  border: 1px solid var(--app-border, #ddd);
  min-height: 160px;
  max-height: 320px;
  overflow: auto;
  padding: 6px;
}
.cmd357-empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--app-muted, #888);
  font-size: 13px;
}
</style>
