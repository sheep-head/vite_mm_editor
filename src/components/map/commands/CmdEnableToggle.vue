<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="320px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="56px">
      <el-form-item label="操作">
        <el-radio-group v-model="op">
          <el-radio :value="0">启用</el-radio>
          <el-radio :value="1">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
/** 通用启用/禁用：134–137、281 等 parameters[0] = 0启用/1禁用 */
export default {
  name: 'CmdEnableToggle',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
    entry: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { op: 0 }
  },
  computed: {
    title() {
      return (this.entry && this.entry.label) || '启用/禁用'
    },
    code() {
      return (this.entry && this.entry.code) || (this.command && this.command.code) || 134
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0]
        this.op = p[0] === 1 ? 1 : 0
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: this.code,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.op],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
