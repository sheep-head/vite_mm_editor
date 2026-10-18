<template>
  <el-dialog
    :model-value="modelValue"
    title="插件管理器"
    width="860px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="onVisible"
    @open="load">
    <div class="pm-add">
      <el-select v-model="addName" filterable clearable placeholder="从 js/plugins 添加" size="small" style="width: 280px">
        <el-option v-for="name in unusedNames" :key="name" :label="name" :value="name" />
      </el-select>
      <el-button size="small" :disabled="!addName" @click="addPlugin">添加</el-button>
      <el-button size="small" :disabled="selected < 0" @click="removePlugin">移除</el-button>
    </div>
    <div class="pm-table-wrap">
      <table class="pm-table">
        <thead>
          <tr>
            <th class="pm-st">状态</th>
            <th class="pm-nm">名称</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="row.name + '-' + i"
            :class="{ active: selected === i }"
            draggable="true"
            @click="selected = i"
            @dblclick="openSettings(i)"
            @dragstart="onDragStart(i, $event)"
            @dragover.prevent
            @drop="onDrop(i)">
            <td class="pm-st" @click.stop>
              <el-checkbox v-model="row.status">开启</el-checkbox>
            </td>
            <td class="pm-nm">{{ row.name }}</td>
            <td>{{ rowText(row) }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="3" class="pm-empty">没有插件</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pm-note">{{ note }}</div>
    <template #footer>
      <el-button @click="close(false)">取消</el-button>
      <el-button @click="apply">应用</el-button>
      <el-button type="primary" @click="applyAndClose">确定</el-button>
    </template>
    <plugin-settings-dialog v-model="settingsVisible" :plugin="editing" @confirm="onSettingsConfirm" />
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
import {
  mzSupportNote,
  parsePluginSource,
  parsePluginsJs,
  stringifyPluginsJs,
} from '@/utils/pluginMeta'
import PluginSettingsDialog from './PluginSettingsDialog.vue'

export default {
  name: 'PluginManagerDialog',
  components: { PluginSettingsDialog },
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      rows: [],
      fileNames: [],
      selected: -1,
      addName: '',
      dragIndex: -1,
      settingsVisible: false,
      editing: null,
      editingIndex: -1,
      loadError: '',
    }
  },
  computed: {
    unusedNames() {
      const used = new Set(this.rows.map((r) => r.name))
      return this.fileNames.filter((n) => !used.has(n))
    },
    note() {
      if (this.loadError) return this.loadError
      const row = this.rows[this.selected]
      if (!row) return ''
      if (!row.meta) return `未找到插件文件“${row.name}.js”。`
      return mzSupportNote(row.name, row.meta)
    },
  },
  methods: {
    workspace() {
      return (DataManager.$config && DataManager.$config.workSpace) || ''
    },
    onVisible(v) {
      this.$emit('update:modelValue', v)
    },
    close(v) {
      this.$emit('update:modelValue', v)
    },
    load() {
      this.rows = []
      this.fileNames = []
      this.selected = -1
      this.addName = ''
      this.loadError = ''
      if (!isNw || !fs || !path) {
        this.loadError = '仅 NW.js 环境可管理插件'
        return
      }
      const root = this.workspace()
      if (!root) {
        this.loadError = '未设置工作空间'
        return
      }
      const dir = path.join(root, 'js', 'plugins')
      const file = path.join(root, 'js', 'plugins.js')
      try {
        if (fs.existsSync(dir)) {
          this.fileNames = fs
            .readdirSync(dir)
            .filter((n) => /\.js$/i.test(n))
            .map((n) => n.replace(/\.js$/i, ''))
            .sort((a, b) => a.localeCompare(b))
        }
        const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : 'var $plugins = [];\n'
        const list = parsePluginsJs(text)
        this.rows = list.map((p) => this.decorate(p))
        if (this.rows.length) this.selected = 0
      } catch (e) {
        console.error(e)
        this.loadError = '读取插件失败'
      }
    },
    readMeta(name) {
      const root = this.workspace()
      if (!root || !fs || !path) return null
      const file = path.join(root, 'js', 'plugins', name + '.js')
      if (!fs.existsSync(file)) return null
      try {
        return parsePluginSource(fs.readFileSync(file, 'utf8'))
      } catch (e) {
        console.error(e)
        return null
      }
    },
    decorate(p) {
      const meta = this.readMeta(p.name)
      const parameters = { ...(p.parameters || {}) }
      return {
        name: p.name,
        status: !!p.status,
        description: (meta && meta.plugindesc) || p.description || '',
        parameters,
        meta,
      }
    },
    rowText(row) {
      return (row.meta && row.meta.plugindesc) || row.description || ''
    },
    addPlugin() {
      const name = this.addName
      if (!name) return
      const meta = this.readMeta(name)
      const parameters = {}
      if (meta) {
        ;(meta.params || []).forEach((param) => {
          if (param.group) return
          parameters[param.name] = param.default != null ? String(param.default) : ''
        })
      }
      this.rows.push({
        name,
        status: true,
        description: (meta && meta.plugindesc) || '',
        parameters,
        meta,
      })
      this.selected = this.rows.length - 1
      this.addName = ''
    },
    removePlugin() {
      if (this.selected < 0) return
      this.rows.splice(this.selected, 1)
      if (this.selected >= this.rows.length) this.selected = this.rows.length - 1
    },
    onDragStart(i, e) {
      this.dragIndex = i
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
    },
    onDrop(i) {
      const from = this.dragIndex
      this.dragIndex = -1
      if (from < 0 || from === i) return
      const [row] = this.rows.splice(from, 1)
      this.rows.splice(i, 0, row)
      this.selected = i
    },
    openSettings(i) {
      this.selected = i
      this.editingIndex = i
      this.editing = this.rows[i]
      this.settingsVisible = true
    },
    onSettingsConfirm(next) {
      const i = this.editingIndex
      if (i < 0 || !this.rows[i]) return
      this.rows.splice(i, 1, {
        ...this.rows[i],
        status: next.status,
        description: next.description,
        parameters: next.parameters,
        meta: next.meta || this.rows[i].meta,
      })
    },
    apply() {
      if (!isNw || !fs || !path) {
        ElMessage.warning('仅 NW.js 环境可保存插件')
        return false
      }
      const root = this.workspace()
      if (!root) {
        ElMessage.warning('未设置工作空间')
        return false
      }
      const file = path.join(root, 'js', 'plugins.js')
      const payload = this.rows.map((r) => ({
        name: r.name,
        status: !!r.status,
        description: (r.meta && r.meta.plugindesc) || r.description || '',
        parameters: r.parameters || {},
      }))
      try {
        fs.writeFileSync(file, stringifyPluginsJs(payload), 'utf8')
        ElMessage.success('已写入 plugins.js')
        return true
      } catch (e) {
        console.error(e)
        ElMessage.error('写入 plugins.js 失败')
        return false
      }
    },
    applyAndClose() {
      if (this.apply()) this.close(false)
    },
  },
}
</script>

<style scoped>
.pm-add {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.pm-table-wrap {
  height: 420px;
  overflow: auto;
  border: 1px solid var(--app-border, #ddd);
}
.pm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pm-table th,
.pm-table td {
  border-bottom: 1px solid var(--app-border, #eee);
  padding: 4px 8px;
  text-align: left;
  vertical-align: middle;
}
.pm-table th {
  position: sticky;
  top: 0;
  background: var(--app-surface, #fafafa);
}
.pm-st {
  width: 88px;
}
.pm-nm {
  width: 220px;
  word-break: break-all;
}
.pm-table tbody tr {
  cursor: pointer;
}
.pm-table tbody tr.active {
  background: #2a5db0;
  color: #fff;
}
.pm-table tbody tr.active :deep(.el-checkbox__label) {
  color: #fff;
}
.pm-empty {
  text-align: center;
  color: var(--app-muted, #888);
}
.pm-note {
  min-height: 22px;
  margin-top: 8px;
  color: var(--app-muted, #666);
  font-size: 13px;
}
</style>
