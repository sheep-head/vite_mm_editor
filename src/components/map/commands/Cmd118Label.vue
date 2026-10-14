<template>
  <el-dialog
    :model-value="modelValue"
    title="标签"
    width="360px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="56px">
      <el-form-item label="标签">
        <el-input v-model="label" placeholder="标签名" />
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
  name: 'Cmd118Label',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { label: '' }
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
          code: 118,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.label],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
