<template>
  <el-dialog
    :model-value="modelValue"
    title="数值输入处理"
    width="400px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="变量">
        <id-name-field v-model="varId" type="variable" width="220px" />
      </el-form-item>
      <el-form-item label="位数">
        <el-input-number v-model="digits" :min="1" :max="8" controls-position="right" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'

export default {
  name: 'Cmd103NumInput',
  components: { IdNameField },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { varId: 1, digits: 1 }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 1]
        this.varId = p[0] || 1
        this.digits = this.clampDigits(p[1])
      },
    },
  },
  methods: {
    clampDigits(n) {
      const v = Number(n) || 1
      return Math.max(1, Math.min(9, v))
    },
    ok() {
      this.$emit('confirm', [
        {
          code: 103,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.varId, this.clampDigits(this.digits)],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
