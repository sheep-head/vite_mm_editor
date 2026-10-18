<template>
  <el-dialog
    :model-value="modelValue"
    title="转到标签"
    width="400px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="56px">
      <el-form-item label="标签">
        <el-select
          v-model="label"
          filterable
          allow-create
          default-first-option
          clearable
          placeholder="选择或输入标签名"
          style="width: 100%">
          <el-option v-for="name in labelOptions" :key="name" :label="name" :value="name" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
export default {
  name: 'Cmd119JumpLabel',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
    commandList: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { label: '' }
  },
  computed: {
    labelOptions() {
      const seen = new Set()
      const out = []
      const list = Array.isArray(this.commandList) ? this.commandList : []
      list.forEach((cmd) => {
        if (!cmd || cmd.code !== 118) return
        const name = cmd.parameters && cmd.parameters[0] != null ? String(cmd.parameters[0]) : ''
        if (!name || seen.has(name)) return
        seen.add(name)
        out.push(name)
      })
      return out
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || ['']
        this.label = p[0] || ''
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 119,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.label],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
