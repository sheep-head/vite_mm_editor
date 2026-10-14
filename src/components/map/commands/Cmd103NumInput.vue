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
        <el-input-number v-model="varId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item label="位数">
        <el-input-number v-model="digits" :min="1" :max="9" controls-position="right" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="variable" :model-id="varId" @confirm="(id) => (varId = id)" />
  </el-dialog>
</template>

<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'

export default {
  name: 'Cmd103NumInput',
  components: { IdNamePickerDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { varId: 1, digits: 1, pickerVisible: false }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 1]
        this.varId = p[0] || 1
        this.digits = p[1] || 1
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 103,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.varId, this.digits],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
