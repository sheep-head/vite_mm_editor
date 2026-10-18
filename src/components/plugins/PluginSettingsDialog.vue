<template>
  <el-dialog
    :model-value="modelValue"
    title="插件设置"
    width="980px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="draft" class="ps-grid">
      <div class="ps-left">
        <div class="ps-label">基本设置</div>
        <el-form label-width="64px" size="small">
          <el-form-item label="名称">
            <el-input :model-value="draft.name" disabled />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="draft.status" style="width: 100%">
              <el-option label="开启" :value="true" />
              <el-option label="关闭" :value="false" />
            </el-select>
          </el-form-item>
          <el-form-item label="作者">
            <el-input :model-value="author" disabled />
          </el-form-item>
          <el-form-item label="说明">
            <el-input :model-value="desc" type="textarea" :rows="2" disabled />
          </el-form-item>
        </el-form>
        <div class="ps-label">帮助</div>
        <pre class="ps-help">{{ helpText }}</pre>
      </div>
      <div class="ps-right">
        <div class="ps-label">参数</div>
        <div class="ps-params">
          <plugin-param-tree
            v-if="tree.length"
            :nodes="tree"
            :bag="draft.parameters"
            :structs="structs"
            :collapse-list="collapsed"
            @dirty="dirty = true" />
          <div v-else class="ps-empty">这个插件没有参数。</div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import PluginParamTree from './PluginParamTree.vue'
import { buildParamTree } from '@/utils/pluginMeta'

export default {
  name: 'PluginSettingsDialog',
  components: { PluginParamTree },
  props: {
    modelValue: { type: Boolean, default: false },
    plugin: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      draft: null,
      dirty: false,
    }
  },
  computed: {
    meta() {
      return (this.draft && this.draft.meta) || {}
    },
    author() {
      return this.meta.author || ''
    },
    desc() {
      return this.meta.plugindesc || (this.draft && this.draft.description) || ''
    },
    helpText() {
      if (!this.draft) return ''
      if (!this.draft.meta) return '未找到插件文件，无法读取帮助。'
      return this.meta.help || '（没有帮助）'
    },
    structs() {
      return this.meta.structs || {}
    },
    tree() {
      return buildParamTree(this.meta.params || [])
    },
    collapsed() {
      const p = this.draft && this.draft.parameters
      return (p && p.__collapsed) || []
    },
  },
  watch: {
    modelValue(v) {
      if (v) this.reset()
    },
  },
  methods: {
    reset() {
      const src = this.plugin
      if (!src) {
        this.draft = null
        return
      }
      const parameters = JSON.parse(JSON.stringify(src.parameters || {}))
      if (!Array.isArray(parameters.__collapsed)) {
        parameters.__collapsed = Array.isArray(src.parameters && src.parameters.__collapsed)
          ? src.parameters.__collapsed.slice()
          : []
      }
      this.draft = {
        name: src.name,
        status: !!src.status,
        description: src.description || '',
        parameters,
        meta: src.meta || null,
      }
      this.dirty = false
    },
    confirm() {
      if (!this.draft) return
      const desc = (this.draft.meta && this.draft.meta.plugindesc) || this.draft.description || ''
      this.$emit('confirm', {
        name: this.draft.name,
        status: !!this.draft.status,
        description: desc,
        parameters: JSON.parse(JSON.stringify(this.draft.parameters)),
        meta: this.draft.meta,
      })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.ps-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  min-height: 420px;
}
.ps-label {
  font-weight: 600;
  margin-bottom: 8px;
}
.ps-help {
  margin: 0;
  height: 280px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--app-surface, #f7f7f7);
  border: 1px solid var(--app-border, #ddd);
  padding: 8px;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.45;
}
.ps-params {
  height: 460px;
  overflow: auto;
  border: 1px solid var(--app-border, #ddd);
  padding: 4px;
}
.ps-empty {
  color: var(--app-muted, #888);
  padding: 12px;
}
</style>
