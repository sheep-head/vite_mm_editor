<template>
  <el-dialog
    :model-value="modelValue"
    title="增减金币"
    width="400px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <operate-value-fields v-model="ov" />
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import OperateValueFields from '../pickers/OperateValueFields.vue'

export default {
  name: 'Cmd125Gold',
  components: { OperateValueFields },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { ov: { operation: 0, operandType: 0, operand: 0 } }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0, 0]
        this.ov = { operation: p[0] || 0, operandType: p[1] || 0, operand: p[2] || 0 }
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 125,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.ov.operation, this.ov.operandType, this.ov.operand],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
